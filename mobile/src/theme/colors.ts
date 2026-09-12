/**
 * Sanad Design System Colors
 * Optimized for high contrast (WCAG AAA) and dark mode baseline.
 */
export const colors = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2C2C2C',
  surfaceBorder: '#3D3D3D',

  textPrimary: '#FFFFFF',
  textSecondary: '#E0E0E0',
  textMuted: '#A0A0A0',

  primary: '#2E7D32', // Accessible Green
  primaryText: '#FFFFFF',
  accent: '#81C784',

  danger: '#D32F2F', // High contrast red
  dangerText: '#FFFFFF',

  warning: '#F57C00',
  warningText: '#FFFFFF',

  info: '#1976D2',
  infoText: '#FFFFFF',

  // High visibility accessibility focus outline
  focusOutline: '#FFD600',
  screenCurtain: '#000000',
} as const;

export type ThemeColors = typeof colors;
