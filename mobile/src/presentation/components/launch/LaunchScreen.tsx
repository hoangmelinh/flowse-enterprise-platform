import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Polygon, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useColors } from '../../../core/theme';
import { AppText } from '../ui';
import { Building, FACTORY, OFFICE, LINK, LINK_PATH, SMOKE, SCENE_W, SCENE_H } from './isoScene';

// Thời lượng theo Spec "Chuyển động 3D": 0→500 ms vào cảnh, 500→900 ms gói dữ liệu chạy, giữ rồi mờ sang Đăng nhập
const PLAY_MS = 900;
const HOLD_MS = 600;
const FADE_MS = 240;

const BuildingSvg: React.FC<{ b: Building; id: string }> = ({ b, id }) => (
  <Svg width={b.width} height={b.height}>
    <Defs>
      {b.polys.map((p, i) =>
        p.gradient ? (
          <LinearGradient key={i} id={`${id}${i}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={p.gradient[0]} />
            <Stop offset="1" stopColor={p.gradient[1]} />
          </LinearGradient>
        ) : null
      )}
    </Defs>
    {b.polys.map((p, i) => (
      <Polygon key={i} points={p.points} fill={p.gradient ? `url(#${id}${i})` : p.fill} opacity={p.opacity} />
    ))}
  </Svg>
);

/** Toà nhà trượt vào từ ngoài cảnh và hiện rõ dần (A00 → A01). */
const SlideIn: React.FC<{ b: typeof FACTORY; dir: 1 | -1; progress: SharedValue<number>; id: string }> = ({
  b,
  dir,
  progress,
  id,
}) => {
  const style = useAnimatedStyle(() => {
    const t = interpolate(progress.value, [0, 0.55], [1, 0], Extrapolation.CLAMP);
    return {
      opacity: 1 - 0.65 * t,
      transform: [{ translateX: -40 * dir * t }, { translateY: 22 * dir * t }],
    };
  });
  return (
    <Animated.View style={[styles.abs, { left: b.x, top: b.y }, style]}>
      <BuildingSvg b={b} id={id} />
    </Animated.View>
  );
};

const Puff: React.FC<{ p: (typeof SMOKE)[number]; i: number; progress: SharedValue<number> }> = ({ p, i, progress }) => {
  const style = useAnimatedStyle(() => {
    // cụm thấp hiện trước, cụm cao hiện sau: khói "bốc lên"
    const start = 0.3 + (i / SMOKE.length) * 0.5;
    const t = interpolate(progress.value, [start, start + 0.25], [0, 1], Extrapolation.CLAMP);
    return { opacity: p.opacity * t, transform: [{ translateY: 10 * (1 - t) }, { scale: 0.6 + 0.4 * t }] };
  });
  return (
    <Animated.View style={[styles.abs, { left: p.x, top: p.y, width: p.size, height: p.size * 0.82 }, style]}>
      <Svg width={p.size} height={p.size * 0.82}>
        <Defs>
          <RadialGradient id={`s${i}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={p.color} stopOpacity={1} />
            <Stop offset="0.5" stopColor={p.color} stopOpacity={0.75} />
            <Stop offset="1" stopColor={p.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Path
          d={`M0 ${(p.size * 0.41).toFixed(1)} a${p.size / 2} ${p.size * 0.41} 0 1 0 ${p.size} 0 a${p.size / 2} ${p.size * 0.41} 0 1 0 ${-p.size} 0`}
          fill={`url(#s${i})`}
        />
      </Svg>
    </Animated.View>
  );
};

/** Gói dữ liệu chạy dọc tuyến từ nhà máy sang văn phòng (A01 → A01b). */
const Packet: React.FC<{ offset: number; progress: SharedValue<number>; fill: string; ring: string }> = ({
  offset,
  progress,
  fill,
  ring,
}) => {
  const { S0, C0, E0 } = LINK;
  const style = useAnimatedStyle(() => {
    const t = interpolate(progress.value, [0.55, 1], [0.04 + offset, 0.4 + offset * 3.25], Extrapolation.CLAMP);
    const u = 1 - t;
    const x = u * u * S0[0] + 2 * u * t * C0[0] + t * t * E0[0];
    const y = u * u * S0[1] + 2 * u * t * C0[1] + t * t * E0[1];
    return {
      opacity: interpolate(progress.value, [0.5, 0.6], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateX: x - 6 }, { translateY: y - 6 }],
    };
  });
  return <Animated.View style={[styles.packet, { backgroundColor: fill, borderColor: ring }, style]} />;
};

export const LaunchScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const c = useColors();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const fade = useSharedValue(1);

  useEffect(() => {
    const finish = () => {
      fade.value = withDelay(reduceMotion ? 500 : HOLD_MS, withTiming(0, { duration: FADE_MS }, (done) => {
        if (done) scheduleOnRN(onDone);
      }));
    };
    if (reduceMotion) {
      finish();
      return;
    }
    progress.value = withTiming(1, { duration: PLAY_MS, easing: Easing.inOut(Easing.cubic) }, (done) => {
      if (done) scheduleOnRN(finish);
    });
  }, [fade, progress, reduceMotion, onDone]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const linkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.45, 0.6], [0, 1], Extrapolation.CLAMP),
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.55, 1], [0.15, 0.5, 1]),
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.6, 1], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }, rootStyle]}
      accessibilityLabel="Flowse đang khởi động"
      pointerEvents="none"
    >
      <View style={styles.stage}>
        <View style={styles.scene}>
          <SlideIn b={FACTORY} dir={1} progress={progress} id="f" />
          {SMOKE.map((p, i) => (
            <Puff key={i} p={p} i={i} progress={progress} />
          ))}
          <SlideIn b={OFFICE} dir={-1} progress={progress} id="o" />
          <Animated.View style={[StyleSheet.absoluteFill, linkStyle]}>
            <Svg width={SCENE_W} height={SCENE_H}>
              <Path
                d={LINK_PATH}
                fill="none"
                stroke={c.accent}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray="2 7"
              />
            </Svg>
          </Animated.View>
          {[0, 0.08, 0.16].map((o) => (
            <Packet key={o} offset={o} progress={progress} fill={c.accent} ring={c.surface} />
          ))}
        </View>
      </View>
      <View style={styles.wordmark}>
        <Animated.View style={titleStyle}>
          <AppText variant="title" style={styles.brand}>
            Flowse
          </AppText>
        </Animated.View>
        <Animated.View style={taglineStyle}>
          <AppText tone="muted">Nhà máy và văn phòng, chung một luồng việc.</AppText>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scene: { width: SCENE_W, height: SCENE_H },
  abs: { position: 'absolute' },
  packet: { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 2.5 },
  wordmark: { paddingHorizontal: 28, paddingBottom: 56, gap: 8 },
  brand: { fontSize: 40, lineHeight: 48 },
});
