import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform, View, Text, TouchableOpacity } from 'react-native';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { AuthProvider, useAuth } from '../lib/authContext';
import { ThemeProvider, useTheme } from '../lib/themeContext';
import { COLORS } from '../lib/theme';
import TestNavigatorModal from '../components/TestNavigatorModal';

function AuthRouteGuard({ children }) {
  const { user, profile, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const searchParams = useGlobalSearchParams();

  useEffect(() => {
    if (isLoading) return;

    // Allow QA showcase tester or explicit preview mode from Test Navigator
    const isPreviewMode = searchParams?.preview === 'true';
    const firstSegment = segments[0] || '';
    const inAuthGroup = firstSegment === '(auth)';
    const inShowcase = firstSegment === 'showcase';

    if (inShowcase || isPreviewMode) return;

    const isVerified = profile?.verification_status === 'verified';
    const hasTheme = profile?.theme_preference === 'dark' || profile?.theme_preference === 'light';

    if (user || profile) {
      // User is logged in
      if (!isVerified) {
        // Unverified user MUST complete selfie verification before entering any authenticated area
        const currentSubRoute = segments[1] || '';
        if (!inAuthGroup || (currentSubRoute !== 'verification' && currentSubRoute !== 'guidelines')) {
          router.replace('/(auth)/verification');
        }
      } else if (!hasTheme) {
        // Verified user with NO theme preference MUST choose a theme before entering main app!
        const currentSubRoute = segments[1] || '';
        if (!inAuthGroup || currentSubRoute !== 'theme-selection') {
          router.replace('/(auth)/theme-selection');
        }
      } else {
        // Verified with theme preference: only redirect from initial unauthenticated entry points (welcome/login/signup)
        const currentSubRoute = segments[1] || '';
        if (inAuthGroup && (currentSubRoute === 'welcome' || currentSubRoute === 'login' || currentSubRoute === 'signup')) {
          router.replace('/(tabs)');
        }
      }
    } else {
      // User is not logged in
      if (!inAuthGroup) {
        router.replace('/(auth)/welcome');
      }
    }
  }, [user, profile, isLoading, segments, searchParams]);

  return children;
}

function ThemedAppContainer({ children }) {
  const { isDark, colors } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = 'MaybeWe — Solo Travel Matching';

      const linkId = 'expo-google-font-manrope';
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(link);
      }

      const styleId = 'solo-traveler-global-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          html, body {
            width: 100%;
            height: 100%;
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: hidden !important;
            background-color: #030a10 !important;
            -webkit-font-smoothing: antialiased;
          }
          * {
            box-sizing: border-box;
          }

          /* Force all React Native Web background images and image wrappers to cover 100% width and height */
          [style*="background-image"] {
            background-size: cover !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
            width: 100% !important;
            height: 100% !important;
          }
          div[style*="position: absolute"] > div[style*="background-image"],
          div[style*="position: absolute"] > img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }

          /* LAPTOP & DESKTOP RESPONSIVE CONTAINER (Screen width > 768px) */
          @media (min-width: 769px) {
            body {
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              background: radial-gradient(circle at 50% 30%, #0d273e 0%, #030a10 100%) !important;
              min-height: 100vh !important;
              overflow: hidden !important;
            }
            #root {
              max-width: 440px !important;
              width: 100% !important;
              height: 100vh !important;
              margin: 0 auto !important;
              position: relative !important;
              box-shadow: 0 0 60px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.12) !important;
              overflow: hidden !important;
              background-color: #061522 !important;
            }
            /* When showcase screen is opened on laptop, allow full desktop width */
            body.showcase-wide #root,
            #root:has([data-showcase="true"]) {
              max-width: 100% !important;
              height: 100vh !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
          }

          /* MOBILE VIEW (Screen width <= 768px): Edge-to-edge native appearance */
          @media (max-width: 768px) {
            #root {
              width: 100% !important;
              max-width: 100% !important;
              height: 100% !important;
              margin: 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <AuthRouteGuard>
              <ThemedAppContainer>
                <TestNavigatorModal />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right',
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="chat/[id]"
                    options={{
                      headerShown: false,
                      presentation: 'card',
                    }}
                  />
                  <Stack.Screen
                    name="review/[id]"
                    options={{
                      headerShown: false,
                      presentation: 'modal',
                    }}
                  />
                  <Stack.Screen
                    name="settings"
                    options={{
                      headerShown: false,
                      presentation: 'card',
                    }}
                  />
                  <Stack.Screen
                    name="showcase"
                    options={{
                      headerShown: false,
                    }}
                  />
                  <Stack.Screen
                    name="+not-found"
                    options={{
                      headerShown: false,
                    }}
                  />
                </Stack>
              </ThemedAppContainer>
            </AuthRouteGuard>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export function ErrorBoundary({ error, retry }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMsg}>{error?.message || 'An unexpected error occurred.'}</Text>
      <TouchableOpacity style={styles.errorBtn} onPress={retry} activeOpacity={0.8}>
        <Text style={styles.errorBtnText}>Reload App</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#061522',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#061522',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  errorMsg: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorBtn: {
    backgroundColor: COLORS.lavender,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
  },
  errorBtnText: {
    color: '#061522',
    fontWeight: '600',
    fontSize: 15,
  },
});
