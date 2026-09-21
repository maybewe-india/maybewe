import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_COLORS, LIGHT_COLORS, TYPOGRAPHY, GRADIENTS, SHADOWS, RADII, FONTS } from './theme';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { useAuth } from './authContext';

export const THEME_STORAGE_KEY = '@maybewe_theme_preference';

const defaultColors = LIGHT_COLORS;

const ThemeContext = createContext({
  currentTheme: 'light',
  theme: {
    mode: 'light',
    isDark: false,
    colors: defaultColors,
    typography: TYPOGRAPHY,
    gradients: GRADIENTS,
    shadows: SHADOWS,
    radii: RADII,
    fonts: FONTS,
  },
  themeTokens: {
    mode: 'light',
    isDark: false,
    colors: defaultColors,
    typography: TYPOGRAPHY,
    gradients: GRADIENTS,
    shadows: SHADOWS,
    radii: RADII,
    fonts: FONTS,
  },
  isDark: false,
  colors: defaultColors,
  typography: TYPOGRAPHY,
  gradients: GRADIENTS,
  shadows: SHADOWS,
  radii: RADII,
  fonts: FONTS,
  setTheme: async () => {},
  toggleTheme: async () => {},
  refreshThemeFromProfile: async () => {},
});

export function ThemeProvider({ children }) {
  // Read auth profile if ThemeProvider is inside AuthProvider
  let authContext = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    authContext = useAuth();
  } catch {
    // Rendered outside AuthProvider
  }
  const setThemePreference = authContext?.setThemePreference;

  // The application is permanently locked to Light Theme from start to end
  const currentTheme = 'light';
  const isDark = false;
  const colors = LIGHT_COLORS;

  // Ensure storage & web body style are permanently synchronized to light theme
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (document.body) {
        document.body.setAttribute('data-theme', 'light');
        document.body.style.backgroundColor = '#F6F8FB';
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
        } catch {}
      }
    }
    AsyncStorage.setItem(THEME_STORAGE_KEY, 'light').catch(() => {});
  }, []);

  // Safe no-op handlers for backward compatibility
  const setTheme = useCallback(async () => {}, []);
  const toggleTheme = useCallback(async () => {}, []);
  const refreshThemeFromProfile = useCallback(async () => 'light', []);

  const themeTokens = useMemo(() => ({
    mode: 'light',
    isDark: false,
    colors: LIGHT_COLORS,
    typography: TYPOGRAPHY,
    gradients: GRADIENTS,
    shadows: SHADOWS,
    radii: RADII,
    fonts: FONTS,
  }), []);

  const contextValue = useMemo(() => ({
    currentTheme: 'light',
    theme: themeTokens,
    themeTokens,
    isDark: false,
    colors: LIGHT_COLORS,
    typography: TYPOGRAPHY,
    gradients: GRADIENTS,
    shadows: SHADOWS,
    radii: RADII,
    fonts: FONTS,
    setTheme,
    toggleTheme,
    refreshThemeFromProfile,
  }), [themeTokens, setTheme, toggleTheme, refreshThemeFromProfile]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
