import React, { useState } from 'react';
import { Appearance, ScrollView, Switch, StyleSheet } from 'react-native';
import { Search, Plus, Circle, CircleCheck } from 'lucide-react-native';
import { space, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { usePrefs } from '../../state/prefsStore';
import { AppText, Avatar, Button, Chips, Field, Group, KV, Row, ScrollPage, Segmented } from '../../components/ui';
import { ScreenProps } from '../../navigation/types';

const MODES = ['unspecified', 'light', 'dark'] as const;

/** J04 — Giao diện & chuyển động. Đổi Sáng/Tối bằng Appearance nên mọi màn đổi theo ngay. */
export const AppearanceScreen: React.FC<ScreenProps<typeof Routes.APPEARANCE>> = ({ navigation }) => {
  const c = useColors();
  const { anim3d, theme, set } = usePrefs();
  const pick = (i: number) => {
    set({ theme: i });
    Appearance.setColorScheme(MODES[i]);
  };
  return (
    <ScrollPage title="Giao diện" caption="Tôi" onBack={navigation.goBack}>
      <AppText variant="label" tone="muted">Chế độ</AppText>
      <Segmented items={['Theo máy', 'Sáng', 'Tối']} value={theme} onChange={pick} />
      <Group>
        <Row
          title="Hiệu ứng 3D"
          subtitle="Khối ghép khi mở app, xác nhận thao tác"
          chevron={false}
          trailing={<Switch value={anim3d} onValueChange={(v) => set({ anim3d: v })} trackColor={{ true: c.accent, false: c.line }} thumbColor={c.surface} />}
        />
        <KV label="Giảm chuyển động" value="Theo cài đặt trợ năng của máy" />
        <KV label="Cỡ chữ" value="Theo máy" />
      </Group>
    </ScrollPage>
  );
};

const RECENT = [
  { name: 'Trần Thu Hà', sub: 'Phòng Kế hoạch · đang hoạt động' },
  { name: 'Phạm Quốc Huy', sub: 'Phòng Kế hoạch · 10 phút trước' },
  { name: 'Lê Đức Thành', sub: 'Tổ bảo trì · ca sáng' },
];

/** J08 — Tin nhắn mới (sheet). */
export const NewMessageSheet: React.FC<ScreenProps<typeof Routes.NEW_MESSAGE>> = ({ navigation }) => {
  const s = useStyles();
  const c = useColors();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(RECENT[0].name);
  const list = RECENT.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <ScrollView style={s.bg} contentContainerStyle={s.sheet}>
      <AppText variant="heading">Tin nhắn mới</AppText>
      <Field label="Tìm người" icon={Search} value={q} onChangeText={setQ} placeholder="Tìm người trong An Phát" />
      <Group>
        <Row icon={Plus} iconTone="accent" title="Tạo kênh" subtitle="Nhóm theo dây chuyền, dự án" chevron={false} />
      </Group>
      <AppText variant="label" tone="muted">Gần đây</AppText>
      <Group>
        {list.map((p) => (
          <Row
            key={p.name}
            title={p.name}
            subtitle={p.sub}
            chevron={false}
            trailing={p.name === picked ? <CircleCheck size={22} color={c.accent} /> : <Circle size={22} color={c.muted} />}
            onPress={() => setPicked(p.name)}
          />
        ))}
      </Group>
      <Button title={`Nhắn ${picked}`} onPress={() => navigation.replace(Routes.CHAT, { conversationId: 9, name: picked })} />
    </ScrollView>
  );
};

const MEMBERS = [
  { name: 'Trần Quốc Dũng', sub: 'Quản trị kênh · Trưởng ca', admin: true },
  { name: 'Hồ Văn Bảo', sub: 'Kỹ thuật · Tổ bảo trì', admin: false },
  { name: 'Lê Đức Thành', sub: 'Kỹ thuật · Tổ bảo trì', admin: false },
  { name: 'Nguyễn Hoàng Nam', sub: 'Kỹ thuật · Tổ bảo trì', admin: false },
];

/** J09 — Thành viên kênh (sheet). */
export const ChannelMembersSheet: React.FC<ScreenProps<typeof Routes.CHANNEL_MEMBERS>> = ({ route }) => {
  const s = useStyles();
  const c = useColors();
  const [f, setF] = useState('Tất cả 8');
  const [muted, setMuted] = useState(false);
  return (
    <ScrollView style={s.bg} contentContainerStyle={s.sheet}>
      <AppText variant="caption" tone="muted">Kênh · 8 thành viên</AppText>
      <AppText variant="heading">{route.params.name}</AppText>
      <Chips items={['Tất cả 8', 'Quản trị 1']} value={f} onChange={setF} />
      <Group>
        <Row title="Tắt thông báo" chevron={false} trailing={<Switch value={muted} onValueChange={setMuted} trackColor={{ true: c.accent, false: c.line }} thumbColor={c.surface} />} />
      </Group>
      <Group>
        {MEMBERS.filter((m) => f.startsWith('Tất cả') || m.admin).map((m) => (
          <Row key={m.name} title={m.name} subtitle={m.sub} chevron={false} trailing={<Avatar name={m.name} size={28} />} />
        ))}
      </Group>
      <Button title="Thêm thành viên" variant="secondary" icon={<Plus size={18} color={c.ink} />} />
    </ScrollView>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    bg: { flex: 1, backgroundColor: c.bg },
    sheet: { gap: space.lg, padding: space.xl },
  })
);
