import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { CircleCheck, FileText } from 'lucide-react-native';
import { radius, space, Colors, makeStyles, useColors } from '../../../core/theme';
import { AppText, BottomBar, Button, Screen } from '../../components/ui';
import { ScreenProps } from '../../navigation/types';
import { Routes } from '../../../core/constants/routes';

/**
 * Hoạt ảnh hoàn tất dùng chung (component "Hoạt ảnh / Yêu cầu hoàn tất" trong Figma):
 * phiếu bay theo đường cong vào khay "Hoàn tất" → dấu tích. Chỉ transform/opacity trên luồng UI.
 */
export const SuccessScreen: React.FC<ScreenProps<typeof Routes.SUCCESS>> = ({ route, navigation }) => {
  const { title, body, kind, code, primary } = route.params;
  const s = useStyles();
  const c = useColors();
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  const copy = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    if (reduce) return;
    p.value = withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) });
    copy.value = withDelay(650, withTiming(1, { duration: 300 }));
  }, [p, copy, reduce]);

  // Đường bay: góc dưới trái → đỉnh cung → giữa khay
  const card = useAnimatedStyle(() => {
    const t = p.value;
    const u = 1 - t;
    const x = u * u * -92 + 2 * u * t * -40 + t * t * 58;
    const y = u * u * 40 + 2 * u * t * -78 + t * t * -6;
    return {
      opacity: interpolate(t, [0, 0.1], [0, 1], Extrapolation.CLAMP),
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${interpolate(t, [0, 0.5, 1], [-8, 6, 0])}deg` },
        { scale: interpolate(t, [0.7, 1], [1, 0.72], Extrapolation.CLAMP) },
      ],
    };
  });
  const check = useAnimatedStyle(() => {
    const t = interpolate(p.value, [0.85, 1], [0, 1], Extrapolation.CLAMP);
    return { opacity: t, transform: [{ scale: 0.6 + 0.4 * t }] };
  });
  const text = useAnimatedStyle(() => ({ opacity: copy.value, transform: [{ translateY: 8 * (1 - copy.value) }] }));

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.body}>
        <View style={s.scene}>
          <View style={s.trayBack} />
          <Animated.View style={[s.card, card]}>
            <View style={s.cardHead}>
              <View style={s.dot}>
                <FileText size={13} color={c.onAccent} />
              </View>
              <AppText variant="micro" numberOfLines={1} style={s.flex}>
                {kind}
              </AppText>
            </View>
            <View style={[s.line, { width: 92 }]} />
            <View style={[s.line, { width: 66 }]} />
            <AppText variant="micro" tone="muted">
              {code}
            </AppText>
          </Animated.View>
          <View style={s.trayFront}>
            <AppText variant="label" tone="onAccent">
              Hoàn tất
            </AppText>
          </View>
          <Animated.View style={[s.check, check]}>
            <CircleCheck size={30} color={c.success} fill={c.surface} />
          </Animated.View>
        </View>
        <Animated.View style={[s.copy, text]}>
          <AppText variant="heading" style={s.center} accessibilityRole="header">
            {title}
          </AppText>
          <AppText variant="caption" tone="muted" style={s.center}>
            {body}
          </AppText>
        </Animated.View>
      </View>
      <BottomBar>
        {primary ? <Button title={primary} onPress={() => navigation.goBack()} /> : null}
        <Button title="Về trang chủ" variant={primary ? 'secondary' : 'primary'} onPress={() => navigation.popToTop()} />
      </BottomBar>
    </Screen>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl, paddingHorizontal: space.xl },
    scene: { width: 300, height: 200, alignItems: 'center', justifyContent: 'center' },
    trayBack: { position: 'absolute', left: 170, top: 70, width: 108, height: 58, borderRadius: radius.md, backgroundColor: c.accent, opacity: 0.55 },
    trayFront: { position: 'absolute', left: 166, top: 108, width: 116, height: 36, borderRadius: radius.md, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    card: {
      width: 124,
      padding: 10,
      gap: 7,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      boxShadow: '0 8px 16px rgba(0,0,0,0.14)',
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
    line: { height: 4, borderRadius: 2, backgroundColor: c.line },
    check: { position: 'absolute', left: 262, top: 52 },
    copy: { gap: space.sm, maxWidth: 340 },
    center: { textAlign: 'center' },
  })
);
