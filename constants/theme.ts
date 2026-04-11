import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    // Core text
    text: '#1a1a2e',
    textSecondary: '#4a4a68',
    textTertiary: '#8e8ea0',
    // Surfaces
    background: '#f5f5f7',
    surface: '#eeeef0',
    surfaceElevated: '#ffffff',
    border: '#d8d8de',
    // Brand — teal/cyan for biotech feel
    primary: '#0891b2',
    primaryDark: '#0e7490',
    primaryLight: '#ecfeff',
    primaryMuted: '#cffafe',
    // Semantic
    success: '#10b981',
    successLight: '#ecfdf5',
    warning: '#f59e0b',
    warningLight: '#fffbeb',
    danger: '#ef4444',
    dangerLight: '#fef2f2',
    // Accent — warm amber for contrast
    accent: '#f97316',
    accentLight: '#fff7ed',
    // Navigation
    tabBar: '#ffffff',
    tabBarBorder: '#e5e5ea',
    icon: '#8e8ea0',
    iconActive: '#0891b2',
    // Cards
    card: '#ffffff',
    cardBorder: '#e5e5ea',
    cardHighlight: '#f0fdfa',
    // Inputs
    input: '#f0f0f2',
    inputBorder: '#d1d1d6',
    inputFocusBorder: '#0891b2',
    // Misc
    shadow: 'rgba(0, 0, 0, 0.08)',
    gradient1: '#0891b2',
    gradient2: '#06b6d4',
  },
  dark: {
    // Core text
    text: '#f0f0f5',
    textSecondary: '#a0a0b8',
    textTertiary: '#6b6b80',
    // Surfaces
    background: '#0c0c1d',
    surface: '#161630',
    surfaceElevated: '#1e1e3a',
    border: '#2a2a45',
    // Brand
    primary: '#22d3ee',
    primaryDark: '#06b6d4',
    primaryLight: '#0c2d3f',
    primaryMuted: '#164e63',
    // Semantic
    success: '#34d399',
    successLight: '#064e3b',
    warning: '#fbbf24',
    warningLight: '#451a03',
    danger: '#f87171',
    dangerLight: '#450a0a',
    // Accent
    accent: '#fb923c',
    accentLight: '#431407',
    // Navigation
    tabBar: '#161630',
    tabBarBorder: '#2a2a45',
    icon: '#6b6b80',
    iconActive: '#22d3ee',
    // Cards
    card: '#161630',
    cardBorder: '#2a2a45',
    cardHighlight: '#0c2d3f',
    // Inputs
    input: '#1e1e3a',
    inputBorder: '#2a2a45',
    inputFocusBorder: '#22d3ee',
    // Misc
    shadow: 'rgba(0, 0, 0, 0.4)',
    gradient1: '#22d3ee',
    gradient2: '#06b6d4',
  },
} as const;

export type ThemeColors = (typeof Colors)['light' | 'dark'];

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  title: 28,
  hero: 36,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  }),
} as const;
