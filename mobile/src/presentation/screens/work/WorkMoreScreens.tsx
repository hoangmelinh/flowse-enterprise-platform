import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Circle, CircleCheck, Folder, List, Plus, Search, SquareCheckBig, Square } from 'lucide-react-native';
import { space, radius, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { Tone } from '../../../data/demo/fixtures';
import {
  AppText, Avatar, BottomBar, Button, Chips, Field, Group, KV, PressableScale, Row, ScrollPage, SectionHeader, Segmented, Stat, StatRow, Tag,
} from '../../components/ui';
import { ScreenProps } from '../../navigation/types';

// shortcut: nội dung mẫu theo Figma (C03–C15, D02–D10); thay bằng API danh sách/nhóm/đơn vị khi backend có

type Task = { title: string; due: string; who: string; status: 'Cần làm' | 'Đang làm' | 'Hoàn tất'; tone?: Tone; progress?: string };
const LIST_TASKS: Task[] = [
  { title: 'Chốt kế hoạch vật tư', due: 'Hôm qua', who: 'Nguyễn Minh Anh', status: 'Đang làm', tone: 'danger', progress: '3/5' },
  { title: 'Xác nhận lịch giao hàng', due: '31/10', who: 'Phạm Quốc Huy', status: 'Đang làm' },
  { title: 'Rà soát hồ sơ đơn hàng', due: '01/11', who: 'Trần Thu Hà', status: 'Cần làm' },
  { title: 'Đặt xe giao lô 1', due: '02/11', who: 'Lê Đức Thành', status: 'Cần làm' },
  { title: 'Gọi xác nhận kho Đồng Nai', due: '30/10', who: 'Phạm Quốc Huy', status: 'Cần làm' },
  { title: 'Nhận PO từ khách', due: '26/10', who: 'Nguyễn Minh Anh', status: 'Hoàn tất' },
];
const STATUSES = ['Đang làm', 'Cần làm', 'Hoàn tất'] as const;
const WEEK = [['T2', 27], ['T3', 28], ['T4', 29], ['T5', 30], ['T6', 31], ['T7', 1], ['CN', 2]] as const;
const BY_DAY: Record<number, { title: string; sub: string; who: string; tone?: Tone }[]> = {
  30: [
    { title: 'Chốt kế hoạch vật tư', sub: 'Quá hạn từ 29/10', who: 'Nguyễn Minh Anh', tone: 'danger' },
    { title: 'Gọi xác nhận kho Đồng Nai', sub: 'Trong ngày', who: 'Phạm Quốc Huy' },
  ],
  31: [{ title: 'Xác nhận lịch giao hàng', sub: 'Cả ngày', who: 'Phạm Quốc Huy' }],
  1: [{ title: 'Rà soát hồ sơ đơn hàng', sub: 'Hạn 17:00', who: 'Trần Thu Hà' }],
  2: [{ title: 'Đặt xe giao lô 1', sub: 'Hạn 10:00', who: 'Lê Đức Thành' }],
};

/** C03 / C04 / C05 — Một danh sách xem dạng Danh sách, Bảng, Lịch trên cùng dữ liệu. */
export const ListViewScreen: React.FC<ScreenProps<typeof Routes.LIST_VIEW>> = ({ route, navigation }) => {
  const s = useStyles();
  const [view, setView] = useState(route.params.view ?? 0);
  const [day, setDay] = useState(30);
  const open = (t: { title: string }) => navigation.navigate(Routes.WORK_ITEM_DETAIL, { workItemId: 102, title: t.title });
  return (
    <ScrollPage title={route.params.name} caption="Kế hoạch SX / Đơn hàng T11" onBack={navigation.goBack}>
      <Segmented items={['Danh sách', 'Bảng', 'Lịch']} value={view} onChange={setView} />
      {view === 0 &&
        STATUSES.map((st) => {
          const rows = LIST_TASKS.filter((t) => t.status === st);
          return (
            <View key={st} style={{ gap: space.md }}>
              <SectionHeader title={st} count={rows.length} />
              <Group>
                {rows.map((t) => (
                  <Row key={t.title} title={t.title} subtitle={[t.due, t.progress].filter(Boolean).join(' · ')} subtitleTone={t.tone} trailing={<Avatar name={t.who} size={28} />} onPress={() => open(t)} />
                ))}
              </Group>
            </View>
          );
        })}
      {view === 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.board} style={s.bleed}>
          {STATUSES.map((st) => {
            const rows = LIST_TASKS.filter((t) => t.status === st);
            return (
              <View key={st} style={s.column}>
                <SectionHeader title={st} count={rows.length} />
                {rows.map((t) => (
                  <PressableScale key={t.title} accessibilityRole="button" onPress={() => open(t)} style={s.card}>
                    <AppText variant="bodyMedium">{t.title}</AppText>
                    <View style={s.between}>
                      <AppText variant="caption" tone={t.tone ?? 'muted'}>{t.due}</AppText>
                      <Avatar name={t.who} size={24} />
                    </View>
                  </PressableScale>
                ))}
                <Button title="Thêm việc" variant="secondary" size="sm" onPress={() => navigation.navigate(Routes.CREATE_WORK_ITEM, { listName: route.params.name })} />
              </View>
            );
          })}
        </ScrollView>
      )}
      {view === 2 && (
        <>
          <View style={s.week}>
            {WEEK.map(([d, n]) => (
              <PressableScale key={n} accessibilityRole="button" accessibilityState={{ selected: day === n }} onPress={() => setDay(n)} style={[s.day, day === n && s.dayOn]}>
                <AppText variant="micro" tone={day === n ? 'bg' : 'muted'}>{d}</AppText>
                <AppText variant="bodyMedium" tone={day === n ? 'bg' : 'ink'}>{String(n)}</AppText>
                {BY_DAY[n] ? <View style={[s.dot, day === n && s.dotOn]} /> : null}
              </PressableScale>
            ))}
          </View>
          <SectionHeader title={`Ngày ${day}`} count={BY_DAY[day]?.length ?? 0} />
          {BY_DAY[day] ? (
            <Group>
              {BY_DAY[day].map((t) => (
                <Row key={t.title} title={t.title} subtitle={t.sub} subtitleTone={t.tone} trailing={<Avatar name={t.who} size={28} />} onPress={() => open(t)} />
              ))}
            </Group>
          ) : (
            <AppText variant="caption" tone="muted">Không có việc đến hạn ngày này.</AppText>
          )}
        </>
      )}
    </ScrollPage>
  );
};

/** C09 — Việc con & checklist. */
export const SubtasksScreen: React.FC<ScreenProps<typeof Routes.SUBTASKS>> = ({ navigation }) => {
  const c = useColors();
  const [tab, setTab] = useState(0);
  const [subs, setSubs] = useState([
    { t: 'Đối chiếu tồn kho vải', d: '27/10', w: 'Nguyễn Minh Anh', ok: true },
    { t: 'Lấy định mức từ kỹ thuật', d: '27/10', w: 'Trần Thu Hà', ok: true },
    { t: 'Gửi PR phụ liệu', d: '28/10', w: 'Nguyễn Minh Anh', ok: true },
    { t: 'Báo giá phụ liệu từ 2 NCC', d: 'Hôm nay', w: 'Phạm Quốc Huy', ok: false },
    { t: 'Trình duyệt kế hoạch', d: '31/10', w: 'Nguyễn Minh Anh', ok: false },
  ]);
  const [checks, setChecks] = useState([true, true, true, true, false, false]);
  const labels = ['Định mức đã duyệt', 'Tồn kho cập nhật', 'Báo giá đủ 2 NCC', 'Hạn giao khớp kế hoạch', 'Ngân sách dưới 200 triệu', 'Trưởng phòng xem trước'];
  const done = subs.filter((x) => x.ok).length;
  const doneC = checks.filter(Boolean).length;
  return (
    <ScrollPage
      title="Việc con"
      caption="VP-2610-031"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Thêm việc con, giao người riêng" variant="secondary" icon={<Plus size={18} color={c.ink} />} onPress={() => navigation.navigate(Routes.CREATE_WORK_ITEM)} />
        </BottomBar>
      }
    >
      <Segmented items={[`Việc con ${done}/${subs.length}`, `Checklist ${doneC}/${checks.length}`]} value={tab} onChange={setTab} />
      <Group>
        {tab === 0
          ? subs.map((x, i) => (
              <Row
                key={x.t}
                icon={x.ok ? CircleCheck : Circle}
                iconTone={x.ok ? 'success' : 'muted'}
                title={x.t}
                subtitle={x.d}
                subtitleTone={x.d === 'Hôm nay' ? 'warning' : 'muted'}
                trailing={<Avatar name={x.w} size={28} />}
                chevron={false}
                onPress={() => setSubs((a) => a.map((v, j) => (j === i ? { ...v, ok: !v.ok } : v)))}
              />
            ))
          : labels.map((l, i) => (
              <Row key={l} icon={checks[i] ? SquareCheckBig : Square} iconTone={checks[i] ? 'success' : 'muted'} title={l} chevron={false} onPress={() => setChecks((a) => a.map((v, j) => (j === i ? !v : v)))} />
            ))}
      </Group>
    </ScrollPage>
  );
};

/** C11 — Review kết quả: duyệt hoàn tất hoặc trả lại (bắt buộc nhận xét). */
export const ReviewScreen: React.FC<ScreenProps<typeof Routes.REVIEW>> = ({ navigation }) => {
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  return (
    <ScrollPage
      title="Review"
      caption="VP-2610-028 · gửi bởi Nguyễn Minh Anh"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button
            title="Duyệt hoàn tất"
            onPress={() => navigation.replace(Routes.SUCCESS, { title: 'Đã duyệt hoàn tất', body: 'Việc chuyển sang Hoàn tất. Nguyễn Minh Anh nhận thông báo.', kind: 'Công việc', code: 'VP-2610-028', anim: 'stamp' })}
          />
          <Button
            title="Trả lại chỉnh sửa"
            variant="secondary"
            onPress={() => {
              setTried(true);
              if (note.trim()) navigation.goBack();
            }}
          />
        </BottomBar>
      }
    >
      <AppText variant="title" style={{ fontSize: 24, lineHeight: 30 }}>Báo cáo tiến độ đơn PO-2410</AppText>
      <Group>
        <KV label="Việc con" value="3/3 xong" tone="success" />
        <KV label="Checklist" value="6/6 đạt" tone="success" />
        <KV label="Tệp kết quả" value="2 tệp" />
        <KV label="Gửi lúc" value="Hôm nay 08:05" />
      </Group>
      <Field label="Nhận xét (bắt buộc khi trả lại)" value={note} onChangeText={setNote} placeholder="Thêm số liệu lô 2 vào trang 3." multiline invalid={tried && !note.trim()} />
      {tried && !note.trim() ? <AppText variant="caption" tone="danger">Nhập nhận xét trước khi trả lại.</AppText> : null}
      <AppText variant="caption" tone="muted">Bạn là người review được chỉ định của việc này. Duyệt sẽ chuyển việc sang Hoàn tất.</AppText>
    </ScrollPage>
  );
};

/** C13 — Chi tiết dự án: thư mục và danh sách. */
export const ProjectDetailScreen: React.FC<ScreenProps<typeof Routes.PROJECT_DETAIL>> = ({ route, navigation }) => {
  const lists = (names: [string, number][]) =>
    names.map(([n, k]) => <Row key={n} icon={List} title={n} subtitle={`${k} việc`} onPress={() => navigation.navigate(Routes.LIST_VIEW, { name: n })} />);
  return (
    <ScrollPage title={route.params.name} caption="Dự án · Phòng Kế hoạch" onBack={navigation.goBack}>
      <StatRow>
        <Stat value={24} label="Việc mở" />
        <Stat value={3} label="Quá hạn" tone="danger" />
        <Stat value="62%" label="Tiến độ" tone="accent" />
      </StatRow>
      <SectionHeader title="Giai đoạn 2a · Kho" />
      <Group>{lists([['Tích hợp tồn kho', 8], ['Đào tạo người dùng', 5]])}</Group>
      <SectionHeader title="Giai đoạn 2b · Mua hàng" />
      <Group>
        <Row icon={Folder} title="Thư mục Mua hàng" subtitle="6 việc" onPress={() => navigation.navigate(Routes.LIST_VIEW, { name: 'Mua hàng' })} />
      </Group>
      <SectionHeader title="Danh sách trực tiếp trong không gian" />
      <Group>{lists([['Kiểm thử UAT', 4]])}</Group>
    </ScrollPage>
  );
};

const PROJECTS = [
  { name: 'Dự án ERP giai đoạn 2', sub: 'Dự án · 24 việc mở', kind: 'Dự án' },
  { name: 'Phòng Kế hoạch', sub: 'Phòng ban · 18 việc mở', kind: 'Phòng ban' },
  { name: 'Mở rộng dây chuyền A3', sub: 'Dự án · Nhà máy Bình Dương', kind: 'Dự án' },
];

/** C14 — Chọn dự án hoặc phòng ban (sheet, bước 1/2 của giao việc). */
export const PickProjectSheet: React.FC<ScreenProps<typeof Routes.PICK_PROJECT>> = ({ navigation }) => {
  const s = useStyles();
  const c = useColors();
  const [q, setQ] = useState('');
  const [f, setF] = useState('Gần đây');
  const [picked, setPicked] = useState(PROJECTS[0].name);
  const list = PROJECTS.filter((p) => (f === 'Gần đây' || p.kind === f) && p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <ScrollView style={s.sheetBg} contentContainerStyle={s.sheet}>
      <AppText variant="caption" tone="muted">Bước 1/2 · Giao việc</AppText>
      <AppText variant="heading">Thuộc dự án / phòng ban</AppText>
      <Field label="Tìm" icon={Search} value={q} onChangeText={setQ} placeholder="Tìm dự án hoặc phòng ban" />
      <Chips items={['Gần đây', 'Dự án', 'Phòng ban']} value={f} onChange={setF} />
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
      <Button title={`Tiếp tục với ${picked}`} onPress={() => navigation.replace(Routes.ASSIGN_SHEET, { title: picked })} />
    </ScrollView>
  );
};

/** D02 — Lọc công việc (sheet). */
export const WorkFilterSheet: React.FC<ScreenProps<typeof Routes.WORK_FILTER>> = ({ navigation }) => {
  const s = useStyles();
  const init = { st: 'Tất cả', due: 'Bất kỳ', by: 'Ai cũng được', pr: 'Tất cả' };
  const [f, setF] = useState(init);
  const groups: [keyof typeof init, string, string[]][] = [
    ['st', 'Trạng thái', ['Tất cả', 'Cần làm', 'Đang làm', 'Chờ duyệt']],
    ['due', 'Hạn', ['Bất kỳ', 'Quá hạn', 'Hôm nay', 'Tuần này']],
    ['by', 'Người giao', ['Ai cũng được', 'Trần Quốc Dũng', 'Tôi']],
    ['pr', 'Ưu tiên', ['Tất cả', 'Cao', 'Thường']],
  ];
  // shortcut: đếm theo dữ liệu mẫu; nối tham số lọc vào /tasks/my-tasks khi API hỗ trợ
  const count = f.due === 'Quá hạn' && f.pr === 'Cao' ? 0 : f.due === 'Quá hạn' ? 1 : 12;
  return (
    <ScrollView style={s.sheetBg} contentContainerStyle={s.sheet}>
      <AppText variant="heading">Lọc</AppText>
      {groups.map(([k, label, items]) => (
        <View key={k} style={{ gap: space.sm }}>
          <AppText variant="label" tone="muted">{label}</AppText>
          <Chips items={items} value={f[k]} onChange={(v) => setF((x) => ({ ...x, [k]: v }))} />
        </View>
      ))}
      <View style={s.row2}>
        <Button title="Xóa lọc" variant="secondary" style={{ flex: 1 }} onPress={() => setF(init)} />
        <Button title={count ? `Xem ${count} việc` : 'Không có việc'} style={{ flex: 1 }} onPress={() => (count ? navigation.goBack() : navigation.replace(Routes.STATE, { k: 'K02' }))} />
      </View>
    </ScrollView>
  );
};

const TEAM = [
  { name: 'Phạm Quốc Huy', role: 'Chuyên viên kế hoạch', load: '7 mở · 2 trễ', late: true },
  { name: 'Nguyễn Minh Anh', role: 'Chuyên viên kế hoạch', load: '5 mở', late: false },
  { name: 'Trần Thu Hà', role: 'Điều độ', load: '3 mở · 1 trễ', late: true },
  { name: 'Lê Đức Thành', role: 'Điều độ', load: '3 mở', late: false },
  { name: 'Võ Văn Khánh', role: 'Thực tập', load: '1 mở', late: false, free: true },
];

/** D04 — Nhóm. */
export const TeamScreen: React.FC<ScreenProps<typeof Routes.TEAM>> = ({ navigation }) => {
  const [f, setF] = useState('Tất cả 6');
  const list = TEAM.filter((m) => (f.startsWith('Có') ? m.late : f.startsWith('Rảnh') ? m.free : true));
  return (
    <ScrollPage title="Nhóm" caption="Phòng Kế hoạch" onBack={navigation.goBack}>
      <Chips items={['Tất cả 6', 'Có việc quá hạn 2', 'Rảnh 1']} value={f} onChange={setF} />
      <Group>
        {list.map((m) => (
          <Row key={m.name} title={m.name} subtitle={m.role} trailing={<Tag label={m.load} tone={m.late ? 'danger' : 'muted'} />} onPress={() => navigation.navigate(Routes.MEMBER_WORK, { name: m.name })} />
        ))}
      </Group>
    </ScrollPage>
  );
};

/** D05 — Việc của một người trong nhóm, giữ bộ lọc khi mở việc rồi quay lại. */
export const MemberWorkScreen: React.FC<ScreenProps<typeof Routes.MEMBER_WORK>> = ({ route, navigation }) => {
  const [tab, setTab] = useState(0);
  const late = [
    { t: 'Bổ sung biên bản nghiệm thu', s: 'AP-1126', d: 'Quá 2 giờ' },
    { t: 'Báo giá phụ liệu từ 2 NCC', s: 'AP-1126', d: 'Quá 30 phút' },
  ];
  return (
    <ScrollPage
      title={`Việc của ${route.params.name}`}
      caption="Phòng Kế hoạch"
      onBack={navigation.goBack}
      footer={
        tab === 0 ? (
          <BottomBar>
            <Button title="Giao lại 2 việc" onPress={() => navigation.navigate(Routes.REASSIGN, { title: late[0].t, from: route.params.name })} />
          </BottomBar>
        ) : undefined
      }
    >
      <Segmented items={['Quá hạn 2', 'Đang làm 5', 'Tất cả 7']} value={tab} onChange={setTab} />
      <Group>
        {(tab === 0 ? late : [...late, { t: 'Xác nhận lịch giao hàng', s: 'AP-1126', d: '31/10' }, { t: 'Gọi xác nhận kho Đồng Nai', s: 'AP-1131', d: 'Hôm nay' }]).map((x) => (
          <Row key={x.t} title={x.t} subtitle={x.s} trailing={<Tag label={x.d} tone={x.d.startsWith('Quá') ? 'danger' : 'muted'} />} onPress={() => navigation.navigate(Routes.WORK_ITEM_DETAIL, { workItemId: 101, title: x.t })} />
        ))}
      </Group>
      <AppText variant="caption" tone="muted">Bộ lọc được giữ khi bạn mở việc rồi quay lại.</AppText>
    </ScrollPage>
  );
};

/** D06 — Giao lại có lý do. */
export const ReassignScreen: React.FC<ScreenProps<typeof Routes.REASSIGN>> = ({ route, navigation }) => {
  const [reason, setReason] = useState('');
  return (
    <ScrollPage
      title="Giao lại"
      caption={route.params.title}
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button
            title="Giao lại cho Trần Thu Hà"
            disabled={!reason.trim()}
            onPress={() => navigation.replace(Routes.SUCCESS, { title: 'Đã giao lại cho Trần Thu Hà', body: 'Cả hai người nhận thông báo kèm lý do.', kind: 'Công việc', code: 'VP-2610-031', anim: 'handover' })}
          />
        </BottomBar>
      }
    >
      <Group>
        <KV label="Từ" value={route.params.from} />
        <KV label="Sang" value="Trần Thu Hà" />
        <KV label="Hạn mới" value="Hôm nay 17:00" />
      </Group>
      <Field label="Lý do (cả hai người đều thấy)" value={reason} onChangeText={setReason} placeholder="Huy đang xử lý báo giá gấp cho PO-2410." multiline />
      <AppText variant="caption" tone="muted">Lịch sử việc, bình luận và tệp được giữ nguyên.</AppText>
    </ScrollPage>
  );
};

/** D07 — Đơn vị trong phạm vi quản lý. */
export const UnitsScreen: React.FC<ScreenProps<typeof Routes.UNITS>> = ({ navigation }) => {
  const units: [string, string, Tone, boolean][] = [
    ['Xưởng đóng gói', '18 việc · 4 quá hạn · 3 sự cố', 'danger', false],
    ['Dây chuyền A1', '6 việc · 1 quá hạn', 'warning', true],
    ['Dây chuyền A2', '8 việc · 2 quá hạn · 2 sự cố', 'danger', true],
    ['Dây chuyền A3', '4 việc · 1 quá hạn', 'warning', true],
    ['Xưởng cắt may', '21 việc · 3 quá hạn', 'warning', false],
    ['Kho thành phẩm', '7 việc · đúng hạn', 'success', false],
  ];
  return (
    <ScrollPage title="Đơn vị" caption="Nhà máy Bình Dương" onBack={navigation.goBack}>
      <Group>
        {units.map(([n, sub, tone, line]) => (
          <Row key={n} icon={line ? List : Folder} title={n} subtitle={sub} subtitleTone={tone} onPress={() => navigation.navigate(Routes.LINE_DETAIL)} />
        ))}
      </Group>
      <AppText variant="caption" tone="muted">Chỉ hiện đơn vị trong phạm vi bạn quản lý.</AppText>
    </ScrollPage>
  );
};

/** D08 — Chi tiết dây chuyền: việc, thiết bị, QC, vật tư. */
export const LineDetailScreen: React.FC<ScreenProps<typeof Routes.LINE_DETAIL>> = ({ navigation }) => {
  const [tab, setTab] = useState(0);
  const tabs: [string, string, Tone, () => void][][] = [
    [
      ['BT-07 rung bất thường', 'Sự cố · Lê Đức Thành · còn 28 phút', 'danger', () => navigation.navigate(Routes.INCIDENT_DETAIL, { incidentId: 24 })],
      ['Kiểm tra cảm biến băng tải', 'Nguyễn Hoàng Nam', 'muted', () => navigation.navigate(Routes.WORK_ITEM_DETAIL, { workItemId: 105 })],
      ['Kiểm tra khu vực cuối chuyền', 'Lê Minh Tâm · Chờ review', 'warning', () => navigation.navigate(Routes.REVIEW)],
    ],
    [
      ['BT-07 · Băng tải con lăn 6 m', 'Đang có sự cố', 'danger', () => navigation.navigate(Routes.ASSET_DETAIL, { assetCode: 'BT-07' })],
      ['MD-03 · Máy dán thùng', 'PM hôm nay 15:00', 'warning', () => navigation.navigate(Routes.PM_LIST)],
    ],
    [['QC-2610-018 · Lô vải 24', 'Chưa đạt · NCR-2610-004', 'danger', () => navigation.navigate(Routes.NCR_DETAIL)]],
    [['VT-2610-009 · Vòng bi BT-07', 'Kho cấp 2/4 · chờ mua 2', 'warning', () => navigation.navigate(Routes.MATERIAL_DETAIL, { materialId: 9 })]],
  ];
  return (
    <ScrollPage title="Dây chuyền A2" caption="Xưởng đóng gói" onBack={navigation.goBack}>
      <Segmented items={['Việc', 'Thiết bị', 'QC', 'Vật tư']} value={tab} onChange={setTab} />
      <StatRow>
        <Stat value={8} label="Việc mở" />
        <Stat value={2} label="Quá hạn" tone="danger" />
        <Stat value={12} label="Người" />
      </StatRow>
      <Group>
        {tabs[tab].map(([t, sub, tone, go]) => (
          <Row key={t} title={t} subtitle={sub} subtitleTone={tone} onPress={go} />
        ))}
      </Group>
    </ScrollPage>
  );
};

/** D09 — Việc hiện trường đang xử lý của dây chuyền. */
export const FieldWorkScreen: React.FC<ScreenProps<typeof Routes.FIELD_WORK>> = ({ navigation }) => {
  const [f, setF] = useState('Tất cả 4');
  const all: [string, string, string, Tone, string, () => void][] = [
    ['SC-2610-024 · BT-07 rung bất thường', 'Lê Đức Thành đang sửa', 'Còn 28 phút', 'warning', 'Sự cố', () => navigation.navigate(Routes.INCIDENT_DETAIL, { incidentId: 24 })],
    ['QC-2610-018 · Lô 24 chưa đạt', 'Chờ khắc phục · Tổ an toàn', 'Quá 30 phút', 'danger', 'Sự cố', () => navigation.navigate(Routes.NCR_DETAIL)],
    ['VT-2610-009 · Thay vòng bi BT-07', 'Kho cấp 2/4', 'Chờ mua 2', 'warning', 'Chờ vật tư', () => navigation.navigate(Routes.MATERIAL_DETAIL, { materialId: 9 })],
    ['Vệ sinh khu cuối chuyền', 'Tổ đóng gói 02 · 60%', 'Hạn 11:00', 'muted', '', () => navigation.navigate(Routes.SHIFT_TRANSFER)],
  ];
  const list = all.filter((x) => f.startsWith('Tất cả') || f.startsWith(x[4]));
  return (
    <ScrollPage
      title="Việc hiện trường"
      caption="Dây chuyền A2 · Ca sáng"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Phân công nhanh" onPress={() => navigation.navigate(Routes.INCIDENT_TRIAGE, { incidentId: 24 })} />
        </BottomBar>
      }
    >
      <Chips items={['Tất cả 4', 'Sự cố 2', 'Chờ vật tư 1']} value={f} onChange={setF} />
      <Group>
        {list.map(([t, sub, tag, tone, , go]) => (
          <Row key={t} title={t} subtitle={sub} trailing={<Tag label={tag} tone={tone} />} onPress={go} />
        ))}
      </Group>
      <AppText variant="caption" tone="muted">Chỉ hiện việc đang xử lý tại hiện trường của dây chuyền bạn quản lý.</AppText>
    </ScrollPage>
  );
};

/** D10 — Chuyển việc sang ca sau (sheet). */
export const ShiftTransferSheet: React.FC<ScreenProps<typeof Routes.SHIFT_TRANSFER>> = ({ navigation }) => {
  const s = useStyles();
  const c = useColors();
  const ppl = [
    { n: 'Võ Văn Khánh', sub: 'Ca chiều · rảnh đầu ca', off: false },
    { n: 'Phạm Thị Mai', sub: 'Ca chiều · 2 việc', off: false },
    { n: 'Đặng Văn Lộc', sub: 'Nghỉ ca chiều', off: true },
  ];
  const [picked, setPicked] = useState(ppl[0].n);
  const [due, setDue] = useState('Đầu ca');
  return (
    <ScrollView style={s.sheetBg} contentContainerStyle={s.sheet}>
      <AppText variant="caption" tone="muted">Tổ đóng gói 02 · Ca sáng kết thúc 14:00</AppText>
      <AppText variant="heading">Vệ sinh khu vực cuối chuyền</AppText>
      <AppText variant="label" tone="muted">Chuyển sang ca chiều · cùng khu vực</AppText>
      <Group>
        {ppl.map((p) => (
          <Row
            key={p.n}
            title={p.n}
            subtitle={p.sub}
            chevron={false}
            trailing={p.n === picked ? <CircleCheck size={22} color={c.accent} /> : <Circle size={22} color={c.muted} />}
            onPress={p.off ? undefined : () => setPicked(p.n)}
          />
        ))}
      </Group>
      <AppText variant="label" tone="muted">Hạn ở ca chiều</AppText>
      <Chips items={['Đầu ca', 'Trước 18:00', 'Trong ca']} value={due} onChange={setDue} />
      <Button title={`Chuyển cho ${picked}`} onPress={navigation.goBack} />
    </ScrollView>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    bleed: { marginHorizontal: -space.xl },
    board: { gap: space.md, paddingHorizontal: space.xl },
    column: { width: 248, gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: c.subtle },
    card: { gap: space.sm, padding: space.md, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    week: { flexDirection: 'row', gap: 6 },
    day: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    dayOn: { backgroundColor: c.ink, borderColor: c.ink },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.accent },
    dotOn: { backgroundColor: c.bg },
    sheetBg: { flex: 1, backgroundColor: c.bg },
    sheet: { gap: space.lg, padding: space.xl },
    row2: { flexDirection: 'row', gap: space.sm },
  })
);
