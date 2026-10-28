/**
 * Pure authorization guard evaluation for Expo Router.
 *
 * Enforces authentication and onboarding boundaries across Web, iOS, and Android.
 * Restricts query/deep-link `?preview=true` bypasses strictly to development builds (`__DEV__`).
 * In release bundles (EAS preview APK, EAS production AAB/IPA, web production), `previewRequested`
 * is unconditionally ignored, preventing unauthenticated access to protected routes.
 *
 * @param {Object} params
 * @param {boolean} [params.hasSession] - True if user has an active session/identity
 * @param {boolean} [params.isLoading] - True while session or profile is loading
 * @param {boolean} [params.onboardingComplete] - True if user has completed onboarding/verification
 * @param {boolean} [params.isVerified] - Explicit verified status (verification_status === 'verified')
 * @param {boolean} [params.hasAgreedToGuidelines] - Explicit guidelines agreement status
 * @param {boolean} [params.isPasswordRecovery] - Explicit password recovery state
 * @param {string[]} [params.segments] - Expo Router route segments
 * @param {string|string[]} [params.previewRequested] - Value of searchParams.preview
 * @param {boolean} [params.isDevelopment] - Compile-time development flag (__DEV__)
 * @returns {'wait' | 'allow' | 'redirect-to-welcome' | 'redirect-to-tabs' | 'redirect-to-guidelines' | 'redirect-to-verification' | 'redirect-to-reset-password'}
 */
export function evaluateAuthGuard({
  hasSession = false,
  isLoading = false,
  onboardingComplete,
  isVerified,
  hasAgreedToGuidelines = false,
  isPasswordRecovery = false,
  segments = [],
  previewRequested,
  isDevelopment = false,
} = {}) {
  // 1. Loading state takes precedence: wait until session/profile state is resolved
  if (isLoading) {
    return 'wait';
  }

  // 2. Safe segments parsing
  const safeSegments = Array.isArray(segments) ? segments : [];
  const firstSegment = safeSegments[0] || '';
  const currentSubRoute = safeSegments[1] || '';

  // 3. Public bypass routes (Showcase tester, Maps viewer, Legal screens)
  const inShowcase = firstSegment === 'showcase';
  const inMaps = firstSegment === 'maps';
  const isPublicLegal =
    firstSegment === 'privacy' ||
    firstSegment === 'terms' ||
    firstSegment === 'delete-account';

  // 4. Preview mode: strictly enabled ONLY when compiled in development (__DEV__ === true)
  // Rejects arrays, whitespace, uppercase ("TRUE"), numeric ("1"), or release builds
  const isStrictPreview =
    isDevelopment === true &&
    typeof previewRequested === 'string' &&
    previewRequested === 'true';

  if (inShowcase || inMaps || isStrictPreview || isPublicLegal) {
    return 'allow';
  }

  // 5. Auth callback route: must execute token exchange without redirection
  const isAuthCallback =
    currentSubRoute === 'callback' ||
    firstSegment === 'callback' ||
    safeSegments.includes('callback');
  if (isAuthCallback) {
    return 'allow';
  }

  // 6. Password recovery flow: keep user on reset-password
  const isOnResetPassword =
    currentSubRoute === 'reset-password' ||
    firstSegment === 'reset-password';

  if (isOnResetPassword || isPasswordRecovery) {
    if (!isOnResetPassword) {
      return 'redirect-to-reset-password';
    }
    return 'allow';
  }

  // 7. Determine resolved authentication and onboarding states
  const isAuthenticated = Boolean(hasSession);
  const resolvedVerified =
    typeof isVerified === 'boolean'
      ? isVerified
      : Boolean(onboardingComplete);
  const resolvedAgreed =
    typeof hasAgreedToGuidelines === 'boolean'
      ? hasAgreedToGuidelines
      : Boolean(onboardingComplete);

  const inAuthGroup = firstSegment === '(auth)' || firstSegment === 'auth';

  // 8. Authenticated user path
  if (isAuthenticated) {
    if (!resolvedVerified) {
      // Unverified user must complete guidelines then verification before accessing app
      if (!inAuthGroup) {
        if (!resolvedAgreed) {
          return 'redirect-to-guidelines';
        }
        return 'redirect-to-verification';
      }

      // If user is already on guidelines or verification, allow them to complete the step
      const isPendingOnboardingScreen =
        currentSubRoute === 'guidelines' ||
        currentSubRoute === 'verification';

      if (!isPendingOnboardingScreen) {
        // Authenticated unverified users on entrypoint auth screens (welcome/login/signup)
        // should be guided directly to guidelines or verification
        const isEntryAuthScreen =
          currentSubRoute === 'welcome' ||
          currentSubRoute === 'login' ||
          currentSubRoute === 'signup' ||
          currentSubRoute === 'theme-selection';

        if (isEntryAuthScreen) {
          if (!resolvedAgreed) {
            return 'redirect-to-guidelines';
          }
          return 'redirect-to-verification';
        }
      }

      return 'allow';
    }

    // Verified user: redirect away from auth screens to tabs
    const isAuthScreen =
      currentSubRoute === 'welcome' ||
      currentSubRoute === 'login' ||
      currentSubRoute === 'signup' ||
      currentSubRoute === 'forgot-password' ||
      currentSubRoute === 'theme-selection' ||
      currentSubRoute === 'guidelines' ||
      currentSubRoute === 'verification';

    if (inAuthGroup && isAuthScreen) {
      return 'redirect-to-tabs';
    }
    return 'allow';
  }

  // 9. Unauthenticated user path: only public auth screens permitted
  const isPublicAuthScreen =
    currentSubRoute === 'welcome' ||
    currentSubRoute === 'login' ||
    currentSubRoute === 'signup' ||
    currentSubRoute === 'forgot-password' ||
    currentSubRoute === 'reset-password' ||
    currentSubRoute === 'callback' ||
    firstSegment === 'reset-password' ||
    firstSegment === 'callback';

  if (!inAuthGroup || !isPublicAuthScreen) {
    return 'redirect-to-welcome';
  }

  return 'allow';
}
