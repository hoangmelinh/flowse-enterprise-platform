import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { radius, Colors, makeStyles } from '../../../core/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

// Logo khối Flowse: Không gian → Thư mục → Danh sách → Công việc (dưới lên), cùng bộ màu khối C01.
const BLOCKS = [
  ['#5fd3c6', '#0e7c74', '#0a5e58'],
  ['#f6c36b', '#c98512', '#9a650c'],
  ['#9db8f7', '#2f5fd0', '#2249a6'],
  ['#f59a8f', '#c9473b', '#9c3329'],
] as const;

export const FlowseMark: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56" accessibilityLabel="Flowse">
    {BLOCKS.map(([top, left, right], i) => {
      const y = 30 - i * 10; // khối dưới vẽ trước, khối trên đè lên mặt trên của khối dưới
      return (
        <React.Fragment key={i}>
          <Polygon points={`16,${y + 7} 28,${y + 14} 28,${y + 27} 16,${y + 20}`} fill={left} />
          <Polygon points={`28,${y + 14} 40,${y + 7} 40,${y + 20} 28,${y + 27}`} fill={right} />
          <Polygon points={`28,${y} 40,${y + 7} 28,${y + 14} 16,${y + 7}`} fill={top} />
        </React.Fragment>
      );
    })}
  </Svg>
);

/** Một khối màu đầu dòng Không gian / Dự án (C01, C12); màu xoay vòng theo thứ tự. */
export const SpaceMark: React.FC<{ index: number }> = ({ index }) => {
  const [top, left, right] = BLOCKS[index % BLOCKS.length];
  return (
    <Svg width={28} height={32} viewBox="16 0 24 27">
      <Polygon points="16,7 28,14 28,27 16,20" fill={left} />
      <Polygon points="28,14 40,7 40,20 28,27" fill={right} />
      <Polygon points="28,0 40,7 28,14 16,7" fill={top} />
    </Svg>
  );
};

export const FlowseWordmark: React.FC = () => (
  <View style={styles.row}>
    <FlowseMark />
    <AppText variant="brand">Flowse</AppText>
  </View>
);

export const GoogleLogo: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path
      fill="#FBBC05"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <Path
      fill="#EA4335"
      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
    />
    <Path
      fill="#34A853"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
    />
    <Path
      fill="#4285F4"
      d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </Svg>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});

/** Ngôi sao Flowse AI tô gradient cùng bộ màu viền L01 (xanh ngọc → xanh dương → tím → hồng). */
export const AISparkle: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Defs>
      <LinearGradient id="ai" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#2DD4BF" />
        <Stop offset="0.4" stopColor="#3B82F6" />
        <Stop offset="0.75" stopColor="#8B5CF6" />
        <Stop offset="1" stopColor="#EC4899" />
      </LinearGradient>
    </Defs>
    <Path d="M11 2C11.7 7.6 13.9 9.8 19.5 10.5C13.9 11.2 11.7 13.4 11 19C10.3 13.4 8.1 11.2 2.5 10.5C8.1 9.8 10.3 7.6 11 2Z" fill="url(#ai)" />
    <Path d="M19 14.5C19.25 16.6 19.9 17.25 22 17.5C19.9 17.75 19.25 18.4 19 20.5C18.75 18.4 18.1 17.75 16 17.5C18.1 17.25 18.75 16.6 19 14.5Z" fill="url(#ai)" />
  </Svg>
);

/** Nút mở Flowse AI ở đầu trang chủ: ngôi sao + chữ, viền gradient quay chậm. */
export const AIButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const s = useStyles();
  const reduce = useReducedMotion();
  const spin = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    spin.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(spin);
  }, [reduce, spin]);
  // Tấm gradient lớn xoay phía sau, viên nhộng cắt đi chỉ còn lộ viền 1.5px
  const rotate = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel="Mở Flowse AI" onPress={onPress} hitSlop={10} style={s.ring}>
      <Animated.View style={[s.spinner, rotate]}>
        <Svg width={SPIN} height={SPIN}>
          <Defs>
            <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#2DD4BF" />
              <Stop offset="0.35" stopColor="#3B82F6" />
              <Stop offset="0.65" stopColor="#8B5CF6" />
              <Stop offset="1" stopColor="#EC4899" />
            </LinearGradient>
          </Defs>
          <Rect width={SPIN} height={SPIN} fill="url(#ring)" />
        </Svg>
      </Animated.View>
      <View style={s.ai}>
        <AISparkle size={12} />
        <AppText variant="label" style={{ fontSize: 11, lineHeight: 14 }}>
          Flowse AI
        </AppText>
      </View>
    </PressableScale>
  );
};

const SPIN = 120;

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    ring: { height: 26, padding: 1.5, borderRadius: radius.full, overflow: 'hidden', backgroundColor: c.line },
    spinner: { position: 'absolute', width: SPIN, height: SPIN, top: '50%', left: '50%', marginTop: -SPIN / 2, marginLeft: -SPIN / 2 },
    ai: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, borderRadius: radius.full, backgroundColor: c.surface },
  })
);
