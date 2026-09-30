import { Platform } from 'react-native';

// ============================================================
// MaybeWe — Warm Champagne Pearl Design System
// Theme: Warm Champagne Pearl
//
// Exact brand colours (DO NOT ALTER):
//   Pearl White  #EFDCCC  — main page / background foundation
//   Champagne    #E7D3B5  — CTAs, active nav, highlights, accents
//   Warm Beige   #D9C8B2  — cards, inputs, chips, dividers, surfaces
//   Deep Charcoal #171817 — readable text and important icons
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
    lineHeight: 44,
    letterSpacing: -0.8,
    color: '#171817',
  },
  display: {
    fontFamily: FONTS.extraBold,
    fontWeight: '800',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: '#171817',
  },
  // Large headings → Manrope 700–800
  headingLarge: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: '#171817',
  },
  heading2: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: '#171817',
  },
  // Section headings → Manrope 700
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: '#171817',
  },
  // Card titles → Manrope 600–700
  cardTitle: {
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: '#171817',
  },
  cardTitleBold: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: '#171817',
  },
  // Body text → Manrope 400–500
  body: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 15,
    lineHeight: 24,
    color: '#363633',
  },
  bodyMedium: {
    fontFamily: FONTS.medium,
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 24,
    color: '#171817',
  },
  bodySmall: {
    fontFamily: FONTS.regular,
    fontWeight: '400',
    fontSize: 13,
    lineHeight: 20,
    color: '#8A8984',
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
    letterSpacing: 0.2,
  },
  // Eyebrow labels → Manrope 600–700
  eyebrow: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: '#8A8984',
  },
  // Stats / percentages / dates → Manrope 700
  stats: {
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 18,
    color: '#171817',
  },
  caption: {
    fontFamily: FONTS.medium,
    fontWeight: '500',
    fontSize: 12,
    lineHeight: 18,
    color: '#8A8984',
  },
};

// Warm Champagne Pearl — Lighter surface tokens
// Main background: #FFFDFC (almost white)
// Secondary bg:    #FBF8F3 (very light warm ivory)
// Cards/surfaces:  #F5EEE5 (very light beige)
// Champagne:       #E7D3B5 (soft accent)
// Borders:         #EDE5DA (subtle warm beige)
export const SURFACES = {
  pearl: '#FFFDFC',       // Near-white main background
  warmIvory: '#FBF8F3',   // Very light warm ivory
  silk: '#FBF8F3',        // alias
  softChampagne: '#E7D3B5', // Champagne — accents
  mistSage: '#F5EEE5',    // Very light beige — surfaces
  powderBlue: '#F5EEE5',  // alias
  warmSand: '#F5EEE5',    // Very light beige
  softRose: '#FFFDFC',    // alias → near-white
  stone: '#EDE5DA',       // Border/divider beige
};

export const TEXT = {
  obsidian: '#171817',
  graphite: '#2B2C29',
  warmCharcoal: '#45453F',
  muted: '#77766F',
};

export const ACCENTS = {
  champagneGold: '#E7D3B5', // Champagne — primary accent
  deepOlive: '#33463C',
  mutedTerracotta: '#A96F5C',
  deepOcean: '#405B68',
};

export const GLASS_MATERIALS = {
  light: {
    backgroundColor: 'rgba(255, 253, 252, 0.92)',
    borderColor: 'rgba(237, 229, 218, 0.75)',
  },
  pearl: {
    backgroundColor: 'rgba(251, 248, 243, 0.90)',
    borderColor: 'rgba(237, 229, 218, 0.65)',
  },
  champagne: {
    backgroundColor: 'rgba(231, 211, 181, 0.28)',
    borderColor: 'rgba(237, 229, 218, 0.50)',
  },
  sage: {
    backgroundColor: 'rgba(245, 238, 229, 0.38)',
    borderColor: 'rgba(51, 70, 60, 0.20)',
  },
};

export const PALETTE = {
  // BASE — Warm Champagne Pearl (Lighter Edition)
  pearl: '#FFFDFC',         // Near-white main background
  warmIvory: '#FBF8F3',     // Very light warm ivory
  silk: '#FBF8F3',          // alias
  softChampagne: '#E7D3B5', // Champagne — accents/highlights
  mistSage: '#F5EEE5',      // Very light beige — surfaces
  powderBlue: '#F5EEE5',    // alias
  warmSand: '#F5EEE5',      // Very light beige
  softRose: '#FFFDFC',      // alias → near-white
  stone: '#EDE5DA',         // Border/divider

  // TEXT
  obsidian: '#171817',
  graphite: '#2B2C29',
  warmCharcoal: '#45453F',
  muted: '#77766F',

  // ACCENTS
  champagneGold: '#E7D3B5', // Champagne
  deepOlive: '#33463C',
  mutedTerracotta: '#A96F5C',
  deepOcean: '#405B68',

  // Legacy & compatibility aliases
  softPearl: '#FFFDFC',
  deepCharcoal: '#171817',
  softStone: '#EDE5DA',
  warmGrey: '#77766F',
  textPrimary: '#171817',
  textSecondary: '#45453F',
  textMuted: '#77766F',
  champagne: '#E7D3B5',
  champagneHighlight: '#E7D3B5',
  deepBronze: '#756345',
  deepForest: '#33463C',
  warmOffWhite: '#FBF8F3',
  softIvory: '#FBF8F3',
  white: '#FFFFFF',
  lightGrey: '#FFFDFC',
  borderGrey: '#EDE5DA',
  mediumGrey: '#45453F',
  darkGrey: '#2B2C29',
  nearBlack: '#171817',
};

export const DARK_COLORS = {
  mode: 'dark',
  isDark: false, // Locked to luxury light palette
  background: '#061522',
  backgroundSecondary: '#1D1D1B',
  surface: '#242422',
  surfaceElevated: '#363633',
  surfaceGlass: 'rgba(29, 29, 27, 0.85)',
  surfaceGlassDark: '#111210',
  surfaceGlassUltra: '#1D1D1B',

  // Borders
  border: '#363633',
  borderLight: '#242422',
  borderGlass: '#363633',
  borderActive: '#E7D3B5',

  // Text
  text: '#FAF8F3',
  textPrimary: '#FAF8F3',
  textSecondary: '#D8D4CB',
  textMuted: '#96938B',
  textDisabled: '#66645F',

  primary: '#FAF8F3',
  primaryText: '#1D1D1B',
  primaryLight: '#D8D4CB',
  primaryDark: '#96938B',

  success: '#3D7A5A',
  danger: '#B34A4A',
  warning: '#E7D3B5',
  info: '#4A6B82',

  overlay: 'rgba(17, 18, 16, 0.50)',
  overlayHeavy: 'rgba(17, 18, 16, 0.75)',
  overlayCard: '#242422',
  bgGradientOverlay: ['rgba(17, 18, 16, 0.20)', 'rgba(17, 18, 16, 0.50)', '#111210'],
  heroGradientOverlay: ['rgba(17, 18, 16, 0.15)', 'rgba(17, 18, 16, 0.40)', '#111210'],

  cardBg: '#1D1D1B',
  cardBorder: '#363633',
  input: '#242422',
  inputBg: '#242422',
  inputBorder: '#363633',
  chipBg: '#242422',
  chipBorder: '#363633',
  tabBarBg: '#111210',
  modalBg: '#1D1D1B',
  surfaceSubtle: '#242422',
  surfaceCard: '#1D1D1B',
  textSecondaryLight: '#D8D4CB',
};

export const LIGHT_COLORS = {
  mode: 'light',
  isDark: false,

  // ─── Background & Surface tokens (light warm ivory & pearl) ───
  background: '#FFFDFC',
  backgroundSecondary: '#FBF8F3',
  surface: '#FFFDFC',
  surfaceElevated: '#FFFFFF',
  surfaceGlass: 'rgba(255, 253, 252, 0.95)',
  surfaceGlassDark: 'rgba(23, 24, 23, 0.88)',
  surfaceGlassUltra: 'rgba(251, 248, 243, 0.95)',

  // ─── Borders: subtle warm beige ───
  border: '#EDE5DA',
  borderLight: 'rgba(237, 229, 218, 0.55)',
  borderGlass: 'rgba(237, 229, 218, 0.65)',
  borderActive: '#E7D3B5',         // Champagne — active border
  borderChampagne: '#E7D3B5',      // Champagne

  // ─── Text: Deep Charcoal (unchanged) ───
  text: '#171817',
  textPrimary: '#171817',
  textSecondary: '#45453F',
  textMuted: '#77766F',
  textDisabled: '#EDE5DA',

  // ─── Champagne accents ───
  champagne: '#E7D3B5',
  champagneHighlight: '#E7D3B5',
  deepOlive: '#33463C',
  mutedTerracotta: '#A96F5C',
  deepOcean: '#405B68',
  deepBronze: '#756345',
  deepForest: '#33463C',

  // ─── Semantic ───
  success: '#33463C',
  successBg: '#F5EEE5',
  danger: '#A96F5C',
  dangerBg: '#FBF8F3',
  warning: '#E7D3B5',
  warningBg: '#FBF8F3',
  info: '#405B68',
  infoBg: '#F5EEE5',

  // ─── Overlays ───
  overlay: 'rgba(23, 24, 23, 0.35)',
  overlayHeavy: 'rgba(23, 24, 23, 0.60)',
  overlayCard: 'transparent',
  bgGradientOverlay: ['transparent', 'transparent', 'transparent'],
  heroGradientOverlay: ['transparent', 'transparent', 'transparent'],

  // ─── Component-specific ───
  primary: '#171817',
  primaryText: '#FBF8F3',
  primaryLight: '#2B2C29',
  primaryDark: '#111210',
  glassBg: 'rgba(251, 248, 243, 0.92)',
  glassBorder: 'rgba(237, 229, 218, 0.65)',

  // Cards / inputs / chips → very light beige
  surfaceSubtle: '#F5EEE5',
  surfaceCard: '#F5EEE5',
  cardBg: '#F5EEE5',
  cardBorder: '#EDE5DA',
  input: '#F5EEE5',
  inputBg: '#F5EEE5',
  inputBorder: '#EDE5DA',
  chipBg: '#F5EEE5',
  chipBorder: '#EDE5DA',

  // Modal → near-white (modal needs a real background)
  modalBg: '#FFFDFC',
  tabBarBg: 'transparent',
  textSecondaryLight: '#77766F',
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
    palette: PALETTE,
  };
};

// Default export permanently locked to LIGHT_COLORS
export const COLORS = LIGHT_COLORS;

export const GRADIENTS = {
  // 3D physical graphite gradients
  primary3D: ['#282824', '#1D1D1B', '#111210'],
  lavenderViolet: ['#282824', '#1D1D1B', '#111210'],
  peachLavender: ['#282824', '#1D1D1B', '#111210'],
  sunsetPeachViolet: ['#1D1D1B', '#282824', '#756345'],
  sunsetToNavy: ['#1D1D1B', '#282824', '#1D1D1B'],

  // Champagne Pearl reflections
  champagneReflect: ['#E7D3B5', '#F5EEE5', '#E7D3B5'],
  champagneSubtle: ['rgba(231, 211, 181, 0.16)', 'rgba(231, 211, 181, 0.02)'],
  pearlGlass: ['rgba(255, 253, 252, 0.96)', 'rgba(251, 248, 243, 0.88)'],
  cardHighlight: ['rgba(255, 253, 252, 0.92)', 'rgba(255, 253, 252, 0)'],
  ambientLight: ['rgba(231, 211, 181, 0.14)', 'rgba(255, 253, 252, 0)'],

  // Subtle tonal transitions
  heroOverlay: ['transparent', 'rgba(251, 248, 243, 0.70)', '#FBF8F3'],
  heroOverlayTop: ['rgba(255, 253, 252, 0.85)', 'transparent'],
  cardOverlay: ['transparent', 'rgba(17, 18, 16, 0.65)'],
  cardOverlayMedium: ['transparent', 'rgba(17, 18, 16, 0.40)'],
  darkBase: ['#FFFDFC', '#FBF8F3'],
  surface: ['#FFFDFC', '#FBF8F3'],
  glassGradient: ['rgba(255, 253, 252, 0.94)', 'rgba(251, 248, 243, 0.88)'],

  morning: ['#FFFDFC', '#FBF8F3'],
  afternoon: ['#FFFDFC', '#FBF8F3'],
  sunset: ['#FFFDFC', '#FBF8F3'],
  night: ['#FFFDFC', '#FBF8F3'],

  // Tab / pill
  tabPill: ['#FFFDFC', '#FBF8F3'],
  tabPillActive: ['#282824', '#1D1D1B'],
  ocean: ['#1D1D1B', '#282824'],
  hero: ['#1D1D1B', '#282824'],
  cardAccent: ['transparent', 'transparent'],
};

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  subtle: {
    shadowColor: '#111210',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(17, 18, 16, 0.04), 0 1px 2px rgba(17, 18, 16, 0.02)',
      },
      default: {},
    }),
  },
  card: {
    shadowColor: '#111210',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px -2px rgba(17, 18, 16, 0.06), 0 1px 3px rgba(17, 18, 16, 0.03)',
      },
      default: {},
    }),
  },
  card3D: {
    shadowColor: '#111210',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 28px -4px rgba(17, 18, 16, 0.08), 0 2px 6px -1px rgba(17, 18, 16, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
      },
      default: {},
    }),
  },
  soft: {
    shadowColor: '#111210',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(17, 18, 16, 0.04)',
      },
      default: {},
    }),
  },
  large: {
    shadowColor: '#111210',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.10,
    shadowRadius: 28,
    elevation: 6,
    ...Platform.select({
      web: {
        boxShadow: '0 16px 36px -6px rgba(17, 18, 16, 0.10), 0 4px 12px rgba(17, 18, 16, 0.03)',
      },
      default: {},
    }),
  },
  buttonPrimary: {
    shadowColor: '#111210',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 3,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 14px rgba(17, 18, 16, 0.18), 0 1px 2px rgba(17, 18, 16, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      },
      default: {},
    }),
  },
  buttonSecondary: {
    shadowColor: '#111210',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(17, 18, 16, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
      },
      default: {},
    }),
  },
  glassFloat: {
    shadowColor: '#111210',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 5,
    ...Platform.select({
      web: {
        boxShadow: '0 12px 32px -4px rgba(17, 18, 16, 0.08), 0 2px 8px rgba(17, 18, 16, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.85)',
      },
      default: {},
    }),
  },
  champagneGlow: {
    shadowColor: '#E7D3B5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 2,
    ...Platform.select({
      web: {
        boxShadow: '0 0 16px rgba(231, 211, 181, 0.25)',
      },
      default: {},
    }),
  },
  hover: {
    shadowColor: '#111210',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px -2px rgba(17, 18, 16, 0.08)',
      },
      default: {},
    }),
  },
};

export const RADII = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  '2xl': 18,
  '3xl': 22,
  '4xl': 28,
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
