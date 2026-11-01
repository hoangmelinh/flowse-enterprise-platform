import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { ChevronRight, LucideIcon } from 'lucide-react-native';
import { radius, space, Colors, ColorToken, makeStyles, useColors } from '../../../core/theme';
import { AppText } from './AppText';

/** Khung danh sách bo góc 16, tự chèn đường kẻ giữa các dòng (Group trong Figma). */
export const Group: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => {
  const styles = useStyles();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.group, style]}>
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={styles.sep} />}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
};

interface RowProps {
  title: string;
  subtitle?: string;
  subtitleTone?: ColorToken;
  icon?: LucideIcon;
  iconTone?: ColorToken;
  trailing?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
}

export const Row: React.FC<RowProps> = ({
  title,
  subtitle,
  subtitleTone = 'muted',
  icon: Icon,
  iconTone = 'muted',
  trailing,
  chevron = true,
  onPress,
}) => {
  const styles = useStyles();
  const c = useColors();
  const content = (
    <>
      {Icon && <Icon size={20} color={c[iconTone]} />}
      <View style={styles.texts}>
        <AppText variant="bodyMedium" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone={subtitleTone} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
      {chevron && onPress && <ChevronRight size={18} color={c.muted} />}
    </>
  );

  return onPress ? (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      scaleTo={0.99}
      pressedBackground={c.subtle}
      style={styles.row}
    >
      {content}
    </PressableScale>
  ) : (
    <View style={styles.row}>{content}</View>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    group: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.line,
      overflow: 'hidden',
    },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginLeft: space.lg },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingVertical: 14,
      paddingHorizontal: space.lg,
      minHeight: 56,
    },
    texts: { flex: 1, gap: 2 },
  })
);
