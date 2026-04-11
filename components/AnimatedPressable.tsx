import React, { useCallback, useRef } from 'react';
import {
  Pressable, Animated, type PressableProps, type ViewStyle, type StyleProp,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface Props extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleDown?: number;
  haptic?: 'light' | 'medium' | 'selection' | 'none';
}

export default function AnimatedPressable({
  children, style, scaleDown = 0.97, haptic = 'none', onPressIn, onPressOut, onPress, ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback((e: any) => {
    Animated.parallel([
      Animated.spring(scale, { toValue: scaleDown, useNativeDriver: true, speed: 50, bounciness: 4 }),
      Animated.timing(opacity, { toValue: 0.92, duration: 80, useNativeDriver: true }),
    ]).start();
    if (haptic === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (haptic === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (haptic === 'selection') Haptics.selectionAsync();
    onPressIn?.(e);
  }, [scaleDown, haptic, onPressIn]);

  const handlePressOut = useCallback((e: any) => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPressOut?.(e);
  }, [onPressOut]);

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>
      <Pressable
        {...rest}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
