import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../theme';

export const Card = ({ children, style, variant = 'default' }) => {
  return (
    <View style={[
      styles.card, 
      variant === 'elevated' && theme.shadows.md,
      style
      ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  }
});
