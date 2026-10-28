import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseRecoveryUrl,
  classifyRecoveryError,
  getRedactedUrlSummary,
  handleRecoveryUrl,
} from '../frontend/lib/authRecoveryHelper.js';

test('authRecoveryHelper: parseRecoveryUrl parses PKCE ?code=', () => {
  const url = 'solo-traveler://auth/callback?code=abc12345pkce&type=recovery';
  const parsed = parseRecoveryUrl(url);
  assert.equal(parsed.kind, 'code');
  assert.equal(parsed.code, 'abc12345pkce');
  assert.equal(parsed.type, 'recovery');
});

test('authRecoveryHelper: parseRecoveryUrl parses implicit hash fragments', () => {
  const url = 'solo-traveler://auth/callback#access_token=secret_access&refresh_token=secret_refresh&type=recovery';
  const parsed = parseRecoveryUrl(url);
  assert.equal(parsed.kind, 'tokens');
  assert.equal(parsed.accessToken, 'secret_access');
  assert.equal(parsed.refreshToken, 'secret_refresh');
  assert.equal(parsed.type, 'recovery');
});

test('authRecoveryHelper: parseRecoveryUrl parses token_hash parameter', () => {
  const url = 'solo-traveler://auth/callback?token_hash=th_abc123&type=recovery';
  const parsed = parseRecoveryUrl(url);
  assert.equal(parsed.kind, 'token_hash');
  assert.equal(parsed.tokenHash, 'th_abc123');
  assert.equal(parsed.type, 'recovery');
});

test('authRecoveryHelper: parseRecoveryUrl detects error parameters and maps cleanly', () => {
  const url = 'solo-traveler://auth/callback?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
  const parsed = parseRecoveryUrl(url);
  assert.equal(parsed.kind, 'error');
  assert.ok(parsed.error.includes('expired'));
  assert.ok(!parsed.error.includes('access_denied')); // does not leak raw technical string
});

test('authRecoveryHelper: parseRecoveryUrl rejects unsupported auth types', () => {
  const url = 'solo-traveler://auth/callback?code=abc12345pkce&type=signup';
  const parsed = parseRecoveryUrl(url);
  assert.equal(parsed.kind, 'unsupported_type');
  assert.equal(parsed.type, 'signup');
});

test('authRecoveryHelper: parseRecoveryUrl handles non-auth or malformed URLs', () => {
  assert.equal(parseRecoveryUrl(null).kind, 'none');
  assert.equal(parseRecoveryUrl('').kind, 'none');
  assert.equal(parseRecoveryUrl('solo-traveler://tabs/explore').kind, 'none');
});

test('authRecoveryHelper: getRedactedUrlSummary never exposes secret values', () => {
  const url = 'solo-traveler://auth/callback?code=super_secret_code_12345&access_token=super_secret_token_67890';
  const summary = getRedactedUrlSummary(url);
  assert.ok(!summary.includes('super_secret_code_12345'));
  assert.ok(!summary.includes('super_secret_token_67890'));
  assert.ok(summary.includes('[REDACTED]'));
});

test('authRecoveryHelper: handleRecoveryUrl is idempotent and guards against double-execution', async () => {
  const handledSet = new Set();
  const isHandled = (k) => handledSet.has(k);
  const markHandled = (k) => handledSet.add(k);

  let exchangeCalls = 0;
  const mockSupabase = {
    auth: {
      exchangeCodeForSession: async (code) => {
        exchangeCalls++;
        return { data: { session: { user: { id: 'u1' } } }, error: null };
      },
      getSession: async () => ({ data: { session: null } }),
    },
  };

  const url = 'solo-traveler://auth/callback?code=testcode123';

  // First invocation
  const res1 = await handleRecoveryUrl({
    url,
    supabase: mockSupabase,
    onSessionEstablished: () => {},
    onError: () => {},
    isHandled,
    markHandled,
  });

  assert.equal(res1.handled, true);
  assert.equal(res1.success, true);
  assert.equal(exchangeCalls, 1);

  // Second invocation with identical URL
  const res2 = await handleRecoveryUrl({
    url,
    supabase: mockSupabase,
    onSessionEstablished: () => {},
    onError: () => {},
    isHandled,
    markHandled,
  });

  assert.equal(res2.handled, true);
  assert.equal(res2.duplicate, true);
  assert.equal(exchangeCalls, 1); // Not called again!
});

test("authRecoveryHelper: parseRecoveryUrl handles very long parameter values safely", () => {
  const longValue = "A".repeat(4096);
  const url = `solo-traveler://auth/callback?code=${longValue}&type=recovery`;
  const parsed = parseRecoveryUrl(url);
  assert.equal(parsed.kind, "code");
  assert.equal(parsed.code.length, 4096);
});

test("authRecoveryHelper: handleRecoveryUrl executes setSession for implicit fragment tokens", async () => {
  let setSessionCalledWith = null;
  const mockSupabase = {
    auth: {
      setSession: async (tokens) => {
        setSessionCalledWith = tokens;
        return { data: { session: { user: { id: "u2" } } }, error: null };
      },
      getSession: async () => ({ data: { session: null } }),
    },
  };

  const url = "solo-traveler://auth/callback#access_token=FAKE_ACCESS&refresh_token=FAKE_REFRESH&type=recovery";
  let established = null;

  const res = await handleRecoveryUrl({
    url,
    supabase: mockSupabase,
    onSessionEstablished: (s) => { established = s; },
    onError: () => {},
  });

  assert.equal(res.handled, true);
  assert.equal(res.success, true);
  assert.equal(setSessionCalledWith.access_token, "FAKE_ACCESS");
  assert.equal(setSessionCalledWith.refresh_token, "FAKE_REFRESH");
  assert.equal(established.user.id, "u2");
});

test("authRecoveryHelper: handleRecoveryUrl executes verifyOtp for token_hash", async () => {
  let verifyOtpCalledWith = null;
  const mockSupabase = {
    auth: {
      verifyOtp: async (params) => {
        verifyOtpCalledWith = params;
        return { data: { session: { user: { id: "u3" } } }, error: null };
      },
      getSession: async () => ({ data: { session: null } }),
    },
  };

  const url = "solo-traveler://auth/callback?token_hash=FAKE_TH&type=recovery";
  let established = null;

  const res = await handleRecoveryUrl({
    url,
    supabase: mockSupabase,
    onSessionEstablished: (s) => { established = s; },
    onError: () => {},
  });

  assert.equal(res.handled, true);
  assert.equal(res.success, true);
  assert.equal(verifyOtpCalledWith.token_hash, "FAKE_TH");
  assert.equal(verifyOtpCalledWith.type, "recovery");
  assert.equal(established.user.id, "u3");
});

test("authRecoveryHelper: canary token in URL is never exposed in error messages or logs", async () => {
  const canaryToken = "CANARY_SECRET_NEVER_LEAK_xyz123";
  const url = `solo-traveler://auth/callback?code=${canaryToken}&error=invalid_grant&error_description=${canaryToken}`;

  const outputLogs = [];
  const origWarn = console.warn;
  const origLog = console.log;
  console.warn = (...args) => outputLogs.push(args.join(" "));
  console.log = (...args) => outputLogs.push(args.join(" "));

  let capturedError = "";
  try {
    const res = await handleRecoveryUrl({
      url,
      supabase: { auth: {} },
      onSessionEstablished: () => {},
      onError: (err) => { capturedError = err; },
    });

    assert.equal(res.handled, true);
    assert.equal(res.success, false);
    assert.ok(!capturedError.includes(canaryToken), "Canary token must not appear in user error message");
    const combinedLogs = outputLogs.join(" ");
    assert.ok(!combinedLogs.includes(canaryToken), "Canary token must not appear in console logs");
  } finally {
    console.warn = origWarn;
    console.log = origLog;
  }
});

test("authRecoveryHelper: direct link landing on reset-password?code= exchanges successfully", async () => {
  let codeExchanged = null;
  const mockSupabase = {
    auth: {
      exchangeCodeForSession: async (code) => {
        codeExchanged = code;
        return { data: { session: { user: { id: "u4" } } }, error: null };
      },
      getSession: async () => ({ data: { session: null } }),
    },
  };

  const directResetUrl = "solo-traveler://reset-password?code=DIRECT_RESET_CODE&type=recovery";
  let sessionResult = null;

  const res = await handleRecoveryUrl({
    url: directResetUrl,
    supabase: mockSupabase,
    onSessionEstablished: (s) => { sessionResult = s; },
    onError: () => {},
  });

  assert.equal(res.handled, true);
  assert.equal(res.success, true);
  assert.equal(codeExchanged, "DIRECT_RESET_CODE");
  assert.equal(sessionResult.user.id, "u4");
});

test("authRecoveryHelper: cold start and warm start delivery handled by single idempotent state", async () => {
  const handledSet = new Set();
  const isHandled = (k) => handledSet.has(k);
  const markHandled = (k) => handledSet.add(k);

  let calls = 0;
  const mockSupabase = {
    auth: {
      exchangeCodeForSession: async () => {
        calls++;
        return { data: { session: { user: { id: "u5" } } }, error: null };
      },
      getSession: async () => ({ data: { session: null } }),
    },
  };

  const coldUrl = "solo-traveler://auth/callback?code=SAME_CODE_COLD_WARM";
  const warmUrl = "solo-traveler://auth/callback?code=SAME_CODE_COLD_WARM";

  // Cold start delivery
  const resCold = await handleRecoveryUrl({
    url: coldUrl,
    supabase: mockSupabase,
    onSessionEstablished: () => {},
    onError: () => {},
    isHandled,
    markHandled,
  });

  // Warm start delivery of identical URL
  const resWarm = await handleRecoveryUrl({
    url: warmUrl,
    supabase: mockSupabase,
    onSessionEstablished: () => {},
    onError: () => {},
    isHandled,
    markHandled,
  });

  assert.equal(resCold.success, true);
  assert.equal(resWarm.duplicate, true);
  assert.equal(calls, 1, "Exactly one network call must occur across cold and warm deliveries");
});

test('authRecoveryHelper: handleRecoveryUrl proactively succeeds if active session already exists', async () => {
  let exchangeCalls = 0;
  const mockSupabase = {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: 'pre-existing-user' } } },
      }),
      exchangeCodeForSession: async () => {
        exchangeCalls++;
        return { data: { session: null }, error: new Error('should not be called') };
      },
    },
  };

  let sessionEstablished = false;
  const res = await handleRecoveryUrl({
    url: 'solo-traveler://auth/callback?code=PRE_AUTHENTICATED_CODE',
    supabase: mockSupabase,
    onSessionEstablished: (s) => {
      sessionEstablished = s.user.id === 'pre-existing-user';
    },
    onError: () => {},
  });

  assert.equal(res.success, true);
  assert.equal(sessionEstablished, true);
  assert.equal(exchangeCalls, 0, 'Must not attempt redundant exchange if session is already active');
});

test('authRecoveryHelper: handleRecoveryUrl recovers gracefully if code exchange errors but session was captured concurrently', async () => {
  let fallbackSessionCalls = 0;
  const mockSupabase = {
    auth: {
      getSession: async () => {
        fallbackSessionCalls++;
        // First check during proactive check returns null; second check during catch block returns active session
        if (fallbackSessionCalls === 1) return { data: { session: null } };
        return { data: { session: { user: { id: 'concurrent-user' } } } };
      },
      exchangeCodeForSession: async () => {
        throw new Error('invalid_grant: PKCE code has already been used');
      },
    },
  };

  let errorReported = null;
  let sessionEstablished = false;
  const res = await handleRecoveryUrl({
    url: 'solo-traveler://auth/callback?code=ALREADY_USED_CODE',
    supabase: mockSupabase,
    onSessionEstablished: (s) => {
      sessionEstablished = s.user.id === 'concurrent-user';
    },
    onError: (err) => {
      errorReported = err;
    },
  });

  assert.equal(res.success, true);
  assert.equal(sessionEstablished, true);
  assert.equal(errorReported, null, 'Must not report error when valid session exists on client');
});
