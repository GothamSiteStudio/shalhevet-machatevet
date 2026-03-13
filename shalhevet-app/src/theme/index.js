export * from './colors';
export * from './spacing';
export * from './typography';
import { COLORS } from './colors';
import { SPACING } from './spacing';
import { TYPOGRAPHY } from './typography';

export const theme = {
  colors: COLORS,
  spacing: SPACING,
  typography: TYPOGRAPHY,
  
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 28,
    round: 9999, // Perfect circle, e.g., for avatars
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.34,
      shadowRadius: 6.27,
      elevation: 5,
    },
    glow: {
      shadowColor: COLORS.primary, // Red/Orange glow
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 8, // For Android
    }
  }
};

export default theme;
