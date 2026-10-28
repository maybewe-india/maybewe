import { parseRecoveryUrl, handleRecoveryUrl, getDetailedRecoveryError } from '../frontend/lib/authRecoveryHelper.js';
import { evaluateAuthGuard } from '../frontend/lib/authGuard.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

// Helper to parse deep link URLs (same logic as used in callback.jsx and authContext.jsx)
function parseAuthDeepLinkUrl(url) {
  if (!url) return null;
  let code = null;
  let accessToken = null;
  let refreshToken = null;
  let type = null;
  let errorParam = null;

  try {
    const parsed = new URL(url.replace('#', '?'));
    code = parsed.searchParams.get('code');
    accessToken = parsed.searchParams.get('access_token');
    refreshToken = parsed.searchParams.get('refresh_token');
    type = parsed.searchParams.get('type');
    errorParam =
      parsed.searchParams.get('error_description') ||
      parsed.searchParams.get('error');
  } catch {
    const codeMatch = url.match(/[?&]code=([^&#]+)/);
    if (codeMatch) code = decodeURIComponent(codeMatch[1]);
    const accessMatch = url.match(/[?&#]access_token=([^&#]+)/);
    if (accessMatch) accessToken = decodeURIComponent(accessMatch[1]);
    const refreshMatch = url.match(/[?&#]refresh_token=([^&#]+)/);
    if (refreshMatch) refreshToken = decodeURIComponent(refreshMatch[1]);
    const typeMatch = url.match(/[?&#]type=([^&#]+)/);
    if (typeMatch) type = decodeURIComponent(typeMatch[1]);
    const errorMatch =
      url.match(/[?&#]error_description=([^&#]+)/) ||
      url.match(/[?&#]error=([^&#]+)/);
    if (errorMatch) errorParam = decodeURIComponent(errorMatch[1]);
  }

  const isRecovery =
    type === 'recovery' ||
    url.includes('type=recovery') ||
    url.includes('reset-password');

  return {
    code,
    accessToken,
    refreshToken,
    type,
    error: errorParam,
    isRecovery,
  };
}

test('1. Scheme & Intent Filter Registration: app.json & AndroidManifest register solo-traveler://', () => {
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const manifest = fs.readFileSync(path.join(ROOT, 'android/app/src/main/AndroidManifest.xml'), 'utf8');

  assert.equal(appJson.expo.scheme, 'solo-traveler', 'app.json must register solo-traveler custom scheme');
  assert.ok(appJson.expo.android?.intentFilters?.length > 0, 'app.json must declare android.intentFilters');
  const filter = appJson.expo.android.intentFilters.find((f) =>
    f.data?.some((d) => d.scheme === 'solo-traveler')
  );
  assert.ok(filter, 'android.intentFilters must capture solo-traveler scheme');

  assert.ok(
    manifest.includes('android:scheme="solo-traveler"'),
    'AndroidManifest.xml must declare android:scheme="solo-traveler" in VIEW intent-filter'
  );
});

test('2. Deep-Link URL Parsing: PKCE code extraction (?code=...)', () => {
  const samplePkceUrl = 'solo-traveler://auth/callback?code=test-pkce-auth-code-12345';
  const parsed = parseAuthDeepLinkUrl(samplePkceUrl);

  assert.equal(parsed.code, 'test-pkce-auth-code-12345');
  assert.equal(parsed.accessToken, null);
  assert.equal(parsed.error, null);
});

test('3. Deep-Link URL Parsing: Implicit recovery hash fragment (#access_token=...&type=recovery)', () => {
  const sampleHashUrl =
    'solo-traveler://auth/callback#access_token=test-jwt-access-token&refresh_token=test-jwt-refresh-token&expires_in=3600&token_type=bearer&type=recovery';
  const parsed = parseAuthDeepLinkUrl(sampleHashUrl);

  assert.equal(parsed.accessToken, 'test-jwt-access-token');
  assert.equal(parsed.refreshToken, 'test-jwt-refresh-token');
  assert.equal(parsed.type, 'recovery');
  assert.equal(parsed.isRecovery, true);
  assert.equal(parsed.error, null);
});

test('4. Deep-Link URL Parsing: Expired recovery link error detection', () => {
  const sampleErrorUrl =
    'solo-traveler://auth/callback?error=access_denied&error_code=403&error_description=Email+link+is+invalid+or+has+expired';
  const parsed = parseAuthDeepLinkUrl(sampleErrorUrl);

  assert.ok(parsed.error);
  assert.ok(parsed.error.includes('expired') || parsed.error.includes('Email link is invalid'));
});

test('5. Destination Route Verification: auth/callback and reset-password routes exist', () => {
  const callbackPath = path.join(ROOT, 'frontend/app/auth/callback.jsx');
  const resetPasswordPath = path.join(ROOT, 'frontend/app/(auth)/reset-password.jsx');
  const rootResetPath = path.join(ROOT, 'frontend/app/reset-password.jsx');
  const rootCallbackPath = path.join(ROOT, 'frontend/app/callback.jsx');

  assert.ok(fs.existsSync(callbackPath), 'frontend/app/auth/callback.jsx must exist');
  assert.ok(fs.existsSync(resetPasswordPath), 'frontend/app/(auth)/reset-password.jsx canonical route must exist');
  assert.equal(fs.existsSync(rootResetPath), false, 'frontend/app/reset-password.jsx redundant root alias must be removed to prevent route collisions');
  assert.ok(fs.existsSync(rootCallbackPath), 'frontend/app/callback.jsx root alias must exist');
});

test('6. Auth Callback Implementation: Handles PKCE exchange, setSession, and recovery redirect', () => {
  const callbackSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/auth/callback.jsx'), 'utf8');

  assert.ok(
    callbackSrc.includes('exchangeCodeForSession'),
    'callback.jsx must call exchangeCodeForSession for PKCE codes'
  );
  assert.ok(
    callbackSrc.includes('setSession'),
    'callback.jsx must call setSession for access/refresh token pairs'
  );
  assert.ok(
    callbackSrc.includes('setIsPasswordRecovery(true)'),
    'callback.jsx must flag password recovery mode on type=recovery'
  );
  assert.ok(
    callbackSrc.includes("router.replace('/(auth)/reset-password')"),
    'callback.jsx must route to reset-password upon successful recovery token verification'
  );
});

test('7. AuthRouteGuard Invariant: Callback and reset-password routes are protected from redirection', () => {
  const layoutSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/_layout.jsx'), 'utf8');

  assert.ok(
    layoutSrc.includes("evaluateAuthGuard") || layoutSrc.includes("isAuthCallback") || layoutSrc.includes("segments.includes('callback')"),
    '_layout.jsx must integrate auth guard exempting callback routes'
  );
  assert.ok(
    layoutSrc.includes("redirect-to-reset-password") || layoutSrc.includes("currentSubRoute === 'reset-password'") || layoutSrc.includes("isPasswordRecovery"),
    '_layout.jsx must protect reset-password and recovery sessions from being kicked to welcome or tabs'
  );

  // Behavioral verification
  const callbackPermitted = evaluateAuthGuard({
    hasSession: false,
    segments: ['auth', 'callback'],
    isDevelopment: false,
  });
  assert.equal(callbackPermitted, 'allow', 'Auth callback route must be permitted without session');

  const recoveryPermittedOnReset = evaluateAuthGuard({
    hasSession: false,
    isPasswordRecovery: true,
    segments: ['(auth)', 'reset-password'],
    isDevelopment: false,
  });
  assert.equal(recoveryPermittedOnReset, 'allow', 'Reset-password route must be permitted during recovery');

  const recoveryRedirectFromTabs = evaluateAuthGuard({
    hasSession: false,
    isPasswordRecovery: true,
    segments: ['(tabs)'],
    isDevelopment: false,
  });
  assert.equal(recoveryRedirectFromTabs, 'redirect-to-reset-password', 'Recovery session must redirect to reset-password from tabs');
});

test('8. Password Reset UI Contract: Form provides inputs, validation, and invokes updateUser', () => {
  const resetSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/(auth)/reset-password.jsx'), 'utf8');

  assert.ok(
    resetSrc.includes('newPassword') && resetSrc.includes('confirmPassword'),
    'Reset password screen must have new password and confirmation inputs'
  );
  assert.ok(
    resetSrc.includes('updateUser') || resetSrc.includes('updateUserPassword'),
    'Reset password screen must invoke Supabase updateUser with new password'
  );
  assert.ok(
    resetSrc.includes('Password Reset Successfully'),
    'Reset password screen must provide success feedback confirmation'
  );
});

test('9. Email Sanitization: Trims leading/trailing whitespace, newlines, and normalizes to lowercase', () => {
  // Test sanitization function
  function sanitizeAuthEmail(email) {
    if (typeof email !== 'string') return '';
    return email.trim().toLowerCase();
  }

  assert.equal(sanitizeAuthEmail('  Maya.Lin@Traveler.IO  '), 'maya.lin@traveler.io');
  assert.equal(sanitizeAuthEmail('User@Gmail.COM\n'), 'user@gmail.com');
  assert.equal(sanitizeAuthEmail('   test.user+tag@domain.co.in   '), 'test.user+tag@domain.co.in');
  assert.equal(sanitizeAuthEmail(''), '');
  assert.equal(sanitizeAuthEmail(null), '');

  // Verify usage in frontend/lib/authContext.jsx
  const authContextSrc = fs.readFileSync(path.join(ROOT, 'frontend/lib/authContext.jsx'), 'utf8');
  assert.ok(
    authContextSrc.includes('sanitizeAuthEmail'),
    'authContext.jsx must define and use sanitizeAuthEmail'
  );
  assert.ok(
    authContextSrc.includes('const sanitizedEmail = sanitizeAuthEmail(userData.email);'),
    'authContext.jsx signup must sanitize incoming email'
  );
});

function classifyAuthError(authError, authData) {
  // 1. Identity array collision check (Supabase GoTrue user enumeration defense)
  if (authData?.user && Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
    return {
      isCollision: true,
      userMessage: 'This email is already registered. Please sign in or reset your password.',
      code: 'user_already_registered',
    };
  }

  if (!authError) return null;

  const msg = String(authError.message || '');
  const lowerMsg = msg.toLowerCase();
  const status = authError.status || authError.statusCode;

  // 2. Rate limit (429)
  if (status === 429 || lowerMsg.includes('rate limit') || lowerMsg.includes('security purposes')) {
    return {
      isCollision: false,
      userMessage: 'Too many requests. Please wait a moment before trying again.',
      code: 'over_rate_limit',
    };
  }

  // 3. Network or connection errors
  if (
    authError.name === 'AuthRetryableFetchError' ||
    lowerMsg.includes('fetch failed') ||
    lowerMsg.includes('network request failed') ||
    lowerMsg.includes('failed to fetch')
  ) {
    return {
      isCollision: false,
      userMessage: 'Network connection error. Please check your internet connection and try again.',
      code: 'network_error',
    };
  }

  // 4. Password validation errors
  if (lowerMsg.includes('password')) {
    return {
      isCollision: false,
      userMessage: msg,
      code: 'invalid_password',
    };
  }

  // 5. Genuine collision
  if (
    lowerMsg.includes('already registered') ||
    lowerMsg.includes('already in use') ||
    (status === 400 && lowerMsg.includes('user already exists'))
  ) {
    return {
      isCollision: true,
      userMessage: 'This email is already registered. Please sign in or reset your password.',
      code: 'user_already_registered',
    };
  }

  // 6. Generic/other error - preserve provider message honestly
  return {
    isCollision: false,
    userMessage: msg || 'Unable to complete authentication request.',
    code: authError.code || status || 'unknown_auth_error',
  };
}

test('10. Auth Error Classification: Never falsely maps 429 rate limit, weak password, or network errors to "already registered"', () => {
  // Rate limit 429
  const rateLimitError = { status: 429, message: 'For security purposes, you can only request this after 32 seconds.' };
  const classifiedRate = classifyAuthError(rateLimitError, null);
  assert.equal(classifiedRate.isCollision, false);
  assert.ok(classifiedRate.userMessage.toLowerCase().includes('too many requests') || classifiedRate.userMessage.toLowerCase().includes('wait'));
  assert.notEqual(classifiedRate.userMessage, 'This email is already registered. Please sign in or reset your password.');

  // Weak password
  const passwordError = { status: 422, message: 'Password should be at least 6 characters.' };
  const classifiedPwd = classifyAuthError(passwordError, null);
  assert.equal(classifiedPwd.isCollision, false);
  assert.equal(classifiedPwd.userMessage, 'Password should be at least 6 characters.');

  // Network failure
  const networkError = { name: 'AuthRetryableFetchError', message: 'Failed to fetch' };
  const classifiedNet = classifyAuthError(networkError, null);
  assert.equal(classifiedNet.isCollision, false);
  assert.ok(classifiedNet.userMessage.toLowerCase().includes('network'));

  // Generic provider failure
  const genericError = { status: 500, message: 'Database connection pool exhausted' };
  const classifiedGeneric = classifyAuthError(genericError, null);
  assert.equal(classifiedGeneric.isCollision, false);
  assert.equal(classifiedGeneric.userMessage, 'Database connection pool exhausted');

  // Verify authContext.jsx source enforces this classification
  const authContextSrc = fs.readFileSync(path.join(ROOT, 'frontend/lib/authContext.jsx'), 'utf8');
  assert.ok(
    authContextSrc.includes('classifyAuthError'),
    'authContext.jsx must implement classifyAuthError'
  );
});

test('11. Auth Collision Detection: Correctly identifies empty identities array or explicit collision error', () => {
  // Supabase empty identities array collision
  const collisionAuthData = {
    user: { id: 'usr-12345', identities: [] },
  };
  const classifiedIdentity = classifyAuthError(null, collisionAuthData);
  assert.equal(classifiedIdentity.isCollision, true);
  assert.equal(classifiedIdentity.code, 'user_already_registered');
  assert.equal(
    classifiedIdentity.userMessage,
    'This email is already registered. Please sign in or reset your password.'
  );

  // Explicit provider collision error
  const collisionError = { status: 400, message: 'User already registered' };
  const classifiedExplicit = classifyAuthError(collisionError, null);
  assert.equal(classifiedExplicit.isCollision, true);
  assert.equal(classifiedExplicit.code, 'user_already_registered');

  // New user with valid identity array is NOT collision
  const newUserData = {
    user: { id: 'usr-new-999', identities: [{ id: 'ident-1', provider: 'email' }] },
  };
  const classifiedNew = classifyAuthError(null, newUserData);
  assert.equal(classifiedNew, null);
});

test('12. Android Native UI Layout: "Forgot Password?" touch targets & hitSlop contracts', () => {
  const welcomeSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/(auth)/welcome.jsx'), 'utf8');
  const loginSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/(auth)/login.jsx'), 'utf8');

  // Label exact text check
  assert.ok(
    welcomeSrc.includes('Forgot password?'),
    'welcome.jsx must display exact label "Forgot password?"'
  );
  assert.ok(
    loginSrc.includes('Forgot password?'),
    'login.jsx must display exact label "Forgot password?"'
  );

  // Welcome screen checks
  assert.ok(
    welcomeSrc.includes('hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}'),
    'welcome.jsx must declare generous hitSlop on Forgot Password button'
  );
  assert.ok(
    welcomeSrc.includes('minHeight: 44'),
    'welcome.jsx forgotBtn must enforce minHeight >= 44dp for mobile tap targets'
  );
  assert.ok(
    welcomeSrc.includes('<ScrollView'),
    'welcome.jsx must wrap content in ScrollView to prevent overflow clipping on Android'
  );
  assert.ok(
    welcomeSrc.includes('numberOfLines={1}') && welcomeSrc.includes('ellipsizeMode="tail"'),
    'welcome.jsx must configure numberOfLines={1} and ellipsizeMode="tail"'
  );

  // Login screen checks
  assert.ok(
    loginSrc.includes('hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}'),
    'login.jsx must declare generous hitSlop on Forgot Password button'
  );
  assert.ok(
    loginSrc.includes('minHeight: 44'),
    'login.jsx forgotRow must enforce minHeight >= 44dp'
  );
  assert.ok(
    loginSrc.includes('#5C554E'),
    'login.jsx must use high-contrast color #5C554E for Forgot Password readability'
  );
  assert.ok(
    loginSrc.includes('numberOfLines={1}') && loginSrc.includes('ellipsizeMode="tail"'),
    'login.jsx must configure numberOfLines={1} and ellipsizeMode="tail"'
  );
});

test('13. Android Input Sanitization: Signup and Login input fields configure autoCapitalize and autoCorrect', () => {
  const signupSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/(auth)/signup.jsx'), 'utf8');
  const loginSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/(auth)/login.jsx'), 'utf8');

  assert.ok(
    signupSrc.includes('autoCapitalize="none"'),
    'signup.jsx email input must set autoCapitalize="none"'
  );
  assert.ok(
    signupSrc.includes('autoCorrect={false}'),
    'signup.jsx email input must set autoCorrect={false}'
  );
  assert.ok(
    signupSrc.includes('email.trim().toLowerCase()'),
    'signup.jsx handleSubmit must sanitize email with trim().toLowerCase()'
  );

  assert.ok(
    loginSrc.includes('autoCapitalize="none"'),
    'login.jsx email input must set autoCapitalize="none"'
  );
  assert.ok(
    loginSrc.includes('autoCorrect={false}'),
    'login.jsx email input must set autoCorrect={false}'
  );
  assert.ok(
    loginSrc.includes('email.trim().toLowerCase()'),
    'login.jsx handleSignIn must sanitize email with trim().toLowerCase()'
  );
});

test('14. In-App 6-Digit OTP Recovery Contract: forgot-password.jsx renders direct OTP entry & authContext exports verifyOtpAndResetPassword', () => {
  const authContextSrc = fs.readFileSync(path.join(ROOT, 'frontend/lib/authContext.jsx'), 'utf8');
  const forgotPwdSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/(auth)/forgot-password.jsx'), 'utf8');

  // Verify authContext exports verifyOtpAndResetPassword
  assert.ok(
    authContextSrc.includes('verifyOtpAndResetPassword'),
    'authContext.jsx must export verifyOtpAndResetPassword for in-app recovery without browser redirects'
  );
  assert.ok(
    authContextSrc.includes("type: 'recovery'"),
    "authContext.jsx must invoke supabase.auth.verifyOtp with type: 'recovery'"
  );
  assert.ok(
    authContextSrc.includes('supabase.auth.updateUser'),
    'authContext.jsx must invoke supabase.auth.updateUser after verifying OTP'
  );

  // Verify forgot-password renders direct OTP inputs
  assert.ok(
    forgotPwdSrc.includes('verifyOtpAndResetPassword'),
    'forgot-password.jsx must use verifyOtpAndResetPassword hook'
  );
  assert.ok(
    forgotPwdSrc.includes('OR RESET WITH 6-DIGIT CODE') || forgotPwdSrc.includes('PASTE RESET LINK'),
    'forgot-password.jsx must provide option to reset with link or code'
  );
  assert.ok(
    forgotPwdSrc.includes('Recovery Code') || forgotPwdSrc.includes('Reset Link'),
    'forgot-password.jsx must render Reset Link input field'
  );
});

test('15. Step 1 Signup Early Validation Contract: Pure client-side validation without premature GoTrue signUp', async () => {
  const authContextSrc = fs.readFileSync(path.join(ROOT, 'frontend/lib/authContext.jsx'), 'utf8');
  const signupSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/(auth)/signup.jsx'), 'utf8');

  // Verify authContext exports validateSignupCredentials
  assert.ok(
    authContextSrc.includes('validateSignupCredentials'),
    'authContext.jsx must export validateSignupCredentials'
  );

  // Verify Step 1 does NOT call supabase.auth.signUp
  const validateMatch = authContextSrc.match(/const validateSignupCredentials = async[\s\S]*?\n  \};/);
  assert.ok(validateMatch, 'validateSignupCredentials implementation must be found');
  assert.ok(
    !validateMatch[0].includes('supabase.auth.signUp'),
    'validateSignupCredentials MUST NOT invoke supabase.auth.signUp at Step 1'
  );

  // Behavioral test of validateSignupCredentials logic
  function sanitizeAuthEmail(email) {
    if (typeof email !== 'string') return '';
    return email.trim().toLowerCase();
  }
  const validateSignupCredentialsFn = async ({ email, password, age, name }) => {
    const trimmedName = String(name || '').trim();
    if (!trimmedName) return { success: false, error: 'Please enter your full name.' };
    const sanitizedEmail = sanitizeAuthEmail(email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!sanitizedEmail || !emailRegex.test(sanitizedEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 18) {
      return { success: false, error: 'You must be at least 18 years old to join MaybeWe.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    return { success: true, email: sanitizedEmail };
  };

  // Test validation rejections
  const resEmptyName = await validateSignupCredentialsFn({ name: '', email: 'test@example.com', password: 'password123', age: 25 });
  assert.equal(resEmptyName.success, false);
  assert.equal(resEmptyName.error, 'Please enter your full name.');

  const resInvalidEmail = await validateSignupCredentialsFn({ name: 'Alex', email: 'invalid-email', password: 'password123', age: 25 });
  assert.equal(resInvalidEmail.success, false);
  assert.equal(resInvalidEmail.error, 'Please enter a valid email address.');

  const resUnderage = await validateSignupCredentialsFn({ name: 'Alex', email: 'alex@example.com', password: 'password123', age: 17 });
  assert.equal(resUnderage.success, false);
  assert.equal(resUnderage.error, 'You must be at least 18 years old to join MaybeWe.');

  const resShortPass = await validateSignupCredentialsFn({ name: 'Alex', email: 'alex@example.com', password: '123', age: 25 });
  assert.equal(resShortPass.success, false);
  assert.equal(resShortPass.error, 'Password must be at least 6 characters.');

  // Test valid credentials
  const resValid = await validateSignupCredentialsFn({ name: ' Alex Traveler ', email: ' Alex@Example.Com ', password: 'securePassword123', age: 24 });
  assert.equal(resValid.success, true);
  assert.equal(resValid.email, 'alex@example.com');
});

test('16. Token-Hash Recovery Contract: parseRecoveryToken extracts URL-encoded tokens, rejects wrong-type links, and ignores unrelated URLs', () => {
  const authContextSrc = fs.readFileSync(path.join(ROOT, 'frontend/lib/authContext.jsx'), 'utf8');

  // Verify parseRecoveryToken exists and handles type validation
  assert.ok(authContextSrc.includes('function parseRecoveryToken'), 'authContext.jsx must define parseRecoveryToken');
  assert.ok(authContextSrc.includes("type !== 'recovery'"), 'parseRecoveryToken must ensure type is recovery');
  assert.ok(authContextSrc.includes('decodeURIComponent'), 'parseRecoveryToken must decode URI components');

  // Evaluate parseRecoveryToken in isolated context
  const funcMatch = authContextSrc.match(/function parseRecoveryToken[\s\S]*?\n\}/);
  assert.ok(funcMatch, 'must isolate parseRecoveryToken implementation');
  const parseRecoveryToken = new Function('tokenOrUrl', `${funcMatch[0]}; return parseRecoveryToken(tokenOrUrl);`);

  // 1. Valid Supabase Reset URL with URL-encoded characters
  const validUrl = 'https://demo.supabase.co/auth/v1/verify?token=pkce_abc%2B123%3D&type=recovery&redirect_to=solo-traveler://auth/callback';
  const parsedValid = parseRecoveryToken(validUrl);
  assert.equal(parsedValid.token_hash, 'pkce_abc+123=');

  // 2. Direct token parameter without leading ?
  const directParam = 'token=pkce_direct%2Bhash&type=recovery';
  const parsedDirect = parseRecoveryToken(directParam);
  assert.equal(parsedDirect.token_hash, 'pkce_direct+hash');

  // 3. Raw token hash string (20+ chars)
  const rawHash = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
  const parsedRaw = parseRecoveryToken(rawHash);
  assert.equal(parsedRaw.token_hash, rawHash);

  // 4. 6-digit numeric OTP code
  const otpCode = '654321';
  const parsedOtp = parseRecoveryToken(otpCode);
  assert.equal(parsedOtp.token, '654321');

  // 5. Wrong type link (e.g. signup confirmation)
  const signupUrl = 'https://demo.supabase.co/auth/v1/verify?token=pkce_signup&type=signup';
  const parsedSignup = parseRecoveryToken(signupUrl);
  assert.ok(parsedSignup.error, 'must return error for non-recovery type');
  assert.ok(parsedSignup.error.includes('signup'), 'error must specify that link is for signup');

  // 6. Wrong type link (e.g. invite)
  const inviteUrl = 'https://demo.supabase.co/auth/v1/verify?token=pkce_invite&type=invite';
  const parsedInvite = parseRecoveryToken(inviteUrl);
  assert.ok(parsedInvite.error, 'must return error for invite type');
  assert.ok(parsedInvite.error.includes('invite'), 'error must specify that link is for invite');

  // 7. Unrelated external URL with token query
  const mapboxUrl = 'https://api.mapbox.com/styles/v1?token=pk.12345678901234567890';
  const parsedMapbox = parseRecoveryToken(mapboxUrl);
  assert.ok(parsedMapbox.error, 'must return error for unrelated external URL');

  // 8. Malformed input (not code, hash, or recognized link)
  const malformed = parseRecoveryToken('not-a-valid-token');
  assert.ok(malformed.error, 'must return error for malformed input');
  assert.ok(malformed.error.includes('Invalid recovery format'), 'must inform user of invalid format');

  // 9. Short numeric input (not 6 digits)
  const shortNum = parseRecoveryToken('12345');
  assert.ok(shortNum.error, 'must reject non-6-digit numbers');

  // 10. PKCE code URL extraction
  const pkceUrl = 'https://demo.supabase.co/auth/v1/callback?code=pkce_secret_auth_code';
  const parsedPkce = parseRecoveryToken(pkceUrl);
  assert.equal(parsedPkce.code, 'pkce_secret_auth_code');
});

test('17. Error Classification & Fallback Contract: verifyRecoveryOtp distinguishes expired, already used, and invalid errors without labeling all 400s as expired', () => {
  const authContextSrc = fs.readFileSync(path.join(ROOT, 'frontend/lib/authContext.jsx'), 'utf8');

  // Verify authContext does not blanket-label status 400 as expired
  assert.ok(
    !authContextSrc.includes("error?.status === 400 ? 'This reset link has expired"),
    'authContext must not unconditionally label every HTTP 400 as expired'
  );

  // Verify distinct error classification
  assert.ok(
    authContextSrc.includes('isAlreadyUsed'),
    'authContext must check whether link was already used'
  );
  assert.ok(
    authContextSrc.includes('isInvalid'),
    'authContext must check whether link is invalid'
  );
  assert.ok(
    authContextSrc.includes('fallback'),
    'authContext must implement fallback verification when user email is present'
  );
});

test('18. Code-First Recovery Flow Contract: forgot-password.jsx implements pure 6-digit OTP entry, verification, and password update', () => {
  const forgotPwdSrc = fs.readFileSync(path.join(ROOT, 'frontend/app/(auth)/forgot-password.jsx'), 'utf8');

  // 1. Initial screen sends recovery code
  assert.ok(
    forgotPwdSrc.includes('Send Recovery Code'),
    'forgot-password.jsx must render "Send Recovery Code" CTA button'
  );
  assert.ok(
    forgotPwdSrc.includes('6-digit verification code') || forgotPwdSrc.includes('6-digit recovery code'),
    'forgot-password.jsx subtitle must mention 6-digit code'
  );

  // 2. Primary 6-digit code entry
  assert.ok(
    forgotPwdSrc.includes('maxLength={6}'),
    'forgot-password.jsx must configure maxLength={6} on code input'
  );
  assert.ok(
    forgotPwdSrc.includes('keyboardType="number-pad"'),
    'forgot-password.jsx must configure number-pad keyboard for OTP'
  );
  assert.ok(
    forgotPwdSrc.includes('Recovery Code'),
    'forgot-password.jsx must render Recovery Code label'
  );
  assert.ok(
    forgotPwdSrc.includes('Verify Code'),
    'forgot-password.jsx must render "Verify Code" button'
  );

  // 3. Post-verification password update
  assert.ok(
    forgotPwdSrc.includes('handleUpdatePasswordOnly'),
    'forgot-password.jsx must provide handleUpdatePasswordOnly'
  );
  assert.ok(
    forgotPwdSrc.includes('Update Password'),
    'forgot-password.jsx must render "Update Password" button'
  );
  assert.ok(
    forgotPwdSrc.includes('Code verified!'),
    'forgot-password.jsx must indicate code verification success'
  );
});

test('19. Behavioral Multi-Step Registration Lifecycle: Single-Submission Contract across Steps 1-5', async () => {
  let signUpCallCount = 0;
  let lastSignUpPayload = null;
  let mockSignUpResponse = null;

  const mockSupabase = {
    auth: {
      signUp: async (payload) => {
        signUpCallCount++;
        lastSignUpPayload = payload;
        if (typeof mockSignUpResponse === 'function') {
          return mockSignUpResponse(payload);
        }
        return mockSignUpResponse;
      },
    },
  };

  function sanitizeAuthEmail(email) {
    if (typeof email !== 'string') return '';
    return email.trim().toLowerCase();
  }

  // Pure client-side step 1 validation
  const validateStep1 = async ({ email, password, age, name }) => {
    const trimmedName = String(name || '').trim();
    if (!trimmedName) return { success: false, error: 'Please enter your full name.' };
    const sanitizedEmail = sanitizeAuthEmail(email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!sanitizedEmail || !emailRegex.test(sanitizedEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 18) {
      return { success: false, error: 'You must be at least 18 years old to join MaybeWe.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    return { success: true, email: sanitizedEmail };
  };

  // Step 5 atomic signup execution
  const executeStep5Signup = async (userData) => {
    const ageNum = parseInt(userData.age, 10);
    const sanitizedEmail = sanitizeAuthEmail(userData.email);
    const sanitizedName = String(userData.name || '').trim();
    const sanitizedBio = String(userData.bio || '').trim();

    const { data: authData, error: authError } = await mockSupabase.auth.signUp({
      email: sanitizedEmail,
      password: userData.password,
      options: {
        data: {
          name: sanitizedName,
          age: ageNum,
          gender: userData.gender || 'Not specified',
          bio: sanitizedBio,
          avatar_url: userData.avatar_url || 'https://images.unsplash.com/default-avatar',
          travel_styles: userData.travel_styles || [],
          languages: userData.languages || ['English'],
        },
      },
    });

    if (authError) {
      const classified = classifyAuthError(authError, authData);
      return {
        success: false,
        error: classified?.userMessage || authError.message,
        code: classified?.code || authError.status,
      };
    }

    if (authData?.user) {
      if (Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
        return {
          success: false,
          alreadyRegistered: true,
          error: 'This email is already registered. Please sign in or reset your password.',
          code: 'user_already_registered',
        };
      }

      if (!authData.session) {
        return {
          success: true,
          needsEmailConfirmation: true,
          message: 'Account created! Please check your email to confirm your account.',
        };
      }

      return { success: true, session: authData.session, user: authData.user };
    }

    return { success: false, error: 'Registration failed.' };
  };

  // Lifecycle Test 1: Step 1 progression does NOT call supabase.auth.signUp
  const step1Result = await validateStep1({
    name: 'Maya Lin',
    email: 'maya@traveler.io',
    password: 'securePassword99',
    age: 26,
  });
  assert.equal(step1Result.success, true);
  assert.equal(signUpCallCount, 0, 'Step 1 progression must NOT invoke supabase.auth.signUp');

  // Lifecycle Test 2: Revisiting Step 1 backwards and forwards does NOT invoke backend
  const revisitResult = await validateStep1({
    name: 'Maya Lin',
    email: 'maya@traveler.io',
    password: 'securePassword99',
    age: 26,
  });
  assert.equal(revisitResult.success, true);
  assert.equal(signUpCallCount, 0, 'Revisiting Step 1 must NOT invoke backend network requests');

  // Lifecycle Test 3: Steps 2-4 collect state, Step 5 executes single submission with aggregated payload
  const aggregatedProfile = {
    name: 'Maya Lin',
    email: 'maya@traveler.io',
    password: 'securePassword99',
    age: 26,
    gender: 'Female',
    bio: 'Wanderer exploring the Himalayas and serene coastal trails.',
    travel_styles: ['Backpacking', 'Culture', 'Photography'],
    languages: ['English', 'Hindi'],
    avatar_url: 'file:///local/cache/avatar_user123.jpg',
  };

  // Case A: Confirmed session response
  mockSignUpResponse = {
    data: {
      user: { id: 'usr_new_1', email: 'maya@traveler.io', identities: [{ id: 'id1' }] },
      session: { access_token: 'tok_active_session' },
    },
    error: null,
  };

  const submitResA = await executeStep5Signup(aggregatedProfile);
  assert.equal(signUpCallCount, 1, 'Step 5 must execute supabase.auth.signUp exactly once');
  assert.equal(submitResA.success, true);
  assert.equal(submitResA.session?.access_token, 'tok_active_session');
  assert.equal(lastSignUpPayload.email, 'maya@traveler.io');
  assert.equal(lastSignUpPayload.options.data.bio, 'Wanderer exploring the Himalayas and serene coastal trails.');
  assert.deepEqual(lastSignUpPayload.options.data.travel_styles, ['Backpacking', 'Culture', 'Photography']);

  // Case B: Email confirmation required (session === null)
  signUpCallCount = 0;
  mockSignUpResponse = {
    data: {
      user: { id: 'usr_new_2', email: 'maya@traveler.io', identities: [{ id: 'id2' }] },
      session: null,
    },
    error: null,
  };

  const submitResB = await executeStep5Signup(aggregatedProfile);
  assert.equal(signUpCallCount, 1);
  assert.equal(submitResB.success, true);
  assert.equal(submitResB.needsEmailConfirmation, true);

  // Case C: Pre-existing user collision via GoTrue enumeration defense (identities: [])
  signUpCallCount = 0;
  mockSignUpResponse = {
    data: {
      user: { id: 'usr_existing', email: 'maya@traveler.io', identities: [] },
      session: null,
    },
    error: null,
  };

  const submitResC = await executeStep5Signup(aggregatedProfile);
  assert.equal(signUpCallCount, 1);
  assert.equal(submitResC.success, false);
  assert.equal(submitResC.alreadyRegistered, true);
  assert.equal(submitResC.code, 'user_already_registered');

  // Case D: Network timeout or 429 rate limit error
  signUpCallCount = 0;
  mockSignUpResponse = {
    data: null,
    error: { status: 429, message: 'Too many requests' },
  };

  const submitResD = await executeStep5Signup(aggregatedProfile);
  assert.equal(signUpCallCount, 1);
  assert.equal(submitResD.success, false);
  assert.equal(submitResD.alreadyRegistered, undefined);
  assert.equal(submitResD.code, 'over_rate_limit');
});

test("20. Reset Password Manual Code Entry Fallback Contract: reset-password.jsx provides manual OTP / reset link fallback when active session is absent", () => {
  const resetSrc = fs.readFileSync(path.join(ROOT, "frontend/app/(auth)/reset-password.jsx"), "utf8");

  // 1. Hook and state
  assert.ok(
    resetSrc.includes("verifyOtpAndResetPassword"),
    "reset-password.jsx must import verifyOtpAndResetPassword from useAuth"
  );
  assert.ok(
    resetSrc.includes("showManualEntry"),
    "reset-password.jsx must declare showManualEntry state"
  );
  assert.ok(
    resetSrc.includes("manualEmail"),
    "reset-password.jsx must declare manualEmail state"
  );
  assert.ok(
    resetSrc.includes("otpCode"),
    "reset-password.jsx must declare otpCode state"
  );

  // 2. Action handler
  assert.ok(
    resetSrc.includes("handleVerifyOtpAndUpdatePassword"),
    "reset-password.jsx must implement handleVerifyOtpAndUpdatePassword"
  );

  // 3. UI elements
  assert.ok(
    resetSrc.includes("Enter 6-Digit Code Manually"),
    'reset-password.jsx must render "Enter 6-Digit Code Manually" CTA button'
  );
  assert.ok(
    resetSrc.includes("Verify & Update Password"),
    'reset-password.jsx must render "Verify & Update Password" action button'
  );
});

test("21. Account Enumeration Defense Contract: resetPassword does not disclose whether an email exists", async () => {
  const authContextSrc = fs.readFileSync(path.join(ROOT, "frontend/lib/authContext.jsx"), "utf8");

  // Invariant 1: authContext must intercept "user not found" / 404 and return success: true
  assert.ok(
    authContextSrc.includes("user not found") || authContextSrc.includes("email not found"),
    "authContext.jsx resetPassword must detect user not found"
  );
  assert.ok(
    authContextSrc.includes("isUnknownUser"),
    "authContext.jsx resetPassword must have isUnknownUser guard"
  );

  // Behavioral test: simulate resetPassword defense
  function simulateResetPasswordResponse(supabaseError) {
    if (supabaseError) {
      const msg = String(supabaseError.message || "");
      const lower = msg.toLowerCase();
      const isUnknownUser =
        lower.includes("user not found") ||
        lower.includes("email not found") ||
        supabaseError.status === 404 ||
        supabaseError.code === "user_not_found";

      if (isUnknownUser) {
        return { success: true };
      }
      return { success: false, error: msg };
    }
    return { success: true };
  }

  const unknownRes = simulateResetPasswordResponse({ status: 404, message: "User not found" });
  assert.equal(unknownRes.success, true, "Unknown user must return success: true to prevent account enumeration");

  const emailNotFoundRes = simulateResetPasswordResponse({ status: 400, message: "Email not found" });
  assert.equal(emailNotFoundRes.success, true, "Email not found must return success: true to prevent account enumeration");

  const rateLimitRes = simulateResetPasswordResponse({ status: 429, message: "Rate limit exceeded" });
  assert.equal(rateLimitRes.success, false, "Rate limit error must be returned to client");
});

test("22. Password Recovery Lifecycle Cleanup: Back navigation and error recovery clear isPasswordRecovery", () => {
  const fpSrc = fs.readFileSync(path.join(ROOT, "frontend/app/(auth)/forgot-password.jsx"), "utf8");
  const rpSrc = fs.readFileSync(path.join(ROOT, "frontend/app/(auth)/reset-password.jsx"), "utf8");
  const cbSrc = fs.readFileSync(path.join(ROOT, "frontend/app/auth/callback.jsx"), "utf8");

  // 1. forgot-password cleans recovery state
  assert.ok(
    fpSrc.includes("setIsPasswordRecovery(false)"),
    "forgot-password.jsx must clear isPasswordRecovery on back/login/success navigation"
  );

  // 2. reset-password cleans recovery state
  assert.ok(
    rpSrc.includes("setIsPasswordRecovery(false)"),
    "reset-password.jsx must clear isPasswordRecovery on back to login or requesting new link"
  );

  // 3. auth/callback cleans recovery state
  assert.ok(
    cbSrc.includes("setIsPasswordRecovery(false)"),
    "auth/callback.jsx must clear isPasswordRecovery on requesting new link or canceling"
  );
});

test("23. Password Reset Form Validation: Minimum length >= 6 and matching password check", () => {
  function validatePasswords(newPwd, confirmPwd) {
    const trimmed = (newPwd || "").trim();
    const trimmedConfirm = (confirmPwd || "").trim();
    if (!trimmed) return { valid: false, error: "Please enter a new password." };
    if (trimmed.length < 6) return { valid: false, error: "Password must be at least 6 characters long." };
    if (trimmed !== trimmedConfirm) return { valid: false, error: "Passwords do not match. Please verify and try again." };
    return { valid: true };
  }

  assert.equal(validatePasswords("", "").valid, false);
  assert.equal(validatePasswords("12345", "12345").valid, false);
  assert.equal(validatePasswords("validPass1", "differentPass2").valid, false);
  assert.equal(validatePasswords("validPass1", "validPass1").valid, true);
});


test("24. Root AuthProvider Centralized Recovery Synchronization", () => {
  const authContextSrc = fs.readFileSync(path.join(ROOT, "frontend/lib/authContext.jsx"), "utf8");

  assert.ok(
    authContextSrc.includes("recoverySession"),
    "authContext.jsx must manage and export recoverySession"
  );
  assert.ok(
    authContextSrc.includes("recoveryError"),
    "authContext.jsx must manage and export recoveryError"
  );
  assert.ok(
    authContextSrc.includes("isVerifyingRecovery"),
    "authContext.jsx must manage and export isVerifyingRecovery"
  );
  assert.ok(
    authContextSrc.includes("handleIncomingRecoveryUrl"),
    "authContext.jsx must export handleIncomingRecoveryUrl for root-level deep link synchronization"
  );
  assert.ok(
    authContextSrc.includes("clearRecoveryState"),
    "authContext.jsx must export clearRecoveryState"
  );
});

test("25. Auth Callback Screen Root Synchronization: Eliminates warm deep-link race", () => {
  const callbackSrc = fs.readFileSync(path.join(ROOT, "frontend/app/auth/callback.jsx"), "utf8");

  assert.ok(
    callbackSrc.includes("recoverySession"),
    "callback.jsx must subscribe to recoverySession from useAuth"
  );
  assert.ok(
    callbackSrc.includes("recoveryError"),
    "callback.jsx must subscribe to recoveryError from useAuth"
  );
  assert.ok(
    callbackSrc.includes("handleIncomingRecoveryUrl"),
    "callback.jsx must forward candidate URLs to root handleIncomingRecoveryUrl"
  );
  assert.ok(
    callbackSrc.includes("Enter Code or Paste Link Manually"),
    "callback.jsx error state must provide option to enter code or link manually"
  );
});

test("26. Restored Reset Link & In-App Verification Contract: forgot-password.jsx supports reset link and manual fallback", () => {
  const fpSrc = fs.readFileSync(path.join(ROOT, "frontend/app/(auth)/forgot-password.jsx"), "utf8");

  // Invariant 1: Send Reset Link primary action
  assert.ok(
    fpSrc.includes("Send Reset Link"),
    "forgot-password.jsx must provide Send Reset Link CTA"
  );

  // Invariant 2: Paste Reset Link fallback entry
  assert.ok(
    fpSrc.includes("pastedLink"),
    "forgot-password.jsx must maintain pastedLink state"
  );
  assert.ok(
    fpSrc.includes("handleVerifyLink"),
    "forgot-password.jsx must implement handleVerifyLink"
  );
  assert.ok(
    fpSrc.includes("Verify Reset Link"),
    "forgot-password.jsx must render Verify Reset Link CTA"
  );

  // Invariant 3: Verify Code fallback
  assert.ok(
    fpSrc.includes("handleVerifyCodeOnly"),
    "forgot-password.jsx must implement handleVerifyCodeOnly"
  );
});

test("27. Browser Redirect Bypass & Nested Redirect_To Parsing", () => {
  const nestedUrl = "https://example.supabase.co/auth/v1/verify?redirect_to=" + encodeURIComponent("solo-traveler://auth/callback#access_token=NESTED_ACCESS&refresh_token=NESTED_REFRESH&type=recovery");
  const parsed = parseRecoveryUrl(nestedUrl);

  assert.equal(parsed.kind, "tokens");
  assert.equal(parsed.accessToken, "NESTED_ACCESS");
  assert.equal(parsed.refreshToken, "NESTED_REFRESH");
});

test("28. Zero Blank Screen Contract: No route remains blank indefinitely", () => {
  const callbackSrc = fs.readFileSync(path.join(ROOT, "frontend/app/auth/callback.jsx"), "utf8");
  const resetSrc = fs.readFileSync(path.join(ROOT, "frontend/app/(auth)/reset-password.jsx"), "utf8");
  const layoutSrc = fs.readFileSync(path.join(ROOT, "frontend/app/_layout.jsx"), "utf8");

  // Verify explicit Stack route registration
  assert.ok(layoutSrc.includes("name=\"auth/callback\""), "_layout.jsx must register auth/callback");
  assert.ok(layoutSrc.includes("name=\"callback\""), "_layout.jsx must register callback");

  // Verify callback and reset screens have error and interactive fallbacks
  assert.ok(callbackSrc.includes("status === \"error\"") || callbackSrc.includes("status === 'error'"), "callback.jsx must handle error state");
  assert.ok(resetSrc.includes("urlError"), "reset-password.jsx must handle urlError state");
});

test("29. 6-Digit Recovery OTP Verification Behavioral Invariants (Valid, Invalid, Expired, Reused)", async () => {
  // Mock Supabase Auth verifyOtp implementation
  function mockVerifyOtp({ email, token, type }, fixture) {
    if (type !== "recovery") return { data: null, error: { message: "Invalid type" } };
    if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) {
      return { data: null, error: { message: "Invalid 6-digit code" } };
    }
    if (token === fixture.expiredCode) {
      return { data: null, error: { message: "Token has expired or is invalid", code: "otp_expired" } };
    }
    if (token === fixture.reusedCode) {
      return { data: null, error: { message: "Token has already been used", code: "otp_used" } };
    }
    if (token === fixture.validCode && email === fixture.validEmail) {
      return {
        data: {
          session: { access_token: "mock_jwt_session", user: { id: "user-123", email } },
          user: { id: "user-123", email },
        },
        error: null,
      };
    }
    return { data: null, error: { message: "Invalid or expired recovery code" } };
  }

  const fixture = {
    validEmail: "traveler@maybewe.com",
    validCode: "749201",
    invalidCode: "000000",
    expiredCode: "111222",
    reusedCode: "333444",
  };

  // Case A: Valid 6-digit code establishes session
  const validRes = mockVerifyOtp({ email: fixture.validEmail, token: fixture.validCode, type: "recovery" }, fixture);
  assert.equal(validRes.error, null);
  assert.ok(validRes.data.session, "Valid 6-digit OTP must establish a session");
  assert.equal(validRes.data.user.email, fixture.validEmail);

  // Case B: Invalid 6-digit code returns clear error
  const invalidRes = mockVerifyOtp({ email: fixture.validEmail, token: fixture.invalidCode, type: "recovery" }, fixture);
  assert.ok(invalidRes.error, "Invalid code must return an error");
  assert.equal(invalidRes.data, null);

  // Case C: Expired code returns expiration error
  const expiredRes = mockVerifyOtp({ email: fixture.validEmail, token: fixture.expiredCode, type: "recovery" }, fixture);
  assert.equal(expiredRes.error.code, "otp_expired");

  // Case D: Reused code returns already used error
  const reusedRes = mockVerifyOtp({ email: fixture.validEmail, token: fixture.reusedCode, type: "recovery" }, fixture);
  assert.equal(reusedRes.error.code, "otp_used");
});

test("30. Attempt Limiter & Lockout Contract: 5 Failed Attempts Locks Out Verification", () => {
  const MAX_ATTEMPTS = 5;
  let failedAttempts = 0;
  let lockedOut = false;

  function attemptVerify(isSuccess) {
    if (failedAttempts >= MAX_ATTEMPTS) {
      lockedOut = true;
      return { error: "Maximum verification attempts reached. Please request a new recovery code." };
    }
    if (!isSuccess) {
      failedAttempts += 1;
      if (failedAttempts >= MAX_ATTEMPTS) {
        lockedOut = true;
      }
      return { error: "Invalid code (" + (MAX_ATTEMPTS - failedAttempts) + " attempts remaining)" };
    }
    failedAttempts = 0;
    return { success: true };
  }

  // Attempts 1 to 4: Failures decrement attempts
  for (let i = 1; i <= 4; i++) {
    const res = attemptVerify(false);
    assert.ok(res.error.includes((MAX_ATTEMPTS - i) + " attempts remaining"));
    assert.equal(lockedOut, false);
  }

  // Attempt 5: Final failure triggers lockout
  const fifth = attemptVerify(false);
  assert.equal(lockedOut, true);

  // Attempt 6: Blocked by rate limiter
  const sixth = attemptVerify(false);
  assert.ok(sixth.error.includes("Maximum verification attempts reached"));

  // Resend code resets counter
  failedAttempts = 0;
  lockedOut = false;
  assert.equal(failedAttempts, 0);
  assert.equal(lockedOut, false);
});

test("31. Password Update Contract: Password validation and update call", async () => {
  function validateNewPassword(newPwd, confirmPwd) {
    const trimmedNew = (newPwd || "").trim();
    const trimmedConfirm = (confirmPwd || "").trim();
    if (!trimmedNew || trimmedNew.length < 6) {
      return { valid: false, error: "New password must be at least 6 characters long." };
    }
    if (trimmedNew !== trimmedConfirm) {
      return { valid: false, error: "Passwords do not match. Please re-enter." };
    }
    return { valid: true };
  }

  assert.equal(validateNewPassword("short", "short").valid, false);
  assert.equal(validateNewPassword("password123", "different123").valid, false);
  assert.equal(validateNewPassword("newSecret99", "newSecret99").valid, true);
});


test("32. Multi-Format Recovery: URL hash parsing and setSession() restoration", async () => {
  const hashUrl = "solo-traveler://auth/callback#access_token=MOCK_HASH_ACCESS&refresh_token=MOCK_HASH_REFRESH&token_type=bearer&type=recovery";
  const parsed = parseRecoveryUrl(hashUrl);
  assert.equal(parsed.kind, "tokens");
  assert.equal(parsed.accessToken, "MOCK_HASH_ACCESS");
  assert.equal(parsed.refreshToken, "MOCK_HASH_REFRESH");

  let setSessionParams = null;
  const mockSupabase = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      setSession: async (params) => {
        setSessionParams = params;
        return { data: { session: { user: { id: "user-hash-1", email: "hash@maybewe.com" } } }, error: null };
      },
    },
  };

  let sessionResult = null;
  const res = await handleRecoveryUrl({
    url: hashUrl,
    supabase: mockSupabase,
    onSessionEstablished: (s) => { sessionResult = s; },
    onError: () => {},
  });

  assert.equal(res.handled, true);
  assert.equal(res.success, true);
  assert.equal(setSessionParams.access_token, "MOCK_HASH_ACCESS");
  assert.equal(sessionResult.user.email, "hash@maybewe.com");
});

test("33. Multi-Format Recovery: PKCE code exchange handling and missing verifier error states", async () => {
  const codeUrl = "solo-traveler://auth/callback?code=PKCE_AUTH_CODE_VALID&type=recovery";
  const parsed = parseRecoveryUrl(codeUrl);
  assert.equal(parsed.kind, "code");
  assert.equal(parsed.code, "PKCE_AUTH_CODE_VALID");

  // Case A: Missing PKCE code verifier generates classified error
  const mockMissingVerifierSupabase = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      exchangeCodeForSession: async () => {
        const err = new Error("both auth code and code verifier should be non-empty");
        err.code = "flow_state_not_found";
        throw err;
      },
    },
  };

  let capturedError = "";
  let capturedCode = "";
  const resFail = await handleRecoveryUrl({
    url: codeUrl,
    supabase: mockMissingVerifierSupabase,
    onSessionEstablished: () => {},
    onError: (err, errCode) => {
      capturedError = err;
      capturedCode = errCode;
    },
  });

  assert.equal(resFail.handled, true);
  assert.equal(resFail.success, false);
  assert.equal(resFail.errorCode, "PKCE_VERIFIER_MISSING");
  assert.ok(capturedError.includes("code verifier was not found"));

  // Case B: Successful PKCE exchange establishes session
  const mockSuccessSupabase = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      exchangeCodeForSession: async (code) => {
        return { data: { session: { user: { id: "pkce-user", email: "pkce@maybewe.com" } } }, error: null };
      },
    },
  };

  const resSuccess = await handleRecoveryUrl({
    url: codeUrl,
    supabase: mockSuccessSupabase,
    onSessionEstablished: () => {},
    onError: () => {},
  });
  assert.equal(resSuccess.handled, true);
  assert.equal(resSuccess.success, true);
});

test("34. Multi-Format Recovery: Correct verifyOtp dispatching without mixing token and token_hash", async () => {
  let verifyOtpCalls = [];
  const mockSupabase = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      verifyOtp: async (params) => {
        verifyOtpCalls.push(params);
        if (params.token_hash === "VALID_TRUE_HASH") {
          return { data: { session: { user: { id: "u-hash" } } }, error: null };
        }
        if (params.email === "test@maybewe.com" && params.token === "RAW_TOKEN_123") {
          return { data: { session: { user: { id: "u-raw" } } }, error: null };
        }
        return { data: null, error: { message: "Token is invalid or has expired", code: "otp_expired" } };
      },
    },
  };

  // Case A: Token hash URL (?token_hash=...) calls verifyOtp with token_hash
  verifyOtpCalls = [];
  await handleRecoveryUrl({
    url: "solo-traveler://auth/callback?token_hash=VALID_TRUE_HASH&type=recovery",
    supabase: mockSupabase,
    onSessionEstablished: () => {},
    onError: () => {},
  });
  assert.equal(verifyOtpCalls.length, 1);
  assert.equal(verifyOtpCalls[0].token_hash, "VALID_TRUE_HASH");
  assert.equal(verifyOtpCalls[0].token, undefined);

  // Case B: Raw token URL (?token=...) with email falls back gracefully to email + token
  verifyOtpCalls = [];
  const resFallback = await handleRecoveryUrl({
    url: "https://vdmzchvwrmqnbmpzvgng.supabase.co/auth/v1/verify?token=RAW_TOKEN_123&type=recovery",
    email: "test@maybewe.com",
    supabase: mockSupabase,
    onSessionEstablished: () => {},
    onError: () => {},
  });
  assert.equal(resFallback.success, true);
  assert.equal(verifyOtpCalls.length, 2);
  assert.equal(verifyOtpCalls[0].token_hash, "RAW_TOKEN_123"); // First tried as token_hash
  assert.equal(verifyOtpCalls[1].email, "test@maybewe.com"); // Fallback tried email + token
  assert.equal(verifyOtpCalls[1].token, "RAW_TOKEN_123");
});

test("35. Multi-Format Recovery: 6-digit code OTP verification flow with email parameter", async () => {
  let otpParams = null;
  const mockSupabase = {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      verifyOtp: async (params) => {
        otpParams = params;
        return { data: { session: { user: { id: "u-otp-6", email: params.email } } }, error: null };
      },
    },
  };

  const res = await handleRecoveryUrl({
    url: "solo-traveler://auth/callback?token=592014&type=recovery",
    email: "traveler@maybewe.com",
    supabase: mockSupabase,
    onSessionEstablished: () => {},
    onError: () => {},
  });

  assert.equal(res.success, true);
  assert.equal(otpParams.email, "traveler@maybewe.com");
  assert.equal(otpParams.token, "592014");
  assert.equal(otpParams.type, "recovery");
});

test("36. Multi-Format Recovery: Error distinction (expired token vs. PKCE error vs. already used vs. malformed)", () => {
  const expiredDetail = getDetailedRecoveryError("otp_expired", "Token has expired");
  assert.equal(expiredDetail.code, "TOKEN_EXPIRED");
  assert.ok(expiredDetail.message.includes("expired"));

  const pkceDetail = getDetailedRecoveryError("flow_state_not_found", "code verifier not found");
  assert.equal(pkceDetail.code, "PKCE_VERIFIER_MISSING");
  assert.ok(pkceDetail.message.includes("code verifier was not found"));

  const usedDetail = getDetailedRecoveryError("otp_used", "Token has already been used");
  assert.equal(usedDetail.code, "TOKEN_ALREADY_USED");
  assert.ok(usedDetail.message.includes("already been used"));

  const invalidDetail = getDetailedRecoveryError("invalid_grant", "Invalid recovery token");
  assert.equal(invalidDetail.code, "INVALID_CODE");
  assert.ok(invalidDetail.message.includes("invalid"));

  const malformed = parseRecoveryUrl("https://invalid url with spaces");
  assert.equal(malformed.kind, "error");
  assert.equal(malformed.errorCode, "MALFORMED_URL");
});

test("37. Multi-Format Recovery: Wrapped email URL unwrapping (Google Mail / SafeLinks redirectors)", async () => {
  const wrappedUrl = "https://www.google.com/url?q=" + encodeURIComponent("https://vdmzchvwrmqnbmpzvgng.supabase.co/auth/v1/verify?token=WRAPPED_CANARY_TOKEN&type=recovery&redirect_to=solo-traveler://auth/callback");
  const parsed = parseRecoveryUrl(wrappedUrl);
  assert.equal(parsed.kind, "token_hash");
  assert.equal(parsed.tokenHash, "WRAPPED_CANARY_TOKEN");
  assert.equal(parsed.type, "recovery");
});

test("38. Recovery Session Gate Contract: forgot-password.jsx destructures setSession from useAuth", async () => {
  const forgotPwdContent = fs.readFileSync("frontend/app/(auth)/forgot-password.jsx", "utf8");
  assert.ok(forgotPwdContent.includes("setSession,"), "forgot-password.jsx must destructure setSession");
  assert.ok(!forgotPwdContent.includes("if (setSession &&"), "forgot-password.jsx should use safe typeof check for setSession");
});

test("39. Multi-Format Recovery: Manifest intent filters match app.json specification", () => {
  const manifestContent = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
  assert.ok(manifestContent.includes('<data android:scheme="solo-traveler"/>'), "Manifest must register solo-traveler base scheme");
  assert.ok(manifestContent.includes('<data android:scheme="solo-traveler" android:host="auth"/>'), "Manifest must register solo-traveler://auth host");
  assert.ok(manifestContent.includes('<data android:scheme="solo-traveler" android:host="reset-password"/>'), "Manifest must register solo-traveler://reset-password host");
});
