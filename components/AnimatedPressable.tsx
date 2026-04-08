import React, { useCallback } from 'react';
import {
  Pressable, type PressableProps, type ViewStyle, type StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleDown?: number;
  haptic?: 'light' | 'medium' | 'selection' | 'none';
}

export default function AnimatedPressable({
  children, style, scaleDown = 0.97, haptic = 'none', onPressIn, onPressOut, onPress, ...rest
}: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback((e: any) => {
    scale.value = withSpring(scaleDown, { damping: 15, stiffness: 400 });
    opacity.value = withTiming(0.92, { duration: 80 });
    if (haptic === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (haptic === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (haptic === 'selection') Haptics.selectionAsync();
    onPressIn?.(e);
  }, [scaleDown, haptic, onPressIn]);

  const handlePressOut = useCallback((e: any) => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    opacity.value = withTiming(1, { duration: 120 });
    onPressOut?.(e);
  }, [onPressOut]);

  return (
    <AnimatedPressableBase
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressableBase>
  );
}
