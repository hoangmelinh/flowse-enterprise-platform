import type { Kf } from './figmaScenes';

/**
 * Nội suy một lớp giữa các mốc khung hình như Smart Animate của Figma (ease in-out).
 * Trả về các bước transform kiểu CSS (gốc ở góc trên trái cảnh) và độ mờ.
 * Lớp SVG được vẽ sẵn ở vị trí khung cuối (`ref`), nên transform = vị trí hiện tại ∘ nghịch đảo vị trí ref.
 * Figma xoay dương là ngược chiều kim đồng hồ, CSS thì ngược lại, nên đổi dấu góc.
 */
export function layerAt(kf: Kf[], ref: Kf, t: number[], ms: number) {
  'worklet';
  let i = 0;
  while (i < t.length - 2 && ms > t[i + 1]) i++;
  const span = t[i + 1] - t[i];
  const k = Math.min(1, Math.max(0, span > 0 ? (ms - t[i]) / span : 1));
  const u = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const a = kf[i];
  const b = kf[Math.min(i + 1, kf.length - 1)];
  const v = [0, 1, 2, 3, 4, 5].map((j) => a[j] + (b[j] - a[j]) * u);
  return {
    opacity: v[5],
    transform: [
      { translateX: v[0] },
      { translateY: v[1] },
      { rotate: `${-v[4]}deg` },
      { scaleX: ref[2] ? v[2] / ref[2] : 1 },
      { scaleY: ref[3] ? v[3] / ref[3] : 1 },
      { rotate: `${ref[4]}deg` },
      { translateX: -ref[0] },
      { translateY: -ref[1] },
    ],
  };
}
