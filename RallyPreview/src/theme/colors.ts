export const Colors = {
  orange: '#FF6B35',
  orangeLight: '#FF8A5C',
  navy: '#131B2E',
  navyMid: '#1C2842',
  navyLight: '#243052',
  blue: '#2D9CDB',
  offWhite: '#F5F7FA',
  gray: '#8B95A5',
  grayDark: '#5A6373',
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FFCC00',
  transparent: 'transparent',
  overlay: 'rgba(0,0,0,0.5)',
  orangeAlpha: (a: number) => `rgba(255,107,53,${a})`,
  blueAlpha: (a: number) => `rgba(45,156,219,${a})`,
  successAlpha: (a: number) => `rgba(52,199,89,${a})`,
  grayAlpha: (a: number) => `rgba(139,149,165,${a})`,
  whiteAlpha: (a: number) => `rgba(255,255,255,${a})`,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};
