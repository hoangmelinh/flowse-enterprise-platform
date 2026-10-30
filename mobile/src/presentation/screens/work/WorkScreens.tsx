import React, { useMemo, useState } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import {
  Circle,
  CircleAlert,
  CircleCheck,
  Layers,
  MessageSquare,
  UserPlus,
  Folder,
  List,
  Calendar,
  Flag,
  SquareCheckBig,
  WifiOff,
  Search,
} from 'lucide-react-native';
import { space, radius, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { dueBucket } from '../../../core/utils/dueDate';
import { WorkItem } from '../../../domain/entities/workitem';
import { WorkItemRepositoryImpl } from '../../../data/repositories/WorkItemRepositoryImpl';
import { comments, people, spaces, spaceTree } from '../../../data/demo/fixtures';
import {
  AppText, Avatar, BottomBar, Button, Chips, Composer, EmptyState, Fab, Field, Group, IconButton, KV, Row,
  Screen, ScreenHeader, ScrollPage, Segmented, SectionHeader, Stat, StatRow, Tag,
} from '../../components/ui';
import { WorkflowTransitionBar } from '../../components/workflow/WorkflowTransitionBar';
import { ScreenProps } from '../../navigation/types';

const repo = new WorkItemRepositoryImpl();
export const useMyWork = () => useQuery({ queryKey: ['my-work'], queryFn: () => repo.getMyWorkItems() });

const dueInfo = (w: WorkItem) => {
  const b = dueBucket(w.dueDate);
  if (b === 'overdue') return { label: 'Quá hạn', tone: 'danger' as const, icon: CircleAlert };
  if (b === 'today') return { label: 'Hôm nay', tone: 'warning' as const, icon: Circle };
  return { label: w.statusName || 'Đang mở', tone: 'muted' as const, icon: Circle };
};

/** D01 — Công việc của tôi (tab). Dùng chung cache ['my-work'] với Trang chủ nên chuyển tab không tải lại. */
export const WorkItemsScreen: React.FC = () => {
  const s = useStyles();
  const nav = useNavigation<any>();
  const [filter, setFilter] = useState('Tất cả');
  const { data = [], isLoading, isError, refetch, isRefetching } = useMyWork();
  const list = useMemo(() => {
    if (filter === 'Quá hạn') return data.filter((w) => dueBucket(w.dueDate) === 'overdue');
    if (filter === 'Hôm nay') return data.filter((w) => dueBucket(w.dueDate) === 'today');
    if (filter === 'Chờ review') return data.filter((w) => w.statusName === 'Chờ review');
    return data;
  }, [data, filter]);

  return (
    <Screen>
      <ScreenHeader
        title="Công việc"
        caption={`${data.length} việc của tôi`}
        right={<IconButton icon={Layers} label="Không gian" onPress={() => nav.navigate(Routes.SPACES)} />}
      />
      <View style={s.filters}>
        <Chips items={['Tất cả', 'Quá hạn', 'Hôm nay', 'Chờ review']} value={filter} onChange={setFilter} />
      </View>
      {isLoading ? (
        <ActivityIndicator style={s.loading} />
      ) : isError ? (
        <EmptyState icon={WifiOff} title="Không tải được công việc" body="Kiểm tra kết nối mạng rồi thử lại." actionTitle="Thử lại" onAction={refetch} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(w) => String(w.id)}
          contentContainerStyle={s.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={<EmptyState icon={SquareCheckBig} title="Không có việc phù hợp" body="Thử bỏ bộ lọc." />}
          renderItem={({ item, index }) => {
            const d = dueInfo(item);
            return (
              <View style={[s.cell, index === 0 && s.first, index === list.length - 1 && s.last]}>
                <Row
                  icon={d.icon}
                  iconTone={d.tone}
                  title={item.title}
                  subtitle={d.label}
                  subtitleTone={d.tone}
                  onPress={() => nav.navigate(Routes.WORK_ITEM_DETAIL, { workItemId: item.id })}
                />
              </View>
            );
          }}
        />
      )}
      <Fab label="Tạo công việc" onPress={() => nav.navigate(Routes.CREATE_WORK_ITEM)} />
    </Screen>
  );
};

/** C06 — Chi tiết công việc + chuyển trạng thái. */
export const WorkItemDetailScreen: React.FC<ScreenProps<typeof Routes.WORK_ITEM_DETAIL>> = ({ route, navigation }) => {
  const { workItemId } = route.params;
  const qc = useQueryClient();
  const item = useQuery({ queryKey: ['work-item', workItemId], queryFn: () => repo.getWorkItemById(workItemId) });
  const transitions = useQuery({ queryKey: ['transitions', workItemId], queryFn: () => repo.getAvailableTransitions(workItemId) });
  const move = useMutation({
    mutationFn: (toStateId: number) => repo.transitionWorkItem(workItemId, toStateId, item.data?.version ?? 1),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-work'] });
      qc.invalidateQueries({ queryKey: ['work-item', workItemId] });
    },
  });
  const w = item.data;
  const d = w ? dueInfo(w) : undefined;

  return (
    <ScrollPage
      title={w?.title ? 'Chi tiết công việc' : 'Đang tải…'}
      caption={w ? `VP-${String(w.id).padStart(4, '0')}` : undefined}
      onBack={navigation.goBack}
      footer={
        transitions.data?.length ? (
          <BottomBar>
            <WorkflowTransitionBar transitions={transitions.data} isLoading={move.isPending} onTransition={(t) => move.mutate(t.toStateId)} />
          </BottomBar>
        ) : undefined
      }
    >
      {w ? (
        <>
          <View style={{ gap: space.sm }}>
            <Tag label={w.statusName || 'Đang mở'} tone="progress" />
            <AppText variant="title" style={{ fontSize: 24, lineHeight: 30 }}>
              {w.title}
            </AppText>
          </View>
          <Group>
            <KV label="Hạn" value={w.dueDate ? new Date(w.dueDate).toLocaleDateString('vi-VN') : 'Chưa đặt'} tone={d?.tone === 'muted' ? 'ink' : d?.tone} />
            <KV label="Trạng thái" value={w.statusName || 'Đang mở'} />
            <KV label="Ưu tiên" value={w.priority === 'High' || w.priority === 'Urgent' ? 'Cao' : 'Bình thường'} />
          </Group>
          <Group>
            <Row icon={MessageSquare} title="Trao đổi" subtitle="3 bình luận · 1 tệp" onPress={() => navigation.navigate(Routes.COMMENTS, { code: `VP-${w.id}` })} />
            <Row icon={UserPlus} title="Giao / chuyển việc" subtitle="Chọn người trong không gian" onPress={() => navigation.navigate(Routes.ASSIGN_SHEET, { title: w.title })} />
          </Group>
          {move.isSuccess ? <AppText variant="caption" tone="success">Đã cập nhật trạng thái.</AppText> : null}
        </>
      ) : (
        <ActivityIndicator />
      )}
    </ScrollPage>
  );
};

/** C07 — Tạo công việc. */
export const CreateWorkItemScreen: React.FC<ScreenProps<typeof Routes.CREATE_WORK_ITEM>> = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollPage
        title="Công việc mới"
        caption="Kế hoạch sản xuất"
        onBack={navigation.goBack}
        footer={
          <BottomBar>
            {/* shortcut: API tạo việc cần listId thật; nối khi có màn chọn Danh sách từ backend */}
            <Button
              title="Tạo và giao việc"
              disabled={!title.trim()}
              onPress={() => navigation.replace(Routes.SUCCESS, { title: 'Đã tạo công việc', body: `"${title.trim()}" đã được giao.`, kind: 'Công việc', code: 'VP-2610-052' })}
            />
          </BottomBar>
        }
      >
        <Field label="Tên công việc" value={title} onChangeText={setTitle} placeholder="Ví dụ: Xác nhận định mức chỉ may lô 2" />
        <Field label="Mô tả" value={desc} onChangeText={setDesc} placeholder="Thêm chi tiết (không bắt buộc)" multiline />
        <Group>
          <Row icon={Folder} title="Danh sách" subtitle="Đơn hàng AP-1126" />
          <Row icon={UserPlus} title="Người làm" subtitle="Chưa chọn" onPress={() => navigation.navigate(Routes.ASSIGN_SHEET)} />
          <Row icon={Calendar} title="Hạn" subtitle="31/10 · 12:00" />
          <Row icon={Flag} title="Ưu tiên" subtitle="Cao" />
        </Group>
        <AppText variant="caption" tone="muted">
          Chỉ người trong không gian Kế hoạch sản xuất được chọn làm người nhận.
        </AppText>
      </ScrollPage>
    </KeyboardAvoidingView>
  );
};

/** C08 — Sheet giao việc (form sheet native). */
export const AssignSheet: React.FC<ScreenProps<typeof Routes.ASSIGN_SHEET>> = ({ navigation }) => {
  const s = useStyles();
  const c = useColors();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(people[0].id);
  const list = people.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const chosen = people.find((p) => p.id === picked);
  return (
    <View style={s.sheet}>
      <AppText variant="heading">Giao cho</AppText>
      <Field label="Tìm người" icon={Search} value={q} onChangeText={setQ} placeholder="Tìm người trong Kế hoạch SX" />
      <Group>
        {list.map((p) => (
          <Row
            key={p.id}
            title={p.name}
            subtitle={p.sub}
            chevron={false}
            trailing={p.id === picked ? <CircleCheck size={22} color={c.accent} /> : <Circle size={22} color={c.muted} />}
            onPress={() => setPicked(p.id)}
          />
        ))}
      </Group>
      <Button title={`Giao cho ${chosen?.name ?? ''}`} disabled={!chosen} onPress={navigation.goBack} />
    </View>
  );
};

/** C10 — Trao đổi trong công việc. */
export const CommentsScreen: React.FC<ScreenProps<typeof Routes.COMMENTS>> = ({ route, navigation }) => {
  const s = useStyles();
  const [items, setItems] = useState(comments);
  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Trao đổi" caption={route.params.code} onBack={navigation.goBack} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={items}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={s.thread}
          renderItem={({ item }) => (
            <View style={s.msg}>
              <Avatar name={item.who} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyMedium">
                  {item.who} <AppText variant="caption" tone="muted">{item.at}</AppText>
                </AppText>
                <AppText>{item.text}</AppText>
              </View>
            </View>
          )}
        />
        <Composer placeholder="Nhắn, gõ @ để nhắc tên" onSend={(t) => setItems((x) => [...x, { who: 'Nguyễn Minh Anh', at: 'Vừa xong', text: t }])} />
      </KeyboardAvoidingView>
    </Screen>
  );
};

/** C01 / C12 — Không gian và Dự án. */
export const SpacesScreen: React.FC<ScreenProps<typeof Routes.SPACES>> = ({ navigation }) => {
  const [tab, setTab] = useState(0);
  const list = spaces.filter((x) => (tab === 1 ? x.project : true));
  return (
    <ScrollPage title={tab === 1 ? 'Dự án' : 'Không gian'} caption="Công ty An Phát" onBack={navigation.goBack}>
      <Segmented items={['Không gian', 'Dự án']} value={tab} onChange={setTab} />
      <Group>
        {list.map((x) => (
          <Row key={x.id} icon={Layers} iconTone="accent" title={x.name} subtitle={x.sub} onPress={() => navigation.navigate(Routes.SPACE_DETAIL, { spaceId: x.id, name: x.name })} />
        ))}
      </Group>
      <AppText variant="caption" tone="muted">
        Chỉ hiện không gian bạn là thành viên. Dự án là không gian có nhãn Dự án.
      </AppText>
    </ScrollPage>
  );
};

/** C02 / C13 — Chi tiết không gian / dự án. */
export const SpaceDetailScreen: React.FC<ScreenProps<typeof Routes.SPACE_DETAIL>> = ({ route, navigation }) => (
  <ScrollPage title={route.params.name} caption="Không gian" onBack={navigation.goBack}>
    <StatRow>
      <Stat value={18} label="Việc mở" />
      <Stat value={2} label="Quá hạn" tone="danger" />
      <Stat value={12} label="Thành viên" />
    </StatRow>
    <SectionHeader title="Thư mục và danh sách" />
    <Group>
      {spaceTree.map((n) => (
        <Row
          key={n.id}
          icon={n.kind === 'folder' ? Folder : List}
          title={n.name}
          subtitle={n.kind === 'folder' ? `Thư mục · ${n.count} việc` : `${n.count} việc`}
          onPress={() => navigation.navigate(Routes.MAIN_TABS, { screen: Routes.WORK_ITEMS })}
        />
      ))}
    </Group>
  </ScrollPage>
);

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    filters: { paddingLeft: space.xl, paddingBottom: space.md },
    loading: { marginTop: 40 },
    list: { paddingHorizontal: space.xl, paddingBottom: 100 },
    // Mỗi dòng là ô riêng của FlatList; bo góc đầu/cuối để trông như một Group liền khối
    cell: { backgroundColor: c.surface, borderLeftWidth: 1, borderRightWidth: 1, borderColor: c.line, borderTopWidth: StyleSheet.hairlineWidth },
    first: { borderTopWidth: 1, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, overflow: 'hidden' },
    last: { borderBottomWidth: 1, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, overflow: 'hidden' },
    sheet: { flex: 1, gap: space.lg, padding: space.xl, backgroundColor: c.bg },
    thread: { gap: space.xl, padding: space.xl },
    msg: { flexDirection: 'row', gap: 10 },
  })
);
