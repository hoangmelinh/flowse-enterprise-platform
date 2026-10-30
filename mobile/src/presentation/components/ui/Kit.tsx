import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, TextInput, StyleSheet, StyleProp, ViewStyle, LayoutChangeEvent, RefreshControl } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { Plus, Send, Paperclip, LucideIcon } from 'lucide-react-native';
import { radius, space, text, Colors, ColorToken, makeStyles, useColors } from '../../../core/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { Screen } from './Screen';
import { ScreenHeader } from './ScreenHeader';

/** Bộ lọc dạng chip (D01, J01...). Chip đang chọn nền m/ink. */
export const Chips: React.FC<{ items: string[]; value: string; onChange: (v: string) => void }> = ({ items, value, onChange }) => {
  const s = useStyles();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
      {items.map((it) => {
        const on = it === value;
        return (
          <PressableScale
            key={it}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(it)}
            style={[s.chip, on && s.chipOn]}
          >
            <AppText variant="label" tone={on ? 'bg' : 'ink'}>
              {it}
            </AppText>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
};

/** Segmented 2–3 lựa chọn; thanh trượt chạy bằng Reanimated nên không giật khi đổi tab. */
export const Segmented: React.FC<{ items: string[]; value: number; onChange: (i: number) => void }> = ({ items, value, onChange }) => {
  const s = useStyles();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const segW = w / items.length;
  const placed = useRef(false);
  useEffect(() => {
    if (!segW) return;
    // Lần đo đầu: đặt thẳng vị trí, tránh thanh trượt "chạy" khi màn vừa mở
    x.value = placed.current ? withTiming(value * segW, { duration: 220, easing: Easing.out(Easing.cubic) }) : value * segW;
    placed.current = true;
  }, [x, value, segW]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={s.seg} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width - 6)}>
      {w > 0 && <Animated.View style={[s.segThumb, { width: segW }, thumb]} />}
      {items.map((it, i) => (
        <PressableScale key={it} accessibilityRole="tab" accessibilityState={{ selected: i === value }} onPress={() => onChange(i)} style={s.segItem}>
          <AppText variant="label" tone={i === value ? 'ink' : 'muted'} style={i === value ? s.bold : undefined}>
            {it}
          </AppText>
        </PressableScale>
      ))}
    </View>
  );
};

export const Stat: React.FC<{ value: string | number; label: string; tone?: ColorToken }> = ({ value, label, tone = 'ink' }) => {
  const s = useStyles();
  return (
    <View style={s.stat}>
      <AppText variant="title" tone={tone}>
        {value}
      </AppText>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
};

export const StatRow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const s = useStyles();
  return <View style={s.statRow}>{children}</View>;
};

/** Dòng nhãn – giá trị trong Group (KV trong Figma). */
export const KV: React.FC<{ label: string; value: string; tone?: ColorToken }> = ({ label, value, tone = 'ink' }) => {
  const s = useStyles();
  return (
    <View style={s.kv}>
      <AppText tone="muted" variant="body" style={s.flex}>
        {label}
      </AppText>
      <AppText variant="bodyMedium" tone={tone} style={s.kvValue}>
        {value}
      </AppText>
    </View>
  );
};

const softOf: Partial<Record<ColorToken, ColorToken>> = {
  accent: 'accentSoft',
  danger: 'dangerSoft',
  warning: 'warningSoft',
  success: 'successSoft',
  progress: 'progressSoft',
  muted: 'subtle',
};
export const Tag: React.FC<{ label: string; tone?: ColorToken; icon?: LucideIcon }> = ({ label, tone = 'accent', icon: Icon }) => {
  const c = useColors();
  return (
    <View style={[stylesStatic.tag, { backgroundColor: c[softOf[tone] ?? 'subtle'] }]}>
      {Icon && <Icon size={12} color={c[tone]} />}
      <AppText variant="micro" tone={tone}>
        {label}
      </AppText>
    </View>
  );
};

export const Avatar: React.FC<{ name: string; size?: number }> = ({ name, size = 32 }) => {
  const c = useColors();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <View style={[stylesStatic.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.subtle }]}>
      <AppText variant="micro" style={{ fontSize: size * 0.36, lineHeight: size * 0.5 }}>
        {initials}
      </AppText>
    </View>
  );
};

export const IconButton: React.FC<{ icon: LucideIcon; label: string; onPress?: () => void; tone?: ColorToken }> = ({
  icon: Icon,
  label,
  onPress,
  tone = 'ink',
}) => {
  const c = useColors();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={stylesStatic.iconBtn}>
      <Icon size={22} color={c[tone]} />
    </PressableScale>
  );
};

export const SectionHeader: React.FC<{ title: string; action?: string; onAction?: () => void; count?: number }> = ({
  title,
  action,
  onAction,
  count,
}) => (
  <View style={stylesStatic.section}>
    <AppText variant="section" accessibilityRole="header">
      {title}
    </AppText>
    {action && onAction ? (
      <PressableScale accessibilityRole="link" hitSlop={8} onPress={onAction}>
        <AppText variant="label" tone="accent">
          {action}
        </AppText>
      </PressableScale>
    ) : count !== undefined ? (
      <AppText variant="caption" tone="muted">
        {count}
      </AppText>
    ) : null}
  </View>
);

/** Thanh nút cuối màn (Actions trong Figma): cùng nền m/bg, kẻ mảnh phía trên. */
export const BottomBar: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const s = useStyles();
  return <View style={s.bottom}>{children}</View>;
};

export const Fab: React.FC<{ onPress: () => void; label: string }> = ({ onPress, label }) => {
  const s = useStyles();
  const c = useColors();
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} onPress={onPress} scaleTo={0.92} style={s.fab}>
      <Plus size={24} color={c.bg} />
    </PressableScale>
  );
};

export const Bubble: React.FC<{ text: string; mine?: boolean; meta?: string; metaTone?: ColorToken; dim?: boolean }> = ({
  text: body,
  mine,
  meta,
  metaTone = 'muted',
  dim,
}) => {
  const s = useStyles();
  return (
    <View style={[s.bubbleWrap, { alignItems: mine ? 'flex-end' : 'flex-start' }]}>
      <View style={[s.bubble, mine ? s.mine : s.theirs, dim && { opacity: 0.55 }]}>
        <AppText tone={mine ? 'bg' : 'ink'}>{body}</AppText>
      </View>
      {meta ? (
        <AppText variant="caption" tone={metaTone}>
          {meta}
        </AppText>
      ) : null}
    </View>
  );
};

/** Ô soạn tin (chat, trao đổi, Flowse AI). */
export const Composer: React.FC<{ placeholder: string; onSend: (msg: string) => void; attach?: boolean; disabled?: boolean }> = ({
  placeholder,
  onSend,
  attach = true,
  disabled,
}) => {
  const s = useStyles();
  const c = useColors();
  const [msg, setMsg] = useState('');
  const send = () => {
    if (!msg.trim()) return;
    onSend(msg.trim());
    setMsg('');
  };
  return (
    <View style={s.composer}>
      {attach && <IconButton icon={Paperclip} label="Đính kèm" tone="muted" />}
      <TextInput
        value={msg}
        onChangeText={setMsg}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        style={s.input}
        editable={!disabled}
        onSubmitEditing={send}
        returnKeyType="send"
      />
      <PressableScale accessibilityRole="button" accessibilityLabel="Gửi" onPress={send} disabled={disabled} scaleTo={0.9} style={[s.send, disabled && { opacity: 0.4 }]}>
        <Send size={18} color={c.bg} />
      </PressableScale>
    </View>
  );
};

/** Khung màn có header + nội dung cuộn (dùng cho đa số màn). */
export const ScrollPage: React.FC<{
  title: string;
  caption?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}> = ({ title, caption, onBack, right, footer, children, refreshing, onRefresh, contentStyle }) => {
  const s = useStyles();
  const c = useColors();
  return (
    <Screen>
      <ScreenHeader title={title} caption={caption} onBack={onBack} right={right} />
      <ScrollView
        contentContainerStyle={[s.page, contentStyle]}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.muted} /> : undefined}
      >
        {children}
      </ScrollView>
      {footer}
    </Screen>
  );
};

const stylesStatic = StyleSheet.create({
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    bold: { fontFamily: text.button.fontFamily },
    chips: { gap: space.sm, paddingRight: space.xl },
    chip: { height: 34, paddingHorizontal: 14, borderRadius: radius.full, justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    chipOn: { backgroundColor: c.ink, borderColor: c.ink },
    seg: { flexDirection: 'row', padding: 3, borderRadius: radius.md, backgroundColor: c.subtle, height: 40 },
    segThumb: { position: 'absolute', top: 3, bottom: 3, left: 3, borderRadius: 9, backgroundColor: c.surface, boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
    segItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    statRow: { flexDirection: 'row', backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line },
    stat: { flex: 1, padding: space.lg, gap: 2 },
    kv: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.lg, minHeight: 44 },
    kvValue: { textAlign: 'right', flexShrink: 1 },
    bottom: { gap: space.sm, paddingTop: space.md, paddingHorizontal: space.xl, paddingBottom: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, backgroundColor: c.bg },
    fab: { position: 'absolute', right: space.xl, bottom: space.xl, width: 56, height: 56, borderRadius: radius.lg, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(0,0,0,0.18)' },
    bubbleWrap: { gap: 4 },
    bubble: { maxWidth: '82%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18 },
    mine: { backgroundColor: c.ink, borderBottomRightRadius: 6 },
    theirs: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line, borderTopLeftRadius: 6 },
    composer: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: 10, paddingBottom: 10, paddingHorizontal: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, backgroundColor: c.bg },
    input: { ...text.body, flex: 1, height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: c.subtle, color: c.ink },
    send: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' },
    page: { gap: space.xl, paddingTop: space.xs, paddingHorizontal: space.xl, paddingBottom: 40 },
  })
);
