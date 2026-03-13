import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  withDelay, 
  Easing 
} from 'react-native-reanimated';

export const FadeInView = ({ 
  children, 
  delay = 0, 
  duration = 500, 
  direction = 'up', // 'up', 'down', 'left', 'right', 'none'
  distance = 20,
  style 
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(direction === 'up' ? distance : direction === 'down' ? -distance : 0);
  const translateX = useSharedValue(direction === 'left' ? distance : direction === 'right' ? -distance : 0);

  useEffect(() => {
    opacity.value = withDelay(
      delay, 
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
    );
    
    translateY.value = withDelay(
      delay, 
      withTiming(0, { duration, easing: Easing.out(Easing.cubic) })
    );

    translateX.value = withDelay(
      delay, 
      withTiming(0, { duration, easing: Easing.out(Easing.cubic) })
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value }
      ],
    };
  });

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};
