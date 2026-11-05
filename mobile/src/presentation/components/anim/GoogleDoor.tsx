import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { usePrefs } from '../../state/prefsStore';
import { GoogleLogo } from '../ui/Brand';

// Màu khối Flowse (C01) cho cửa và nhân vật; logo Google giữ màu gốc của Google
const DOOR = '#0E7C74';
const DOOR_DARK = '#0A5E58';
const FRAME = '#141B2B';
const SKIN = '#F2C9A0';
const SHIRT = '#2F5FD0';
const PANTS = '#2249A6';
const DOTS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853'];

const W = 280;
const H = 220;
const DURATION = 2200;

/** Nội suy theo mốc 0..1 của cả cảnh, ngoài khoảng thì giữ giá trị đầu/cuối. */
const at = (t: number, input: number[], output: number[]) => {
  'worklet';
  return interpolate(t, input, output, Extrapolation.CLAMP);
};

/**
 * A11 — Đăng nhập bằng Google: nhân vật bước tới, với tay mở cửa (cửa xoay 3D quanh bản lề trái),
 * sau cửa hiện logo Google, nhân vật bước sang bên vẫy tay. Chạy một lần; giảm chuyển động hoặc tắt
 * Hiệu ứng 3D thì hiện thẳng khung cuối. `onOpened` gọi khi cửa đã mở để màn hình đi tiếp.
 */
export const GoogleDoor: React.FC<{ onOpened?: () => void }> = ({ onOpened }) => {
  const reduce = useReducedMotion() || !usePrefs((s) => s.anim3d);
  const t = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) {
      t.value = 1;
      onOpened?.();
      return;
    }
    t.value = withTiming(1, { duration: DURATION, easing: Easing.linear }, (done) => {
      if (done && onOpened) scheduleOnRN(onOpened);
    });
    // chỉ chạy một lần khi mở màn
  }, []);

  const door = useAnimatedStyle(() => {
    const open = Easing.out(Easing.cubic)(at(t.value, [0.34, 0.66], [0, 1]));
    return { transform: [{ perspective: 700 }, { rotateY: `${-78 * open}deg` }] };
  });
  // Mặt cửa tối dần khi quay ra xa, cho cảm giác chiều sâu thay vì bóng đổ
  const doorShade = useAnimatedStyle(() => ({ opacity: at(t.value, [0.34, 0.66], [0, 0.35]) }));
  const logo = useAnimatedStyle(() => ({
    opacity: at(t.value, [0.42, 0.58], [0, 1]),
    transform: [{ scale: at(t.value, [0.42, 0.62, 0.7], [0.4, 1.12, 1]) }],
  }));
  const walker = useAnimatedStyle(() => {
    const walk = at(t.value, [0, 0.26], [70, 0]) + at(t.value, [0.7, 0.84], [0, 26]);
    // nhún nhẹ theo bước chân lúc đang đi
    const step = t.value < 0.26 || (t.value > 0.7 && t.value < 0.84) ? Math.abs(Math.sin(t.value * 60)) * -3 : 0;
    return { transform: [{ translateX: walk }, { translateY: step }] };
  });
  const arm = useAnimatedStyle(() => {
    // Góc dương = quay về phía cửa (bên trái): với tay vào nắm cửa, rồi giơ lên vẫy
    const reach = at(t.value, [0.24, 0.34, 0.52, 0.6], [0, 72, 72, 0]);
    const wave = t.value > 0.84 ? at(t.value, [0.84, 0.88, 0.92, 0.96, 1], [0, 150, 115, 150, 135]) : 0;
    return { transform: [{ rotate: `${reach + wave}deg` }] };
  });

  return (
    <View style={styles.stage} accessibilityLabel="Nhân vật mở cửa, sau cửa là logo Google">
      <View style={styles.floor} />

      {/* Khung cửa và khoảng sáng phía sau, nơi logo Google hiện ra */}
      <View style={styles.frame}>
        <View style={styles.opening}>
          <Animated.View style={logo}>
            <GoogleLogo size={58} />
          </Animated.View>
          {DOTS.map((color, i) => (
            <Dot key={color} t={t} index={i} color={color} />
          ))}
        </View>
        <Animated.View style={[styles.door, door]}>
          <View style={styles.panelTop} />
          <View style={styles.panelBottom} />
          <View style={styles.knob} />
          <Animated.View style={[StyleSheet.absoluteFill, styles.shade, doorShade]} />
        </Animated.View>
      </View>

      {/* Nhân vật: thân vẽ SVG, cánh tay là lớp riêng xoay quanh vai */}
      <Animated.View style={[styles.person, walker]}>
        <Svg width={56} height={112} viewBox="0 0 56 112">
          <Path d="M17 10a11 11 0 0 1 22 0v3H17z" fill={FRAME} />
          <Circle cx={28} cy={16} r={11} fill={SKIN} />
          <Rect x={14} y={30} width={28} height={40} rx={10} fill={SHIRT} />
          <Rect x={16} y={66} width={10} height={36} rx={5} fill={PANTS} />
          <Rect x={30} y={66} width={10} height={36} rx={5} fill={PANTS} />
          <Rect x={12} y={100} width={16} height={7} rx={3.5} fill={FRAME} />
          <Rect x={28} y={100} width={16} height={7} rx={3.5} fill={FRAME} />
        </Svg>
        <Animated.View style={[styles.arm, arm]}>
          <View style={styles.sleeve} />
          <View style={styles.hand} />
        </Animated.View>
      </Animated.View>
    </View>
  );
};

/** Chấm màu Google bay ra khi logo hiện. */
const Dot: React.FC<{ t: SharedValue<number>; index: number; color: string }> = ({ t, index, color }) => {
  const angle = (index / DOTS.length) * Math.PI * 2 + 0.6;
  const style = useAnimatedStyle(() => {
    const p = at(t.value, [0.58, 0.82], [0, 1]);
    return {
      opacity: at(t.value, [0.58, 0.64, 0.82, 0.9], [0, 1, 1, 0]),
      transform: [{ translateX: Math.cos(angle) * 46 * p }, { translateY: Math.sin(angle) * 46 * p }],
    };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
};

const styles = StyleSheet.create({
  stage: { width: W, height: H, alignSelf: 'center' },
  floor: { position: 'absolute', left: 30, right: 30, bottom: 6, height: 12, borderRadius: 6, backgroundColor: 'rgba(20,27,43,0.08)' },
  frame: { position: 'absolute', left: 64, top: 12, width: 124, height: 196, borderTopLeftRadius: 14, borderTopRightRadius: 14, backgroundColor: FRAME, padding: 8, paddingBottom: 0 },
  opening: { flex: 1, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  door: {
    position: 'absolute', left: 8, top: 8, width: 108, height: 188, borderTopLeftRadius: 8, borderTopRightRadius: 8,
    backgroundColor: DOOR, transformOrigin: 'left center', padding: 12, gap: 10, overflow: 'hidden',
  },
  panelTop: { height: 70, borderRadius: 6, backgroundColor: DOOR_DARK },
  panelBottom: { flex: 1, borderRadius: 6, backgroundColor: DOOR_DARK, marginBottom: 14 },
  knob: { position: 'absolute', right: 10, top: 98, width: 10, height: 10, borderRadius: 5, backgroundColor: '#F6C36B' },
  shade: { backgroundColor: '#000000' },
  person: { position: 'absolute', left: 176, bottom: 8, width: 56, height: 112 },
  // vai ở mép trái thân, tay chĩa xuống; xoay quanh vai (5px, 4px)
  arm: { position: 'absolute', left: 12, top: 34, width: 10, height: 34, transformOrigin: '5px 4px' },
  sleeve: { width: 10, height: 26, borderRadius: 5, backgroundColor: SHIRT },
  hand: { width: 10, height: 10, borderRadius: 5, backgroundColor: SKIN, marginTop: -2 },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
});
