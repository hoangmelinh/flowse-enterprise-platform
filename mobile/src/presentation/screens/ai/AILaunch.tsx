import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing, Extrapolation, SharedValue, cancelAnimation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { space, useColors } from '../../../core/theme';
import { usePrefs } from '../../state/prefsStore';
import { AppText } from '../../components/ui';

// Màu nhận diện Flowse AI (Spec "Hiệu ứng mở Flowse AI"): chỉ dùng cho logo, không dùng cho trạng thái dữ liệu
const BARS = [
  { from: '#2DD4BF', to: '#3B82F6', w: 78, y: 30 },
  { from: '#8B5CF6', to: '#EC4899', w: 56, y: 54 },
  { from: '#F59E0B', to: '#F97316', w: 36, y: 78 },
];
const FULL = { value: 1 } as SharedValue<number>;

const Bar: React.FC<{ b: (typeof BARS)[number]; i: number; t: SharedValue<number>; k: number }> = ({ b, i, t, k }) => {
  // 3 thanh từ chấm nhỏ bật dài lệch nhịp 60 ms (0.055 của 1100 ms)
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(t.value, [0.1 + i * 0.055, 0.42 + i * 0.055], [0.18, 1], Extrapolation.CLAMP) }],
  }));
  const w = b.w * k;
  const h = 14 * k;
  return (
    <Animated.View style={[{ position: 'absolute', left: 22 * k, top: b.y * k, width: w, height: h, transformOrigin: 'left' }, style]}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={`b${i}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={b.from} />
            <Stop offset="1" stopColor={b.to} />
          </LinearGradient>
        </Defs>
        <Rect width={w} height={h} rx={h / 2} fill={`url(#b${i})`} />
      </Svg>
    </Animated.View>
  );
};

/** Logo Flowse AI: khối tối có độ dày + 3 thanh gradient. `t` = tiến trình mở 0→1 (bỏ trống = đứng yên đủ dài). */
export const AILogo: React.FC<{ size?: number; t?: SharedValue<number>; depth?: boolean }> = ({ size = 48, t = FULL, depth }) => {
  const k = size / 120;
  return (
    <View style={{ width: size, height: size }} accessibilityLabel="Flowse AI">
      {depth ? <View style={{ position: 'absolute', top: 8 * k, width: size, height: size, borderRadius: 32 * k, backgroundColor: '#051416' }} /> : null}
      <View style={{ width: size, height: size, borderRadius: 32 * k, backgroundColor: '#0B2326' }}>
        {BARS.map((b, i) => (
          <Bar key={b.from} b={b} i={i} t={t} k={k} />
        ))}
      </View>
    </View>
  );
};

const GLOW = 300;
const BLOBS = [
  { c: '#2DD4BF', x: 0.68, y: 0.38 },
  { c: '#3B82F6', x: 0.5, y: 0.7 },
  { c: '#8B5CF6', x: 0.3, y: 0.55 },
  { c: '#EC4899', x: 0.38, y: 0.3 },
  { c: '#F59E0B', x: 0.62, y: 0.26 },
];

// Lần mở sau trong cùng phiên chỉ hiện logo nhỏ 300 ms
let playedThisSession = false;

/** L00a–c — Hiệu ứng mở Flowse AI: logo lật vào, thanh bật dài, vầng sáng nhiều màu xoay, rồi mờ sang L01. */
export const AILaunch: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const c = useColors();
  const reduce = useReducedMotion() || !usePrefs((s) => s.anim3d);
  const [quick] = useState(() => playedThisSession || reduce);
  const t = useSharedValue(quick ? 1 : 0);
  const spin = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    playedThisSession = true;
    const out = (delay: number) => {
      fade.value = withDelay(delay, withTiming(0, { duration: quick ? 200 : 300 }, (done) => done && scheduleOnRN(onDone)));
    };
    if (quick) return out(300);
    t.value = withTiming(1, { duration: 1100, easing: Easing.linear });
    spin.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.linear }), -1, false);
    out(1100);
    return () => cancelAnimation(spin);
  }, [t, spin, fade, quick, onDone]);

  const root = useAnimatedStyle(() => ({ opacity: fade.value }));
  // 0 → 250 ms (0.227): 0.7 → 1.08; 600 ms (0.545): về 1.0. Lật từ nghiêng 3D về thẳng.
  const logo = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { scale: interpolate(t.value, [0, 0.227, 0.545], [0.7, 1.08, 1], Extrapolation.CLAMP) },
      { rotateX: `${interpolate(t.value, [0, 0.545], [38, 0], Extrapolation.CLAMP)}deg` },
      { rotateY: `${interpolate(t.value, [0, 0.545], [-32, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));
  const glow = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0.1, 0.45], [0, 1], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(t.value, [0.1, 0.545], [0.55, 1], Extrapolation.CLAMP) },
      { rotate: `${spin.value * 360 + interpolate(t.value, [0.1, 0.545], [-90, 0], Extrapolation.CLAMP)}deg` },
    ],
  }));
  const copy = useAnimatedStyle(() => {
    const v = interpolate(t.value, [0.545, 0.8], [0, 1], Extrapolation.CLAMP);
    return { opacity: v, transform: [{ translateY: 16 * (1 - v) }] };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: c.bg }, root]} accessibilityLabel="Đang mở Flowse AI">
      {quick ? (
        <AILogo size={72} />
      ) : (
        <>
          <View style={styles.stage}>
            <Animated.View style={[styles.glow, glow]} pointerEvents="none">
              <Svg width={GLOW} height={GLOW}>
                <Defs>
                  {BLOBS.map((b, i) => (
                    <RadialGradient key={i} id={`g${i}`} cx="50%" cy="50%" r="50%">
                      <Stop offset="0" stopColor={b.c} stopOpacity={0.55} />
                      <Stop offset="1" stopColor={b.c} stopOpacity={0} />
                    </RadialGradient>
                  ))}
                </Defs>
                {BLOBS.map((b, i) => (
                  <Circle key={i} cx={b.x * GLOW} cy={b.y * GLOW} r={GLOW * 0.3} fill={`url(#g${i})`} />
                ))}
              </Svg>
            </Animated.View>
            <Animated.View style={logo}>
              <AILogo size={112} t={t} depth />
            </Animated.View>
          </View>
          <Animated.View style={[styles.copy, copy]}>
            <AppText variant="title">Flowse AI</AppText>
            <AppText tone="muted">Đang chuẩn bị trợ lý cho ca làm của bạn</AppText>
          </Animated.View>
        </>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  stage: { width: GLOW, height: GLOW, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: GLOW, height: GLOW },
  copy: { alignItems: 'center', gap: space.sm, marginTop: space.sm },
});
