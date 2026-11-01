import { create } from 'zustand';

/** Mã trang chủ theo vai trò (B01–B12 trong Figma). */
export type HomeRole = 'VP' | 'TP' | 'CN' | 'CN_OFF' | 'TC' | 'KT' | 'QC' | 'QLDC' | 'QLPX' | 'QLN' | 'KHO' | 'MH' | 'QT';

// shortcut: chỉ giữ trong bộ nhớ, mở lại app thì về mặc định; lưu SecureStore khi cần nhớ lâu
interface PrefsState {
  /** null = theo vai trò của nơi làm việc */
  homeRole: HomeRole | null;
  anim3d: boolean;
  /** 0 theo máy, 1 sáng, 2 tối */
  theme: number;
  /** Bật khi API trả 401 giữa phiên: về Đăng nhập kèm màn A08 */
  sessionExpired: boolean;
  set: (p: Partial<Pick<PrefsState, 'homeRole' | 'anim3d' | 'theme' | 'sessionExpired'>>) => void;
}

export const usePrefs = create<PrefsState>((set) => ({
  homeRole: null,
  anim3d: true,
  theme: 0,
  sessionExpired: false,
  set: (p) => set(p),
}));
