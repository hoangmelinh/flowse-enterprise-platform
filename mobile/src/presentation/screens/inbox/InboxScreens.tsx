import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, FlatList, Switch, StyleSheet, KeyboardAvoidingView, Platform, Linking, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Bell, Hash, Layers, SquarePen, Users, WifiOff } from 'lucide-react-native';
import { space, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import config from '../../../core/config';
import { Notification } from '../../../domain/entities/notification';
import { chatMessages, conversations, notifications } from '../../../data/demo/fixtures';
import {
  AppText, Avatar, Banner, Bubble, Button, Chips, Composer, EmptyState, Group, IconButton, PressableScale, Row, Screen, ScreenHeader, ScrollPage, Segmented, Tag,
} from '../../components/ui';
import { ScreenProps } from '../../navigation/types';
import { useNotifications } from '../../state/useNotifications';

/** J01 + J05 — Hộp thư: Thông báo | Tin nhắn. */
export const InboxScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const [tab, setTab] = useState(0);
  const [f, setF] = useState('Tất cả');
  const live = useNotifications();
  const source: ((typeof notifications)[number] | Notification)[] = config.demo ? notifications : live.notifications;
  const unread = config.demo ? notifications.filter((n) => n.unread).length : live.unreadCount;
  const busy = live.markRead.isPending || live.markAllRead.isPending;
  const actionError = live.markRead.error || live.markAllRead.error;
  const msgUnread = conversations.reduce((a, x) => a + x.unread, 0);
  const notis = useMemo(
    () => source.filter((n) => (f === 'Chưa đọc' ? n.unread : f === '@ Nhắc tôi' ? n.kind === 'mention' : f === 'Duyệt' ? n.kind === 'approval' : true)),
    [f, source]
  );
  const { refetch } = live;
  useFocusEffect(useCallback(() => {
    if (!config.demo) void refetch();
  }, [refetch]));

  const openNotification = (n: Notification) => {
    if (busy) return;
    live.markRead.reset();
    live.markAllRead.reset();
    const openTask = () => {
      if (n.entityType === 'task' && n.entityId != null) {
        nav.navigate(Routes.WORK_ITEM_DETAIL, { workItemId: n.entityId });
      }
    };
    if (n.unread) live.markRead.mutate(n.id, { onSuccess: openTask });
    else openTask();
  };

  return (
    <Screen>
      <ScreenHeader
        title="Hộp thư"
        caption={tab === 0 ? `${unread} chưa đọc` : `${msgUnread} tin nhắn chưa đọc`}
        right={tab === 1 ? <IconButton icon={SquarePen} label="Tin nhắn mới" onPress={() => nav.navigate(Routes.NEW_MESSAGE)} /> : undefined}
      />
      <ScrollView
        contentContainerStyle={styles.page}
        refreshControl={!config.demo && tab === 0 ? <RefreshControl refreshing={live.isRefetching && !live.isFetchingNextPage} onRefresh={() => { void refetch(); }} /> : undefined}
      >
        <Segmented items={['Thông báo', `Tin nhắn · ${msgUnread}`]} value={tab} onChange={setTab} />
        {tab === 0 ? (
          <>
            <Chips items={['Tất cả', 'Chưa đọc', '@ Nhắc tôi', 'Duyệt']} value={f} onChange={setF} />
            {!config.demo && actionError ? <Banner tone="danger" text={actionError.message} /> : null}
            {!config.demo && live.isError && source.length > 0 ? <Banner tone="danger" text={live.error?.message || 'Không tải được thông báo. Vui lòng thử lại.'} /> : null}
            {!config.demo && unread > 0 ? (
              <Button title="Đánh dấu tất cả đã đọc" variant="secondary" size="sm" disabled={busy} loading={live.markAllRead.isPending}
                onPress={() => { live.markRead.reset(); live.markAllRead.mutate(); }} />
            ) : null}
            {!config.demo && live.isLoading ? <ActivityIndicator accessibilityLabel="Đang tải thông báo" /> :
              !config.demo && live.isError && source.length === 0 ? (
                <EmptyState icon={WifiOff} title="Không tải được thông báo" body={live.error?.message} actionTitle="Thử lại" onAction={refetch} />
              ) : !config.demo && notis.length === 0 ? (
                <EmptyState icon={Bell} title="Chưa có thông báo" body="Thông báo phù hợp sẽ xuất hiện ở đây khi có." />
              ) : <Group>
              {notis.map((n) => (
                <NotiRow key={n.id} n={n} disabled={!config.demo && busy} onPress={() => {
                  if (config.demo) nav.navigate(n.kind === 'approval' ? Routes.APPROVALS : n.kind === 'request' ? Routes.REQUEST_DETAIL : Routes.COMMENTS, { requestId: 39, code: 'VP-2610-031' });
                  else if ('entityType' in n) openNotification(n);
                }} />
              ))}
            </Group>}
            {!config.demo && live.hasNextPage ? <Button title="Tải thêm" variant="secondary" loading={live.isFetchingNextPage} disabled={live.isFetching || busy} onPress={() => { void live.fetchNextPage(); }} /> : null}
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

const NotiRow: React.FC<{ n: (typeof notifications)[number]; onPress: () => void; disabled?: boolean }> = ({ n, onPress, disabled }) => {
  const c = useColors();
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} disabled={disabled} scaleTo={0.99} pressedBackground={c.subtle} style={[styles.row, n.unread && { backgroundColor: c.accentSoft }]}>
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
/** J03 — Thông báo: loại thông báo nào báo ngay; giờ yên lặng ở J11. */
export const NotificationSettingsScreen: React.FC<ScreenProps<typeof Routes.NOTIFICATION_SETTINGS>> = ({ navigation }) => {
  const c = useColors();
  const [on, setOn] = useState({ task: true, mention: true, approval: true, digest: false });
  const toggle = (k: keyof typeof on) => (
    <Switch value={on[k]} onValueChange={(v) => setOn((x) => ({ ...x, [k]: v }))} trackColor={{ true: c.accent, false: c.line }} thumbColor={c.surface} />
  );
  return (
    <ScrollPage title="Thông báo" caption="Tôi" onBack={navigation.goBack}>
      {/* shortcut: chưa có expo-notifications nên chưa đọc được quyền thông báo thật; luôn gợi ý mở cài đặt */}
      <Banner tone="warning" text="Thông báo đẩy đang tắt trên điện thoại. Bạn có thể bỏ lỡ sự cố và phê duyệt gấp." />
      <Button title="Mở cài đặt điện thoại" variant="secondary" onPress={Linking.openSettings} />
      <Group>
        <Row title="Việc giao cho tôi" subtitle="Ngay lập tức" trailing={toggle('task')} chevron={false} />
        <Row title="@ Nhắc tên" subtitle="Ngay lập tức" trailing={toggle('mention')} chevron={false} />
        <Row title="Phê duyệt" subtitle="Ngay lập tức" trailing={toggle('approval')} chevron={false} />
        <Row title="Tóm tắt cuối ngày" subtitle="17:30" trailing={toggle('digest')} chevron={false} />
      </Group>
      <Group>
        <Row title="Giờ yên lặng" subtitle="22:00–06:00" onPress={() => navigation.navigate(Routes.QUIET_HOURS)} />
      </Group>
      <AppText variant="caption" tone="muted">Cảnh báo an toàn luôn bật theo quy định công ty.</AppText>
    </ScrollPage>
  );
};

/** J11 — Giờ yên lặng và ngoại lệ luôn báo. */
export const QuietHoursScreen: React.FC<ScreenProps<typeof Routes.QUIET_HOURS>> = ({ navigation }) => {
  const c = useColors();
  const [quiet, setQuiet] = useState(1);
  const [on, setOn] = useState({ task: true, incident: true, message: false });
  const toggle = (k: keyof typeof on) => (
    <Switch value={on[k]} onValueChange={(v) => setOn((x) => ({ ...x, [k]: v }))} trackColor={{ true: c.accent, false: c.line }} thumbColor={c.surface} />
  );
  return (
    <ScrollPage title="Giờ yên lặng" caption="Thông báo" onBack={navigation.goBack}>
      <Segmented items={['Tắt', '22:00–06:00', 'Ngoài ca']} value={quiet} onChange={setQuiet} />
      <Group>
        <Row title="Việc được giao và @nhắc tên" subtitle="Luôn báo, kể cả trong giờ yên lặng" trailing={toggle('task')} chevron={false} />
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
