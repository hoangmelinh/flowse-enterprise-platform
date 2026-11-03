import React, { useMemo, useState } from 'react';
import { View, FlatList, SectionList, ScrollView, ActivityIndicator, Alert, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import {
  Circle,
  CircleCheck,
  Layers,
  UserPlus,
  Folder,
  List,
  Calendar,
  Flag,
  SquareCheckBig,
  WifiOff,
  Search,
  ListFilter,
  Ellipsis,
  Dot,
  Clock,
  CircleUser,
  Users,
} from 'lucide-react-native';
import { space, radius, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { dueBucket, dueText, fmtDue, overdueDays } from '../../../core/utils/dueDate';
import { WorkItem } from '../../../domain/entities/workitem';
import { WorkItemRepositoryImpl } from '../../../data/repositories/WorkItemRepositoryImpl';
import { comments, people, spaces, spaceTree } from '../../../data/demo/fixtures';
import {
  AppText, Avatar, Banner, BottomBar, Button, Chips, Composer, EmptyState, Fab, Field, Group, IconButton, KV, Row,
  Screen, ScreenHeader, ScrollPage, Segmented, SectionHeader, Stat, StatRow, Tag, TaskRow, TaskStatus, SpaceMark,
} from '../../components/ui';
import { useAuthStore } from '../../state/authStore';
import { WorkflowTransitionBar } from '../../components/workflow/WorkflowTransitionBar';
import { ScreenProps } from '../../navigation/types';

const repo = new WorkItemRepositoryImpl();
export const useMyWork = () => useQuery({ queryKey: ['my-work'], queryFn: () => repo.getMyWorkItems() });

/** Cách một việc hiện trong dòng việc (Figma Task): vòng trạng thái, chữ hạn có màu, cờ ưu tiên. */
export const taskView = (w: WorkItem) => {
  const b = dueBucket(w.dueDate);
  const status: TaskStatus = w.currentState?.isTerminal ? 'done' : w.statusName === 'Chờ review' ? 'review' : w.statusName === 'Đang làm' ? 'progress' : 'todo';
  return {
    status,
    due: dueText(w.dueDate),
    dueTone: b === 'overdue' ? ('danger' as const) : b === 'today' ? ('warning' as const) : ('muted' as const),
    flag: w.priority === 'High' || w.priority === 'Urgent',
    // shortcut: Figma hiện tên danh sách; API việc của tôi chưa trả tên danh sách nên tạm hiện trạng thái
    meta: w.statusName,
  };
};

const BUCKETS: [ReturnType<typeof dueBucket>, string][] = [
  ['overdue', 'Quá hạn'],
  ['today', 'Hôm nay'],
  ['later', 'Sắp tới'],
  ['none', 'Chưa đặt hạn'],
];

/** D01 — Công việc của tôi (tab). Dùng chung cache ['my-work'] với Trang chủ nên chuyển tab không tải lại. */
export const WorkItemsScreen: React.FC = () => {
  const s = useStyles();
  const nav = useNavigation<any>();
  const [seg, setSeg] = useState(0);
  const { data = [], isLoading, isError, refetch, isRefetching } = useMyWork();
  // shortcut: chỉ có API "việc tôi làm"; Tôi giao / Theo dõi trống cho tới khi backend có
  const sections = useMemo(
    () =>
      seg === 0
        ? BUCKETS.map(([b, title]) => ({ title, data: data.filter((w) => dueBucket(w.dueDate) === b) })).filter((x) => x.data.length)
        : [],
    [data, seg]
  );

  return (
    <Screen>
      <ScreenHeader
        title="Công việc"
        caption={`${data.length} việc của tôi`}
        right={
          <View style={s.headerIcons}>
            <IconButton icon={Search} label="Tìm kiếm" onPress={() => nav.navigate(Routes.SEARCH)} />
            <IconButton icon={ListFilter} label="Lọc" onPress={() => nav.navigate(Routes.WORK_FILTER)} />
          </View>
        }
      />
      <View style={s.filters}>
        <Segmented items={[`Tôi làm ${data.length}`, 'Tôi giao', 'Theo dõi']} value={seg} onChange={setSeg} />
      </View>
      {isLoading ? (
        <ActivityIndicator style={s.loading} />
      ) : isError ? (
        <EmptyState icon={WifiOff} title="Không tải được công việc" body="Kiểm tra kết nối mạng rồi thử lại." actionTitle="Thử lại" onAction={refetch} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(w) => String(w.id)}
          contentContainerStyle={s.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={<EmptyState icon={SquareCheckBig} title={seg === 0 ? 'Chưa có việc nào' : seg === 1 ? 'Bạn chưa giao việc nào' : 'Bạn chưa theo dõi việc nào'} body="Việc sẽ hiện ở đây khi có." />}
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHead}>
              <SectionHeader title={section.title} count={section.data.length} />
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <View style={[s.cell, index === 0 && s.first, index === section.data.length - 1 && s.last]}>
              <TaskRow title={item.title} {...taskView(item)} onPress={() => nav.navigate(Routes.WORK_ITEM_DETAIL, { workItemId: item.id })} />
            </View>
          )}
        />
      )}
      <Fab label="Tạo công việc" onPress={() => nav.navigate(Routes.CREATE_WORK_ITEM)} />
    </Screen>
  );
};

// shortcut: người review, việc con và hoạt động lấy từ Figma C06; nối API khi backend trả các trường này
const DETAIL_DEMO = {
  list: 'Kế hoạch SX / AP-1126',
  reviewer: 'Trần Quốc Dũng',
  subDone: 3,
  subTotal: 5,
  subtasks: [
    ['Đối chiếu tồn kho vải', 'done', 'Nguyễn Minh Anh'],
    ['Báo giá phụ liệu từ 2 NCC', 'progress', 'Phạm Quốc Huy'],
  ] as [string, TaskStatus, string][],
  activity: [
    ['Phạm Quốc Huy đính kèm bao-gia-ncc.pdf', 'Hôm nay 09:12'],
    ['Trần Quốc Dũng đổi hạn 28/10 → 29/10', 'Hôm qua 16:40'],
  ],
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
  const v = w ? taskView(w) : undefined;
  const user = useAuthStore((st) => st.user);
  const c = useColors();
  const s = useStyles();
  const more = () =>
    w &&
    Alert.alert(w.title, undefined, [
      { text: 'Trao đổi', onPress: () => navigation.navigate(Routes.COMMENTS, { code: `VP-${w.id}` }) },
      { text: 'Giao / chuyển việc', onPress: () => navigation.navigate(Routes.ASSIGN_SHEET, { title: w.title }) },
      ...(w.statusName === 'Chờ review' ? [{ text: 'Review kết quả', onPress: () => navigation.navigate(Routes.REVIEW) }] : []),
      { text: 'Đóng', style: 'cancel' as const },
    ]);

  return (
    <ScrollPage
      title={w ? `VP-${String(w.id).padStart(4, '0')}` : 'Đang tải…'}
      caption={DETAIL_DEMO.list}
      onBack={navigation.goBack}
      right={<IconButton icon={Ellipsis} label="Thêm thao tác" onPress={more} />}
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
          <AppText variant="title" style={s.detailTitle}>
            {w.title}
          </AppText>
          <View style={s.tags}>
            <Tag label={w.statusName || 'Đang mở'} tone={v!.status === 'review' ? 'warning' : v!.status === 'done' ? 'success' : 'progress'} icon={Dot} />
            {v!.flag ? <Tag label="Ưu tiên cao" tone="danger" icon={Flag} /> : null}
            {overdueDays(w.dueDate) ? <Tag label={`Quá hạn ${overdueDays(w.dueDate)} ngày`} tone="danger" icon={Clock} /> : null}
          </View>
          <Group>
            <KV icon={CircleUser} label="Người làm" value={w.assigneeName ?? user?.name ?? 'Chưa giao'} person={!!(w.assigneeName ?? user?.name)} />
            <KV icon={Users} label="Người review" value={DETAIL_DEMO.reviewer} person />
            <KV icon={Calendar} label="Hạn" value={w.dueDate ? fmtDue(w.dueDate) : 'Chưa đặt'} tone={v!.dueTone === 'danger' ? 'danger' : 'ink'} />
            <KV icon={Folder} label="Vị trí" value={DETAIL_DEMO.list} />
          </Group>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate(Routes.SUBTASKS)} style={s.subHead}>
            <SectionHeader title="Việc con" count={`${DETAIL_DEMO.subDone}/${DETAIL_DEMO.subTotal}`} />
            <View style={s.track}>
              <View style={[s.fill, { width: `${(DETAIL_DEMO.subDone / DETAIL_DEMO.subTotal) * 100}%` }]} />
            </View>
          </Pressable>
          <Group>
            {DETAIL_DEMO.subtasks.map(([t, st, who]) => (
              <TaskRow key={t} title={t} status={st} who={<Avatar name={who} size={24} />} onPress={() => navigation.navigate(Routes.SUBTASKS)} />
            ))}
          </Group>
          <SectionHeader title="Hoạt động" />
          <View>
            {DETAIL_DEMO.activity.map(([t, at], i) => (
              <View key={t} style={s.event}>
                <View style={s.rail}>
                  <View style={[s.dot, { backgroundColor: i === 0 ? c.accent : c.line }]} />
                  {i < DETAIL_DEMO.activity.length - 1 ? <View style={s.railLine} /> : null}
                </View>
                <View style={s.eventText}>
                  <AppText style={s.eventBody}>{t}</AppText>
                  <AppText variant="caption" tone="muted" style={s.small}>{at}</AppText>
                </View>
              </View>
            ))}
          </View>
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
  // K07: hỏi trước khi rời form đang nhập; bấm Tạo (REPLACE sang màn hoàn tất) thì cho qua
  usePreventRemove(!!(title.trim() || desc.trim()), ({ data }) => {
    if (data.action.type === 'REPLACE') return navigation.dispatch(data.action);
    Alert.alert('Bạn có thay đổi chưa lưu', 'Lưu nháp để tiếp tục sau, hoặc bỏ thay đổi.', [
      { text: 'Ở lại', style: 'cancel' },
      { text: 'Bỏ thay đổi', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
      { text: 'Lưu nháp', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
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
          <Row icon={Folder} title="Danh sách" subtitle="Đơn hàng AP-1126" onPress={() => navigation.navigate(Routes.PICK_PROJECT)} />
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

/** C08 / C15 — Sheet giao việc; người ngoài phạm vi thì gửi yêu cầu phối hợp thay vì giao thẳng. */
export const AssignSheet: React.FC<ScreenProps<typeof Routes.ASSIGN_SHEET>> = ({ navigation }) => {
  const s = useStyles();
  const c = useColors();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(people[0].id);
  const all = [...people, { id: 99, name: 'Hồ Thị Lan', sub: 'Dây chuyền A1 · ngoài phạm vi giao việc của bạn' }];
  const list = all.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const chosen = all.find((p) => p.id === picked);
  const outside = picked === 99;
  return (
    <ScrollView style={s.sheetBg} contentContainerStyle={s.sheet}>
      <AppText variant="heading">Giao cho</AppText>
      <Field label="Tìm người" icon={Search} value={q} onChangeText={setQ} placeholder="Tìm người trong Kế hoạch SX" />
      <Group>
        {list.map((p) => (
          <Row
            key={p.id}
            title={p.name}
            subtitle={p.sub}
            subtitleTone={p.id === 99 ? 'warning' : 'muted'}
            chevron={false}
            trailing={p.id === picked ? <CircleCheck size={22} color={c.accent} /> : <Circle size={22} color={c.muted} />}
            onPress={() => setPicked(p.id)}
          />
        ))}
      </Group>
      {outside ? <Banner tone="warning" text="Hồ Thị Lan thuộc Dây chuyền A1. Gửi yêu cầu phối hợp tới Trưởng dây chuyền A1 để giao cho Hồ Thị Lan." /> : null}
      <Button
        title={outside ? 'Gửi yêu cầu phối hợp' : `Giao cho ${chosen?.name ?? ''}`}
        disabled={!chosen}
        onPress={() => (outside ? navigation.replace(Routes.SUCCESS, { title: 'Đã gửi yêu cầu phối hợp', body: 'Trưởng dây chuyền A1 nhận yêu cầu giao việc cho Hồ Thị Lan.', kind: 'Phối hợp', code: 'PH-2610-006' }) : navigation.goBack())}
      />
    </ScrollView>
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
export const SpacesScreen: React.FC<ScreenProps<typeof Routes.SPACES>> = ({ route, navigation }) => {
  const s = useStyles();
  const projects = !!route.params?.projectsOnly;
  const chips = projects ? ['Đang chạy', 'Sắp hạn', 'Đã xong'] : ['Tất cả', 'Đã ghim', 'Của tôi'];
  const [f, setF] = useState(chips[0]);
  const list = spaces.filter((x) =>
    projects
      ? x.project && (f === 'Sắp hạn' ? x.state === 'soon' : f !== 'Đã xong')
      : !x.project && (f === 'Đã ghim' ? x.pinned : f === 'Của tôi' ? x.mine : true)
  );
  return (
    <ScrollPage
      title={projects ? 'Dự án' : 'Không gian'}
      caption={projects ? 'Không gian · nhãn Dự án' : 'Công ty An Phát · Văn phòng'}
      onBack={navigation.goBack}
      // shortcut: Figma có nút + tạo không gian/dự án; chưa có màn tạo nên chỉ để tìm kiếm
      right={<IconButton icon={Search} label="Tìm kiếm" onPress={() => navigation.navigate(Routes.SEARCH)} />}
    >
      <Chips items={chips} value={f} onChange={setF} />
      {list.length ? (
        <Group>
          {list.map((x, i) => (
            <Row
              key={x.id}
              leading={<SpaceMark index={i} />}
              title={x.name}
              subtitle={x.sub}
              trailing={<AppText tone="muted" style={s.count}>{x.open}</AppText>}
              onPress={() => (x.project ? navigation.navigate(Routes.PROJECT_DETAIL, { name: x.name }) : navigation.navigate(Routes.SPACE_DETAIL, { spaceId: x.id, name: x.name }))}
            />
          ))}
        </Group>
      ) : (
        <EmptyState icon={Layers} title={projects ? 'Chưa có dự án đã xong' : 'Không có không gian phù hợp'} body="Thử chọn bộ lọc khác." />
      )}
      <AppText variant="caption" tone="muted" style={s.small}>
        {projects ? 'Dự án là không gian có nhãn Dự án: có hạn, tiến độ và thành viên.' : 'Chỉ hiện không gian bạn là thành viên.'}
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
          onPress={() => navigation.navigate(Routes.LIST_VIEW, { name: n.name })}
        />
      ))}
    </Group>
  </ScrollPage>
);

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    filters: { paddingHorizontal: space.xl, paddingBottom: space.md },
    sectionHead: { paddingTop: space.lg, paddingBottom: space.md },
    detailTitle: { fontSize: 24, lineHeight: 30 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    subHead: { gap: space.md },
    track: { height: 6, borderRadius: 3, backgroundColor: c.subtle, overflow: 'hidden' },
    fill: { height: 6, borderRadius: 3, backgroundColor: c.accent },
    event: { flexDirection: 'row', gap: space.md },
    rail: { width: 10, alignItems: 'center', paddingTop: 5 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    railLine: { flex: 1, width: 2, marginTop: 4, backgroundColor: c.line },
    eventText: { flex: 1, gap: 2, paddingBottom: space.lg },
    eventBody: { fontSize: 14, lineHeight: 20 },
    small: { fontSize: 12 },
    count: { fontSize: 14 },
    headerIcons: { flexDirection: 'row' },
    loading: { marginTop: 40 },
    list: { paddingHorizontal: space.xl, paddingBottom: 100 },
    // Mỗi dòng là ô riêng của FlatList; bo góc đầu/cuối để trông như một Group liền khối
    cell: { backgroundColor: c.surface, borderLeftWidth: 1, borderRightWidth: 1, borderColor: c.line, borderTopWidth: StyleSheet.hairlineWidth },
    first: { borderTopWidth: 1, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, overflow: 'hidden' },
    last: { borderBottomWidth: 1, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, overflow: 'hidden' },
    sheetBg: { flex: 1, backgroundColor: c.bg },
    sheet: { gap: space.lg, padding: space.xl },
    thread: { gap: space.xl, padding: space.xl },
    msg: { flexDirection: 'row', gap: 10 },
  })
);
