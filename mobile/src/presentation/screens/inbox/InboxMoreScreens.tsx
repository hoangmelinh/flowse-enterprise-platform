import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Appearance, Platform, ScrollView, Switch, StyleSheet } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Circle, CircleCheck, Users } from 'lucide-react-native';
import { space, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import config from '../../../core/config';
import { MessageRepositoryImpl } from '../../../data/repositories/MessageRepositoryImpl';
import { useAuthStore } from '../../state/authStore';
import { usePrefs } from '../../state/prefsStore';
import { useConversations, useWorkspaceMembers } from '../../state/useChat';
import { AppText, Avatar, Banner, Button, Chips, EmptyState, Field, Group, KeyboardAvoidView, KV, Row, ScrollPage, Segmented } from '../../components/ui';
import { ScreenProps } from '../../navigation/types';

const msgRepo = new MessageRepositoryImpl();

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
export const NewMessageSheet: React.FC<ScreenProps<typeof Routes.NEW_MESSAGE>> = (props) =>
  config.demo ? <DemoNewMessageSheet {...props} /> : <LiveNewMessageSheet {...props} />;

const DemoNewMessageSheet: React.FC<ScreenProps<typeof Routes.NEW_MESSAGE>> = ({ navigation }) => {
  const s = useStyles();
  const c = useColors();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(RECENT[0].name);
  const list = RECENT.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <KeyboardAvoidView>
      <ScrollView style={s.bg} contentContainerStyle={s.sheet} keyboardShouldPersistTaps="handled">
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
    </KeyboardAvoidView>
  );
};

const LiveNewMessageSheet: React.FC<ScreenProps<typeof Routes.NEW_MESSAGE>> = ({ navigation }) => {
  const s = useStyles();
  const c = useColors();
  const client = useQueryClient();
  const userId = useAuthStore((st) => st.user?.id);
  const wsId = useAuthStore((st) => st.currentWorkspace?.id);
  const { data: members = [], isLoading, error: loadErr } = useWorkspaceMembers();
  const [q, setQ] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [submitErr, setSubmitErr] = useState('');

  const others = useMemo(
    () => members.filter((m) => m.userId !== userId && `${m.name} ${m.departmentName || ''} ${m.email}`.toLowerCase().includes(q.toLowerCase())),
    [members, userId, q]
  );

  const toggleMember = (uid: number) =>
    setSelectedIds((prev) => (prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]));

  const picked = others.find((m) => m.userId === pickedId) ?? others[0];

  const submit = async () => {
    if (!wsId || busy) return;
    setBusy(true);
    setSubmitErr('');
    try {
      if (creatingChannel) {
        if (!channelName.trim()) return;
        const ch = await msgRepo.createChannel(wsId, channelName, selectedIds);
        await client.invalidateQueries({ queryKey: ['conversations', wsId, userId] });
        navigation.replace(Routes.CHAT, { conversationId: ch.id, name: ch.name, type: 'CHANNEL' });
      } else if (picked) {
        const conversationId = await msgRepo.startDirectMessage(wsId, picked.userId);
        await client.invalidateQueries({ queryKey: ['conversations', wsId, userId] });
        navigation.replace(Routes.CHAT, { conversationId, name: picked.name, type: 'DIRECT' });
      }
    } catch (e: any) {
      setSubmitErr(e?.message || 'Không thực hiện được yêu cầu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidView>
      <ScrollView
        style={s.bg}
        contentContainerStyle={s.sheet}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <AppText variant="heading">{creatingChannel ? 'Tạo kênh mới' : 'Tin nhắn mới'}</AppText>
        <Group>
          <Row
            icon={Plus}
            iconTone="accent"
            title={creatingChannel ? 'Chuyển về nhắn trực tiếp' : 'Tạo kênh mới'}
            subtitle={creatingChannel ? 'Chọn 1 đồng nghiệp để mở DM' : 'Nhóm theo dây chuyền, dự án'}
            chevron={false}
            onPress={() => { setCreatingChannel((v) => !v); setSubmitErr(''); }}
          />
        </Group>
        {creatingChannel ? (
          <Field label="Tên kênh" value={channelName} onChangeText={setChannelName} placeholder="ví dụ: bảo-trì-ca-sáng" />
        ) : null}
        <Field label="Tìm thành viên" icon={Search} value={q} onChangeText={setQ} placeholder="Tìm theo tên, phòng ban" />
        {loadErr ? <Banner tone="danger" text={(loadErr as Error).message} /> : null}
        {submitErr ? <Banner tone="danger" text={submitErr} /> : null}
        {isLoading ? (
          <ActivityIndicator accessibilityLabel="Đang tải thành viên" />
        ) : others.length === 0 ? (
          <EmptyState icon={Users} title="Không tìm thấy thành viên" body="Thử từ khóa khác trong workspace hiện tại." />
        ) : (
          <Group>
            {others.map((m) => {
              const active = creatingChannel ? selectedIds.includes(m.userId) : picked?.userId === m.userId;
              return (
                <Row
                  key={m.userId}
                  title={m.name}
                  subtitle={[m.departmentName, m.roleName].filter(Boolean).join(' · ') || m.email}
                  chevron={false}
                  trailing={active ? <CircleCheck size={22} color={c.accent} /> : <Circle size={22} color={c.muted} />}
                  onPress={() => (creatingChannel ? toggleMember(m.userId) : setPickedId(m.userId))}
                />
              );
            })}
          </Group>
        )}
        <Button
          title={creatingChannel ? `Tạo kênh${channelName.trim() ? ` #${channelName.trim().replace(/^#+/, '')}` : ''}` : picked ? `Nhắn ${picked.name}` : 'Chọn người nhận'}
          disabled={busy || (creatingChannel ? !channelName.trim() : !picked)}
          loading={busy}
          onPress={submit}
        />
      </ScrollView>
    </KeyboardAvoidView>
  );
};

const MEMBERS = [
  { name: 'Trần Quốc Dũng', sub: 'Quản trị kênh · Trưởng ca', admin: true },
  { name: 'Hồ Văn Bảo', sub: 'Kỹ thuật · Tổ bảo trì', admin: false },
  { name: 'Lê Đức Thành', sub: 'Kỹ thuật · Tổ bảo trì', admin: false },
  { name: 'Nguyễn Hoàng Nam', sub: 'Kỹ thuật · Tổ bảo trì', admin: false },
];

/** J09 — Thành viên kênh (sheet). */
export const ChannelMembersSheet: React.FC<ScreenProps<typeof Routes.CHANNEL_MEMBERS>> = (props) =>
  config.demo ? <DemoChannelMembersSheet {...props} /> : <LiveChannelMembersSheet {...props} />;

const DemoChannelMembersSheet: React.FC<ScreenProps<typeof Routes.CHANNEL_MEMBERS>> = ({ route }) => {
  const s = useStyles();
  const c = useColors();
  const [f, setF] = useState('Tất cả 8');
  const [muted, setMuted] = useState(false);
  return (
    <KeyboardAvoidView>
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
    </KeyboardAvoidView>
  );
};

const LiveChannelMembersSheet: React.FC<ScreenProps<typeof Routes.CHANNEL_MEMBERS>> = ({ route }) => {
  const s = useStyles();
  const c = useColors();
  const client = useQueryClient();
  const userId = useAuthStore((st) => st.user?.id);
  const wsId = useAuthStore((st) => st.currentWorkspace?.id);
  const { data: convs = [] } = useConversations();
  const { data: wsMembers = [] } = useWorkspaceMembers();
  const conv = convs.find((x) => (route.params.conversationId ? x.id === route.params.conversationId : x.name === route.params.name));
  const members = conv?.members ?? [];
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [err, setErr] = useState('');

  const available = useMemo(
    () => wsMembers.filter((wm) => !members.some((m) => m.userId === wm.userId)),
    [wsMembers, members]
  );

  const add = async (uid: number) => {
    if (!conv || busyId != null) return;
    setBusyId(uid);
    setErr('');
    try {
      await msgRepo.addMember(conv.id, uid);
      await client.invalidateQueries({ queryKey: ['conversations', wsId, userId] });
      setAdding(false);
    } catch (e: any) {
      setErr(e?.message || 'Không thêm được thành viên.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <KeyboardAvoidView>
      <ScrollView style={s.bg} contentContainerStyle={s.sheet} keyboardShouldPersistTaps="handled">
        <AppText variant="caption" tone="muted">{`Kênh · ${members.length} thành viên`}</AppText>
        <AppText variant="heading">{conv?.name || route.params.name}</AppText>
        {err ? <Banner tone="danger" text={err} /> : null}
        <Group>
          {members.map((m) => (
            <Row
              key={m.userId}
              title={m.name}
              subtitle={conv?.createdBy === m.userId ? 'Người tạo kênh' : `@${m.username || 'member'}`}
              chevron={false}
              trailing={<Avatar name={m.name} size={28} />}
            />
          ))}
        </Group>
        {adding ? (
          <>
            <AppText variant="label" tone="muted">Chọn thành viên để thêm</AppText>
            {available.length === 0 ? (
              <AppText variant="caption" tone="muted">Mọi thành viên workspace đã có trong kênh.</AppText>
            ) : (
              <Group>
                {available.map((wm) => (
                  <Row
                    key={wm.userId}
                    title={wm.name}
                    subtitle={wm.departmentName || wm.email}
                    chevron={false}
                    trailing={<Plus size={18} color={c.accent} />}
                    onPress={() => { void add(wm.userId); }}
                  />
                ))}
              </Group>
            )}
          </>
        ) : (
          <Button title="Thêm thành viên" variant="secondary" icon={<Plus size={18} color={c.ink} />} onPress={() => setAdding(true)} />
        )}
      </ScrollView>
    </KeyboardAvoidView>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    bg: { flex: 1, backgroundColor: c.bg },
    sheet: { gap: space.lg, padding: space.xl },
  })
);
