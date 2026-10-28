import { Platform } from "react-native";

// ============================================================
// MaybeWe — Alabaster, French Linen & Champagne Gold
// Quiet Luxury Concierge Design System
//
// Master Brand Tokens:
//   Background:         #FAF8F5 (Alabaster French Linen)
//   Surface Cards:      #FFFFFF (Silk Ivory) with border: 1px solid rgba(197, 168, 128, 0.28)
//   Surface Secondary:  #F4EFEB (Warm Cashmere Sand)
//   Primary Contrast:   #1C1917 (Warm Espresso / Deep Obsidian — NEVER #000000)
//   Accent:             #C5A880 & #D4AF37 (Champagne Gold / Muted Brass)
//   Text Primary:       #1E1B18 (Deep Warm Charcoal)
//   Text Muted:         #7D756D (Cashmere Taupe)
//   Dividers:           rgba(28, 25, 23, 0.06)
// ============================================================

export const LUXURY_TOKENS = {
  background: "#FAF8F5",
  surfaceCards: "#FFFFFF",
  surfaceCardsBorder: "rgba(197, 168, 128, 0.28)",
  surfaceSecondary: "#F4EFEB",
  primaryContrast: "#1C1917",
  accent: "#C5A880",
  accentGold: "#D4AF37",
  textPrimary: "#1E1B18",
  textMuted: "#7D756D",
  dividers: "rgba(28, 25, 23, 0.06)",
  radii: {
    pills: 9999,
    buttons: 9999,
    cards: 24,
    containers: 24,
    inputFields: 16,
    full: 9999,
  },
  shadows: {
    soft: {
      shadowColor: "#1C1917",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.04,
      shadowRadius: 20,
      elevation: 2,
    },
    card: {
      shadowColor: "#1C1917",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.04,
      shadowRadius: 20,
      elevation: 2,
    },
  },
};

export const FONTS = {
  regular: Platform.select({ web: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif", default: "Manrope_400Regular" }),
  medium: Platform.select({ web: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif", default: "Manrope_500Medium" }),
  semiBold: Platform.select({ web: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif", default: "Manrope_600SemiBold" }),
  bold: Platform.select({ web: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif", default: "Manrope_700Bold" }),
  extraBold: Platform.select({ web: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif", default: "Manrope_800ExtraBold" }),
};

export const TYPOGRAPHY = {
  hero: {
    fontFamily: FONTS.extraBold,
    fontWeight: "800",
    fontSize: 34,
    lineHeight: 44,
    letterSpacing: -0.8,
    color: "#1E1B18",
  },
  display: {
    fontFamily: FONTS.extraBold,
    fontWeight: "800",
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.6,
    color: "#1E1B18",
  },
  headingLarge: {
    fontFamily: FONTS.bold,
    fontWeight: "700",
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.4,
    color: "#1E1B18",
  },
  heading2: {
    fontFamily: FONTS.bold,
    fontWeight: "700",
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: "#1E1B18",
  },
  sectionHeading: {
    fontFamily: FONTS.bold,
    fontWeight: "700",
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: "#1E1B18",
  },
  cardTitle: {
    fontFamily: FONTS.semiBold,
    fontWeight: "600",
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: "#1E1B18",
  },
  cardTitleBold: {
    fontFamily: FONTS.bold,
    fontWeight: "700",
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: "#1E1B18",
  },
  body: {
    fontFamily: FONTS.regular,
    fontWeight: "400",
    fontSize: 15,
    lineHeight: 24,
    color: "#4A443E",
  },
  bodyMedium: {
    fontFamily: FONTS.medium,
    fontWeight: "500",
    fontSize: 15,
    lineHeight: 24,
    color: "#1E1B18",
  },
  bodySmall: {
    fontFamily: FONTS.regular,
    fontWeight: "400",
    fontSize: 13,
    lineHeight: 20,
    color: "#7D756D",
  },
  button: {
    fontFamily: FONTS.semiBold,
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: -0.1,
  },
  buttonBold: {
    fontFamily: FONTS.bold,
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: -0.1,
  },
  navLabel: {
    fontFamily: FONTS.semiBold,
    fontWeight: "600",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  eyebrow: {
    fontFamily: FONTS.bold,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "#7D756D",
  },
  stats: {
    fontFamily: FONTS.bold,
    fontWeight: "700",
    fontSize: 18,
    color: "#1E1B18",
  },
  caption: {
    fontFamily: FONTS.medium,
    fontWeight: "500",
    fontSize: 12,
    lineHeight: 18,
    color: "#7D756D",
  },
};

export const SURFACES = {
  pearl: "#FAF8F5",
  warmIvory: "#FAF8F5",
  silk: "#FFFFFF",
  softChampagne: "#C5A880",
  mistSage: "#F4EFEB",
  powderBlue: "#F4EFEB",
  warmSand: "#F4EFEB",
  softRose: "#FAF8F5",
  stone: "rgba(197, 168, 128, 0.28)",
};

export const TEXT = {
  obsidian: "#1C1917",
  graphite: "#1C1917",
  warmCharcoal: "#1E1B18",
  muted: "#7D756D",
};

export const ACCENTS = {
  champagneGold: "#C5A880",
  deepOlive: "#2C3E35",
  mutedTerracotta: "#A96F5C",
  deepOcean: "#3B5360",
  gold: "#D4AF37",
  mutedBrass: "#D4AF37",
};

export const GLASS_MATERIALS = {
  light: {
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderColor: "rgba(197, 168, 128, 0.28)",
  },
  pearl: {
    backgroundColor: "rgba(250, 248, 245, 0.92)",
    borderColor: "rgba(197, 168, 128, 0.28)",
  },
  champagne: {
    backgroundColor: "rgba(197, 168, 128, 0.16)",
    borderColor: "rgba(197, 168, 128, 0.35)",
  },
  sage: {
    backgroundColor: "rgba(244, 239, 235, 0.70)",
    borderColor: "rgba(197, 168, 128, 0.20)",
  },
};

// Native Android Card Surface & Border Tokens
// High-opacity surfaces prevent Android hardware elevation shadow bleed-through.
// Defined with explicit contrast against Alabaster background (#FAF8F5).
export const ANDROID_CARD_SURFACES = {
  pearl: "#FFFFFF", // High-reflectance ivory; prevents shadow bleed-through
  light: "#FFFFFF",
  champagne: "#FAF6F0",
  sage: "#F5F2EC",
  surfaceBorder: "rgba(197, 168, 128, 0.40)", // 1.32:1 contrast against Alabaster (#FAF8F5)
  surfaceBorderElevated: "rgba(197, 168, 128, 0.52)",
};

export const PALETTE = {
  pearl: "#FAF8F5",
  warmIvory: "#FAF8F5",
  silk: "#FFFFFF",
  softChampagne: "#C5A880",
  mistSage: "#F4EFEB",
  powderBlue: "#F4EFEB",
  warmSand: "#F4EFEB",
  softRose: "#FAF8F5",
  stone: "rgba(197, 168, 128, 0.28)",
  obsidian: "#1C1917",
  graphite: "#1C1917",
  warmCharcoal: "#1E1B18",
  muted: "#7D756D",
  champagneGold: "#C5A880",
  deepOlive: "#2C3E35",
  mutedTerracotta: "#A96F5C",
  deepOcean: "#3B5360",
  softPearl: "#FAF8F5",
  deepCharcoal: "#1E1B18",
  softStone: "rgba(197, 168, 128, 0.28)",
  warmGrey: "#7D756D",
  textPrimary: "#1E1B18",
  textSecondary: "#4A443E",
  textMuted: "#7D756D",
  champagne: "#C5A880",
  champagneHighlight: "#C5A880",
  deepBronze: "#8E7355",
  deepForest: "#2C3E35",
  warmOffWhite: "#FAF8F5",
  softIvory: "#FAF8F5",
  white: "#FFFFFF",
  lightGrey: "#FAF8F5",
  borderGrey: "rgba(197, 168, 128, 0.28)",
  mediumGrey: "#4A443E",
  darkGrey: "#1C1917",
  nearBlack: "#1C1917",
};

export const DARK_COLORS = {
  mode: "dark",
  isDark: false, // Locked to luxury aesthetic
  background: "#FAF8F5",
  backgroundSecondary: "#F4EFEB",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  surfaceGlass: "rgba(255, 255, 255, 0.85)",
  surfaceGlassDark: "rgba(28, 25, 23, 0.90)",
  surfaceGlassUltra: "rgba(250, 248, 245, 0.92)",
  border: "rgba(197, 168, 128, 0.28)",
  borderLight: "rgba(28, 25, 23, 0.06)",
  borderGlass: "rgba(197, 168, 128, 0.28)",
  borderActive: "#C5A880",
  borderChampagne: "#C5A880",
  text: "#1E1B18",
  textPrimary: "#1E1B18",
  textSecondary: "#4A443E",
  textMuted: "#7D756D",
  textDisabled: "#B5AFA7",
  primary: "#1C1917",
  primaryContrast: "#1C1917",
  primaryText: "#FAF8F5",
  primaryLight: "#2B2724",
  primaryDark: "#141210",
  success: "#2C3E35",
  danger: "#8B3A3A",
  warning: "#C5A880",
  info: "#3B5360",
  overlay: "rgba(28, 25, 23, 0.40)",
  overlayHeavy: "rgba(28, 25, 23, 0.65)",
  overlayCard: "transparent",
  bgGradientOverlay: ["transparent", "transparent", "transparent"],
  heroGradientOverlay: ["transparent", "transparent", "transparent"],
  cardBg: "#FFFFFF",
  cardBackground: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "rgba(197, 168, 128, 0.28)",
  input: "#FFFFFF",
  inputBg: "#FFFFFF",
  inputBorder: "#E5DFD5",
  chipBg: "#F4EFEB",
  chipBorder: "rgba(197, 168, 128, 0.28)",
  tabBarBg: "rgba(250, 248, 245, 0.92)",
  modalBg: "#FFFFFF",
  surfaceSubtle: "#F4EFEB",
  surfaceCard: "#FFFFFF",
  textSecondaryLight: "#7D756D",
};

export const LIGHT_COLORS = {
  mode: "light",
  isDark: false,

  // ─── Background & Surface tokens ───
  background: "#FAF8F5",             // Alabaster French Linen
  backgroundSecondary: "#F4EFEB",    // Warm Cashmere Sand
  surface: "#FFFFFF",                // Silk Ivory
  surfaceElevated: "#FFFFFF",
  surfaceGlass: "rgba(255, 255, 255, 0.88)",
  surfaceGlassDark: "rgba(28, 25, 23, 0.90)",
  surfaceGlassUltra: "rgba(250, 248, 245, 0.92)",
  surfaceCard: "#FFFFFF",
  surfaceCards: "#FFFFFF",
  surfaceSecondary: "#F4EFEB",
  surfaceSubtle: "#F4EFEB",

  // ─── Borders & Dividers ───
  border: "rgba(197, 168, 128, 0.28)",
  borderLight: "rgba(28, 25, 23, 0.06)",
  borderGlass: "rgba(197, 168, 128, 0.28)",
  borderActive: "#C5A880",
  borderChampagne: "#C5A880",
  divider: "rgba(28, 25, 23, 0.06)",
  dividers: "rgba(28, 25, 23, 0.06)",

  // ─── Text: Deep Warm Charcoal & Cashmere Taupe ───
  text: "#1E1B18",
  textPrimary: "#1E1B18",
  textSecondary: "#4A443E",
  textMuted: "#7D756D",
  textDisabled: "#B5AFA7",
  textSecondaryLight: "#7D756D",

  // ─── Champagne Accents & Contrast ───
  champagne: "#C5A880",
  champagneHighlight: "#C5A880",
  accent: "#C5A880",
  accentGold: "#D4AF37",
  gold: "#D4AF37",
  brass: "#D4AF37",
  sand: "#F4EFEB",
  deepOlive: "#2C3E35",
  mutedTerracotta: "#A96F5C",
  deepOcean: "#3B5360",
  deepBronze: "#8E7355",
  deepForest: "#2C3E35",

  // ─── Brand Luxuries ───
  alabaster: "#FAF8F5",
  silkIvory: "#FFFFFF",
  warmSand: "#F4EFEB",
  warmEspresso: "#1C1917",
  obsidian: "#1C1917",
  cashmereTaupe: "#7D756D",

  // ─── Semantic ───
  success: "#2C3E35",
  successBg: "#F0F5F2",
  danger: "#8B3A3A",
  dangerBg: "#FDF2F2",
  warning: "#C5A880",
  warningBg: "#FAF5EE",
  info: "#3B5360",
  infoBg: "#F0F4F6",

  // ─── Overlays ───
  overlay: "rgba(28, 25, 23, 0.40)",
  overlayHeavy: "rgba(28, 25, 23, 0.65)",
  overlayCard: "transparent",
  bgGradientOverlay: ["transparent", "transparent", "transparent"],
  heroGradientOverlay: ["transparent", "transparent", "transparent"],

  // ─── Primary Contrast ───
  primary: "#1C1917",
  primaryContrast: "#1C1917",
  primaryText: "#FAF8F5",
  primaryLight: "#2B2724",
  primaryDark: "#141210",
  glassBg: "rgba(250, 248, 245, 0.92)",
  glassBorder: "rgba(197, 168, 128, 0.28)",

  // ─── Cards & Inputs ───
  cardBg: "#FFFFFF",
  cardBackground: "#FFFFFF",
  card: "#FFFFFF",
  cardBorder: "rgba(197, 168, 128, 0.28)",
  input: "#FFFFFF",
  inputBg: "#FFFFFF",
  inputBorder: "#E5DFD5",
  inputFocusBorder: "#C5A880",
  chipBg: "#F4EFEB",
  chipBorder: "rgba(197, 168, 128, 0.28)",

  // ─── Modal & TabBar ───
  modalBg: "#FFFFFF",
  tabBarBg: "rgba(250, 248, 245, 0.92)",
};

export const getThemeColors = (mode = "light") => {
  return LIGHT_COLORS;
};

export const getTheme = (mode = "light") => {
  return {
    mode: "light",
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

export const COLORS = LIGHT_COLORS;

export const GRADIENTS = {
  primary3D: ["#1C1917", "#282420", "#1C1917"],
  lavenderViolet: ["#1C1917", "#282420", "#1C1917"],
  peachLavender: ["#1C1917", "#282420", "#1C1917"],
  sunsetPeachViolet: ["#1C1917", "#282420", "#8E7355"],
  sunsetToNavy: ["#1C1917", "#282420", "#1C1917"],

  champagneReflect: ["#C5A880", "#FAF8F5", "#D4AF37"],
  champagneSubtle: ["rgba(197, 168, 128, 0.16)", "rgba(197, 168, 128, 0.02)"],
  pearlGlass: ["rgba(255, 255, 255, 0.95)", "rgba(250, 248, 245, 0.88)"],
  cardHighlight: ["rgba(255, 255, 255, 0.92)", "rgba(255, 255, 255, 0)"],
  ambientLight: ["rgba(197, 168, 128, 0.14)", "rgba(255, 255, 255, 0)"],

  heroOverlay: ["transparent", "rgba(250, 248, 245, 0.70)", "#FAF8F5"],
  heroOverlayTop: ["rgba(255, 255, 255, 0.85)", "transparent"],
  cardOverlay: ["transparent", "rgba(28, 25, 23, 0.65)"],
  cardOverlayMedium: ["transparent", "rgba(28, 25, 23, 0.40)"],
  darkBase: ["#FAF8F5", "#F4EFEB"],
  surface: ["#FFFFFF", "#FAF8F5"],
  glassGradient: ["rgba(255, 255, 255, 0.94)", "rgba(250, 248, 245, 0.88)"],

  morning: ["#FAF8F5", "#F4EFEB"],
  afternoon: ["#FAF8F5", "#F4EFEB"],
  sunset: ["#FAF8F5", "#F4EFEB"],
  night: ["#FAF8F5", "#F4EFEB"],

  tabPill: ["#FFFFFF", "#FAF8F5"],
  tabPillActive: ["#1C1917", "#2B2724"],
  ocean: ["#1C1917", "#282420"],
  hero: ["#1C1917", "#282420"],
  cardAccent: ["transparent", "transparent"],
};

export const SHADOWS = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  subtle: {
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    ...Platform.select({
      web: {
        boxShadow: "0 2px 6px rgba(28, 25, 23, 0.03)",
      },
      default: {},
    }),
  },
  card: {
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    ...Platform.select({
      web: {
        boxShadow: "0 8px 20px rgba(28, 25, 23, 0.04), 0 1px 3px rgba(28, 25, 23, 0.02)",
      },
      default: {},
    }),
  },
  card3D: {
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
    ...Platform.select({
      web: {
        boxShadow: "0 12px 28px -4px rgba(28, 25, 23, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9)",
      },
      default: {},
    }),
  },
  soft: {
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
    ...Platform.select({
      web: {
        boxShadow: "0 8px 20px rgba(28, 25, 23, 0.04)",
      },
      default: {},
    }),
  },
  large: {
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 6,
    ...Platform.select({
      web: {
        boxShadow: "0 16px 32px -6px rgba(28, 25, 23, 0.08), 0 4px 12px rgba(28, 25, 23, 0.03)",
      },
      default: {},
    }),
  },
  buttonPrimary: {
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
    ...Platform.select({
      web: {
        boxShadow: "0 4px 14px rgba(28, 25, 23, 0.16)",
      },
      default: {},
    }),
  },
  buttonSecondary: {
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    ...Platform.select({
      web: {
        boxShadow: "0 2px 8px rgba(28, 25, 23, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.95)",
      },
      default: {},
    }),
  },
  glassFloat: {
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 5,
    ...Platform.select({
      web: {
        boxShadow: "0 10px 24px -4px rgba(28, 25, 23, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.85)",
      },
      default: {},
    }),
  },
  champagneGlow: {
    shadowColor: "#C5A880",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 2,
    ...Platform.select({
      web: {
        boxShadow: "0 0 16px rgba(197, 168, 128, 0.25)",
      },
      default: {},
    }),
  },
  hover: {
    shadowColor: "#1C1917",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    ...Platform.select({
      web: {
        boxShadow: "0 6px 18px -2px rgba(28, 25, 23, 0.06)",
      },
      default: {},
    }),
  },
};

export const RADII = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
  "4xl": 28,
  card: 24,
  container: 24,
  input: 16,
  inputFields: 16,
  pill: 9999,
  pills: 9999,
  button: 9999,
  buttons: 9999,
  full: 9999,
};

export const RADIUS = RADII;

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 56,
};

export const TIME_THEMES = {
  morning: {
    label: "Morning",
    gradient: ["#FAF8F5", "#F4EFEB", "#C5A880"],
    accentColor: "#C5A880",
    greeting: "Good morning",
    tagline: "Fresh horizons await your journey.",
  },
  afternoon: {
    label: "Afternoon",
    gradient: ["#FAF8F5", "#F4EFEB", "#D4AF37"],
    accentColor: "#D4AF37",
    greeting: "Good afternoon",
    tagline: "Vibrant paths to explore together.",
  },
  sunset: {
    label: "Sunset",
    gradient: ["#FAF8F5", "#F4EFEB", "#C5A880"],
    accentColor: "#C5A880",
    greeting: "Good evening",
    tagline: "Golden hour connections across the globe.",
  },
  night: {
    label: "Night",
    gradient: ["#FAF8F5", "#F4EFEB", "#1C1917"],
    accentColor: "#D4AF37",
    greeting: "Good night",
    tagline: "Under the same stars. Finding kindred spirits.",
  },
};

export default {
  LUXURY_TOKENS,
  FONTS,
  TYPOGRAPHY,
  COLORS,
  GRADIENTS,
  SHADOWS,
  RADII,
  SPACING,
  TIME_THEMES,
};
