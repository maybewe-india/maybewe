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
    color: '#061522',
  },
  display: {
    fontFamily: FONTS.extraBold,
    fontWeight: '800',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: '#061522',
  },
  // Large headings → Manrope 700–800
  headingLarge: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: '#061522',
  },
  heading2: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: '#061522',
  },
  // Section headings → Manrope 700
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: '#061522',
  },
  // Card titles → Manrope 600–700
  cardTitle: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.1,
    color: '#061522',
  },
  cardTitleBold: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.1,
    color: '#061522',
  },
  // Body text → Manrope 400–500
  body: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 21,
    color: '#334E68',
  },
  bodyMedium: {
    fontFamily: FONTS.medium,
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 21,
    color: '#102A43',
  },
  bodySmall: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 12,
    lineHeight: 18,
    color: '#627D98',
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
    color: '#334E68',
  },
  // Stats / percentages / dates → Manrope 700
  stats: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 18,
    color: '#061522',
  },
  caption: {
    fontFamily: FONTS.medium,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 16,
    color: '#627D98',
  },
};

export const DARK_COLORS = {
  mode: 'dark',
  isDark: true,
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
  text: '#FFFFFF',
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
  bgGradientOverlay: ['rgba(6, 21, 34, 0.45)', 'rgba(6, 21, 34, 0.75)', 'rgba(6, 21, 34, 0.95)'],
  heroGradientOverlay: ['rgba(6, 21, 34, 0.20)', 'rgba(6, 21, 34, 0.65)', 'rgba(6, 21, 34, 0.94)'],

  // Aliases & Component Specific
  primary: '#FFFFFF',
  primaryText: '#061522',
  primaryLight: '#FFFFFF',
  primaryDark: 'rgba(255, 255, 255, 0.85)',
  glassBg: 'rgba(16, 40, 58, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.18)',
  surfaceSubtle: '#0B1D2D',
  surfaceCard: '#10283A',
  textSecondaryLight: 'rgba(255, 255, 255, 0.65)',
  tabBarBg: 'rgba(6, 21, 34, 0.92)',
  cardBg: 'rgba(16, 40, 58, 0.80)',
  cardBorder: 'rgba(255, 255, 255, 0.16)',
  input: 'rgba(16, 40, 58, 0.60)',
  inputBg: 'rgba(16, 40, 58, 0.60)',
  inputBorder: 'rgba(255, 255, 255, 0.15)',
  chipBg: 'rgba(255, 255, 255, 0.08)',
  chipBorder: 'rgba(255, 255, 255, 0.15)',
  modalBg: '#0B1D2D',
};

export const LIGHT_COLORS = {
  mode: 'light',
  isDark: false,
  // Backgrounds: warm, clean light grey neutral
  background: '#F6F8FB',
  backgroundSecondary: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.95)',
  surfaceGlassDark: '#F1F5F9',
  surfaceGlassUltra: '#FFFFFF',

  // Borders: clean light grey borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderGlass: '#E2E8F0',
  borderActive: '#0F172A',

  // Text: high-contrast dark text & readable slate grey
  text: '#061522',
  textPrimary: '#061522',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textDisabled: '#94A3B8',

  // Brand Accents
  lavender: '#0F172A',
  lavenderDark: '#1E293B',
  violet: '#0F172A',
  violetDark: '#1E293B',
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
  overlay: 'rgba(241, 245, 249, 0.85)',
  overlayHeavy: 'rgba(241, 245, 249, 0.95)',
  overlayCard: '#FFFFFF',
  bgGradientOverlay: ['rgba(246, 248, 251, 0.85)', 'rgba(241, 245, 249, 0.95)', '#F6F8FB'],
  heroGradientOverlay: ['rgba(246, 248, 251, 0.75)', 'rgba(241, 245, 249, 0.92)', '#F6F8FB'],

  // Aliases & Component Specific
  primary: '#0F172A',
  primaryText: '#0F172A',
  primaryLight: '#334155',
  primaryDark: '#020617',
  glassBg: 'rgba(255, 255, 255, 0.95)',
  glassBorder: '#E2E8F0',
  surfaceSubtle: '#F1F5F9',
  surfaceCard: '#FFFFFF',
  textSecondaryLight: '#64748B',
  tabBarBg: '#FFFFFF',
  cardBg: '#FFFFFF',
  cardBorder: '#E2E8F0',
  input: '#FFFFFF',
  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  chipBg: '#F1F5F9',
  chipBorder: '#E2E8F0',
  modalBg: '#FFFFFF',
};

export const getThemeColors = (mode = 'light') => {
  return LIGHT_COLORS;
};

export const getTheme = (mode = 'light') => {
  return {
    mode: 'light',
    isDark: false,
    colors: LIGHT_COLORS,
    typography: TYPOGRAPHY,
    gradients: GRADIENTS,
    shadows: SHADOWS,
    radii: RADII,
    fonts: FONTS,
  };
};

// Default export permanently locked to LIGHT_COLORS
export const COLORS = LIGHT_COLORS;

export const GRADIENTS = {
  // Primary brand gradients — Clean light grey system
  lavenderViolet: ['#F1F5F9', '#E2E8F0'],
  peachLavender: ['#E06D53', '#F1F5F9'],
  sunsetPeachViolet: ['#DD6B20', '#E06D53', '#F1F5F9'],
  sunsetToNavy: ['#DD6B20', '#E06D53', '#0F172A'],

  // Background gradients for light theme
  heroOverlay: ['transparent', 'rgba(241, 245, 249, 0.65)', '#F6F8FB'],
  heroOverlayTop: ['rgba(241, 245, 249, 0.85)', 'transparent'],
  cardOverlay: ['transparent', 'rgba(241, 245, 249, 0.92)'],
  cardOverlayMedium: ['transparent', 'rgba(241, 245, 249, 0.75)'],
  darkBase: ['#F6F8FB', '#F1F5F9'],
  surface: ['#FFFFFF', '#F8FAFC'],
  glassGradient: ['#FFFFFF', '#F1F5F9'],

  // Time-based atmospheric gradients
  morning: ['#E0E7FF', '#C7D2FE', '#FFB39A'],
  afternoon: ['#E0F2FE', '#BAE6FD', '#7DD3FC'],
  sunset: ['#FCE7F3', '#FBCFE8', '#FFB39A'],
  night: ['#F1F5F9', '#E2E8F0', '#CBD5E1'],

  // Tab / pill
  tabPill: ['#0F172A', '#1E293B'],
  tabPillActive: ['#0F172A', '#1E293B'],
  ocean: ['#F1F5F9', '#FFFFFF', '#0F172A'],
  hero: ['#F1F5F9', '#E2E8F0', '#CBD5E1'],
  cardAccent: ['rgba(0, 0, 0, 0.04)', 'rgba(0, 0, 0, 0.06)'],
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
