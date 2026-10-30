import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { palette, Colors } from './colors';

export type { Colors, ColorToken } from './colors';

// Tên font do @expo-google-fonts/be-vietnam-pro đăng ký (nạp trong App.tsx)
export const fonts = {
  regular: 'BeVietnamPro_400Regular',
  medium: 'BeVietnamPro_500Medium',
  semibold: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
} as const;

// Thang chữ lấy từ các màn Flowse 2.0 trong Figma
export const text = {
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34 },
  brand: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 26 },
  heading: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 25 },
  navTitle: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 24 },
  section: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  button: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  tab: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15 },
  micro: { fontFamily: fonts.semibold, fontSize: 10, lineHeight: 14 },
} as const;

export type TextVariant = keyof typeof text;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 } as const;

export const useColors = (): Colors => palette[useColorScheme() === 'dark' ? 'dark' : 'light'];

// StyleSheet phụ thuộc màu: tạo lại chỉ khi đổi Sáng/Tối
export const makeStyles =
  <T,>(factory: (c: Colors) => T) =>
  (): T => {
    const c = useColors();
    return useMemo(() => factory(c), [c]);
  };
