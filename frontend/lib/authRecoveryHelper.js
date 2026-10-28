/**
 * authRecoveryHelper.js
 *
 * Unified, idempotent recovery deep-link parser and session dispatcher.
 * Handles both cold-start (Linking.getInitialURL) and warm-start (Linking.addEventListener)
 * across PKCE (?code=), implicit hash (#access_token=...&type=recovery), and token-hash (?token_hash=...).
 *
 * Security: Never prints or exposes raw tokens, codes, or credentials.
 */

/**
 * Returns a safe diagnostic summary of a URL with all credential values redacted.
 * Shows only the scheme, host, path, and parameter names.
 */
export function getRedactedUrlSummary(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '[empty-url]';
  try {
    const parsed = new URL(rawUrl.replace('#', '?'));
    const paramNames = Array.from(parsed.searchParams.keys());
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}?${paramNames.map((k) => `${k}=[REDACTED]`).join('&')}`;
  } catch {
    const scheme = (rawUrl.split('://')[0] || '').slice(0, 30);
    return `${scheme}://[REDACTED_URL]`;
  }
}

/**
 * Categorizes recovery errors into precise error codes and human-readable messages.
 * Prevents collapsing all errors into 'Link is expired'.
 */
export function getDetailedRecoveryError(errorCode, errorDescription) {
  const codeStr = String(errorCode || '').toLowerCase();
  const descStr = String(errorDescription || '').toLowerCase();
  const combined = `${codeStr} ${descStr}`;

  if (
    errorCode === 'PKCE_VERIFIER_MISSING' ||
    codeStr.includes('pkce') ||
    descStr.includes('code verifier') ||
    descStr.includes('code_verifier') ||
    descStr.includes('flow_state_not_found') ||
    codeStr.includes('flow_state_not_found')
  ) {
    return {
      code: 'PKCE_VERIFIER_MISSING',
      message: 'Authorization code verification failed because the code verifier was not found. Please request a new link or use the 6-digit recovery code.',
    };
  }

  if (
    codeStr === 'otp_expired' ||
    codeStr === 'token_expired' ||
    descStr.includes('token has expired') ||
    descStr.includes('token is expired') ||
    descStr.includes('otp expired') ||
    descStr.includes('has expired')
  ) {
    return {
      code: 'TOKEN_EXPIRED',
      message: 'This password reset link has expired or has already been used. Please request a fresh reset link, or copy it directly from your email without opening it in a browser.',
    };
  }

  if (
    descStr.includes('already been used') ||
    descStr.includes('already used') ||
    descStr.includes('already opened') ||
    codeStr === 'otp_used'
  ) {
    return {
      code: 'TOKEN_ALREADY_USED',
      message: 'This password reset link has already been used. Please request a fresh reset link.',
    };
  }

  if (
    codeStr === 'invalid_grant' ||
    codeStr === 'bad_code_verifier' ||
    descStr.includes('invalid') ||
    descStr.includes('bad_code_verifier') ||
    descStr.includes('not found') ||
    codeStr.includes('invalid')
  ) {
    return {
      code: 'INVALID_CODE',
      message: 'This password reset link is invalid or has already been used. Please request a new link.',
    };
  }

  if (combined.includes('rate') || combined.includes('too many')) {
    return {
      code: 'RATE_LIMITED',
      message: 'Too many password reset attempts. Please wait a few minutes before trying again.',
    };
  }

  return {
    code: 'UNKNOWN_RECOVERY_ERROR',
    message: errorDescription && typeof errorDescription === 'string' && errorDescription.length > 5
      ? errorDescription
      : 'Unable to verify your password reset link. Please request a new link to continue.',
  };
}

/**
 * Maps error codes and descriptions from auth links to clean, user-friendly messages.
 * Returns primitive string for safe React Native UI rendering.
 */
export function classifyRecoveryError(errorCode, errorDescription) {
  return getDetailedRecoveryError(errorCode, errorDescription).message;
}

/**
 * Pure function to parse an incoming authentication URL into structured recovery data.
 * Checks both query string (?) and hash fragment (#).
 */
export function parseRecoveryUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { kind: 'none' };
  }

  let cleanUrl = String(rawUrl || '').trim();
  // Unwrap email link wrappers (e.g. Google Mail redirector, SafeLinks)
  if (
    cleanUrl.includes('google.com/url') ||
    cleanUrl.includes('/safelinks.') ||
    cleanUrl.includes('url=') ||
    cleanUrl.includes('q=')
  ) {
    try {
      const wrapped = new URL(cleanUrl.replace('#', '?'));
      const realTarget = wrapped.searchParams.get('q') || wrapped.searchParams.get('url');
      if (
        realTarget &&
        (realTarget.startsWith('http://') ||
          realTarget.startsWith('https://') ||
          realTarget.startsWith('solo-traveler://'))
      ) {
        cleanUrl = decodeURIComponent(realTarget);
      }
    } catch {}
  }

  let code = null;
  let accessToken = null;
  let refreshToken = null;
  let tokenHash = null;
  let rawToken = null;
  let type = null;
  let errorCode = null;
  let errorDescription = null;

  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    try {
      new URL(rawUrl.replace('#', '?'));
    } catch {
      return {
        kind: 'error',
        error: 'Malformed password reset link.',
        errorCode: 'MALFORMED_URL',
      };
    }
  }

  try {
    // 1. Inspect hash fragment
    if (cleanUrl.includes('#')) {
      const hashPart = cleanUrl.split('#')[1] || '';
      const hashParams = new URLSearchParams(hashPart);
      accessToken = hashParams.get('access_token') || null;
      refreshToken = hashParams.get('refresh_token') || null;
      tokenHash = hashParams.get('token_hash') || null;
      rawToken = hashParams.get('token') || null;
      type = hashParams.get('type') || null;
      errorCode = hashParams.get('error_code') || hashParams.get('error') || null;
      errorDescription = hashParams.get('error_description') || null;
    }

    // 2. Inspect query string
    if (cleanUrl.includes('?')) {
      const queryPart = cleanUrl.split('?')[1]?.split('#')[0] || '';
      const queryParams = new URLSearchParams(queryPart);
      code = code || queryParams.get('code') || null;
      accessToken = accessToken || queryParams.get('access_token') || null;
      refreshToken = refreshToken || queryParams.get('refresh_token') || null;
      tokenHash = tokenHash || queryParams.get('token_hash') || null;
      rawToken = rawToken || queryParams.get('token') || null;
      type = type || queryParams.get('type') || null;
      errorCode = errorCode || queryParams.get('error_code') || queryParams.get('error') || null;
      errorDescription = errorDescription || queryParams.get('error_description') || null;

      // If token not at top level, check nested redirect_to URL
      if (!code && !accessToken && !tokenHash && !rawToken) {
        const redirectTo = queryParams.get('redirect_to');
        if (redirectTo && (redirectTo.includes('?') || redirectTo.includes('#'))) {
          const nested = parseRecoveryUrl(decodeURIComponent(redirectTo));
          if (nested.kind !== 'none' && nested.kind !== 'error') {
            return nested;
          }
        }
      }
    }
  } catch (err) {
    return {
      kind: 'error',
      error: 'Malformed password reset link.',
      errorCode: 'MALFORMED_URL',
    };
  }

  // Handle explicit errors reported in URL
  if (errorCode || errorDescription) {
    const detailed = getDetailedRecoveryError(errorCode, errorDescription);
    return {
      kind: 'error',
      error: detailed.message,
      errorCode: detailed.code,
    };
  }

  // Type validation: If type is explicitly provided and not recovery, flag as unsupported
  const isRecoveryType = !type || type === 'recovery';
  if (type && !isRecoveryType) {
    return {
      kind: 'unsupported_type',
      type,
      error: 'This authentication link is not a password reset link.',
      errorCode: 'UNSUPPORTED_AUTH_TYPE',
    };
  }

  // 1. Direct Session Tokens (#access_token=...&refresh_token=...)
  if (accessToken && refreshToken) {
    return {
      kind: 'tokens',
      accessToken,
      refreshToken,
      type: type || 'recovery',
    };
  }

  // 2. PKCE Authorization Code (?code=...)
  if (code) {
    return {
      kind: 'code',
      code,
      type: type || 'recovery',
    };
  }

  // 3. Token Hash (Supabase OTP recovery link ?token_hash=...)
  if (tokenHash) {
    return {
      kind: 'token_hash',
      tokenHash,
      type: type || 'recovery',
    };
  }

  // 4. Raw token parameter (?token=...)
  if (rawToken) {
    if (/^\d{6}$/.test(rawToken)) {
      return {
        kind: 'otp',
        code: rawToken,
        type: type || 'recovery',
      };
    }
    return {
      kind: 'token_hash',
      tokenHash: rawToken,
      rawToken,
      type: type || 'recovery',
    };
  }

  return { kind: 'none' };
}

/**
 * Strips sensitive auth tokens, codes, and fragments from the visible web browser URL.
 */
export function sanitizeRecoveryUrlOnWeb() {
  if (typeof window !== 'undefined' && window.history && typeof window.history.replaceState === 'function') {
    try {
      const url = new URL(window.location.href);
      const paramsToRemove = [
        'code',
        'access_token',
        'refresh_token',
        'token_hash',
        'token',
        'type',
        'error',
        'error_code',
        'error_description',
      ];
      let mutated = false;
      for (const param of paramsToRemove) {
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param);
          mutated = true;
        }
      }
      if (url.hash) {
        url.hash = '';
        mutated = true;
      }
      if (mutated) {
        const cleanUrl = url.pathname + (url.search ? url.search : '');
        window.history.replaceState(null, '', cleanUrl || '/');
      }
    } catch {}
  }
}

/**
 * Idempotently handles an incoming recovery URL and dispatches the session exchange.
 *
 * @param {Object} options
 * @param {string} options.url - The incoming URL to process
 * @param {string} [options.email] - Optional account email for fallback verification
 * @param {Object} options.supabase - Supabase client instance
 * @param {Function} options.onSessionEstablished - Callback when session is ready: (session) => void
 * @param {Function} options.onError - Callback when exchange fails: (errorMessage, errorCode) => void
 * @param {Function} options.isHandled - (key: string) => boolean
 * @param {Function} options.markHandled - (key: string) => void
 * @returns {Promise<{ handled: boolean, success?: boolean, session?: any, error?: string, errorCode?: string }>}
 */
export async function handleRecoveryUrl({
  url,
  email,
  supabase,
  onSessionEstablished,
  onError,
  isHandled,
  markHandled,
}) {
  if (!url || typeof url !== 'string') {
    return { handled: false };
  }

  const parsed = parseRecoveryUrl(url);
  console.log('[AuthRecovery:Diagnostic] stage=receive modality=' + parsed.kind + ' hasEmail=' + Boolean(email));
  if (parsed.kind === 'none') {
    return { handled: false };
  }

  // Idempotency key derived from kind and token prefix (without storing full secrets)
  const key = `${parsed.kind}:${
    parsed.code
      ? parsed.code.slice(0, 8)
      : parsed.tokenHash
      ? parsed.tokenHash.slice(0, 8)
      : parsed.accessToken
      ? parsed.accessToken.slice(0, 8)
      : 'err'
  }`;

  if (typeof isHandled === 'function' && isHandled(key)) {
    return { handled: true, duplicate: true };
  }

  if (typeof markHandled === 'function') {
    markHandled(key);
  }

  if (parsed.kind === 'error' || parsed.kind === 'unsupported_type') {
    if (typeof onError === 'function') {
      onError(parsed.error, parsed.errorCode);
    }
    return { handled: true, success: false, error: parsed.error, errorCode: parsed.errorCode };
  }

  if (!supabase?.auth) {
    const errorMsg = 'Authentication service is not ready. Please try again.';
    if (typeof onError === 'function') onError(errorMsg, 'SERVICE_NOT_READY');
    return { handled: true, success: false, error: errorMsg, errorCode: 'SERVICE_NOT_READY' };
  }

  try {
    // 1. Proactive session check: If already authenticated with a user session, avoid redundant one-time code exchange
    try {
      const { data: existingData } = await supabase.auth.getSession();
      if (existingData?.session?.user) {
        sanitizeRecoveryUrlOnWeb();
        if (typeof onSessionEstablished === 'function') {
          onSessionEstablished(existingData.session);
        }
        return { handled: true, success: true, session: existingData.session };
      }
    } catch {}

    let session = null;

    if (parsed.kind === 'tokens') {
      console.log('[AuthRecovery:Diagnostic] stage=dispatch modality=tokens hasAccess=' + Boolean(parsed.accessToken) + ' hasRefresh=' + Boolean(parsed.refreshToken));
      // Modality A: Post-redirect hash fragment (#access_token=...&refresh_token=...)
      const { data, error } = await supabase.auth.setSession({
        access_token: parsed.accessToken,
        refresh_token: parsed.refreshToken,
      });
      if (error) throw error;
      session = data?.session || null;
    } else if (parsed.kind === 'code') {
      console.log('[AuthRecovery:Diagnostic] stage=dispatch modality=code codeLen=' + (parsed.code?.length || 0));
      // Modality B: PKCE authorization code (?code=...)
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(parsed.code);
        if (error) {
          const errMsg = (error.message || '').toLowerCase();
          if (
            errMsg.includes('code verifier') ||
            errMsg.includes('code_verifier') ||
            error.code === 'flow_state_not_found' ||
            error.code === 'bad_code_verifier'
          ) {
            console.warn('[AuthRecovery] PKCE_VERIFIER_MISSING: Code exchange requires code_verifier in storage.');
            error.classifiedCode = 'PKCE_VERIFIER_MISSING';
          }
          throw error;
        }
        session = data?.session || null;
      } catch (codeErr) {
        throw codeErr;
      }
    } else if (parsed.kind === 'token_hash') {
      console.log('[AuthRecovery:Diagnostic] stage=dispatch modality=token_hash hashLen=' + (parsed.tokenHash?.length || 0) + ' hasEmail=' + Boolean(email));
      // Modality C: Raw token hash (?token_hash=... or ?token=...)
      const tokenToVerify = parsed.tokenHash;
      let res = await supabase.auth.verifyOtp({
        token_hash: tokenToVerify,
        type: 'recovery',
      });
      // Fallback: If token_hash rejected and email provided, attempt email + token
      if ((res.error || !res.data?.session) && email) {
        console.log('[AuthRecovery] verifyOtp with token_hash failed, trying email + token fallback');
        const fallbackRes = await supabase.auth.verifyOtp({
          email: String(email).trim().toLowerCase(),
          token: tokenToVerify,
          type: 'recovery',
        });
        if (!fallbackRes.error && fallbackRes.data?.session) {
          res = fallbackRes;
        }
      }
      if (res.error) throw res.error;
      session = res.data?.session || null;
    } else if (parsed.kind === 'otp') {
      console.log('[AuthRecovery:Diagnostic] stage=dispatch modality=otp codeLen=' + (parsed.code?.length || 0) + ' hasEmail=' + Boolean(email));
      // Modality D: 6-digit numeric recovery code
      if (!email) {
        const err = new Error('Please enter your registered email address along with the 6-digit recovery code.');
        err.classifiedCode = 'INVALID_CODE';
        throw err;
      }
      const { data, error } = await supabase.auth.verifyOtp({
        email: String(email).trim().toLowerCase(),
        token: parsed.code,
        type: 'recovery',
      });
      if (error) throw error;
      session = data?.session || null;
    }

    if (!session) {
      // Fallback: Check if client already captured the session
      const { data: sessionData } = await supabase.auth.getSession();
      session = sessionData?.session || null;
    }

    if (session?.user) {
      console.log('[AuthRecovery:Diagnostic] stage=complete success=true modality=' + parsed.kind);
      sanitizeRecoveryUrlOnWeb();
      if (typeof onSessionEstablished === 'function') {
        onSessionEstablished(session);
      }
      return { handled: true, success: true, session };
    }

    const unverifiedErr = 'Could not verify recovery session. Please request a fresh reset link.';
    if (typeof onError === 'function') onError(unverifiedErr, 'SESSION_NOT_VERIFIED');
    return { handled: true, success: false, error: unverifiedErr, errorCode: 'SESSION_NOT_VERIFIED' };
  } catch (err) {
    // Fallback: If code exchange failed (e.g., race condition where single-use code was already consumed by concurrent listener),
    // check whether an active session was indeed established before reporting failure
    try {
      const { data: fallbackData } = await supabase.auth.getSession();
      if (fallbackData?.session?.user) {
        sanitizeRecoveryUrlOnWeb();
        if (typeof onSessionEstablished === 'function') {
          onSessionEstablished(fallbackData.session);
        }
        return { handled: true, success: true, session: fallbackData.session };
      }
    } catch {}

    const detailed = getDetailedRecoveryError(err?.classifiedCode || err?.code || err?.status, err?.message);
    const userMessage = detailed.message;
    console.warn(`[AuthRecovery] Recovery failed [${detailed.code}]:`, err?.message || userMessage);

    if (typeof onError === 'function') {
      onError(userMessage, detailed.code);
    }
    return { handled: true, success: false, error: userMessage, errorCode: detailed.code };
  }
}

/**
 * Backward compatibility helper for token extraction
 */
export function extractTokensFromUrl(rawUrl) {
  const parsed = parseRecoveryUrl(rawUrl);
  return {
    code: parsed.code || null,
    accessToken: parsed.accessToken || null,
    refreshToken: parsed.refreshToken || null,
    tokenHash: parsed.tokenHash || null,
    type: parsed.type || null,
    errorDesc: parsed.error || null,
  };
}

/**
 * Parses user-provided recovery input:
 * 1. 6-digit numeric OTP code (e.g. "123456")
 * 2. Full recovery URL (e.g. "https://...", "solo-traveler://auth/callback#access_token=...", "?code=...")
 * 3. Raw token / token hash (> 20 chars alphanumeric)
 */
export function parseRecoveryInput(input) {
  if (!input || typeof input !== 'string') return { kind: 'none' };
  const trimmed = input.trim();
  if (!trimmed) return { kind: 'none' };

  if (/^\d{6}$/.test(trimmed)) {
    return { kind: 'otp', code: trimmed };
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('solo-traveler://') ||
    trimmed.includes('?') ||
    trimmed.includes('#') ||
    trimmed.includes('code=') ||
    trimmed.includes('token=')
  ) {
    return parseRecoveryUrl(trimmed);
  }

  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return { kind: 'token_hash', tokenHash: trimmed, type: 'recovery' };
  }

  return { kind: 'none' };
}
