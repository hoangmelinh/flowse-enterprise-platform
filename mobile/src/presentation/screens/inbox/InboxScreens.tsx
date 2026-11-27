import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, FlatList, Switch, StyleSheet, Platform, Linking, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Bell, Hash, Layers, MessageSquare, SquarePen, Users, WifiOff } from 'lucide-react-native';
import { space, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import config from '../../../core/config';
import { Notification } from '../../../domain/entities/notification';
import { ChatMessage, Conversation } from '../../../domain/entities/message';
import { chatMessages, conversations, notifications } from '../../../data/demo/fixtures';
import {
  AppText, Avatar, Banner, Bubble, Button, Chips, Composer, EmptyState, Group, IconButton, KeyboardAvoidView, PressableScale, Row, Screen, ScreenHeader, ScrollPage, Segmented, Tag,
} from '../../components/ui';
import { ScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../state/authStore';
import { useNotifications } from '../../state/useNotifications';
import { useConversationMessages, useConversations } from '../../state/useChat';

const fmtTime = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const toNumId = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isInteger(v) && v > 0) return v;
  if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
  return null;
};

/** J01 + J05 — Hộp thư: Thông báo | Tin nhắn. */
export const InboxScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const [tab, setTab] = useState(0);
  const [f, setF] = useState('Tất cả');
  const live = useNotifications();
  const liveConvs = useConversations();
  const source: ((typeof notifications)[number] | Notification)[] = config.demo ? notifications : live.notifications;
  const unread = config.demo ? notifications.filter((n) => n.unread).length : live.unreadCount;
  const busy = live.markRead.isPending || live.markAllRead.isPending;
  const actionError = live.markRead.error || live.markAllRead.error;
  const convSource: Conversation[] = liveConvs.data ?? [];
  const msgUnread = conversations.reduce((a, x) => a + x.unread, 0);
  const notis = useMemo(
    () =>
      source.filter((n) => {
        const k = String(n.kind || '').toLowerCase();
        const et = String(('entityType' in n ? n.entityType : '') || '').toLowerCase();
        if (f === 'Chưa đọc') return n.unread;
        if (f === '@ Nhắc tôi') return k.includes('mention');
        if (f === 'Duyệt') return k.includes('approv') || k === 'parts_requested' || et === 'approval';
        return true;
      }),
    [f, source]
  );
  const { refetch } = live;
  const { refetch: refetchConvs } = liveConvs;
  useFocusEffect(useCallback(() => {
    if (!config.demo) {
      void refetch();
      void refetchConvs();
    }
  }, [refetch, refetchConvs]));

  const openNotification = (n: Notification) => {
    if (busy) return;
    live.markRead.reset();
    live.markAllRead.reset();
    const go = () => {
      const entity = (n.entityType || '').toLowerCase();
      const kind = (n.kind || '').toLowerCase();
      const meta = (n.metadata && typeof n.metadata === 'object' ? n.metadata : {}) as Record<string, unknown>;
      const taskId = toNumId(meta.taskId) ?? (['task', 'work_item', 'incident'].includes(entity) ? n.entityId : null);
      const approvalId = toNumId(meta.approvalId) ?? (entity === 'approval' ? n.entityId : null);
      const incidentId = toNumId(meta.incidentId);

      if (entity === 'task' || entity === 'work_item') {
        if (taskId != null) nav.navigate(Routes.WORK_ITEM_DETAIL, { workItemId: taskId });
      } else if (entity === 'incident') {
        if (taskId != null) nav.navigate(Routes.WORK_ITEM_DETAIL, { workItemId: taskId });
        else if (incidentId != null) nav.navigate(Routes.INCIDENT_DETAIL, { incidentId });
      } else if (entity === 'approval') {
        if (approvalId != null) nav.navigate(Routes.APPROVAL_DECISION, { approvalId });
        else if (toNumId(meta.taskId) != null) nav.navigate(Routes.WORK_ITEM_DETAIL, { workItemId: toNumId(meta.taskId)! });
        else nav.navigate(Routes.APPROVALS);
      } else if (entity === 'request') {
        if (approvalId != null) nav.navigate(Routes.APPROVAL_DECISION, { approvalId });
        else if (toNumId(meta.taskId) != null) nav.navigate(Routes.WORK_ITEM_DETAIL, { workItemId: toNumId(meta.taskId)! });
        else if (kind === 'parts_requested') nav.navigate(Routes.APPROVALS);
        else if (n.entityId != null) nav.navigate(Routes.REQUEST_DETAIL, { requestId: n.entityId });
        else nav.navigate(Routes.REQUESTS);
      } else if (entity === 'comment' && toNumId(meta.taskId) != null) {
        nav.navigate(Routes.WORK_ITEM_DETAIL, { workItemId: toNumId(meta.taskId)! });
      }
    };
    if (n.unread) live.markRead.mutate(n.id, { onSuccess: go });
    else go();
  };

  const refreshCtrl = config.demo ? undefined
    : tab === 0
      ? <RefreshControl refreshing={live.isRefetching && !live.isFetchingNextPage} onRefresh={() => { void refetch(); }} />
      : <RefreshControl refreshing={liveConvs.isRefetching} onRefresh={() => { void refetchConvs(); }} />;

  const tabMsgLabel = config.demo
    ? `Tin nhắn · ${msgUnread}`
    : convSource.length > 0 ? `Tin nhắn · ${convSource.length}` : 'Tin nhắn';

  return (
    <Screen>
      <ScreenHeader
        title="Hộp thư"
        caption={tab === 0 ? `${unread} chưa đọc` : config.demo ? `${msgUnread} tin nhắn chưa đọc` : `${convSource.length} hội thoại`}
        right={tab === 1 ? <IconButton icon={SquarePen} label="Tin nhắn mới" onPress={() => nav.navigate(Routes.NEW_MESSAGE)} /> : undefined}
      />
      <ScrollView contentContainerStyle={styles.page} refreshControl={refreshCtrl}>
        <Segmented items={['Thông báo', tabMsgLabel]} value={tab} onChange={setTab} />
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
        ) : config.demo ? (
          <Group>
            {conversations.map((cv) => (
              <ConvRow key={cv.id} cv={cv} onPress={() => nav.navigate(Routes.CHAT, { conversationId: cv.id, name: cv.name })} />
            ))}
          </Group>
        ) : liveConvs.isLoading ? (
          <ActivityIndicator accessibilityLabel="Đang tải hội thoại" />
        ) : liveConvs.isError && convSource.length === 0 ? (
          <EmptyState icon={WifiOff} title="Không tải được hội thoại" body={liveConvs.error?.message} actionTitle="Thử lại" onAction={refetchConvs} />
        ) : convSource.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Chưa có cuộc trò chuyện" body="Nhắn trực tiếp cho đồng nghiệp hoặc tạo kênh trao đổi theo nhóm." actionTitle="Tin nhắn mới" onAction={() => nav.navigate(Routes.NEW_MESSAGE)} />
        ) : (
          <Group>
            {convSource.map((cv) => (
              <ConvRow
                key={cv.id}
                cv={{
                  id: cv.id,
                  name: cv.name,
                  kind: cv.kind,
                  last: cv.lastMessage ? `${cv.lastMessage.senderName}: ${cv.lastMessage.content}` : 'Chưa có tin nhắn',
                  at: fmtTime(cv.lastMessage?.createdAt || cv.createdAt),
                  unread: 0,
                }}
                onPress={() => nav.navigate(Routes.CHAT, { conversationId: cv.id, name: cv.name, type: cv.type })}
              />
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
        <AppText variant="bodyMedium" numberOfLines={2}>{n.title}</AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>{n.sub}</AppText>
      </View>
    </PressableScale>
  );
};

const ConvRow: React.FC<{ cv: { id: number; name: string; kind: string; last: string; at: string; unread: number }; onPress: () => void }> = ({ cv, onPress }) => {
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

/** J06 / J07 / J10 — Hội thoại realtime. Danh sách đảo ngược nên tin mới luôn ở đáy, không bị bàn phím che. */
export const ChatScreen: React.FC<ScreenProps<typeof Routes.CHAT>> = (props) =>
  config.demo ? <DemoChatScreen {...props} /> : <LiveChatScreen {...props} />;

const DemoChatScreen: React.FC<ScreenProps<typeof Routes.CHAT>> = ({ route, navigation }) => {
  const [msgs, setMsgs] = useState<{ mine: boolean; text: string; meta: string; failed?: boolean }[]>(chatMessages);
  const isChannel = route.params.name.startsWith('#');
  const offline = route.params.conversationId === 4;
  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title={route.params.name}
        caption={isChannel ? 'Kênh · 8 thành viên' : 'Đang hoạt động'}
        onBack={navigation.goBack}
        right={isChannel ? <IconButton icon={Users} label="Thành viên kênh" onPress={() => navigation.navigate(Routes.CHANNEL_MEMBERS, { conversationId: route.params.conversationId, name: route.params.name })} /> : undefined}
      />
      {offline ? (
        <View style={styles.banner}>
          <Banner tone="warning" text="Mất kết nối. Tin nhắn sẽ tự gửi khi có mạng." />
        </View>
      ) : null}
      <KeyboardAvoidView>
        <FlatList
          inverted
          data={[...msgs].reverse()}
          keyExtractor={(_, i) => String(msgs.length - i)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={styles.thread}
          renderItem={({ item }) => <Bubble text={item.text} mine={item.mine} meta={item.meta} metaTone={item.failed ? 'danger' : 'muted'} dim={item.failed} />}
        />
        <Composer placeholder={`Nhắn ${route.params.name}`} onSend={(t) => setMsgs((m) => [...m, offline ? { mine: true, text: t, meta: 'Chưa gửi · sẽ tự gửi khi có mạng', failed: true } : { mine: true, text: t, meta: 'Vừa xong' }])} />
      </KeyboardAvoidView>
    </Screen>
  );
};

const LiveChatScreen: React.FC<ScreenProps<typeof Routes.CHAT>> = ({ route, navigation }) => {
  const { conversationId, name, type } = route.params;
  const userId = useAuthStore((s) => s.user?.id);
  const liveConvs = useConversations();
  const conv = liveConvs.data?.find((c) => c.id === conversationId);
  const convType = type ?? conv?.type;
  const isChannel = convType === 'CHANNEL' || name.startsWith('#');
  const memberCount = conv?.members.length ?? 0;

  const { messages, isLoading, isError, error, refetch, send, retryFailed } = useConversationMessages(conversationId);
  const sendErr = send.error?.message;
  const caption = convType === 'CHANNEL'
    ? `Kênh · ${memberCount || 1} thành viên`
    : convType === 'SPACE'
      ? `Không gian · ${memberCount || 1} thành viên`
      : 'Trực tuyến · Realtime';

  const msgMeta = (m: ChatMessage, mine: boolean) => {
    if (m.pending) return 'Đang gửi…';
    if (m.failed) return 'Chưa gửi · Chạm để gửi lại';
    const time = fmtTime(m.createdAt);
    return !mine && (convType === 'CHANNEL' || convType === 'SPACE') ? `${m.senderName} · ${time}` : time;
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title={conv?.name || name}
        caption={caption}
        onBack={navigation.goBack}
        right={isChannel ? <IconButton icon={Users} label="Thành viên kênh" onPress={() => navigation.navigate(Routes.CHANNEL_MEMBERS, { conversationId, name: conv?.name || name })} /> : undefined}
      />
      {sendErr ? (
        <View style={styles.banner}>
          <Banner tone="warning" text={sendErr} />
        </View>
      ) : null}
      <KeyboardAvoidView>
        {isLoading && messages.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator accessibilityLabel="Đang tải tin nhắn" />
          </View>
        ) : isError && messages.length === 0 ? (
          <View style={styles.center}>
            <EmptyState icon={WifiOff} title="Không tải được tin nhắn" body={error?.message} actionTitle="Thử lại" onAction={refetch} />
          </View>
        ) : (
          <FlatList
            inverted
            data={[...messages].reverse()}
            keyExtractor={(m) => String(m.id)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentContainerStyle={styles.thread}
            ListEmptyComponent={<EmptyState icon={MessageSquare} title="Chưa có tin nhắn" body={`Gửi lời chào tới ${conv?.name || name} để bắt đầu.`} />}
            renderItem={({ item }) => {
              const mine = item.senderId === userId;
              const bubble = <Bubble text={item.content} mine={mine} meta={msgMeta(item, mine)} metaTone={item.failed ? 'danger' : 'muted'} dim={item.failed || item.pending} />;
              return item.failed
                ? <PressableScale onPress={() => retryFailed(item)}>{bubble}</PressableScale>
                : bubble;
            }}
          />
        )}
        <Composer
          placeholder={`Nhắn ${conv?.name || name}`}
          onSend={(content) => send.mutate({ content, tempId: -Date.now() })}
        />
      </KeyboardAvoidView>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl },
});
