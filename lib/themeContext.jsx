import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK_COLORS, LIGHT_COLORS, TYPOGRAPHY, GRADIENTS, SHADOWS, RADII, FONTS } from './theme';

export const THEME_STORAGE_KEY = '@maybewe_theme_preference';

const ThemeContext = createContext({
  theme: 'dark',
  isDark: true,
  colors: DARK_COLORS,
  typography: TYPOGRAPHY,
  gradients: GRADIENTS,
  shadows: SHADOWS,
  radii: RADII,
  fonts: FONTS,
  setTheme: () => {},
});

export function ThemeProvider({ children, initialTheme }) {
  const [theme, setThemeState] = useState(initialTheme || 'dark');

  // Load saved theme preference on initial mount
  useEffect(() => {
    async function loadTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && (saved === 'dark' || saved === 'light')) {
          setThemeState(saved);
        }
      } catch (err) {
        console.warn('Failed to load theme preference:', err);
      }
    }
    loadTheme();
  }, []);

  // Synchronize web document background & dataset
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      if (document.body) {
        document.body.setAttribute('data-theme', theme);
        document.body.style.backgroundColor = theme === 'light' ? '#E8EDF4' : '#030a10';
      }
    }
  }, [theme]);

  const setTheme = async (newTheme) => {
    if (newTheme !== 'dark' && newTheme !== 'light') return;
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (err) {
      console.warn('Failed to persist theme preference:', err);
    }
  };

  const isDark = theme === 'dark';
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        colors,
        typography: TYPOGRAPHY,
        gradients: GRADIENTS,
        shadows: SHADOWS,
        radii: RADII,
        fonts: FONTS,
        setTheme,
      }}
    >
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
