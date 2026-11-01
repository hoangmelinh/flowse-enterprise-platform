import React from 'react';
import { View, Linking, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CircleCheck, Circle, ScanLine, TriangleAlert, ExternalLink } from 'lucide-react-native';
import { space, radius, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { Tone } from '../../../data/demo/fixtures';
import { useAuthStore } from '../../state/authStore';
import { HomeRole, usePrefs } from '../../state/prefsStore';
import { AIButton, AppText, Avatar, Banner, Button, Group, Row, ScrollPage, SectionHeader, Segmented, Stat, StatRow, Tag } from '../../components/ui';
import { STATE_KEYS, stateHeading } from '../common/StateScreen';
import { ScreenProps } from '../../navigation/types';

/**
 * B02–B12 — Trang chủ theo vai trò. Mỗi vai trò là một danh sách khối dựng từ dữ liệu.
 * shortcut: nội dung mẫu lấy từ Figma; thay bằng API tổng hợp theo vai trò khi backend có.
 */
type Go = [string, object?];
interface RowD {
  title: string;
  sub?: string;
  subTone?: Tone;
  tag?: [string, Tone];
  who?: string;
  go?: Go;
}
type Block =
  | { k: 'stats'; items: [string | number, string, Tone?][] }
  | { k: 'section'; title: string; count?: number; rows: RowD[] }
  | { k: 'banner'; tone: 'danger' | 'warning' | 'accent'; text: string }
  | { k: 'note'; text: string }
  | { k: 'hero'; title: string; sub: string; actions?: [string, Go][] }
  | { k: 'seg'; items: string[] }
  | { k: 'progress'; label: string; pct: number }
  | { k: 'link'; title: string; sub: string; url: string };
interface HomeDef {
  name: string;
  caption: string;
  title: string;
  blocks: Block[];
}

const inc: Go = [Routes.INCIDENT_DETAIL, { incidentId: 24 }];
const member = (name: string): Go => [Routes.MEMBER_WORK, { name }];

export const ROLE_HOMES: Record<Exclude<HomeRole, 'VP'>, HomeDef> = {
  TP: {
    name: 'Trưởng phòng',
    caption: 'Phòng Kế hoạch · 6 người',
    title: 'Tổng quan',
    blocks: [
      { k: 'stats', items: [[18, 'Đang mở'], [3, 'Quá hạn', 'danger'], [3, 'Chờ bạn duyệt', 'warning']] },
      {
        k: 'section', title: 'Cần bạn điều phối', rows: [
          { title: 'Bổ sung biên bản nghiệm thu', sub: 'Phạm Quốc Huy', tag: ['Quá 2 giờ', 'danger'], who: 'Phạm Quốc Huy', go: [Routes.REASSIGN, { title: 'Bổ sung biên bản nghiệm thu', from: 'Phạm Quốc Huy' }] },
          { title: 'Báo cáo tiến độ đơn PO-2410', sub: 'Nguyễn Minh Anh · gửi review', tag: ['Hôm nay', 'warning'], who: 'Nguyễn Minh Anh', go: [Routes.REVIEW] },
        ],
      },
      {
        k: 'section', title: 'Tải việc theo người', rows: [
          { title: 'Nguyễn Minh Anh', sub: '5 việc mở', who: 'Nguyễn Minh Anh', go: member('Nguyễn Minh Anh') },
          { title: 'Phạm Quốc Huy', sub: '7 việc mở · 2 quá hạn', subTone: 'danger', who: 'Phạm Quốc Huy', go: member('Phạm Quốc Huy') },
          { title: 'Trần Thu Hà', sub: '3 việc mở · 1 quá hạn', subTone: 'danger', who: 'Trần Thu Hà', go: member('Trần Thu Hà') },
          { title: 'Lê Đức Thành', sub: '3 việc mở', who: 'Lê Đức Thành', go: member('Lê Đức Thành') },
        ],
      },
    ],
  },
  CN: {
    name: 'Công nhân',
    caption: 'Tổ đóng gói 02 · Ca sáng 06:00–14:00',
    title: 'Ca của tôi',
    blocks: [
      { k: 'hero', title: 'Còn 3 giờ 12 phút', sub: '2 việc trong ca · 1 checklist chưa xong', actions: [['Quét thiết bị', [Routes.SCAN]], ['Báo sự cố', [Routes.REPORT_INCIDENT]]] },
      {
        k: 'section', title: 'Việc trong ca', rows: [
          { title: 'Kiểm tra an toàn băng tải BT-07', sub: 'Checklist 2/3', go: [Routes.INSPECTION_RUNNER, { inspectionId: 20 }] },
          { title: 'Vệ sinh khu vực cuối chuyền', sub: 'Trần Quốc Dũng giao', go: [Routes.SHIFT_TRANSFER] },
        ],
      },
      { k: 'section', title: 'Sự cố tôi đã báo', rows: [{ title: 'BT-07 rung bất thường', sub: 'SC-2610-024 · Lê Đức Thành đang sửa', go: inc }] },
    ],
  },
  CN_OFF: {
    name: 'Công nhân · ngoại tuyến (I03)',
    caption: 'Tổ đóng gói 02',
    title: 'Ca của tôi',
    blocks: [
      { k: 'banner', tone: 'warning', text: 'Mất kết nối. Bạn vẫn xem được việc đã tải và lưu nháp; Flowse gửi khi có mạng.' },
      {
        k: 'section', title: 'Trên máy', rows: [
          { title: 'Báo sự cố BT-07', sub: 'Lưu 09:18 · 2 ảnh', tag: ['Chưa đồng bộ', 'warning'], go: [Routes.SYNC_QUEUE] },
          { title: 'Kiểm tra an toàn BT-07', sub: 'Checklist 2/3 · dữ liệu lúc 08:55', go: [Routes.INSPECTION_RUNNER, { inspectionId: 20 }] },
        ],
      },
    ],
  },
  TC: {
    name: 'Trưởng ca',
    caption: 'Tổ đóng gói 02 · Trưởng ca',
    title: 'Điều phối ca',
    blocks: [
      { k: 'stats', items: [[8, 'Người trong ca'], [5, 'Việc mở'], [1, 'Sự cố', 'danger']] },
      {
        k: 'section', title: 'Cần bạn xử lý ngay', rows: [
          { title: 'BT-07 rung bất thường ở cụm con lăn', sub: 'Chưa phân công', tag: ['Còn 28 phút SLA', 'danger'], go: [Routes.INCIDENT_TRIAGE, { incidentId: 24 }] },
          { title: 'Kiểm tra khu vực cuối chuyền', sub: 'Lê Minh Tâm · checklist 6/6', tag: ['Chờ bạn review', 'warning'], go: [Routes.REVIEW] },
        ],
      },
      { k: 'section', title: 'Người chưa có việc', count: 1, rows: [{ title: 'Võ Văn Khánh', sub: 'Đóng gói · có mặt từ 06:02', who: 'Võ Văn Khánh', go: [Routes.ASSIGN_SHEET, { title: 'Giao việc cho Võ Văn Khánh' }] }] },
      { k: 'section', title: 'Ca', rows: [{ title: 'Việc hiện trường đang xử lý', sub: '4 việc · 2 sự cố', go: [Routes.FIELD_WORK] }, { title: 'Nhật ký bàn giao', sub: '1 phiếu chờ xác nhận', go: [Routes.HANDOVER_LOG] }] },
    ],
  },
  KT: {
    name: 'Kỹ thuật',
    caption: 'Tổ bảo trì · Bình Dương',
    title: 'Việc sửa',
    blocks: [
      { k: 'seg', items: ['Được giao 3', 'Đang sửa 1', 'Chờ vật tư 1'] },
      { k: 'hero', title: 'Căn chỉnh cụm con lăn BT-07', sub: 'BT-2610-011 · Dây chuyền A2 · còn 1 giờ 40 phút', actions: [['Mở phiếu sửa', [Routes.REPAIR_ORDER, { incidentId: 24 }]]] },
      {
        k: 'section', title: 'Tiếp theo', rows: [
          { title: 'Bảo trì định kỳ máy dán thùng MD-03', sub: 'PM tháng 10', go: [Routes.PM_LIST] },
          { title: 'Thay cảm biến quang đầu vào A1', sub: 'Chờ VT-2610-012 · dự kiến 29/10', subTone: 'warning', go: [Routes.MATERIAL_DETAIL, { materialId: 9 }] },
        ],
      },
      { k: 'section', title: 'Tài liệu', rows: [{ title: 'SOP băng tải BT-07', sub: 'Bản 4 · hiệu lực 01/09/2026', go: [Routes.SOP] }] },
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
        k: 'section', title: 'Hôm nay', rows: [
          { title: 'Khu vực đóng gói ca sáng', sub: '6 tiêu chí · Dây chuyền A2', go: [Routes.INSPECTION_RUNNER, { inspectionId: 20 }] },
          { title: 'An toàn đầu ca dây chuyền A2', sub: 'Chưa đạt · NCR-2610-004', subTone: 'danger', tag: ['Đang xử lý', 'warning'], go: [Routes.NCR_DETAIL] },
          { title: 'Lô vải 24 · QC đầu vào', sub: '12/12 đạt', subTone: 'success', go: [Routes.LOT_TRACE] },
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
        k: 'section', title: 'Theo mảng', rows: [
          { title: 'Sự cố', sub: '2 mở · BT-07 còn 28 phút SLA', subTone: 'danger', go: [Routes.FIELD_WORK] },
          { title: 'Kiểm tra chất lượng', sub: '3 đạt · 1 chưa đạt · 1 chưa làm', go: [Routes.INSPECTIONS] },
          { title: 'Bảo trì', sub: '1 đang sửa · 1 chờ vật tư', go: [Routes.PM_LIST] },
          { title: 'Người trong ca', sub: '12 có mặt · 1 nghỉ phép', go: [Routes.LINE_DETAIL] },
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
        k: 'section', title: 'Theo dây chuyền', rows: [
          { title: 'Dây chuyền A2', sub: 'Trần Quốc Dũng · 8 việc mở · 2 quá hạn · 2 sự cố', tag: ['64% đúng hạn', 'danger'], go: [Routes.LINE_DETAIL] },
          { title: 'Dây chuyền A1', sub: 'Hồ Thị Lan · 6 việc mở · 1 quá hạn', tag: ['78% đúng hạn', 'warning'], go: [Routes.LINE_DETAIL] },
          { title: 'Dây chuyền A3', sub: 'Đỗ Văn Tài · 4 việc mở · 1 quá hạn · 1 sự cố', tag: ['71% đúng hạn', 'warning'], go: [Routes.LINE_DETAIL] },
        ],
      },
      { k: 'section', title: 'Chờ bạn quyết định', count: 2, rows: [{ title: 'Vật tư sửa BT-07', sub: '4.860.000 ₫ · cần trước 12:00', subTone: 'warning', go: [Routes.APPROVAL_DECISION, { approvalId: 9 }] }] },
    ],
  },
  QLN: {
    name: 'Quản lý nhà máy',
    caption: 'Quản lý nhà máy',
    title: 'Nhà máy',
    blocks: [
      { k: 'stats', items: [[46, 'Việc mở'], [7, 'Quá hạn', 'danger'], [1, 'Nghiêm trọng', 'danger']] },
      { k: 'banner', tone: 'danger', text: 'BT-07 (Đóng gói A2) dừng 42 phút. Đã phân công Lê Đức Thành lúc 09:20.' },
      {
        k: 'section', title: 'Phân xưởng', rows: [
          { title: 'Xưởng đóng gói', sub: 'Nguyễn Văn Bình · 18 việc mở · 4 quá hạn · 3 sự cố', tag: ['68% đúng hạn', 'warning'], go: [Routes.UNITS] },
          { title: 'Xưởng cắt may', sub: 'Lý Thị Hồng · 21 việc mở · 3 quá hạn · 1 sự cố', tag: ['74% đúng hạn', 'warning'], go: [Routes.UNITS] },
          { title: 'Kho thành phẩm', sub: 'Phan Minh Trí · 7 việc mở · đúng hạn', tag: ['90% đúng hạn', 'success'], go: [Routes.UNITS] },
        ],
      },
    ],
  },
  KHO: {
    name: 'Kho',
    caption: 'Kho vật tư Bình Dương',
    title: 'Vật tư',
    blocks: [
      { k: 'seg', items: ['Chờ cấp 4', 'Thiếu hàng 1', 'Đã cấp'] },
      {
        k: 'section', title: 'Chờ cấp', rows: [
          { title: 'VT-2610-009 · Vòng bi, bu lông', sub: 'Nguyễn Hoàng Nam · cần trước 12:00', subTone: 'warning', go: [Routes.MATERIAL_ISSUE] },
          { title: 'VT-2610-012 · Cảm biến E3Z-D61', sub: 'Tổ bảo trì · cần trước 15:00', go: [Routes.MATERIAL_ISSUE] },
          { title: 'VT-2610-015 · Lưỡi dao cắt màng', sub: 'Xưởng đóng gói · mai', go: [Routes.MATERIAL_ISSUE] },
          { title: 'VT-2610-016 · Găng tay chống cắt', sub: 'An toàn · 40 đôi', go: [Routes.MATERIAL_ISSUE] },
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
        k: 'section', title: 'Cần xử lý', rows: [
          { title: 'Dầu thủy lực ISO VG 46', sub: 'MH-2610-007 · từ VT-2610-007 · hạn 28/10', subTone: 'danger', go: [Routes.PURCHASE_UPDATE] },
          { title: 'Lưỡi dao cắt màng 400 mm', sub: 'MH-2610-008 · hạn 29/10', go: [Routes.PURCHASE_UPDATE] },
        ],
      },
      { k: 'note', text: 'Flowse theo dõi tiến độ nội bộ. Đơn mua và thanh toán vẫn xử lý trên hệ thống mua hàng.' },
    ],
  },
  QT: {
    name: 'Quản trị hệ thống',
    caption: 'Công ty An Phát',
    title: 'Quản trị',
    blocks: [
      { k: 'stats', items: [['quantri', 'Tài khoản'], ['2.0.3', 'Phiên bản']] },
      { k: 'note', text: 'Người dùng, vai trò và quy trình cấu hình trên Web quản trị. Tài khoản quản trị không mặc định duyệt nghiệp vụ.' },
      { k: 'link', title: 'Mở Web quản trị', sub: 'admin.flowse.vn', url: 'https://admin.flowse.vn' },
      { k: 'banner', tone: 'warning', text: 'Cảnh báo tài khoản: 2 tài khoản bị khóa trong 24 giờ.' },
    ],
  },
};

/** Trang chủ của một vai trò (B02–B12, I03). */
export const RoleHome: React.FC<{ role: Exclude<HomeRole, 'VP'> }> = ({ role }) => {
  const d = ROLE_HOMES[role];
  const s = useStyles();
  const c = useColors();
  const nav = useNavigation<any>();
  const [seg, setSeg] = React.useState(0);
  const go = (g?: Go) => (g ? () => nav.navigate(g[0], g[1]) : undefined);
  return (
    <ScrollPage title={d.title} caption={d.caption} right={<AIButton onPress={() => nav.navigate(Routes.FLOWSE_AI)} />}>
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
            return <Banner key={i} tone={b.tone} text={b.text} />;
          case 'note':
            return <AppText key={i} variant="caption" tone="muted">{b.text}</AppText>;
          case 'seg':
            return <Segmented key={i} items={b.items} value={seg} onChange={setSeg} />;
          case 'progress':
            return (
              <View key={i} style={s.card}>
                <View style={s.between}>
                  <AppText variant="bodyMedium">{b.label}</AppText>
                  <AppText variant="label" tone="accent">{`${b.pct}%`}</AppText>
                </View>
                <View style={s.track}>
                  <View style={[s.fill, { width: `${b.pct}%` }]} />
                </View>
              </View>
            );
          case 'hero':
            return (
              <View key={i} style={s.card}>
                <AppText variant="heading">{b.title}</AppText>
                <AppText variant="caption" tone="muted">{b.sub}</AppText>
                {b.actions ? (
                  <View style={s.actions}>
                    {b.actions.map(([t, g], k) => (
                      <Button
                        key={t}
                        title={t}
                        size="sm"
                        variant={k === 0 ? 'primary' : 'danger'}
                        style={{ flex: 1 }}
                        icon={k === 0 ? <ScanLine size={16} color={c.bg} /> : <TriangleAlert size={16} color={c.onAccent} />}
                        onPress={go(g)}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          case 'link':
            return (
              <Group key={i}>
                <Row icon={ExternalLink} title={b.title} subtitle={b.sub} onPress={() => Linking.openURL(b.url)} />
              </Group>
            );
          case 'section':
            return (
              <View key={i} style={{ gap: space.md }}>
                <SectionHeader title={b.title} count={b.count} />
                <Group>
                  {b.rows.map((r) => (
                    <Row
                      key={r.title}
                      title={r.title}
                      subtitle={r.sub}
                      subtitleTone={r.subTone}
                      trailing={
                        <>
                          {r.who ? <Avatar name={r.who} size={28} /> : null}
                          {r.tag ? <Tag label={r.tag[0]} tone={r.tag[1]} /> : null}
                        </>
                      }
                      onPress={go(r.go)}
                    />
                  ))}
                </Group>
              </View>
            );
        }
      })}
    </ScrollPage>
  );
};

/** Chọn trang chủ theo vai trò và xem thử các trạng thái dùng chung (chế độ xem thử). */
export const RolePickerScreen: React.FC<ScreenProps<typeof Routes.ROLE_PICKER>> = ({ navigation }) => {
  const c = useColors();
  const { homeRole, set } = usePrefs();
  const field = useAuthStore((st) => st.capabilities.canExecuteRepair && !st.capabilities.canAssignWork);
  const current = homeRole ?? (field ? 'KT' : 'VP');
  const pick = (r: HomeRole) => {
    set({ homeRole: r });
    navigation.popTo(Routes.MAIN_TABS, { screen: Routes.HOME });
  };
  const roles: [HomeRole, string][] = [['VP', 'Văn phòng'], ...Object.entries(ROLE_HOMES).map(([k, v]) => [k as HomeRole, v.name] as [HomeRole, string])];
  return (
    <ScrollPage title="Trang chủ theo vai trò" caption="Xem thử" onBack={navigation.goBack}>
      <AppText variant="caption" tone="muted">Bình thường trang chủ đi theo vai trò của nơi làm việc. Chọn để xem trang chủ của vai trò khác.</AppText>
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
    card: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    track: { height: 8, borderRadius: 4, backgroundColor: c.subtle, overflow: 'hidden' },
    fill: { height: 8, borderRadius: 4, backgroundColor: c.accent },
    actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  })
);
