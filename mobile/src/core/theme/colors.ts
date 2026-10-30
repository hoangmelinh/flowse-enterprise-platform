/**
 * Flowse 2.0 · Minimal — đồng bộ 1-1 với collection biến "Flowse 2.0 · Minimal" trong Figma.
 * Đổi màu ở Figma thì cập nhật lại đúng tên token tại đây.
 */
export const palette = {
  light: {
    bg: '#F6F6F4',
    surface: '#FFFFFF',
    subtle: '#EFEFEC',
    ink: '#141414',
    muted: '#66666B',
    line: '#E6E5E1',
    accent: '#0E7C74',
    accentSoft: '#E2F1EF',
    onAccent: '#FFFFFF',
    danger: '#BF3A2E',
    dangerSoft: '#FBEAE7',
    warning: '#A35A00',
    warningSoft: '#FCF0DE',
    success: '#1F7A3E',
    successSoft: '#E4F3E9',
    progress: '#2F5FD0',
    progressSoft: '#E8EEFB',
  },
  dark: {
    bg: '#111111',
    surface: '#1A1A1A',
    subtle: '#242424',
    ink: '#F2F2F0',
    muted: '#A3A3A8',
    line: '#2E2E2E',
    accent: '#3DBFB2',
    accentSoft: '#11302D',
    onAccent: '#0B1F1D',
    danger: '#F07B70',
    dangerSoft: '#3A1714',
    warning: '#E8A23C',
    warningSoft: '#36260E',
    success: '#5CC98A',
    successSoft: '#13301E',
    progress: '#7FA3F5',
    progressSoft: '#18223A',
  },
} as const;

export type Colors = { [K in keyof typeof palette.light]: string };
export type ColorToken = keyof Colors;
