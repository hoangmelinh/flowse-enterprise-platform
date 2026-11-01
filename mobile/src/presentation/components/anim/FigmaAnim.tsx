import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Animated, { Easing, SharedValue, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { usePrefs } from '../../state/prefsStore';
import { FIGMA_SCENES, FLayer, Kf } from './figmaScenes';
import { layerAt } from './layerAt';

export type FigmaAnimKind = keyof typeof FIGMA_SCENES;

const sizeOf = (svg: string) => {
  const m = svg.match(/^<svg width="([\d.]+)" height="([\d.]+)"/);
  return m ? { width: +m[1], height: +m[2] } : undefined;
};

const Layer: React.FC<{ L: FLayer; t: number[]; ms: SharedValue<number> }> = ({ L, t, ms }) => {
  const last = L.kf?.[L.kf.length - 1];
  // Ô màu (pháo giấy) vẽ ở gốc với kích thước khung cuối; lớp SVG vẽ sẵn ở vị trí khung cuối
  const ref: Kf | undefined = last && (L.color ? [0, 0, last[2], last[3], 0, 1] : last);
  const kf = L.kf;
  const style = useAnimatedStyle(() => (kf && ref ? layerAt(kf, ref, t, ms.value) : {}));
  if (L.color) {
    return <Animated.View style={[styles.origin, { width: ref![2], height: ref![3], borderRadius: 1.5, backgroundColor: L.color }, style]} />;
  }
  return (
    <Animated.View pointerEvents="none" style={[styles.origin, kf ? style : null]}>
      <SvgXml xml={L.svg!} {...sizeOf(L.svg!)} />
    </Animated.View>
  );
};

/**
 * Hoạt ảnh lấy nguyên từ Figma (E05, E12, F05, H03, I01, I04, A09): nội suy các lớp giữa các khung
 * a → b → c như Smart Animate. Giảm chuyển động hoặc tắt Hiệu ứng 3D thì hiện thẳng khung cuối.
 */
export const FigmaAnim: React.FC<{ kind: FigmaAnimKind; loop?: boolean }> = ({ kind, loop }) => {
  const scene = FIGMA_SCENES[kind];
  const end = scene.t[scene.t.length - 1];
  const reduce = useReducedMotion() || !usePrefs((s) => s.anim3d);
  const ms = useSharedValue(reduce ? end : 0);
  useEffect(() => {
    if (reduce) {
      ms.value = end;
      return;
    }
    ms.value = 0;
    const run = withTiming(end, { duration: end, easing: Easing.linear });
    ms.value = loop ? withRepeat(run, -1, false) : run;
  }, [ms, end, loop, reduce]);
  return (
    <View style={[styles.stage, { width: scene.W, height: scene.H }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {scene.layers.map((L, i) => (
        <Layer key={i} L={L} t={scene.t} ms={ms} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  stage: { alignSelf: 'center' },
  origin: { position: 'absolute', left: 0, top: 0, transformOrigin: '0px 0px' },
});
