/**
 * Hình học cảnh mở app "Nhà máy ↔ Văn phòng" (A00–A01b trong Figma).
 * Cùng công thức isometric đã dùng để vẽ Figma, nên toạ độ và màu khớp bản thiết kế.
 */
const SC = 20;
const C30 = Math.cos(Math.PI / 6);
const P = (x: number, y: number, z: number): [number, number] => [(x - y) * C30 * SC, (x + y) * 0.5 * SC - z * SC];

export interface Poly {
  points: string;
  fill: string;
  /** Cửa sổ: gradient dọc từ sáng (trên) xuống màu chính (dưới) */
  gradient?: [string, string];
  opacity?: number;
}

export interface Building {
  polys: Poly[];
  width: number;
  height: number;
  /** Tâm miệng ống khói (chỉ nhà máy), theo toạ độ trong building */
  chimney?: [number, number];
}

type Pt = [number, number, number];
type Raw = { pts: [number, number][]; fill: string; window?: 'lit' | 'dim' | 'sideLit' | 'sideDim' | 'factory' };

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c: number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
export const mix = (a: string, b: string, t: number) => {
  const [x, y] = [hex(a), hex(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};
// Dải màu cửa sổ: tầng thấp teal → giữa blue → cao violet
const ramp = (t: number) => (t < 0.5 ? mix('#2DD4BF', '#3B82F6', t * 2) : mix('#3B82F6', '#8B5CF6', (t - 0.5) * 2));

function builder() {
  const raws: Raw[] = [];
  const poly = (pts: Pt[], fill: string, window?: Raw['window']) => raws.push({ pts: pts.map((p) => P(...p)), fill, window });
  const prism = (x: number, y: number, w: number, d: number, h: number, z: number, top: string, left: string, right: string) => {
    poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], left);
    poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], right);
    poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], top);
  };
  const build = (chimneyPt?: Pt): Building => {
    const xs = raws.flatMap((r) => r.pts.map((p) => p[0]));
    const ys = raws.flatMap((r) => r.pts.map((p) => p[1]));
    const mx = Math.min(...xs);
    const my = Math.min(...ys);
    const wins = raws.filter((r) => r.window && r.window !== 'factory').map((r) => Math.max(...r.pts.map((p) => p[1])));
    const lo = Math.min(...wins);
    const hi = Math.max(...wins);
    const polys = raws.map((r): Poly => {
      const points = r.pts.map(([x, y]) => `${(x - mx).toFixed(1)},${(y - my).toFixed(1)}`).join(' ');
      if (!r.window) return { points, fill: r.fill };
      const bottom = Math.max(...r.pts.map((p) => p[1]));
      const c = ramp(r.window === 'factory' ? 0.25 : hi > lo ? (hi - bottom) / (hi - lo) : 0.3);
      const opacity = { lit: 1, dim: 0.4, sideLit: 0.82, sideDim: 0.3, factory: 1 }[r.window];
      return { points, fill: c, gradient: [mix(c, '#FFFFFF', 0.45), c], opacity };
    });
    const ch = chimneyPt ? P(...chimneyPt) : undefined;
    return {
      polys,
      width: Math.max(...xs) - mx,
      height: Math.max(...ys) - my,
      chimney: ch ? [ch[0] - mx, ch[1] - my] : undefined,
    };
  };
  return { poly, prism, build };
}

const factory = (() => {
  const b = builder();
  const z = 0.2;
  const H = 1.6;
  b.prism(-0.3, -0.3, 5.0, 3.6, 0.2, 0, '#ECEBE7', '#DAD9D4', '#CFCEC8');
  b.prism(0, 0, 4.4, 3, H, z, '#F6F5F2', '#E4E3DE', '#CBCAC4');
  for (const [a, c] of [[0.4, 1.2], [1.6, 2.4], [2.8, 3.6]]) {
    b.poly([[a, 3, z + 0.75], [c, 3, z + 0.75], [c, 3, z + 1.15], [a, 3, z + 1.15]], '', 'factory');
  }
  b.poly([[4.4, 1.0, z], [4.4, 1.8, z], [4.4, 1.8, z + 0.9], [4.4, 1.0, z + 0.9]], '#141414');
  b.prism(0.05, 0.2, 0.5, 0.5, 1.4, z + H, '#3A3A3B', '#232323', '#141414');
  const top = z + H;
  for (const xi of [0.6, 1.85, 3.1]) {
    b.poly([[xi, 0, top + 0.8], [xi, 3, top + 0.8], [xi + 1.2, 3, top], [xi + 1.2, 0, top]], '#0E7C74');
    b.poly([[xi, 3, top], [xi + 1.2, 3, top], [xi, 3, top + 0.8]], '#0A5F59');
  }
  return b.build([0.3, 0.45, z + H + 1.4]);
})();

const office = (() => {
  const b = builder();
  const z = 0.2;
  const H = 5.2;
  b.prism(-0.3, -0.3, 2.9, 2.9, 0.2, 0, '#ECEBE7', '#DAD9D4', '#CFCEC8');
  b.prism(0, 0, 2.3, 2.3, H, z, '#2B2B2B', '#1C1C1C', '#121212');
  let k = 0;
  for (let r = 0; r < 6; r++) {
    const c = z + 0.6 + r * 0.75;
    for (const [a, e] of [[0.3, 0.95], [1.35, 2.0]]) {
      const lit = k++ % 3 !== 1;
      b.poly([[a, 2.3, c], [e, 2.3, c], [e, 2.3, c + 0.42], [a, 2.3, c + 0.42]], '', lit ? 'lit' : 'dim');
      b.poly([[2.3, a, c], [2.3, e, c], [2.3, e, c + 0.42], [2.3, a, c + 0.42]], '', lit ? 'sideLit' : 'sideDim');
    }
  }
  b.prism(0.7, 0.7, 0.9, 0.9, 0.35, z + H, '#2DD4BF', '#0E7C74', '#0A5F59');
  return b.build();
})();

// Bố cục cảnh 330×320 giống frame Figma
export const SCENE_W = 330;
export const SCENE_H = 320;
export const FACTORY = { ...factory, x: 12, y: SCENE_H - factory.height - 12 };
export const OFFICE = { ...office, x: SCENE_W - office.width - 14, y: 8 };

// Tuyến dữ liệu: đường cong bậc hai từ mái nhà máy tới giữa toà văn phòng
const S0: [number, number] = [FACTORY.x + FACTORY.width * 0.8, FACTORY.y + FACTORY.height * 0.3];
const E0: [number, number] = [OFFICE.x + OFFICE.width * 0.18, OFFICE.y + OFFICE.height * 0.5];
const C0: [number, number] = [(S0[0] + E0[0]) / 2, Math.min(S0[1], E0[1]) - 40];
export const LINK_PATH = `M${S0[0].toFixed(1)} ${S0[1].toFixed(1)} Q${C0[0].toFixed(1)} ${C0[1].toFixed(1)} ${E0[0].toFixed(1)} ${E0[1].toFixed(1)}`;
export const LINK = { S0, C0, E0 };

// Khói: 12 cụm dọc đường cong, dưới nhỏ đậm, lên cao to và tan (giống bản Figma)
const [cx, cy] = [FACTORY.x + factory.chimney![0], FACTORY.y + factory.chimney![1]];
export const SMOKE = Array.from({ length: 12 }, (_, i) => {
  const u = i / 11;
  const q = (a: number, b: number, c: number) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
  const size = 12 + 42 * u;
  return {
    x: q(cx, cx + 2, cx + 70) + (i % 2 ? 3 : -3) * u - size / 2,
    y: q(cy - 2, cy - 60, cy - 110) - size * 0.41,
    size,
    color: mix(mix(ramp(u), '#D9D8D4', 0.35), '#FFFFFF', 0.15),
    opacity: Math.max(0.1, 0.8 * Math.pow(1 - u * 0.88, 1.2)),
  };
});
