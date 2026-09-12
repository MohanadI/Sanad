/**
 * Typography scale for clear visibility and TalkBack compatibility.
 */
export const typography = {
  titleLarge: {
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  titleMedium: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
  bodyLarge: {
    fontSize: 18,
    fontWeight: '500' as const,
    lineHeight: 26,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  labelLarge: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
} as const;
