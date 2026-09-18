import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADII, SHADOWS, FONTS, GRADIENTS } from '../../lib/theme';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { useAuth } from '../../lib/authContext';
import { useTheme } from '../../lib/themeContext';

const THEME_BG = require('../../assets/images/theme_selection_bg.jpg');

export default function ThemeSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setThemePreference } = useAuth();
  const { setTheme: setGlobalTheme } = useTheme();

  const [selectedTheme, setSelectedTheme] = useState('dark');
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // 1. Immediately apply the global theme
      await setGlobalTheme(selectedTheme);
      // 2. Persist to auth profile and storage
      if (setThemePreference) {
        await setThemePreference(selectedTheme);
      }
      // 3. Seamlessly enter the main app
      router.replace('/(tabs)');
    } catch (err) {
      console.warn('Error saving theme preference:', err);
      router.replace('/(tabs)');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Full-Screen Cinematic Travel Photography Background */}
      <ImageBackground
        source={THEME_BG}
        style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%' }]}
        imageStyle={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        resizeMode="cover"
      >
        {/* Subtle dark atmospheric gradient so text & glass cards remain crisp and readable */}
        <LinearGradient
          colors={['rgba(6, 21, 34, 0.45)', 'rgba(6, 21, 34, 0.70)', 'rgba(6, 21, 34, 0.94)']}
          locations={[0, 0.42, 1]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Top Brand Header */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandLogoCircle}>
                <Ionicons name="sparkles" size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.brandName}>MaybeWe</Text>
            </View>

            <View style={styles.stepPill}>
              <Text style={styles.stepPillText}>STEP 5 OF 5</Text>
            </View>

            <Text style={styles.heading}>Choose Your Theme</Text>
            <Text style={styles.subtitle}>
              Pick the look that feels right for you.{'\n'}
              You can always change it later in Settings.
            </Text>
          </View>

          {/* THEME CARDS SECTION */}
          <View style={styles.cardsContainer}>
            {/* CARD 1: DARK THEME */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedTheme('dark')}
              style={[
                styles.themeCard,
                styles.darkCard,
                selectedTheme === 'dark' && styles.themeCardSelectedDark,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedTheme === 'dark' }}
              accessibilityLabel="Dark Theme. Easy on the eyes, perfect for night and low light."
            >
              {/* Left Content */}
              <View style={styles.cardMainContent}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.iconCircle, styles.darkIconCircle]}>
                    <Ionicons name="moon" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.cardTitleDark}>Dark Theme</Text>
                  
                  {/* Selection Indicator */}
                  <View style={[styles.indicator, selectedTheme === 'dark' ? styles.indicatorActiveDark : styles.indicatorInactiveDark]}>
                    {selectedTheme === 'dark' && (
                      <Ionicons name="checkmark" size={14} color="#061522" />
                    )}
                  </View>
                </View>

                <Text style={styles.cardDescDark}>
                  Easy on the eyes, perfect for night and low light.
                </Text>

                {/* Dark Mini UI Preview */}
                <View style={styles.previewWrapper}>
                  <View style={styles.miniPhoneDark}>
                    <View style={styles.miniHeaderDark}>
                      <View style={styles.miniDot} />
                      <View style={styles.miniPillDark} />
                    </View>
                    <View style={styles.miniBannerDark}>
                      <LinearGradient
                        colors={['#1E3A5F', '#0B1D2D']}
                        style={StyleSheet.absoluteFill}
                      />
                    </View>
                    <View style={styles.miniCardDark}>
                      <View style={styles.miniAvatarDark} />
                      <View style={styles.miniLinesCol}>
                        <View style={styles.miniLineWhite} />
                        <View style={styles.miniLineMutedDark} />
                      </View>
                    </View>
                    <View style={styles.miniTabBarDark}>
                      <View style={[styles.miniTabDot, styles.miniTabDotActiveDark]} />
                      <View style={styles.miniTabDot} />
                      <View style={styles.miniTabDot} />
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* CARD 2: LIGHT THEME */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedTheme('light')}
              style={[
                styles.themeCard,
                styles.lightCard,
                selectedTheme === 'light' && styles.themeCardSelectedLight,
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedTheme === 'light' }}
              accessibilityLabel="Light Theme. Clean, fresh and bright for daytime adventures."
            >
              {/* Left Content */}
              <View style={styles.cardMainContent}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.iconCircle, styles.lightIconCircle]}>
                    <Ionicons name="sunny" size={20} color="#061522" />
                  </View>
                  <Text style={styles.cardTitleLight}>Light Theme</Text>
                  
                  {/* Selection Indicator */}
                  <View style={[styles.indicator, selectedTheme === 'light' ? styles.indicatorActiveLight : styles.indicatorInactiveLight]}>
                    {selectedTheme === 'light' && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>
                </View>

                <Text style={styles.cardDescLight}>
                  Clean, fresh and bright for daytime adventures.
                </Text>

                {/* Light Mini UI Preview */}
                <View style={styles.previewWrapper}>
                  <View style={styles.miniPhoneLight}>
                    <View style={styles.miniHeaderLight}>
                      <View style={[styles.miniDot, { backgroundColor: '#627D98' }]} />
                      <View style={styles.miniPillLight} />
                    </View>
                    <View style={styles.miniBannerLight}>
                      <LinearGradient
                        colors={['#E2E8F0', '#CBD5E1']}
                        style={StyleSheet.absoluteFill}
                      />
                    </View>
                    <View style={styles.miniCardLight}>
                      <View style={styles.miniAvatarLight} />
                      <View style={styles.miniLinesCol}>
                        <View style={styles.miniLineDark} />
                        <View style={styles.miniLineMutedLight} />
                      </View>
                    </View>
                    <View style={styles.miniTabBarLight}>
                      <View style={[styles.miniTabDot, styles.miniTabDotActiveLight]} />
                      <View style={[styles.miniTabDot, { backgroundColor: '#9FB3C8' }]} />
                      <View style={[styles.miniTabDot, { backgroundColor: '#9FB3C8' }]} />
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* BOTTOM BUTTON */}
          <View style={styles.footer}>
            <PrimaryButton
              title={submitting ? 'Setting up Theme...' : 'Continue  →'}
              size="lg"
              onPress={handleContinue}
              disabled={submitting}
              style={{ width: '100%' }}
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },

  /* Header Styles */
  header: {
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandLogoCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  brandName: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  stepPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    marginBottom: 12,
  },
  stepPillText: {
    fontFamily: FONTS.bold,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.90)',
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  heading: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.80)',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320,
  },

  /* Cards Container */
  cardsContainer: {
    gap: 14,
    marginVertical: 12,
  },
  themeCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        backdropFilter: 'blur(20px)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    }),
  },

  /* Dark Theme Card Specifics */
  darkCard: {
    backgroundColor: 'rgba(10, 26, 40, 0.76)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  themeCardSelectedDark: {
    backgroundColor: 'rgba(12, 32, 50, 0.90)',
    borderColor: '#FFFFFF',
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
      },
      web: {
        boxShadow: '0 0 24px rgba(255, 255, 255, 0.20), 0 8px 32px rgba(0, 0, 0, 0.45)',
      },
    }),
  },

  /* Light Theme Card Specifics */
  lightCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.40)',
  },
  themeCardSelectedLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#061522',
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.20,
        shadowRadius: 16,
      },
      web: {
        boxShadow: '0 0 24px rgba(255, 255, 255, 0.45), 0 8px 32px rgba(0, 0, 0, 0.30)',
      },
    }),
  },

  cardMainContent: {
    width: '100%',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  darkIconCircle: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  lightIconCircle: {
    backgroundColor: 'rgba(6, 21, 34, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(6, 21, 34, 0.15)',
  },
  cardTitleDark: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  cardTitleLight: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    fontWeight: '700',
    color: '#061522',
    flex: 1,
  },

  /* Selection Indicator */
  indicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  indicatorActiveDark: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  indicatorInactiveDark: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  indicatorActiveLight: {
    backgroundColor: '#061522',
    borderColor: '#061522',
  },
  indicatorInactiveLight: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(6, 21, 34, 0.30)',
  },

  cardDescDark: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 18,
    marginBottom: 12,
    paddingLeft: 44,
  },
  cardDescLight: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#334E68',
    lineHeight: 18,
    marginBottom: 12,
    paddingLeft: 44,
  },

  /* Mini Phone UI Previews */
  previewWrapper: {
    alignItems: 'center',
    paddingTop: 4,
  },
  miniPhoneDark: {
    width: 200,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#061522',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    padding: 6,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  miniHeaderDark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  miniPillDark: {
    width: 32,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  miniBannerDark: {
    height: 18,
    borderRadius: 6,
    overflow: 'hidden',
  },
  miniCardDark: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10283A',
    borderRadius: 6,
    padding: 4,
  },
  miniAvatarDark: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  miniLinesCol: {
    flex: 1,
    gap: 3,
  },
  miniLineWhite: {
    width: '60%',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  miniLineMutedDark: {
    width: '40%',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.40)',
  },
  miniTabBarDark: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 2,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.10)',
  },
  miniTabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.30)',
  },
  miniTabDotActiveDark: {
    backgroundColor: '#FFFFFF',
  },

  /* Light Mini Preview */
  miniPhoneLight: {
    width: 200,
    height: 80,
    borderRadius: 14,
    backgroundColor: '#F6F8FB',
    borderWidth: 1,
    borderColor: 'rgba(6, 21, 34, 0.15)',
    padding: 6,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  miniHeaderLight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniPillLight: {
    width: 32,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#061522',
  },
  miniBannerLight: {
    height: 18,
    borderRadius: 6,
    overflow: 'hidden',
  },
  miniCardLight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(6, 21, 34, 0.10)',
  },
  miniAvatarLight: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#061522',
    marginRight: 6,
  },
  miniLineDark: {
    width: '60%',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#061522',
  },
  miniLineMutedLight: {
    width: '40%',
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#627D98',
  },
  miniTabBarLight: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 2,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(6, 21, 34, 0.10)',
  },
  miniTabDotActiveLight: {
    backgroundColor: '#061522',
  },

  /* Footer */
  footer: {
    paddingTop: 16,
    paddingBottom: 4,
  },
});
