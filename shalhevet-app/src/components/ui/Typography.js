import React from 'react';
import { Text as RNText } from 'react-native';
import { theme } from '../../theme';

export const Typography = ({ 
  children, 
  variant = 'body', 
  style, 
  color, 
  weight, 
  align = 'right', // ברירת מחדל ליישור ימינה בשביל עברית
  allowFontScaling = true,
  maxFontSizeMultiplier = 1.6,
  accessibilityRole,
  ...props 
}) => {
  
  const getStyle = () => {
    switch(variant) {
      case 'h1':
        return {
          fontSize: theme.typography.sizes.xxl,
          lineHeight: theme.typography.lineHeights.xxl,
          fontWeight: 'bold',
          color: theme.colors.white,
          fontFamily: theme.typography.fontFamily.bold,
        };
      case 'h2':
        return {
          fontSize: theme.typography.sizes.xl,
          lineHeight: theme.typography.lineHeights.xl,
          fontWeight: 'bold',
          color: theme.colors.white,
          fontFamily: theme.typography.fontFamily.bold,
        };
      case 'h3':
        return {
          fontSize: theme.typography.sizes.lg,
          lineHeight: theme.typography.lineHeights.lg,
          fontWeight: '600',
          color: theme.colors.white,
          fontFamily: theme.typography.fontFamily.medium,
        };
      case 'caption':
        return {
          fontSize: theme.typography.sizes.sm,
          lineHeight: theme.typography.lineHeights.sm,
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.fontFamily.regular,
        };
      case 'label':
        return {
          fontSize: theme.typography.sizes.xs,
          lineHeight: theme.typography.lineHeights.xs,
          color: theme.colors.textMuted,
          fontFamily: theme.typography.fontFamily.regular,
        };
      case 'body':
      default:
        return {
          fontSize: theme.typography.sizes.md,
          lineHeight: theme.typography.lineHeights.md,
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamily.regular,
        };
    }
  };

  const computedAccessibilityRole =
    accessibilityRole || (variant === 'h1' || variant === 'h2' || variant === 'h3' ? 'header' : undefined);

  return (
    <RNText 
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      accessibilityRole={computedAccessibilityRole}
      style={[
        getStyle(),
        { textAlign: align },
        color && { color },
        weight && { fontWeight: weight },
        style
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};
