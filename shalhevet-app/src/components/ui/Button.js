import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme';

export const Button = ({ 
  title, 
  onPress, 
  variant = 'primary', // 'primary', 'secondary', 'outline', 'ghost'
  size = 'md', // 'sm', 'md', 'lg'
  icon,
  style,
  textStyle,
  disabled
}) => {
  const handlePress = () => {
    if (disabled) return;
    // הוספת פידבק רטט נעים בכל לחיצה לחווית משתמש יוקרתית
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress && onPress();
  };

  const getContainerStyle = () => {
    let paddingVertical = theme.spacing.md;
    
    if (size === 'sm') paddingVertical = theme.spacing.sm;
    if (size === 'lg') paddingVertical = theme.spacing.xl;

    return {
      paddingVertical,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.round, // עיצוב בצורת גלולה כמו באפליקציות פרימיום
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      opacity: disabled ? 0.5 : 1,
      ...style
    };
  };

  const getTextStyle = () => {
    let fontSize = theme.typography.sizes.md;
    
    if (size === 'sm') fontSize = theme.typography.sizes.sm;
    if (size === 'lg') fontSize = theme.typography.sizes.lg;

    let color = theme.colors.white;
    if (variant === 'outline' || variant === 'ghost') {
      color = theme.colors.primaryLight;
    }

    return {
      fontSize,
      fontWeight: '600',
      color,
      fontFamily: theme.typography.fontFamily.medium,
      marginLeft: icon ? theme.spacing.sm : 0,
      ...textStyle
    };
  };

  // כפתור ראשי עם גרדיאנט
  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8} disabled={disabled}>
        <LinearGradient
          colors={theme.colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[getContainerStyle(), theme.shadows.glow]} // אפקט הילה (Glow)
        >
          {icon}
          <Text style={getTextStyle()}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // שאר סוגי הכפתורים
  const staticContainerStyles = [
    getContainerStyle(),
    variant === 'secondary' && { backgroundColor: theme.colors.cardLight },
    variant === 'outline' && { borderWidth: 1, borderColor: theme.colors.primary },
    variant === 'ghost' && { backgroundColor: 'transparent' }
  ];

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={staticContainerStyles} disabled={disabled}>
      {icon}
      <Text style={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
};
