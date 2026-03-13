import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  interpolateColor
} from 'react-native-reanimated';
import { theme } from '../../theme';

export const Skeleton = ({ width, height, borderRadius = theme.borderRadius.md, style }) => {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1, // -1 means infinite repeat
      true // reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      animatedValue.value,
      [0, 1],
      [theme.colors.cardLight, theme.colors.border]
    );

    return {
      backgroundColor,
    };
  });

  return (
    <Animated.View 
      style={[
        styles.skeleton, 
        { width, height, borderRadius }, 
        animatedStyle,
        style
      ]} 
    />
  );
};

// קומפוננטה חכמה שמייצרת שלד (Skeleton) למסך או כרטיסיה שלמה
export const SkeletonCard = () => {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.header}>
        <Skeleton width={50} height={50} borderRadius={25} />
        <View style={styles.headerText}>
          <Skeleton width={120} height={16} borderRadius={4} style={{ marginBottom: 8 }} />
          <Skeleton width={80} height={12} borderRadius={4} />
        </View>
      </View>
      <Skeleton width="100%" height={150} borderRadius={theme.borderRadius.md} style={{ marginTop: 16 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  cardContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: theme.spacing.md,
  }
});
