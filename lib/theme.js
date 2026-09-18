import { Platform } from 'react-native';

// ============================================================
// Solo Traveler — Premium Dark-Navy Design System
// Phase 2 Design Tokens & Manrope Typography System
// ============================================================

export const FONTS = {
  regular: Platform.select({ web: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', default: 'Manrope_400Regular' }),
  medium: Platform.select({ web: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', default: 'Manrope_500Medium' }),
  semiBold: Platform.select({ web: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', default: 'Manrope_600SemiBold' }),
  bold: Platform.select({ web: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', default: 'Manrope_700Bold' }),
  extraBold: Platform.select({ web: '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', default: 'Manrope_800ExtraBold' }),
};

export const TYPOGRAPHY = {
  // Display / Hero headings → Manrope 800
  hero: {
    fontFamily: FONTS.extraBold,
    fontWeight: '800',
    fontSize: 34,
    lineHeight: 42,
    letterSpacing: -0.6,
    color: '#FFFFFF',
  },
  display: {
    fontFamily: FONTS.extraBold,
    fontWeight: '800',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: '#FFFFFF',
  },
  // Large headings → Manrope 700–800
  headingLarge: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  heading2: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
  // Section headings → Manrope 700
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
  // Card titles → Manrope 600–700
  cardTitle: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.1,
    color: '#FFFFFF',
  },
  cardTitleBold: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.1,
    color: '#FFFFFF',
  },
  // Body text → Manrope 400–500
  body: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255, 255, 255, 0.70)',
  },
  bodyMedium: {
    fontFamily: FONTS.medium,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  bodySmall: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  // Buttons → Manrope 600–700
  button: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: -0.1,
  },
  buttonBold: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.1,
  },
  // Navigation labels → Manrope 600
  navLabel: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.1,
  },
  // Eyebrow labels → Manrope 600–700 (subtle letter spacing only for uppercase eyebrow labels)
  eyebrow: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 2.0,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  // Stats / percentages / dates → Manrope 700
  stats: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 18,
    color: '#FFFFFF',
  },
  caption: {
    fontFamily: FONTS.medium,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255, 255, 255, 0.55)',
  },
};

export const DARK_COLORS = {
  mode: 'dark',
  // Backgrounds
  background: '#061522',
  backgroundSecondary: '#0B1D2D',
  surface: '#10283A',
  surfaceElevated: '#162F44',
  surfaceGlass: 'rgba(16, 40, 58, 0.72)',
  surfaceGlassDark: 'rgba(6, 21, 34, 0.85)',
  surfaceGlassUltra: 'rgba(11, 29, 45, 0.90)',

  // Borders
  border: 'rgba(255, 255, 255, 0.10)',
  borderLight: 'rgba(255, 255, 255, 0.06)',
  borderGlass: 'rgba(255, 255, 255, 0.18)',
  borderActive: 'rgba(255, 255, 255, 0.35)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.85)',
  textMuted: 'rgba(255, 255, 255, 0.65)',
  textDisabled: 'rgba(255, 255, 255, 0.30)',

  // Brand Accents — White-based accent system
  lavender: '#FFFFFF',
  lavenderDark: 'rgba(255, 255, 255, 0.85)',
  violet: '#FFFFFF',
  violetDark: 'rgba(255, 255, 255, 0.85)',
  peach: '#FFB39A',
  peachDark: '#F59070',
  sunset: '#FFD0A6',
  sunsetDark: '#F0B87A',

  // Semantic
  success: '#79D9B0',
  successBg: 'rgba(121, 217, 176, 0.12)',
  danger: '#FF7D8A',
  dangerBg: 'rgba(255, 125, 138, 0.12)',
  warning: '#FFD0A6',
  warningBg: 'rgba(255, 208, 166, 0.12)',
  info: '#7DBFFF',
  infoBg: 'rgba(125, 191, 255, 0.12)',

  // Overlays
  overlay: 'rgba(6, 21, 34, 0.70)',
  overlayHeavy: 'rgba(6, 21, 34, 0.88)',
  overlayCard: 'rgba(6, 21, 34, 0.55)',

  // Aliases & Component Specific
  primary: '#FFFFFF',
  primaryLight: '#FFFFFF',
  primaryDark: 'rgba(255, 255, 255, 0.85)',
  glassBg: 'rgba(16, 40, 58, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.18)',
  surfaceSubtle: '#0B1D2D',
  surfaceCard: '#10283A',
  textSecondaryLight: 'rgba(255, 255, 255, 0.65)',
  tabBarBg: 'rgba(6, 21, 34, 0.92)',
  cardBg: 'rgba(16, 40, 58, 0.80)',
  inputBg: 'rgba(16, 40, 58, 0.60)',
  inputBorder: 'rgba(255, 255, 255, 0.15)',
  chipBg: 'rgba(255, 255, 255, 0.08)',
  chipBorder: 'rgba(255, 255, 255, 0.15)',
  modalBg: '#0B1D2D',
};

export const LIGHT_COLORS = {
  mode: 'light',
  // Backgrounds: warm, clean light neutral
  background: '#F6F8FB',
  backgroundSecondary: '#EDF1F7',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.88)',
  surfaceGlassDark: 'rgba(240, 244, 249, 0.94)',
  surfaceGlassUltra: 'rgba(255, 255, 255, 0.96)',

  // Borders: subtle refined gray/slate
  border: 'rgba(6, 21, 34, 0.10)',
  borderLight: 'rgba(6, 21, 34, 0.06)',
  borderGlass: 'rgba(6, 21, 34, 0.12)',
  borderActive: '#061522',

  // Text: dark navy typography with crisp contrast
  textPrimary: '#061522',
  textSecondary: '#334E68',
  textMuted: '#627D98',
  textDisabled: '#9FB3C8',

  // Brand Accents
  lavender: '#061522',
  lavenderDark: '#102A43',
  violet: '#061522',
  violetDark: '#102A43',
  peach: '#E06D53',
  peachDark: '#C05621',
  sunset: '#DD6B20',
  sunsetDark: '#C05621',

  // Semantic
  success: '#059669',
  successBg: 'rgba(5, 150, 105, 0.10)',
  danger: '#DC2626',
  dangerBg: 'rgba(220, 38, 38, 0.10)',
  warning: '#D97706',
  warningBg: 'rgba(217, 119, 6, 0.10)',
  info: '#2563EB',
  infoBg: 'rgba(37, 99, 235, 0.10)',

  // Overlays
  overlay: 'rgba(246, 248, 251, 0.70)',
  overlayHeavy: 'rgba(246, 248, 251, 0.90)',
  overlayCard: 'rgba(255, 255, 255, 0.85)',

  // Aliases & Component Specific
  primary: '#061522',
  primaryLight: '#102A43',
  primaryDark: '#030A10',
  glassBg: 'rgba(255, 255, 255, 0.88)',
  glassBorder: 'rgba(6, 21, 34, 0.12)',
  surfaceSubtle: '#EDF1F7',
  surfaceCard: '#FFFFFF',
  textSecondaryLight: '#627D98',
  tabBarBg: 'rgba(255, 255, 255, 0.94)',
  cardBg: 'rgba(255, 255, 255, 0.92)',
  inputBg: '#FFFFFF',
  inputBorder: 'rgba(6, 21, 34, 0.15)',
  chipBg: 'rgba(6, 21, 34, 0.05)',
  chipBorder: 'rgba(6, 21, 34, 0.10)',
  modalBg: '#FFFFFF',
};

export const getThemeColors = (mode = 'dark') => {
  return mode === 'light' ? LIGHT_COLORS : DARK_COLORS;
};

// Default export for backward compatibility
export const COLORS = DARK_COLORS;

export const GRADIENTS = {
  // Primary brand gradients — White crisp system
  lavenderViolet: ['#FFFFFF', '#F0F4F8'],
  peachLavender: ['#FFB39A', '#FFFFFF'],
  sunsetPeachViolet: ['#FFD0A6', '#FFB39A', '#FFFFFF'],
  sunsetToNavy: ['#FFD0A6', '#FFFFFF', '#061522'],

  // Background gradients
  heroOverlay: ['transparent', 'rgba(6,21,34,0.45)', 'rgba(6,21,34,0.94)'],
  heroOverlayTop: ['rgba(6,21,34,0.6)', 'transparent'],
  cardOverlay: ['transparent', 'rgba(6,21,34,0.92)'],
  cardOverlayMedium: ['transparent', 'rgba(6,21,34,0.70)'],
  darkBase: ['#061522', '#0B1D2D'],
  surface: ['#0B1D2D', '#10283A'],
  glassGradient: ['rgba(16, 40, 58, 0.80)', 'rgba(11, 29, 45, 0.65)'],

  // Time-based atmospheric gradients
  morning: ['#1A3A5C', '#2D5A8E', '#FFB39A'],
  afternoon: ['#0B3D6E', '#1565A8', '#2196C9'],
  sunset: ['#2A1540', '#6B2D6B', '#FFB39A'],
  night: ['#020B14', '#061522', '#0E2337'],

  // Tab / pill
  tabPill: ['#FFFFFF', '#F0F4F8'],
  tabPillActive: ['#FFFFFF', '#F0F4F8'],
  ocean: ['#0B1D2D', '#10283A', 'rgba(255, 255, 255, 0.85)'],
  hero: ['#FFFFFF', '#F0F4F8', '#FFB39A'],
  cardAccent: ['rgba(255, 255, 255, 0.12)', 'rgba(255, 179, 154, 0.08)'],
};

export const SHADOWS = {
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40,
    shadowRadius: 20,
    elevation: 8,
  },
  lavender: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 14,
    elevation: 4,
  },
  peach: {
    shadowColor: '#FFB39A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  glow: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
  hover: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.20,
    shadowRadius: 20,
    elevation: 8,
  },
};

export const RADII = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 36,
  full: 9999,
};

export const RADIUS = RADII;

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 56,
};

// Time-based atmospheric themes (used by useTimeTheme hook)
export const TIME_THEMES = {
  morning: {
    label: 'Morning',
    gradient: ['#1A3A5C', '#2D5A8E', '#FFB39A'],
    accentColor: '#FFB39A',
    greeting: 'Good morning',
    tagline: 'Fresh horizons await your journey.',
  },
  afternoon: {
    label: 'Afternoon',
    gradient: ['#0B3D6E', '#1565A8', '#2196C9'],
    accentColor: '#7DBFFF',
    greeting: 'Good afternoon',
    tagline: 'Vibrant paths to explore together.',
  },
  sunset: {
    label: 'Sunset',
    gradient: ['#2A1540', '#6B2D6B', '#FFB39A'],
    accentColor: '#FFD0A6',
    greeting: 'Good evening',
    tagline: 'Golden hour connections across the globe.',
  },
  night: {
    label: 'Night',
    gradient: ['#020B14', '#061522', '#0E2337'],
    accentColor: '#FFFFFF',
    greeting: 'Good night',
    tagline: 'Under the same stars. Finding kindred spirits.',
  },
};

export default {
  FONTS,
  TYPOGRAPHY,
  COLORS,
  GRADIENTS,
  SHADOWS,
  RADII,
  SPACING,
  TIME_THEMES,
};
