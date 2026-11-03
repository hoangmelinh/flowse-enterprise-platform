import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { ChevronRight, Circle, CircleDashed, CircleCheckBig, OctagonAlert, Flag, LucideIcon } from 'lucide-react-native';
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
  titleTone?: ColorToken;
  subtitle?: string;
  subtitleTone?: ColorToken;
  icon?: LucideIcon;
  iconTone?: ColorToken;
  /** Thay icon đầu dòng, ví dụ Avatar (dòng người). */
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
}

export const Row: React.FC<RowProps> = ({
  title,
  titleTone = 'ink',
  subtitle,
  subtitleTone = 'muted',
  icon: Icon,
  iconTone = 'muted',
  leading,
  trailing,
  chevron = true,
  onPress,
}) => {
  const styles = useStyles();
  const c = useColors();
  const content = (
    <>
      {leading ?? (Icon && <Icon size={20} color={c[iconTone]} />)}
      <View style={styles.texts}>
        <AppText variant="bodyMedium" tone={titleTone} numberOfLines={2}>
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

/** Trạng thái việc → vòng màu đầu dòng (Task trong Figma). */
export type TaskStatus = 'todo' | 'progress' | 'review' | 'blocked' | 'done';
const STATUS_ICON: Record<TaskStatus, [LucideIcon, ColorToken]> = {
  todo: [CircleDashed, 'muted'],
  progress: [Circle, 'progress'],
  review: [Circle, 'warning'],
  blocked: [OctagonAlert, 'danger'],
  done: [CircleCheckBig, 'success'],
};

/** Dòng công việc (Task trong Figma): vòng trạng thái, dòng phụ + hạn có màu, cờ ưu tiên, avatar người làm. */
export const TaskRow: React.FC<{
  title: string;
  status: TaskStatus;
  meta?: string;
  due?: string;
  dueTone?: ColorToken;
  extra?: React.ReactNode;
  flag?: boolean;
  who?: React.ReactNode;
  onPress?: () => void;
}> = ({ title, status, meta, due, dueTone = 'muted', extra, flag, who, onPress }) => {
  const styles = useStyles();
  const c = useColors();
  const [Icon, tone] = STATUS_ICON[status];
  const content = (
    <>
      <Icon size={20} color={c[tone]} />
      <View style={styles.texts}>
        <AppText variant="bodyMedium" tone={status === 'done' ? 'muted' : 'ink'} numberOfLines={2}>
          {title}
        </AppText>
        <View style={styles.meta}>
          {meta ? <AppText variant="caption" tone="muted">{meta}</AppText> : null}
          {due ? <AppText variant={dueTone === 'muted' ? 'caption' : 'label'} tone={dueTone}>{due}</AppText> : null}
          {extra}
        </View>
      </View>
      {flag && <Flag size={16} color={c.danger} accessibilityLabel="Ưu tiên cao" />}
      {who}
    </>
  );
  return onPress ? (
    <PressableScale accessibilityRole="button" onPress={onPress} scaleTo={0.99} pressedBackground={c.subtle} style={styles.row}>
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
    meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.sm },
  })
);
