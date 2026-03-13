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
  ...props 
}) => {
  
  const getStyle = () => {
    switch(variant) {
      case 'h1': return { fontSize: theme.typography.sizes.xxl, fontWeight: 'bold', color: theme.colors.white };
      case 'h2': return { fontSize: theme.typography.sizes.xl, fontWeight: 'bold', color: theme.colors.white };
      case 'h3': return { fontSize: theme.typography.sizes.lg, fontWeight: '600', color: theme.colors.white };
      case 'caption': return { fontSize: theme.typography.sizes.sm, color: theme.colors.textSecondary };
      case 'label': return { fontSize: theme.typography.sizes.xs, color: theme.colors.textMuted };
      case 'body':
      default: return { fontSize: theme.typography.sizes.md, color: theme.colors.text };
    }
  };

  return (
    <RNText 
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
