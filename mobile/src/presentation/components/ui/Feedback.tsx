import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CircleAlert, TriangleAlert, Info, LucideIcon } from 'lucide-react-native';
import { radius, space, Colors, makeStyles, useColors } from '../../../core/theme';
import { AppText } from './AppText';
import { Button } from './Button';

type BannerTone = 'danger' | 'warning' | 'accent';
const bannerIcon: Record<BannerTone, LucideIcon> = { danger: CircleAlert, warning: TriangleAlert, accent: Info };
const softBg = { danger: 'dangerSoft', warning: 'warningSoft', accent: 'accentSoft' } as const;

/** Dải thông báo trong màn (lỗi đăng nhập A03, mất mạng I03...). */
export const Banner: React.FC<{ tone?: BannerTone; text: string }> = ({ tone = 'accent', text }) => {
  const c = useColors();
  const Icon = bannerIcon[tone];
  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: c[softBg[tone]] }]}
    >
      <Icon size={18} color={c[tone]} />
      <AppText variant="caption" tone={tone} style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
};

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  actionTitle?: string;
  onAction?: () => void;
}

/** Trạng thái trống / lỗi tải / thiếu quyền dùng chung (nhóm K trong Figma). */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, body, actionTitle, onAction }) => {
  const s = useStyles();
  const c = useColors();
  return (
    <View style={s.empty}>
      <View style={s.tile}>
        <Icon size={28} color={c.ink} />
      </View>
      <AppText variant="heading" style={s.centerText}>
        {title}
      </AppText>
      {body ? (
        <AppText variant="caption" tone="muted" style={s.centerText}>
          {body}
        </AppText>
      ) : null}
      {actionTitle && onAction ? (
        <Button title={actionTitle} variant="secondary" size="sm" onPress={onAction} style={s.action} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: space.md,
    paddingHorizontal: 14,
    borderRadius: radius.md,
  },
  flex: { flex: 1 },
});

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    empty: { alignItems: 'center', gap: space.sm, paddingVertical: 40, paddingHorizontal: space.xl },
    tile: {
      width: 64,
      height: 64,
      borderRadius: radius.xl,
      backgroundColor: c.subtle,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space.xs,
    },
    centerText: { textAlign: 'center' },
    action: { marginTop: space.sm, alignSelf: 'stretch' },
  })
);
