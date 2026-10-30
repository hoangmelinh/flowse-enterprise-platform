import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 18, stiffness: 420, mass: 0.6 };

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Mức thu nhỏ khi nhấn (thẻ lớn nên nhún ít hơn nút) */
  scaleTo?: number;
  /** Nền khi nhấn (dòng trong danh sách) — chạy trên luồng UI, không re-render */
  pressedBackground?: string;
}

/** Phản hồi chạm chạy hoàn toàn trên luồng UI (Reanimated), nên không giật khi JS bận. */
export const PressableScale: React.FC<PressableScaleProps> = ({
  style,
  scaleTo = 0.97,
  pressedBackground,
  onPressIn,
  onPressOut,
  children,
  ...rest
}) => {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: 1 - (1 - scaleTo) * pressed.value }] }));
  // Lớp phủ khi nhấn nằm dưới nội dung, không đè lên nền gốc (vd. dòng chưa đọc)
  const overlay = useAnimatedStyle(() => ({ opacity: pressed.value }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        pressed.value = withSpring(1, SPRING);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = withTiming(0, { duration: 160 });
        onPressOut?.(e);
      }}
      style={[style, animated]}
    >
      {pressedBackground ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: pressedBackground }, overlay]} />
      ) : null}
      {children as React.ReactNode}
    </AnimatedPressable>
  );
};
