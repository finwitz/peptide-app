import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    text: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#94a3b8',
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceElevated: '#ffffff',
    border: '#e2e8f0',
    primary: '#3b82f6',
    primaryDark: '#1e40af',
    primaryLight: '#eff6ff',
    success: '#22c55e',
    successLight: '#f0fdf4',
    warning: '#f59e0b',
    warningLight: '#fffbeb',
    danger: '#ef4444',
    dangerLight: '#fef2f2',
    accent: '#8b5cf6',
    tabBar: '#ffffff',
    tabBarBorder: '#e2e8f0',
    icon: '#64748b',
    iconActive: '#3b82f6',
    card: '#ffffff',
    cardBorder: '#e2e8f0',
    input: '#f1f5f9',
    inputBorder: '#cbd5e1',
    inputFocusBorder: '#3b82f6',
    shadow: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
    background: '#0f172a',
    surface: '#1e293b',
    surfaceElevated: '#334155',
    border: '#334155',
    primary: '#60a5fa',
    primaryDark: '#3b82f6',
    primaryLight: '#1e3a5f',
    success: '#4ade80',
    successLight: '#14532d',
    warning: '#fbbf24',
    warningLight: '#422006',
    danger: '#f87171',
    dangerLight: '#450a0a',
    accent: '#a78bfa',
    tabBar: '#1e293b',
    tabBarBorder: '#334155',
    icon: '#94a3b8',
    iconActive: '#60a5fa',
    card: '#1e293b',
    cardBorder: '#334155',
    input: '#334155',
    inputBorder: '#475569',
    inputFocusBorder: '#60a5fa',
    shadow: 'rgba(0, 0, 0, 0.3)',
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
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;
