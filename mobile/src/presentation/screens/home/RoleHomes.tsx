import React from 'react';
import { View, Linking, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  CircleCheck, Circle, ScanQrCode, TriangleAlert, Search, Users, ClipboardCheck, Wrench, Package, ShoppingCart,
  ArrowUpRight, ShieldAlert, LogOut, ChevronRight, LucideIcon,
} from 'lucide-react-native';
import { space, radius, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { Tone } from '../../../data/demo/fixtures';
import { useAuthStore } from '../../state/authStore';
import { HomeRole, usePrefs } from '../../state/prefsStore';
import { useHomeRole } from '../../state/useHomeRole';
import {
  AIButton, AppText, Avatar, Banner, Chips, Fab, FlowseMark, Group, IconButton, KV, PressableScale, Row, ScrollPage, SectionHeader,
  Segmented, Stat, StatRow, TaskRow, TaskStatus,
} from '../../components/ui';
import { STATE_KEYS, stateHeading } from '../common/StateScreen';
import { ScreenProps } from '../../navigation/types';

/**
 * B02–B12 — Trang chủ theo vai trò, dựng từ dữ liệu theo đúng các khối trong Figma.
 * shortcut: nội dung mẫu lấy từ Figma; thay bằng API tổng hợp theo vai trò khi backend có.
 */
type Go = [string, object?] | (() => void);
interface RowD {
  title: string;
  sub?: string;
  subTone?: Tone;
  go?: Go;
  /** Dòng việc: vòng trạng thái + hạn có màu + cờ + avatar */
  status?: TaskStatus;
  due?: string;
  dueTone?: Tone;
  flag?: boolean;
  who?: string;
  /** Dòng thường: icon đầu dòng, hoặc avatar của chính người đó */
  icon?: LucideIcon;
  iconTone?: Tone;
  person?: boolean;
  danger?: boolean;
  /** Nút chữ cuối dòng (B04 "Giao việc") */
  action?: string;
  /** Dòng dây chuyền / phân xưởng (B08, B09): thanh % đúng hạn */
  pct?: number;
  pctTone?: Tone;
}
type Block =
  | { k: 'stats'; items: [string | number, string, Tone?][] }
  | { k: 'section'; title?: string; count?: number; action?: [string, Go]; rows: RowD[] }
  | { k: 'banner'; tone: 'danger' | 'warning' | 'accent'; text: string; plain?: boolean }
  | { k: 'note'; text: string }
  | { k: 'hero'; title: string; sub: string }
  | { k: 'tiles' }
  | { k: 'seg'; items: string[]; on?: number }
  | { k: 'chips'; items: string[] }
  | { k: 'progress'; label: string; pct: number }
  | { k: 'kv'; items: [string, string][] };
interface HomeDef {
  name: string;
  caption: string;
  title: string;
  /** Nút góc phải header; bỏ trống = kính lúp, null = không có */
  head?: 'users' | 'scan' | null;
  fab?: boolean;
  blocks: Block[];
}

const inc: Go = [Routes.INCIDENT_DETAIL, { incidentId: 24 }];
const member = (name: string): RowD => ({ title: name, person: true, go: [Routes.MEMBER_WORK, { name }] });

export const ROLE_HOMES: Record<Exclude<HomeRole, 'VP'>, HomeDef> = {
  TP: {
    name: 'Trưởng phòng',
    caption: 'Phòng Kế hoạch · 6 người',
    title: 'Tổng quan',
    fab: true,
    blocks: [
      { k: 'stats', items: [[18, 'Đang mở'], [3, 'Quá hạn', 'danger'], [3, 'Chờ bạn duyệt']] },
      {
        k: 'section', title: 'Cần bạn điều phối', action: ['Việc nhóm', [Routes.TEAM]], rows: [
          { title: 'Bổ sung biên bản nghiệm thu', status: 'blocked', sub: 'Phạm Quốc Huy', due: 'Quá 2 giờ', dueTone: 'danger', flag: true, who: 'Phạm Quốc Huy', go: [Routes.REASSIGN, { title: 'Bổ sung biên bản nghiệm thu', from: 'Phạm Quốc Huy' }] },
          { title: 'Báo cáo tiến độ đơn PO-2410', status: 'review', sub: 'Nguyễn Minh Anh · gửi review', due: 'Hôm nay', who: 'Nguyễn Minh Anh', go: [Routes.REVIEW] },
        ],
      },
      {
        k: 'section', title: 'Tải việc theo người', rows: [
          { ...member('Nguyễn Minh Anh'), sub: '5 việc mở' },
          { ...member('Phạm Quốc Huy'), sub: '7 việc mở · 2 quá hạn', subTone: 'danger' },
          { ...member('Trần Thu Hà'), sub: '3 việc mở · 1 quá hạn', subTone: 'danger' },
          { ...member('Lê Đức Thành'), sub: '3 việc mở' },
        ],
      },
    ],
  },
  CN: {
    name: 'Công nhân',
    caption: 'Tổ đóng gói 02 · Ca sáng 06:00–14:00',
    title: 'Ca của tôi',
    head: null,
    blocks: [
      { k: 'hero', title: 'Còn 3 giờ 12 phút', sub: '2 việc trong ca · 1 checklist chưa xong' },
      { k: 'tiles' },
      {
        k: 'section', title: 'Việc trong ca', rows: [
          { title: 'Kiểm tra an toàn băng tải BT-07', status: 'progress', sub: 'Checklist 2/3', due: '10:30', dueTone: 'warning', go: [Routes.INSPECTION_RUNNER, { inspectionId: 20 }] },
          { title: 'Vệ sinh khu vực cuối chuyền', status: 'todo', sub: 'Trần Quốc Dũng giao', due: '13:30', go: [Routes.SHIFT_TRANSFER] },
        ],
      },
      { k: 'section', title: 'Sự cố tôi đã báo', rows: [{ title: 'BT-07 rung bất thường', icon: TriangleAlert, iconTone: 'warning', sub: 'SC-2610-024 · Lê Đức Thành đang sửa', go: inc }] },
    ],
  },
  CN_OFF: {
    name: 'Công nhân · ngoại tuyến (I03)',
    caption: 'Tổ đóng gói 02',
    title: 'Ca của tôi',
    head: null,
    blocks: [
      { k: 'banner', tone: 'warning', text: 'Mất kết nối. Bạn vẫn xem được việc đã tải và lưu nháp; Flowse gửi khi có mạng.' },
      {
        k: 'section', title: 'Trên máy', rows: [
          { title: 'Báo sự cố BT-07', icon: TriangleAlert, iconTone: 'warning', sub: 'Lưu 09:18 · 2 ảnh · chưa đồng bộ', subTone: 'warning', go: [Routes.SYNC_QUEUE] },
          { title: 'Kiểm tra an toàn BT-07', status: 'progress', sub: 'Checklist 2/3', due: 'dữ liệu lúc 08:55', go: [Routes.INSPECTION_RUNNER, { inspectionId: 20 }] },
        ],
      },
    ],
  },
  TC: {
    name: 'Trưởng ca',
    caption: 'Tổ đóng gói 02 · Trưởng ca',
    title: 'Điều phối ca',
    head: 'users',
    fab: true,
    blocks: [
      { k: 'stats', items: [[8, 'Người trong ca'], [5, 'Việc mở'], [1, 'Sự cố', 'danger']] },
      {
        k: 'section', title: 'Cần bạn xử lý ngay', rows: [
          { title: 'BT-07 rung bất thường ở cụm con lăn', status: 'blocked', sub: 'Chưa phân công', due: 'Còn 28 phút SLA', dueTone: 'danger', flag: true, go: [Routes.INCIDENT_TRIAGE, { incidentId: 24 }] },
          { title: 'Kiểm tra khu vực cuối chuyền', status: 'review', sub: 'Lê Minh Tâm · checklist 6/6', due: 'Chờ bạn review', dueTone: 'warning', who: 'Lê Minh Tâm', go: [Routes.REVIEW] },
        ],
      },
      { k: 'section', title: 'Người chưa có việc', count: 1, rows: [{ title: 'Võ Văn Khánh', person: true, sub: 'Đóng gói · có mặt từ 06:02', action: 'Giao việc', go: [Routes.ASSIGN_SHEET, { title: 'Giao việc cho Võ Văn Khánh' }] }] },
    ],
  },
  KT: {
    name: 'Kỹ thuật',
    caption: 'Tổ bảo trì · Bình Dương',
    title: 'Việc sửa',
    blocks: [
      { k: 'seg', items: ['Được giao 3', 'Đang sửa 1', 'Chờ vật tư 1'], on: 1 },
      { k: 'section', rows: [{ title: 'Căn chỉnh cụm con lăn BT-07', status: 'progress', sub: 'BT-2610-011 · Dây chuyền A2', due: 'Còn 1 giờ 40 phút', dueTone: 'warning', flag: true, go: [Routes.REPAIR_ORDER, { incidentId: 24 }] }] },
      {
        k: 'section', title: 'Tiếp theo', rows: [
          { title: 'Bảo trì định kỳ máy dán thùng MD-03', status: 'todo', sub: 'PM tháng 10', due: '15:00', go: [Routes.PM_LIST] },
          { title: 'Thay cảm biến quang đầu vào A1', status: 'blocked', sub: 'Chờ VT-2610-012', due: 'Dự kiến 29/10', go: [Routes.MATERIAL_MINE] },
        ],
      },
    ],
  },
  QC: {
    name: 'QA/QC',
    caption: 'QA/QC · Ca sáng 30/10',
    title: 'Kiểm tra',
    blocks: [
      { k: 'stats', items: [[4, 'Được giao'], [1, 'Chưa đạt', 'danger'], [2, 'Đã gửi', 'success']] },
      { k: 'progress', label: '2/4 đợt kiểm tra đã gửi', pct: 50 },
      {
        k: 'section', rows: [
          { title: 'Khu vực đóng gói ca sáng', status: 'todo', sub: '6 tiêu chí · Dây chuyền A2', due: '13:30', go: [Routes.INSPECTION_RUNNER, { inspectionId: 20 }] },
          { title: 'An toàn đầu ca dây chuyền A2', status: 'blocked', sub: 'Chưa đạt · NCR-2610-004', due: 'Đang xử lý', dueTone: 'danger', go: [Routes.NCR_DETAIL] },
          { title: 'Lô vải 24 · QC đầu vào', status: 'done', sub: '12/12 đạt', due: '08:40', go: [Routes.LOT_TRACE] },
        ],
      },
    ],
  },
  QLDC: {
    name: 'Quản lý dây chuyền',
    caption: 'Trưởng dây chuyền · Bình Dương',
    title: 'Dây chuyền A2',
    blocks: [
      { k: 'seg', items: ['Ca sáng', 'Ca chiều', 'Ca đêm'] },
      { k: 'stats', items: [[8, 'Việc mở'], [2, 'Quá hạn', 'danger'], [2, 'Sự cố', 'warning']] },
      {
        k: 'section', rows: [
          { title: 'Sự cố', icon: TriangleAlert, iconTone: 'danger', sub: '2 mở · BT-07 còn 28 phút SLA', subTone: 'danger', go: [Routes.FIELD_WORK] },
          { title: 'Kiểm tra chất lượng', icon: ClipboardCheck, sub: '3 đạt · 1 chưa đạt · 1 chưa làm', go: [Routes.INSPECTIONS] },
          { title: 'Bảo trì', icon: Wrench, sub: '1 đang sửa · 1 chờ vật tư', go: [Routes.PM_LIST] },
          { title: 'Người trong ca', icon: Users, sub: '12 có mặt · 1 nghỉ phép', go: [Routes.LINE_DETAIL] },
        ],
      },
      { k: 'note', text: 'Sản lượng hiển thị khi đã nối nguồn báo cáo sản xuất.' },
    ],
  },
  QLPX: {
    name: 'Quản đốc phân xưởng',
    caption: 'Quản đốc · 3 dây chuyền',
    title: 'Phân xưởng',
    blocks: [
      { k: 'stats', items: [[18, 'Việc mở'], [4, 'Quá hạn', 'danger'], [3, 'Sự cố', 'warning']] },
      {
        k: 'section', title: 'Theo dây chuyền', action: ['So sánh', [Routes.UNITS]], rows: [
          { title: 'Dây chuyền A2', sub: 'Trần Quốc Dũng · 8 việc mở · 2 quá hạn · 2 sự cố', subTone: 'danger', pct: 64, pctTone: 'warning', go: [Routes.LINE_DETAIL] },
          { title: 'Dây chuyền A1', sub: 'Hồ Thị Lan · 6 việc mở · 1 quá hạn', pct: 78, go: [Routes.LINE_DETAIL] },
          { title: 'Dây chuyền A3', sub: 'Đỗ Văn Tài · 4 việc mở · 1 quá hạn · 1 sự cố', pct: 71, go: [Routes.LINE_DETAIL] },
        ],
      },
      { k: 'section', title: 'Chờ bạn quyết định', count: 2, rows: [{ title: 'Vật tư sửa BT-07', icon: Package, sub: '4.860.000 ₫ · cần trước 12:00', subTone: 'warning', go: [Routes.APPROVAL_DECISION, { approvalId: 9 }] }] },
    ],
  },
  QLN: {
    name: 'Quản lý nhà máy',
    caption: 'Quản lý nhà máy',
    title: 'Nhà máy',
    blocks: [
      { k: 'stats', items: [[46, 'Việc mở'], [7, 'Quá hạn', 'danger'], [1, 'Sự cố nghiêm trọng', 'danger']] },
      { k: 'banner', tone: 'danger', text: 'BT-07 (Đóng gói A2) dừng 42 phút. Đã phân công Lê Đức Thành lúc 09:20.' },
      {
        k: 'section', title: 'Phân xưởng', rows: [
          { title: 'Xưởng đóng gói', sub: 'Nguyễn Văn Bình · 18 việc mở · 4 quá hạn · 3 sự cố', subTone: 'danger', pct: 68, pctTone: 'warning', go: [Routes.UNITS] },
          { title: 'Xưởng cắt may', sub: 'Lý Thị Hồng · 21 việc mở · 3 quá hạn · 1 sự cố', subTone: 'danger', pct: 74, pctTone: 'warning', go: [Routes.UNITS] },
          { title: 'Kho thành phẩm', sub: 'Phan Minh Trí · 7 việc mở · đúng hạn', pct: 90, go: [Routes.UNITS] },
        ],
      },
    ],
  },
  KHO: {
    name: 'Kho',
    caption: 'Kho vật tư Bình Dương',
    title: 'Vật tư',
    head: 'scan',
    blocks: [
      { k: 'chips', items: ['Chờ cấp 4', 'Thiếu hàng 1', 'Đã cấp'] },
      {
        k: 'section', rows: [
          { title: 'VT-2610-009 · Vòng bi, bu lông', icon: Package, sub: 'Nguyễn Hoàng Nam · cần trước 12:00', subTone: 'warning', go: [Routes.MATERIAL_ISSUE] },
          { title: 'VT-2610-012 · Cảm biến E3Z-D61', icon: Package, sub: 'Tổ bảo trì · cần trước 15:00', go: [Routes.MATERIAL_ISSUE] },
          { title: 'VT-2610-015 · Lưỡi dao cắt màng', icon: Package, sub: 'Xưởng đóng gói · mai', go: [Routes.MATERIAL_ISSUE] },
          { title: 'VT-2610-016 · Găng tay chống cắt', icon: Package, sub: 'An toàn · 40 đôi', go: [Routes.MATERIAL_ISSUE] },
        ],
      },
      { k: 'note', text: 'Số lượng tồn chỉ hiển thị khi đã nối hệ thống kho.' },
    ],
  },
  MH: {
    name: 'Mua hàng',
    caption: 'Phòng mua hàng',
    title: 'Mua hàng',
    blocks: [
      { k: 'seg', items: ['Cần xử lý 2', 'Đã đặt 1', 'Đã giao'] },
      {
        k: 'section', rows: [
          { title: 'Dầu thủy lực ISO VG 46', icon: ShoppingCart, sub: 'MH-2610-007 · từ VT-2610-007 · hạn 28/10', subTone: 'danger', go: [Routes.PURCHASE_UPDATE] },
          { title: 'Lưỡi dao cắt màng 400 mm', icon: ShoppingCart, sub: 'MH-2610-008 · hạn 29/10', go: [Routes.PURCHASE_UPDATE] },
        ],
      },
      { k: 'banner', tone: 'accent', plain: true, text: 'Flowse theo dõi tiến độ nội bộ. Đơn mua và thanh toán vẫn xử lý trên hệ thống mua hàng.' },
    ],
  },
  QT: {
    name: 'Quản trị hệ thống',
    caption: 'Công ty An Phát',
    title: 'Tôi',
    head: null,
    blocks: [
      { k: 'kv', items: [['Tài khoản', 'quantri@anphat.vn'], ['Vai trò', 'Quản trị hệ thống'], ['Phiên bản', '2.0.3 · build 418']] },
      { k: 'banner', tone: 'accent', plain: true, text: 'Người dùng, vai trò và quy trình cấu hình trên Web quản trị. Tài khoản quản trị không mặc định duyệt nghiệp vụ.' },
      {
        k: 'section', rows: [
          { title: 'Mở Web quản trị', icon: ArrowUpRight, sub: 'admin.flowse.vn', go: () => Linking.openURL('https://admin.flowse.vn') },
          // Khoá/mở tài khoản làm trên Web quản trị
          { title: 'Cảnh báo tài khoản', icon: ShieldAlert, sub: '2 tài khoản bị khóa trong 24 giờ', subTone: 'warning', go: () => Linking.openURL('https://admin.flowse.vn/accounts') },
          { title: 'Đăng xuất', icon: LogOut, danger: true, go: () => void useAuthStore.getState().logout() },
        ],
      },
    ],
  },
};

/** Trang chủ của một vai trò (B02–B12, I03). */
export const RoleHome: React.FC<{ role: Exclude<HomeRole, 'VP'> }> = ({ role }) => {
  const d = ROLE_HOMES[role];
  const s = useStyles();
  const c = useColors();
  const nav = useNavigation<any>();
  const [seg, setSeg] = React.useState<number | null>(null);
  const [chip, setChip] = React.useState<string | null>(null);
  const go = (g?: Go) => (g ? (typeof g === 'function' ? g : () => nav.navigate(g[0], g[1])) : undefined);
  const head =
    d.head === null ? undefined : d.head === 'users' ? (
      <IconButton icon={Users} label="Người trong ca" onPress={() => nav.navigate(Routes.TEAM)} />
    ) : d.head === 'scan' ? (
      <IconButton icon={ScanQrCode} label="Quét mã" onPress={() => nav.navigate(Routes.SCAN)} />
    ) : (
      <IconButton icon={Search} label="Tìm kiếm" onPress={() => nav.navigate(Routes.SEARCH)} />
    );

  const renderRow = (r: RowD) => {
    if (r.status) {
      return (
        <TaskRow
          key={r.title}
          title={r.title}
          status={r.status}
          meta={r.sub}
          due={r.due}
          dueTone={r.dueTone}
          flag={r.flag}
          who={r.who ? <Avatar name={r.who} size={24} /> : undefined}
          onPress={go(r.go)}
        />
      );
    }
    if (r.pct !== undefined) {
      return (
        <PressableScale key={r.title} accessibilityRole="button" onPress={go(r.go)} scaleTo={0.99} pressedBackground={c.subtle} style={s.line}>
          <View style={s.between}>
            <AppText variant="section">{r.title}</AppText>
            <ChevronRight size={18} color={c.muted} />
          </View>
          <AppText variant="caption" tone={r.subTone ?? 'muted'}>{r.sub}</AppText>
          <View style={s.onTime}>
            <View style={[s.track, s.flex]}>
              <View style={[s.fill, { width: `${r.pct}%`, backgroundColor: c[r.pctTone ?? 'accent'] }]} />
            </View>
            <AppText variant="label" tone="muted" style={s.small}>{`${r.pct}% đúng hạn`}</AppText>
          </View>
        </PressableScale>
      );
    }
    return (
      <Row
        key={r.title}
        title={r.title}
        titleTone={r.danger ? 'danger' : 'ink'}
        subtitle={r.sub}
        subtitleTone={r.subTone}
        icon={r.icon}
        iconTone={r.iconTone}
        leading={r.person ? <Avatar name={r.title} size={28} /> : undefined}
        chevron={!r.action && !r.danger}
        trailing={r.action ? <AppText variant="label" tone="accent" style={s.action}>{r.action}</AppText> : undefined}
        onPress={go(r.go)}
      />
    );
  };

  return (
    <ScrollPage
      title={d.title}
      caption={d.caption}
      right={head}
      titleRight={<AIButton onPress={() => nav.navigate(Routes.FLOWSE_AI)} />}
      footer={d.fab ? <Fab label="Tạo nhanh" onPress={() => nav.navigate(Routes.CREATE_WORK_ITEM)} /> : undefined}
      contentStyle={d.fab ? s.fabSpace : undefined}
    >
      {d.blocks.map((b, i) => {
        switch (b.k) {
          case 'stats':
            return (
              <StatRow key={i}>
                {b.items.map(([v, l, t]) => (
                  <Stat key={l} value={v} label={l} tone={t} />
                ))}
              </StatRow>
            );
          case 'banner':
            return <Banner key={i} tone={b.tone} text={b.text} plain={b.plain} />;
          case 'note':
            return <AppText key={i} variant="caption" tone="muted" style={s.small}>{b.text}</AppText>;
          case 'seg':
            return <Segmented key={i} items={b.items} value={seg ?? b.on ?? 0} onChange={setSeg} />;
          case 'chips':
            return <Chips key={i} items={b.items} value={chip ?? b.items[0]} onChange={setChip} />;
          case 'progress':
            return (
              <View key={i} style={s.progress}>
                <View style={s.between}>
                  <AppText variant="caption" tone="muted">{b.label}</AppText>
                  <AppText variant="label">{`${b.pct}%`}</AppText>
                </View>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${b.pct}%` }]} />
                </View>
              </View>
            );
          case 'hero':
            return (
              <View key={i} style={s.hero}>
                <View style={s.heroText}>
                  <AppText variant="heading">{b.title}</AppText>
                  <AppText variant="caption" tone="muted">{b.sub}</AppText>
                </View>
                <FlowseMark size={72} />
              </View>
            );
          case 'tiles':
            return (
              <View key={i} style={s.tiles}>
                <PressableScale accessibilityRole="button" onPress={() => nav.navigate(Routes.SCAN)} scaleTo={0.97} style={[s.tile, s.tileScan]}>
                  <ScanQrCode size={26} color={c.ink} />
                  <AppText variant="section" style={s.tileText}>Quét thiết bị</AppText>
                </PressableScale>
                <PressableScale accessibilityRole="button" onPress={() => nav.navigate(Routes.REPORT_INCIDENT)} scaleTo={0.97} style={[s.tile, { backgroundColor: c.dangerSoft }]}>
                  <TriangleAlert size={26} color={c.danger} />
                  <AppText variant="section" tone="danger" style={s.tileText}>Báo sự cố</AppText>
                </PressableScale>
              </View>
            );
          case 'kv':
            return (
              <Group key={i}>
                {b.items.map(([l, v]) => (
                  <KV key={l} label={l} value={v} />
                ))}
              </Group>
            );
          case 'section':
            return b.title ? (
              <View key={i} style={s.section}>
                <SectionHeader title={b.title} count={b.count} action={b.action?.[0]} onAction={go(b.action?.[1])} />
                <Group>{b.rows.map(renderRow)}</Group>
              </View>
            ) : (
              <Group key={i}>{b.rows.map(renderRow)}</Group>
            );
        }
      })}
    </ScrollPage>
  );
};

/** Chọn trang chủ theo vai trò và xem thử các trạng thái dùng chung (chế độ xem thử). */
export const RolePickerScreen: React.FC<ScreenProps<typeof Routes.ROLE_PICKER>> = ({ navigation }) => {
  const c = useColors();
  const set = usePrefs((p) => p.set);
  const current = useHomeRole();
  const pick = (r: HomeRole) => {
    set({ homeRole: r });
    navigation.popTo(Routes.MAIN_TABS, { screen: Routes.HOME });
  };
  const roles: [HomeRole, string][] = [['VP', 'Văn phòng'], ...Object.entries(ROLE_HOMES).map(([k, v]) => [k as HomeRole, v.name] as [HomeRole, string])];
  return (
    <ScrollPage title="Trang chủ theo vai trò" caption="Xem thử" onBack={navigation.goBack}>
      <AppText variant="caption" tone="muted">Bình thường trang chủ và thanh tab đi theo vai trò của nơi làm việc. Chọn để xem của vai trò khác.</AppText>
      <Group>
        {roles.map(([k, name]) => (
          <Row
            key={k}
            title={name}
            subtitle={k === 'VP' ? 'Hôm nay' : ROLE_HOMES[k as Exclude<HomeRole, 'VP'>].title}
            chevron={false}
            trailing={k === current ? <CircleCheck size={22} color={c.accent} /> : <Circle size={22} color={c.muted} />}
            onPress={() => pick(k)}
          />
        ))}
      </Group>
      <SectionHeader title="Trạng thái dùng chung" count={STATE_KEYS.length} />
      <Group>
        {STATE_KEYS.map((k) => (
          <Row key={k} title={stateHeading(k)} subtitle={k} onPress={() => navigation.navigate(Routes.STATE, { k })} />
        ))}
      </Group>
    </ScrollPage>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    small: { fontSize: 12 },
    between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    section: { gap: space.md },
    progress: { gap: space.sm },
    track: { height: 6, borderRadius: 3, backgroundColor: c.subtle, overflow: 'hidden' },
    fill: { height: 6, borderRadius: 3, backgroundColor: c.accent },
    hero: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
    heroText: { flex: 1, gap: space.xs },
    tiles: { flexDirection: 'row', gap: space.md },
    tile: { flex: 1, height: 94, padding: space.lg, borderRadius: radius.xl, justifyContent: 'space-between' },
    tileScan: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    tileText: { fontSize: 16 },
    line: { gap: 6, paddingVertical: 14, paddingHorizontal: space.lg },
    onTime: { flexDirection: 'row', alignItems: 'center', gap: space.md },
    action: { fontSize: 14 },
    fabSpace: { paddingBottom: 96 },
  })
);
