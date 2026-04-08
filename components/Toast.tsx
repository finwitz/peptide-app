import React, { useEffect, useCallback, createContext, useContext, useState } from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withDelay, withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'success' | 'error' | 'info';

interface ToastConfig {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  show: (config: ToastConfig) => void;
}

const ToastContext = createContext<ToastContextType>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_COLORS: Record<ToastType, { bg: string; text: string; icon: string }> = {
  success: { bg: '#059669', text: '#ffffff', icon: 'checkmark-circle' },
  error: { bg: '#dc2626', text: '#ffffff', icon: 'alert-circle' },
  info: { bg: '#2563eb', text: '#ffffff', icon: 'information-circle' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const hide = useCallback(() => {
    setToast(null);
  }, []);

  const show = useCallback((config: ToastConfig) => {
    setToast(config);
    translateY.value = -120;
    opacity.value = 0;
    translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 200 });

    const duration = config.duration ?? 2500;
    translateY.value = withDelay(
      duration,
      withTiming(-120, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(hide)();
        }
      })
    );
    opacity.value = withDelay(duration, withTiming(0, { duration: 300 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const type = toast?.type ?? 'success';
  const colors = TOAST_COLORS[type];

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.container,
            animatedStyle,
            {
              backgroundColor: colors.bg,
              top: insets.top + 8,
            },
          ]}
          pointerEvents="none"
        >
          <Ionicons name={colors.icon as any} size={20} color={colors.text} />
          <Text style={[styles.text, { color: colors.text }]}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
});
