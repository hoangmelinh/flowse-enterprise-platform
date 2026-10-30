import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { space, useColors } from '../../../core/theme';
import { AppText } from './AppText';

interface ScreenHeaderProps {
  title: string;
  caption?: string;
  /** Có onBack: header điều hướng (tiêu đề giữa). Không có: header lớn của tab. */
  onBack?: () => void;
  right?: React.ReactNode;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, caption, onBack, right }) => {
  const c = useColors();

  if (!onBack) {
    return (
      <View style={styles.large}>
        <View style={styles.flex}>
          {caption ? (
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {caption}
            </AppText>
          ) : null}
          <AppText variant="title" accessibilityRole="header" numberOfLines={1}>
            {title}
          </AppText>
        </View>
        {right}
      </View>
    );
  }

  return (
    <View style={styles.nav}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} style={styles.iconBtn}>
        <ChevronLeft size={22} color={c.ink} />
      </Pressable>
      <View style={[styles.flex, styles.center]}>
        {caption ? (
          <AppText variant="caption" tone="muted" numberOfLines={1}>
            {caption}
          </AppText>
        ) : null}
        <AppText variant="navTitle" accessibilityRole="header" numberOfLines={1}>
          {title}
        </AppText>
      </View>
      <View style={styles.iconBtn}>{right}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  large: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingTop: space.xs,
    paddingBottom: space.md,
    paddingHorizontal: space.xl,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingTop: space.xs,
    paddingBottom: space.md,
    paddingHorizontal: space.xl,
  },
  flex: { flex: 1, gap: 2 },
  center: { alignItems: 'center' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
