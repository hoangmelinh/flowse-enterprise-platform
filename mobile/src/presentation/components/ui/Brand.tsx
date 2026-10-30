import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';
import { AppText } from './AppText';

// Logo khối Flowse: Không gian → Thư mục → Danh sách → Công việc (dưới lên), cùng bộ màu khối C01.
const BLOCKS = [
  ['#5fd3c6', '#0e7c74', '#0a5e58'],
  ['#f6c36b', '#c98512', '#9a650c'],
  ['#9db8f7', '#2f5fd0', '#2249a6'],
  ['#f59a8f', '#c9473b', '#9c3329'],
] as const;

export const FlowseMark: React.FC<{ size?: number }> = ({ size = 56 }) => (
  <Svg width={size} height={size} viewBox="0 0 56 56" accessibilityLabel="Flowse">
    {BLOCKS.map(([top, left, right], i) => {
      const y = 30 - i * 10; // khối dưới vẽ trước, khối trên đè lên mặt trên của khối dưới
      return (
        <React.Fragment key={i}>
          <Polygon points={`16,${y + 7} 28,${y + 14} 28,${y + 27} 16,${y + 20}`} fill={left} />
          <Polygon points={`28,${y + 14} 40,${y + 7} 40,${y + 20} 28,${y + 27}`} fill={right} />
          <Polygon points={`28,${y} 40,${y + 7} 28,${y + 14} 16,${y + 7}`} fill={top} />
        </React.Fragment>
      );
    })}
  </Svg>
);

export const FlowseWordmark: React.FC = () => (
  <View style={styles.row}>
    <FlowseMark />
    <AppText variant="brand">Flowse</AppText>
  </View>
);

export const GoogleLogo: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path
      fill="#FBBC05"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <Path
      fill="#EA4335"
      d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
    />
    <Path
      fill="#34A853"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
    />
    <Path
      fill="#4285F4"
      d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </Svg>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
