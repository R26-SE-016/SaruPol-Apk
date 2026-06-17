export const COLORS = {
  // Brand Palette
  primary: '#1B5E20',       // Deep Tropical Green
  primaryLight: '#4CAF50',  // Vibrant Green
  accent: '#FF8F00',        // Golden Coconut Amber
  accentLight: '#FFB300',   // Warm Gold
  
  // Neutral Theme Colors (Sleek Dark Mode)
  background: '#0A1F0D',     // Deep Forest Green
  surface: '#122617',        // Dark Leaf
  surfaceLight: '#1B3522',   // Lighter Leaf Green
  
  // Status Colors
  healthy: '#66BB6A',        // Fresh Healthy Green
  diseased: '#EF5350',       // Disease Warning Red
  warning: '#FFCA28',        // Caution Yellow
  info: '#29B6F6',           // Informational Blue
  
  // Text Colors
  textPrimary: '#F1F8E9',    // Soft White-Green
  textSecondary: '#A5D6A7',  // Muted Leaf Green
  textMuted: '#81C784',      // Highly Muted Green
  textDark: '#0A1F0D',       // Dark Contrast Text
  
  // Card Glass Color overlays
  glassBackground: 'rgba(27, 94, 32, 0.12)',
  glassBorder: 'rgba(76, 175, 80, 0.25)',
  glassShadow: 'rgba(0, 0, 0, 0.3)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const ROUNDING = {
  sm: 8,
  md: 16,
  lg: 24,
  full: 9999,
};

export const SHADOWS = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const GLASS_STYLE = {
  backgroundColor: COLORS.glassBackground,
  borderColor: COLORS.glassBorder,
  borderWidth: 1,
  borderRadius: ROUNDING.md,
  backdropFilter: 'blur(20px)', // web only fallback
};
