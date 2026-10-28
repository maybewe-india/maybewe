import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAuthGuard } from '../frontend/lib/authGuard.js';

describe('Auth Guard & Preview Bypass Security Contract', () => {
  // Test 1
  test('1. Development mode with preview="true" grants immediate access', () => {
    // What code change would make this fail: Removing the isStrictPreview branch or checking isDevelopment === false.
    const result = evaluateAuthGuard({
      hasSession: false,
      isLoading: false,
      isVerified: false,
      hasAgreedToGuidelines: false,
      segments: ['(tabs)', 'discovery'],
      previewRequested: 'true',
      isDevelopment: true,
    });
    assert.equal(result, 'allow', 'Development mode with preview="true" must allow access to internal routes');
  });

  // Test 2
  test('2. Production mode (isDevelopment: false) ignores preview="true" and blocks unauthenticated access', () => {
    // What code change would make this fail: Failing to gate previewRequested on isDevelopment === true.
    const protectedRoutes = [
      ['(tabs)'],
      ['(tabs)', 'discovery'],
      ['(tabs)', 'profile'],
      ['chat', '123'],
      ['settings'],
      ['edit-profile'],
    ];

    for (const route of protectedRoutes) {
      const result = evaluateAuthGuard({
        hasSession: false,
        isLoading: false,
        isVerified: false,
        hasAgreedToGuidelines: false,
        segments: route,
        previewRequested: 'true',
        isDevelopment: false,
      });
      assert.equal(
        result,
        'redirect-to-welcome',
        `Production mode must ignore ?preview=true and redirect unauthenticated access on ${route.join('/')} to welcome`
      );
    }
  });

  // Test 3: Exhaustive parity test
  test('3. Parity Matrix: In production, preview="true" behaves identically to preview="false" across all state permutations', () => {
    // What code change would make this fail: Any leakage of preview parameter evaluation when isDevelopment is false.
    const booleanOptions = [true, false];
    const segmentCases = [
      ['(tabs)'],
      ['(tabs)', 'discovery'],
      ['(tabs)', 'profile'],
      ['(auth)', 'welcome'],
      ['(auth)', 'login'],
      ['(auth)', 'verification'],
      ['(auth)', 'reset-password'],
      ['chat', '456'],
      ['settings'],
      ['privacy'],
      ['showcase'],
      ['maps'],
      ['auth', 'callback'],
      [],
    ];

    let permutationsCount = 0;

    for (const hasSession of booleanOptions) {
      for (const isLoading of booleanOptions) {
        for (const isVerified of booleanOptions) {
          for (const hasAgreedToGuidelines of booleanOptions) {
            for (const isPasswordRecovery of booleanOptions) {
              for (const segments of segmentCases) {
                permutationsCount++;
                const decisionWithPreviewTrue = evaluateAuthGuard({
                  hasSession,
                  isLoading,
                  isVerified,
                  hasAgreedToGuidelines,
                  isPasswordRecovery,
                  segments,
                  previewRequested: 'true',
                  isDevelopment: false,
                });

                const decisionWithPreviewFalse = evaluateAuthGuard({
                  hasSession,
                  isLoading,
                  isVerified,
                  hasAgreedToGuidelines,
                  isPasswordRecovery,
                  segments,
                  previewRequested: 'false',
                  isDevelopment: false,
                });

                assert.equal(
                  decisionWithPreviewTrue,
                  decisionWithPreviewFalse,
                  `Parity failure in production at permutation #${permutationsCount}: ` +
                    JSON.stringify({ hasSession, isLoading, isVerified, hasAgreedToGuidelines, isPasswordRecovery, segments })
                );
              }
            }
          }
        }
      }
    }

    assert.equal(permutationsCount, 448, 'Must verify all 448 permutations in the state matrix');
  });

  // Test 4
  test('4. Non-strict / malformed preview param values never grant access even in development', () => {
    // What code change would make this fail: Using loose type coercion (== 'true') or case insensitivity.
    const malformedValues = [
      ['true', 'false'], // array from repeated query params
      ['true'],
      'TRUE',
      'True',
      '1',
      'yes',
      ' true',
      'true ',
      '',
      null,
      undefined,
      true, // boolean instead of string
      {},
    ];

    for (const val of malformedValues) {
      const result = evaluateAuthGuard({
        hasSession: false,
        isLoading: false,
        isVerified: false,
        hasAgreedToGuidelines: false,
        segments: ['(tabs)', 'discovery'],
        previewRequested: val,
        isDevelopment: true,
      });
      assert.equal(
        result,
        'redirect-to-welcome',
        `Malformed previewRequested value (${JSON.stringify(val)}) must NOT grant preview access`
      );
    }
  });

  // Test 5
  test('5. Loading state unconditionally yields "wait" without leaking content', () => {
    // What code change would make this fail: Checking previewRequested or route permissions before checking isLoading.
    const resultProd = evaluateAuthGuard({
      hasSession: true,
      isLoading: true,
      isVerified: true,
      segments: ['(tabs)'],
      previewRequested: 'true',
      isDevelopment: false,
    });
    assert.equal(resultProd, 'wait');

    const resultDev = evaluateAuthGuard({
      hasSession: false,
      isLoading: true,
      isVerified: false,
      segments: ['(tabs)'],
      previewRequested: 'true',
      isDevelopment: true,
    });
    assert.equal(resultDev, 'wait');
  });

  // Test 6
  test('6. Verified signed-in user is redirected from auth screens to /(tabs)', () => {
    // What code change would make this fail: Regressing verified user auth screen handling.
    const authScreens = ['welcome', 'login', 'signup', 'forgot-password', 'theme-selection', 'guidelines', 'verification'];

    for (const subRoute of authScreens) {
      const decision = evaluateAuthGuard({
        hasSession: true,
        isLoading: false,
        isVerified: true,
        hasAgreedToGuidelines: true,
        segments: ['(auth)', subRoute],
        previewRequested: undefined,
        isDevelopment: false,
      });
      assert.equal(
        decision,
        'redirect-to-tabs',
        `Verified user on (auth)/${subRoute} must be redirected to tabs`
      );
    }
  });

  // Test 7
  test('7. Unverified user onboarding flow enforcement', () => {
    // What code change would make this fail: Permitting unverified users into tabs or skipping guidelines step.
    const needsGuidelines = evaluateAuthGuard({
      hasSession: true,
      isLoading: false,
      isVerified: false,
      hasAgreedToGuidelines: false,
      segments: ['(tabs)', 'discovery'],
      previewRequested: undefined,
      isDevelopment: false,
    });
    assert.equal(needsGuidelines, 'redirect-to-guidelines');

    const needsVerification = evaluateAuthGuard({
      hasSession: true,
      isLoading: false,
      isVerified: false,
      hasAgreedToGuidelines: true,
      segments: ['(tabs)', 'discovery'],
      previewRequested: undefined,
      isDevelopment: false,
    });
    assert.equal(needsVerification, 'redirect-to-verification');
  });

  // Test 8
  test('8. Password recovery state isolation', () => {
    // What code change would make this fail: Redirecting a user in recovery mode to welcome or verification.
    const inRecoveryOnTabs = evaluateAuthGuard({
      hasSession: false,
      isLoading: false,
      isPasswordRecovery: true,
      segments: ['(tabs)'],
      previewRequested: undefined,
      isDevelopment: false,
    });
    assert.equal(inRecoveryOnTabs, 'redirect-to-reset-password');

    const inRecoveryOnReset = evaluateAuthGuard({
      hasSession: false,
      isLoading: false,
      isPasswordRecovery: true,
      segments: ['(auth)', 'reset-password'],
      previewRequested: undefined,
      isDevelopment: false,
    });
    assert.equal(inRecoveryOnReset, 'allow');
  });

  // Test 9
  test('9. Safe handling of null, undefined, and non-array segments', () => {
    // What code change would make this fail: Accessing segments[0] without verifying Array.isArray(segments).
    const badSegments = [null, undefined, '', 123, {}];
    for (const bad of badSegments) {
      const result = evaluateAuthGuard({
        hasSession: false,
        isLoading: false,
        segments: bad,
        previewRequested: undefined,
        isDevelopment: false,
      });
      assert.equal(result, 'redirect-to-welcome', `Must safely default to redirect-to-welcome for segments=${bad}`);
    }
  });

  // Test 10
  test('10. Compatibility with onboardingComplete shorthand parameter', () => {
    // What code change would make this fail: Failing to resolve onboardingComplete into resolvedVerified/resolvedAgreed.
    const verifiedViaShorthand = evaluateAuthGuard({
      hasSession: true,
      isLoading: false,
      onboardingComplete: true,
      segments: ['(auth)', 'login'],
      isDevelopment: false,
    });
    assert.equal(verifiedViaShorthand, 'redirect-to-tabs');

    const unverifiedViaShorthand = evaluateAuthGuard({
      hasSession: true,
      isLoading: false,
      onboardingComplete: false,
      segments: ['(tabs)'],
      isDevelopment: false,
    });
    assert.equal(unverifiedViaShorthand, 'redirect-to-guidelines');
  });
});
