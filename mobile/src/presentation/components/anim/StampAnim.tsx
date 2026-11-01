import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Animated, { Easing, SharedValue, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { usePrefs } from '../../state/prefsStore';

/**
 * G10a → G10b → G10 — "Hoạt hình / Đóng dấu duyệt" trong Figma: người duyệt giơ dấu, đập xuống phiếu
 * (nheo mắt, tia va chạm), nhấc lên, dấu ĐÃ DUYỆT co về cỡ thật và lấp lánh bung ra.
 * Hình vẽ là SVG xuất nguyên từ các lớp Figma; toạ độ khung 300×250 giữ đúng như bản thiết kế.
 */
const W = 300;
const H = 250;
const svg = (body: string, w = W, h = H) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

const BODY = '<path d="M92 104H68C52.536 104 40 116.536 40 132V172C40 187.464 52.536 200 68 200H92C107.464 200 120 187.464 120 172V132C120 116.536 107.464 104 92 104Z" fill="#0E7C74"/><path d="M68 104L80 120L92 104H68Z" fill="white"/><path d="M82 90H78C74.6863 90 72 92.6863 72 96V102C72 105.314 74.6863 108 78 108H82C85.3137 108 88 105.314 88 102V96C88 92.6863 85.3137 90 82 90Z" fill="#F2C29B"/><path d="M80 96C94.3594 96 106 84.3594 106 70C106 55.6406 94.3594 44 80 44C65.6406 44 54 55.6406 54 70C54 84.3594 65.6406 96 80 96Z" fill="#F2C29B"/><path d="M54 68C54 49.3333 62.6667 40 80 40C97.3333 40 106 48.6667 106 66C101.333 56.6667 93.3333 52.3333 82 53C71.3333 53.6667 62 58.6667 54 68Z" fill="#2B2B2B"/>';
const FACE = '<path d="M73 82C78.3333 86.6667 83.6667 86.6667 89 82" stroke="#141414" stroke-width="2.2" stroke-linecap="round"/><path opacity="0.5" d="M64 85C66.2091 85 68 83.2091 68 81C68 78.7909 66.2091 77 64 77C61.7909 77 60 78.7909 60 81C60 83.2091 61.7909 85 64 85Z" fill="#F59A8F"/><path opacity="0.5" d="M98 85C100.209 85 102 83.2091 102 81C102 78.7909 100.209 77 98 77C95.7909 77 94 78.7909 94 81C94 83.2091 95.7909 85 98 85Z" fill="#F59A8F"/>';
const CHARACTER = svg(BODY + FACE);
const EYES_OPEN = svg('<path d="M72 74.8C73.5464 74.8 74.8 73.5466 74.8 72C74.8 70.4538 73.5464 69.2 72 69.2C70.4536 69.2 69.2 70.4538 69.2 72C69.2 73.5466 70.4536 74.8 72 74.8Z" fill="#141414"/><path d="M90 74.8C91.5464 74.8 92.8 73.5466 92.8 72C92.8 70.4538 91.5464 69.2 90 69.2C88.4536 69.2 87.2 70.4538 87.2 72C87.2 73.5466 88.4536 74.8 90 74.8Z" fill="#141414"/>');
const EYES_SHUT = svg('<path d="M68 72C70.6667 74 73.3333 74 76 72" stroke="#141414" stroke-width="2.2" stroke-linecap="round"/><path d="M86 72C88.6667 74 91.3333 74 94 72" stroke="#141414" stroke-width="2.2" stroke-linecap="round"/>');
const DESK = svg('<path d="M286 150H14C9.58172 150 6 153.582 6 158V182C6 186.418 9.58172 190 14 190H286C290.418 190 294 186.418 294 182V158C294 153.582 290.418 150 286 150Z" fill="#E9E8E4"/><path d="M288 182H12C8.68629 182 6 184.686 6 188V232C6 235.314 8.68629 238 12 238H288C291.314 238 294 235.314 294 232V188C294 184.686 291.314 182 288 182Z" fill="#D2D1CB"/>');
const ARM_LEFT = svg('<path d="M52 116C42.6666 130.667 39.3333 145.333 42 160L88 170" stroke="#0B6B64" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><path d="M96 179.5C101.523 179.5 106 175.694 106 171C106 166.306 101.523 162.5 96 162.5C90.4772 162.5 86 166.306 86 171C86 175.694 90.4772 179.5 96 179.5Z" fill="#F2C29B"/><path d="M90 166C94 164 98 164 102 166" stroke="#D9A57C" stroke-width="1.5" stroke-linecap="round"/>');
const DOC = svg('<path d="M158 184H262L252 156H166L158 184Z" fill="white" stroke="#E2E1DC"/><path d="M214 162H178C176.895 162 176 162.895 176 164C176 165.105 176.895 166 178 166H214C215.105 166 216 165.105 216 164C216 162.895 215.105 162 214 162Z" fill="#9B9BA0"/><path d="M234.5 170H177.5C176.672 170 176 170.672 176 171.5C176 172.328 176.672 173 177.5 173H234.5C235.328 173 236 172.328 236 171.5C236 170.672 235.328 170 234.5 170Z" fill="#C9C8C3"/><path d="M222.5 176H177.5C176.672 176 176 176.672 176 177.5C176 178.328 176.672 179 177.5 179H222.5C223.328 179 224 178.328 224 177.5C224 176.672 223.328 176 222.5 176Z" fill="#C9C8C3"/>');
const IMPACT = svg(['M162 164L148 160', 'M254 164L268 160', 'M172 148L162 136', 'M244 148L254 136'].map((d) => `<path d="${d}" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>`).join(''));
const SWOOSH = svg('<path d="M150 40C176.667 33.3334 198 40.6668 214 62" stroke="#9B9BA0" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 7"/><path d="M160 26C186.667 19.3336 209.333 27.3336 228 50" stroke="#C9C8C3" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 7"/>');
const STAMP = svg('<path d="M35.4884 9.52132C35.4884 4.26284 31.2256 0 25.9671 0C20.7086 0 16.4458 4.26284 16.4458 9.52132V59.7247C16.4458 64.9831 20.7086 69.246 25.9671 69.246C31.2256 69.246 35.4884 64.9831 35.4884 59.7247V9.52132Z" fill="#0E7C74"/><path d="M25.9673 83.0947C30.7477 83.0947 34.623 79.2194 34.623 74.439C34.623 69.6585 30.7477 65.7832 25.9673 65.7832C21.1868 65.7832 17.3115 69.6585 17.3115 74.439C17.3115 79.2194 21.1868 83.0947 25.9673 83.0947Z" fill="#F2C29B"/><path d="M26.8328 76.1709H25.1016C23.6675 76.1709 22.5049 77.3335 22.5049 78.7676V94.348C22.5049 95.7821 23.6675 96.9447 25.1016 96.9447H26.8328C28.2669 96.9447 29.4295 95.7821 29.4295 94.348V78.7676C29.4295 77.3335 28.2669 76.1709 26.8328 76.1709Z" fill="#8B5E3C"/><path d="M25.9673 84.8267C29.7917 84.8267 32.8919 81.7265 32.8919 77.9021C32.8919 74.0778 29.7917 70.9775 25.9673 70.9775C22.143 70.9775 19.0427 74.0778 19.0427 77.9021C19.0427 81.7265 22.143 84.8267 25.9673 84.8267Z" fill="#A0522D"/><path d="M39.8165 95.2129H12.1181C10.2059 95.2129 8.65576 96.763 8.65576 98.6752V107.331C8.65576 109.243 10.2059 110.793 12.1181 110.793H39.8165C41.7286 110.793 43.2788 109.243 43.2788 107.331V98.6752C43.2788 96.763 41.7286 95.2129 39.8165 95.2129Z" fill="#2F2F31"/><path d="M39.8165 110.794H12.1181C11.162 110.794 10.387 111.569 10.387 112.525V114.256C10.387 115.212 11.162 115.987 12.1181 115.987H39.8165C40.7726 115.987 41.5477 115.212 41.5477 114.256V112.525C41.5477 111.569 40.7726 110.794 39.8165 110.794Z" fill="#1F7A3E"/>', 52, 122);
// Dấu tròn "ĐÃ DUYỆT" (chữ đã chuyển thành nét khi xuất từ Figma)
const MARK = svg('<circle cx="17.98" cy="17.98" r="15.965" fill="#E4F3E9" fill-opacity="0.85" stroke="#1F7A3E" stroke-width="1.55"/><path d="M14.4088 16.1602V14.4415H13.9457V13.7496H14.4088V12.031H15.9656C16.3041 12.031 16.5999 12.0905 16.8528 12.2095C17.1058 12.3248 17.316 12.4811 17.4834 12.6782C17.6545 12.8754 17.781 13.0967 17.8628 13.3423C17.9484 13.5878 17.9912 13.8389 17.9912 14.0956C17.9912 14.3522 17.9484 14.6033 17.8628 14.8489C17.781 15.0944 17.6545 15.3157 17.4834 15.5129C17.316 15.71 17.1058 15.8681 16.8528 15.9872C16.5999 16.1025 16.3041 16.1602 15.9656 16.1602H14.4088ZM16.0437 14.4415H15.2681V15.3957H15.9266C16.1981 15.3957 16.4232 15.3325 16.6017 15.206C16.7803 15.0795 16.9124 14.9158 16.9979 14.7149C17.0835 14.5141 17.1263 14.3057 17.1263 14.09C17.1263 13.8742 17.0835 13.6678 16.9979 13.4706C16.9124 13.2697 16.7803 13.106 16.6017 12.9796C16.4232 12.8494 16.1981 12.7843 15.9266 12.7843H15.2681V13.7496H16.0437V14.4415ZM20.5532 11.5622C20.4527 11.5622 20.3653 11.5455 20.2909 11.512C20.2202 11.4748 20.157 11.4339 20.1012 11.3893C20.0454 11.3446 19.9933 11.3056 19.9449 11.2721C19.9003 11.2349 19.8519 11.2163 19.7999 11.2163C19.7403 11.2163 19.6994 11.2442 19.6771 11.3C19.6548 11.3558 19.6436 11.432 19.6436 11.5288H19.1916C19.1916 11.406 19.2047 11.2814 19.2307 11.1549C19.2605 11.0284 19.3163 10.9224 19.3981 10.8368C19.4799 10.7513 19.5971 10.7085 19.7496 10.7085C19.8538 10.7085 19.9412 10.7271 20.0119 10.7643C20.0863 10.7978 20.1514 10.8368 20.2072 10.8815C20.263 10.9261 20.3132 10.9652 20.3579 10.9987C20.4062 11.0321 20.4546 11.0489 20.5029 11.0489C20.6071 11.0489 20.6592 10.9466 20.6592 10.742H21.1112C21.1112 10.8647 21.0963 10.9894 21.0665 11.1158C21.0368 11.2423 20.981 11.3483 20.8991 11.4339C20.821 11.5195 20.7057 11.5622 20.5532 11.5622ZM18.1593 16.1602L19.5655 12.031H20.7094L22.1156 16.1602H21.2116L20.9438 15.3511H19.3311L19.0633 16.1602H18.1593ZM19.5655 14.6033H20.7094L20.1402 12.8791L19.5655 14.6033ZM8.53282 23.1602V19.031H10.0952C10.43 19.031 10.7239 19.0905 10.9769 19.2095C11.2335 19.3248 11.4456 19.4811 11.613 19.6782C11.7804 19.8754 11.9069 20.0967 11.9924 20.3423C12.078 20.5878 12.1208 20.8389 12.1208 21.0956C12.1208 21.3522 12.078 21.6033 11.9924 21.8489C11.9069 22.0944 11.7804 22.3157 11.613 22.5129C11.4456 22.71 11.2335 22.8681 10.9769 22.9872C10.7239 23.1025 10.43 23.1602 10.0952 23.1602H8.53282ZM10.0562 19.7843H9.39214V22.3957H10.0562C10.3277 22.3957 10.5509 22.3325 10.7258 22.206C10.9043 22.0795 11.0364 21.9158 11.1219 21.7149C11.2112 21.5141 11.2559 21.3057 11.2559 21.09C11.2559 20.8742 11.2112 20.6678 11.1219 20.4706C11.0364 20.2697 10.9043 20.106 10.7258 19.9796C10.5509 19.8494 10.3277 19.7843 10.0562 19.7843ZM14.4028 23.216C14.1015 23.216 13.8225 23.1583 13.5658 23.043C13.3129 22.9277 13.1083 22.7491 12.952 22.5073C12.7995 22.2655 12.7233 21.9512 12.7233 21.5643V19.031H13.5826V21.5643C13.5826 21.8024 13.6495 22.0032 13.7835 22.1669C13.9174 22.3269 14.1238 22.4069 14.4028 22.4069C14.6818 22.4069 14.8864 22.3269 15.0166 22.1669C15.1506 22.0032 15.2175 21.8024 15.2175 21.5643V19.031H16.0824V21.5643C16.0824 21.9512 16.0043 22.2655 15.8481 22.5073C15.6955 22.7491 15.4909 22.9277 15.2343 23.043C14.9776 23.1583 14.7004 23.216 14.4028 23.216ZM18.1024 23.1602V21.7484L16.6516 19.031H17.5946L18.532 20.8668L19.4695 19.031H20.4125L18.9617 21.7484V23.1602H18.1024ZM21.3264 18.6627L22.0462 17.8034H22.7214L23.4412 18.6627H22.7772L22.381 18.1884L21.9904 18.6627H21.3264ZM20.9358 23.1602V19.031H23.7816V19.7787H21.7951V20.705H23.5249V21.4248H21.7951V22.4124H23.8095V23.1602H20.9358ZM22.2359 24.5384C22.1057 24.5384 21.9978 24.4938 21.9123 24.4045C21.8304 24.3189 21.7895 24.2148 21.7895 24.092C21.7895 23.9693 21.8304 23.8651 21.9123 23.7795C21.9978 23.694 22.1057 23.6512 22.2359 23.6512C22.3624 23.6512 22.4665 23.694 22.5484 23.7795C22.6339 23.8651 22.6767 23.9693 22.6767 24.092C22.6767 24.2148 22.6339 24.3189 22.5484 24.4045C22.4665 24.4938 22.3624 24.5384 22.2359 24.5384ZM25.6257 23.1602V19.7787H24.359V19.031H27.7516V19.7787H26.485V23.1602H25.6257Z" fill="#1F7A3E"/>', 36, 36);
const sparkle = (s: number, fill: string) => svg(`<path d="M${s / 2} 0C${s * 0.55} ${s * 0.283} ${s * 0.717} ${s * 0.45} ${s} ${s / 2}C${s * 0.717} ${s * 0.55} ${s * 0.55} ${s * 0.717} ${s / 2} ${s}C${s * 0.45} ${s * 0.717} ${s * 0.283} ${s * 0.55} 0 ${s / 2}C${s * 0.283} ${s * 0.45} ${s * 0.45} ${s * 0.283} ${s / 2} 0Z" fill="${fill}"/>`, s, s);
// Lấp lánh: điểm xuất phát dưới con dấu (G10a/b) → vị trí cuối (G10)
const SPARKLES = [
  { from: [204, 166, 8], to: [136, 74, 28], fill: '#0E7C74' },
  { from: [204, 166, 7], to: [254, 116, 24], fill: '#C98512' },
  { from: [205, 167, 6], to: [234, 94, 20], fill: '#2F5FD0' },
  { from: [205, 167, 5], to: [167, 95, 18], fill: '#C9473B' },
].map((sp) => ({ ...sp, xml: sparkle(sp.to[2], sp.fill) }));

// Mốc thời gian theo Figma: G10a 0 ms → G10b 220 ms → G10 (Smart Animate 480 ms)
const K = [0, 220, 700];

const Layer: React.FC<{ xml: string; style?: object }> = ({ xml, style }) => (
  <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
    <SvgXml xml={xml} width={W} height={H} />
  </Animated.View>
);

const Sparkle: React.FC<{ sp: (typeof SPARKLES)[number]; t: SharedValue<number> }> = ({ sp, t }) => {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [K[1], K[1] + 120, K[2]], [0, 1, 1], 'clamp'),
    transform: [
      { translateX: interpolate(t.value, K, [sp.from[0], sp.from[0], sp.to[0]], 'clamp') },
      { translateY: interpolate(t.value, K, [sp.from[1], sp.from[1], sp.to[1]], 'clamp') },
      { scale: interpolate(t.value, K, [sp.from[2] / sp.to[2], sp.from[2] / sp.to[2], 1], 'clamp') },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.origin, { width: sp.to[2], height: sp.to[2] }, style]}>
      <SvgXml xml={sp.xml} width={sp.to[2]} height={sp.to[2]} />
    </Animated.View>
  );
};

export const StampAnim: React.FC = () => {
  const reduce = useReducedMotion() || !usePrefs((s) => s.anim3d);
  const t = useSharedValue(reduce ? K[2] : 0);
  useEffect(() => {
    if (reduce) return;
    // Đập xuống nhanh (nhanh dần), nhấc lên chậm lại
    t.value = withSequence(
      withTiming(K[1], { duration: K[1], easing: Easing.in(Easing.quad) }),
      withTiming(K[2], { duration: K[2] - K[1], easing: Easing.out(Easing.cubic) })
    );
  }, [t, reduce]);

  const eyesOpen = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, K[1] - 40, K[1], K[1] + 160], [1, 1, 0, 1], 'clamp') }));
  const eyesShut = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, K[1] - 40, K[1], K[1] + 160], [0, 0, 1, 0], 'clamp') }));
  const impact = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [K[1] - 30, K[1], K[1] + 200], [0, 1, 0], 'clamp') }));
  const swoosh = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, K[1]], [0.7, 0], 'clamp') }));
  // Figma xoay ngược chiều kim đồng hồ là dương; RN thì ngược lại nên đổi dấu
  const stamp = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, K, [128, 93, 104], 'clamp') },
      { translateY: interpolate(t.value, K, [144, 141, 148], 'clamp') },
      { rotate: `${-interpolate(t.value, K, [143, 63, 91], 'clamp')}deg` },
    ],
  }));
  const mark = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [K[1] - 20, K[1]], [0, 1], 'clamp'),
    transform: [
      { translateX: interpolate(t.value, K, [191, 195, 198], 'clamp') },
      { translateY: interpolate(t.value, K, [145, 149, 152], 'clamp') },
      { rotate: '12deg' },
      { scale: interpolate(t.value, K, [50 / 36, 41 / 36, 1], 'clamp') },
    ],
  }));

  return (
    <View style={styles.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Layer xml={CHARACTER} />
      <Layer xml={EYES_OPEN} style={eyesOpen} />
      <Layer xml={EYES_SHUT} style={eyesShut} />
      <Layer xml={DESK} />
      <Layer xml={ARM_LEFT} />
      <Layer xml={DOC} />
      <Animated.View pointerEvents="none" style={[styles.origin, { width: 36, height: 36 }, mark]}>
        <SvgXml xml={MARK} width={36} height={36} />
      </Animated.View>
      <Layer xml={IMPACT} style={impact} />
      <Animated.View pointerEvents="none" style={[styles.origin, { width: 52, height: 122 }, stamp]}>
        <SvgXml xml={STAMP} width={52} height={122} />
      </Animated.View>
      <Layer xml={SWOOSH} style={swoosh} />
      {SPARKLES.map((sp) => (
        <Sparkle key={sp.fill} sp={sp} t={t} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  stage: { width: W, height: H, alignSelf: 'center' },
  // Gốc biến đổi ở góc trên trái giống toạ độ x, y của lớp trong Figma
  origin: { position: 'absolute', left: 0, top: 0, transformOrigin: '0px 0px' },
});
