import React, { useMemo, useState } from 'react';
import { View, ScrollView, FlatList, Switch, StyleSheet, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Hash, Layers, SquarePen, Users } from 'lucide-react-native';
import { space, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { chatMessages, conversations, notifications } from '../../../data/demo/fixtures';
import {
  AppText, Avatar, Banner, Bubble, Button, Chips, Composer, Group, IconButton, PressableScale, Row, Screen, ScreenHeader, ScrollPage, Segmented, Tag,
} from '../../components/ui';
import { ScreenProps } from '../../navigation/types';

/** J01 + J05 — Hộp thư: Thông báo | Tin nhắn. */
export const InboxScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const [tab, setTab] = useState(0);
  const [f, setF] = useState('Tất cả');
  const unread = notifications.filter((n) => n.unread).length;
  const msgUnread = conversations.reduce((a, x) => a + x.unread, 0);
  const notis = useMemo(
    () => notifications.filter((n) => (f === 'Chưa đọc' ? n.unread : f === '@ Nhắc tôi' ? n.kind === 'mention' : f === 'Duyệt' ? n.kind === 'approval' : true)),
    [f]
  );

  return (
    <Screen>
      <ScreenHeader
        title="Hộp thư"
        caption={tab === 0 ? `${unread} chưa đọc` : `${msgUnread} tin nhắn chưa đọc`}
        right={tab === 1 ? <IconButton icon={SquarePen} label="Tin nhắn mới" onPress={() => nav.navigate(Routes.NEW_MESSAGE)} /> : undefined}
      />
      <ScrollView contentContainerStyle={styles.page}>
        <Segmented items={['Thông báo', `Tin nhắn · ${msgUnread}`]} value={tab} onChange={setTab} />
        {tab === 0 ? (
          <>
            <Chips items={['Tất cả', 'Chưa đọc', '@ Nhắc tôi', 'Duyệt']} value={f} onChange={setF} />
            <Group>
              {notis.map((n) => (
                <NotiRow key={n.id} n={n} onPress={() => nav.navigate(n.kind === 'approval' ? Routes.APPROVALS : n.kind === 'request' ? Routes.REQUEST_DETAIL : Routes.COMMENTS, { requestId: 39, code: 'VP-2610-031' })} />
              ))}
            </Group>
          </>
        ) : (
          <Group>
            {conversations.map((cv) => (
              <ConvRow key={cv.id} cv={cv} onPress={() => nav.navigate(Routes.CHAT, { conversationId: cv.id, name: cv.name })} />
            ))}
          </Group>
        )}
      </ScrollView>
    </Screen>
  );
};

const NotiRow: React.FC<{ n: (typeof notifications)[number]; onPress: () => void }> = ({ n, onPress }) => {
  const c = useColors();
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} scaleTo={0.99} pressedBackground={c.subtle} style={[styles.row, n.unread && { backgroundColor: c.accentSoft }]}>
      <Avatar name={n.who} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyMedium" numberOfLines={1}>{n.title}</AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>{n.sub}</AppText>
      </View>
    </PressableScale>
  );
};

const ConvRow: React.FC<{ cv: (typeof conversations)[number]; onPress: () => void }> = ({ cv, onPress }) => {
  const c = useColors();
  const icon = cv.kind === 'channel' ? <Hash size={18} color={c.ink} /> : cv.kind === 'space' ? <Layers size={18} color={c.ink} /> : null;
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} scaleTo={0.99} pressedBackground={c.subtle} style={styles.row}>
      {icon ? <View style={[styles.convIcon, { backgroundColor: c.subtle }]}>{icon}</View> : <Avatar name={cv.name} />}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyMedium" numberOfLines={1}>{cv.name}</AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>{cv.last}</AppText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <AppText variant="caption" tone="muted">{cv.at}</AppText>
        {cv.unread ? <Tag label={String(cv.unread)} tone="accent" /> : null}
      </View>
    </PressableScale>
  );
};

/** J06 / J07 / J10 — Hội thoại. Danh sách đảo ngược nên tin mới luôn ở đáy, không nhảy khi bàn phím mở. */
export const ChatScreen: React.FC<ScreenProps<typeof Routes.CHAT>> = ({ route, navigation }) => {
  const [msgs, setMsgs] = useState<{ mine: boolean; text: string; meta: string; failed?: boolean }[]>(chatMessages);
  const isChannel = route.params.name.startsWith('#');
  // shortcut: J10 mô phỏng mất mạng ở hội thoại với Lê Đức Thành; nối trạng thái mạng thật khi có NetInfo
  const offline = route.params.conversationId === 4;
  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title={route.params.name}
        caption={isChannel ? 'Kênh · 8 thành viên' : 'Đang hoạt động'}
        onBack={navigation.goBack}
        right={isChannel ? <IconButton icon={Users} label="Thành viên kênh" onPress={() => navigation.navigate(Routes.CHANNEL_MEMBERS, { name: route.params.name })} /> : undefined}
      />
      {offline ? (
        <View style={styles.banner}>
          <Banner tone="warning" text="Mất kết nối. Tin nhắn sẽ tự gửi khi có mạng." />
        </View>
      ) : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          inverted
          data={[...msgs].reverse()}
          keyExtractor={(_, i) => String(msgs.length - i)}
          contentContainerStyle={styles.thread}
          renderItem={({ item }) => <Bubble text={item.text} mine={item.mine} meta={item.meta} metaTone={item.failed ? 'danger' : 'muted'} dim={item.failed} />}
        />
        {/* shortcut: gửi qua /messages/:conversationId khi nối API chat (backend đã có) */}
        <Composer placeholder={`Nhắn ${route.params.name}`} onSend={(t) => setMsgs((m) => [...m, offline ? { mine: true, text: t, meta: 'Chưa gửi · sẽ tự gửi khi có mạng', failed: true } : { mine: true, text: t, meta: 'Vừa xong' }])} />
      </KeyboardAvoidingView>
    </Screen>
  );
};

/** J11 — Cài đặt thông báo. */
export const NotificationSettingsScreen: React.FC<ScreenProps<typeof Routes.NOTIFICATION_SETTINGS>> = ({ navigation }) => {
  const c = useColors();
  const [quiet, setQuiet] = useState(1);
  const [on, setOn] = useState({ task: true, incident: true, message: false });
  const toggle = (k: keyof typeof on) => (
    <Switch value={on[k]} onValueChange={(v) => setOn((x) => ({ ...x, [k]: v }))} trackColor={{ true: c.accent, false: c.line }} thumbColor={c.surface} />
  );
  return (
    <ScrollPage title="Thông báo" caption="Tôi" onBack={navigation.goBack}>
      {/* J03: shortcut: chưa có expo-notifications nên chưa đọc được quyền thông báo thật; luôn gợi ý mở cài đặt */}
      <Banner tone="warning" text="Nếu thông báo đẩy đang tắt trên điện thoại, bạn có thể bỏ lỡ sự cố và phê duyệt gấp." />
      <Button title="Mở cài đặt điện thoại" variant="secondary" size="sm" onPress={Linking.openSettings} />
      <AppText variant="label" tone="muted">Giờ yên lặng</AppText>
      <Segmented items={['Tắt', '22:00–06:00', 'Ngoài ca']} value={quiet} onChange={setQuiet} />
      <Group>
        <Row title="Việc được giao và @nhắc tên" subtitle="Luôn báo, kể cả giờ yên lặng" trailing={toggle('task')} chevron={false} />
        <Row title="Sự cố trong phạm vi" subtitle="Rung mạnh khi SLA còn 15 phút" trailing={toggle('incident')} chevron={false} />
        <Row title="Tin nhắn" subtitle="Chỉ tin trực tiếp và @nhắc tên" trailing={toggle('message')} chevron={false} />
      </Group>
      <AppText variant="caption" tone="muted">Cảnh báo an toàn luôn bật theo quy định công ty.</AppText>
    </ScrollPage>
  );
};

const styles = StyleSheet.create({
  page: { gap: space.lg, paddingHorizontal: space.xl, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14, paddingHorizontal: space.lg },
  convIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  thread: { gap: space.md, padding: space.xl },
  banner: { paddingHorizontal: space.xl, paddingBottom: space.sm },
});
