import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { CircleCheck, Circle, Clock, Wrench } from 'lucide-react-native';
import { space, radius, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { Tone } from '../../../data/demo/fixtures';
import { AppText, Banner, BottomBar, Button, Chips, Field, Group, KV, Row, ScrollPage, SectionHeader, Stat, StatRow, Tag } from '../../components/ui';
import { ScreenProps } from '../../navigation/types';

// shortcut: nội dung mẫu theo Figma (E13, E14, F04, F06–F08); nối API bảo trì/QC khi backend có

/** E13 — Bảo trì định kỳ. */
export const PmListScreen: React.FC<ScreenProps<typeof Routes.PM_LIST>> = ({ navigation }) => {
  const s = useStyles();
  const items: [string, string, string, Tone][] = [
    ['Máy dán thùng MD-03', 'Checklist 8 mục', 'Hôm nay 15:00', 'warning'],
    ['Máy nén khí MK-01', 'Checklist 12 mục', '31/10', 'muted'],
    ['Băng tải BT-05', 'Đạt · 28/10', 'Xong', 'success'],
  ];
  return (
    <ScrollPage title="Bảo trì định kỳ" caption="Tổ bảo trì · Tháng 10" onBack={navigation.goBack}>
      <View style={s.card}>
        <View style={s.between}>
          <AppText variant="bodyMedium">13/21 hạng mục tháng này</AppText>
          <AppText variant="label" tone="accent">62%</AppText>
        </View>
        <View style={s.track}>
          <View style={[s.fill, { width: '62%' }]} />
        </View>
      </View>
      <Group>
        {items.map(([t, sub, due, tone]) => (
          <Row key={t} icon={Wrench} title={t} subtitle={sub} trailing={<Tag label={due} tone={tone} />} onPress={tone === 'success' ? undefined : () => navigation.navigate(Routes.INSPECTION_RUNNER, { inspectionId: 20 })} />
        ))}
      </Group>
    </ScrollPage>
  );
};

/** E14 — Hướng dẫn vận hành SOP: phải xác nhận đã đọc bản mới. */
export const SopScreen: React.FC<ScreenProps<typeof Routes.SOP>> = ({ navigation }) => {
  const s = useStyles();
  const steps = ['Dừng băng tải bằng nút E-stop', 'Treo biển "Đang bảo trì"', 'Khóa và treo thẻ nguồn LOTO', 'Kiểm tra gối đỡ, bu lông'];
  return (
    <ScrollPage
      title="SOP băng tải"
      caption="BT-07 · Bản 4 · hiệu lực từ 01/09/2026"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Tôi đã đọc và hiểu" onPress={navigation.goBack} />
        </BottomBar>
      }
    >
      <Banner tone="warning" text="Bản 4 thay thế bản 3. Thay đổi: bước 3 khóa nguồn trước khi căn chỉnh." />
      {/* Danh sách có thứ tự thật: thứ tự bước là nội dung an toàn */}
      <View style={{ gap: space.md }}>
        {steps.map((t, i) => (
          <View key={t} style={[s.step, i === 2 && s.changed]}>
            <View style={s.num}>
              <AppText variant="label" tone="bg">{String(i + 1)}</AppText>
            </View>
            <AppText variant="bodyMedium" style={{ flex: 1 }}>{t}</AppText>
          </View>
        ))}
      </View>
    </ScrollPage>
  );
};

/** F04 — Xác nhận gửi: kết quả sẽ khoá, mục không đạt sinh việc khắc phục. */
export const InspectionSubmitScreen: React.FC<ScreenProps<typeof Routes.INSPECTION_SUBMIT>> = ({ route, navigation }) => {
  const { passed, total } = route.params;
  const failed = total - passed;
  return (
    <ScrollPage
      title="Xác nhận gửi"
      caption="Khu vực đóng gói · A2"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title={failed ? 'Gửi và tạo việc khắc phục' : 'Gửi kết quả'} onPress={() => navigation.replace(Routes.INSPECTION_RESULT, { passed, total })} />
          <Button title="Quay lại sửa" variant="secondary" onPress={navigation.goBack} />
        </BottomBar>
      }
    >
      <StatRow>
        <Stat value={passed} label="Đạt" tone="success" />
        <Stat value={failed} label="Không đạt" tone={failed ? 'danger' : 'muted'} />
        <Stat value={0} label="N/A" />
      </StatRow>
      <AppText tone="muted">{`Kết quả gửi sẽ được khóa.${failed ? ` Mục không đạt sẽ tạo ${failed} việc khắc phục cho Tổ an toàn.` : ''}`}</AppText>
      {failed ? (
        <Group>
          <Row title="Bình chữa cháy còn hạn" subtitle="→ Việc: Thay bình số 3 · Tổ an toàn · hạn 31/10" subtitleTone="danger" chevron={false} />
        </Group>
      ) : null}
    </ScrollPage>
  );
};

/** F06 — Ghi nhận không phù hợp (NCR). */
export const NcrNewScreen: React.FC<ScreenProps<typeof Routes.NCR_NEW>> = ({ navigation }) => {
  const [desc, setDesc] = useState('Đường may lô 25 lệch 3 mm so với mẫu.');
  const [level, setLevel] = useState('Trung bình');
  const [qty, setQty] = useState('120 sản phẩm');
  return (
    <ScrollPage
      title="NCR mới"
      caption="Từ QC-2610-018"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button
            title="Tạo NCR"
            disabled={!desc.trim() || !qty.trim()}
            onPress={() => navigation.replace(Routes.NCR_DETAIL)}
          />
        </BottomBar>
      }
    >
      <Field label="Mô tả" value={desc} onChangeText={setDesc} multiline />
      <AppText variant="label" tone="muted">Mức độ</AppText>
      <Chips items={['Nhẹ', 'Trung bình', 'Nghiêm trọng']} value={level} onChange={setLevel} />
      <Field label="Số lượng ảnh hưởng" value={qty} onChangeText={setQty} />
      <Group>
        <KV label="Người xử lý" value="Xưởng cắt may · Lý Thị Hồng" />
      </Group>
    </ScrollPage>
  );
};

/** F07 — NCR & CAPA: theo dõi khắc phục. */
export const NcrDetailScreen: React.FC<ScreenProps<typeof Routes.NCR_DETAIL>> = ({ navigation }) => {
  const s = useStyles();
  const c = useColors();
  const steps: [string, string, 'done' | 'now' | 'next'][] = [
    ['Cách ly 120 sản phẩm', 'Hoàn tất 28/10', 'done'],
    ['Tìm nguyên nhân gốc', 'Dao cắt mòn · 29/10', 'done'],
    ['Thay dao, hiệu chỉnh máy', 'Đang làm · hạn 31/10', 'now'],
    ['Theo dõi 3 lô kế tiếp', 'Bắt đầu 01/11', 'next'],
    ['Đánh giá hiệu lực', 'Sau khi theo dõi xong', 'next'],
  ];
  return (
    <ScrollPage
      title="Theo dõi khắc phục"
      caption="NCR-2610-004 · Trung bình"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Truy xuất lô" variant="secondary" onPress={() => navigation.navigate(Routes.LOT_TRACE)} />
        </BottomBar>
      }
    >
      <Group>
        {steps.map(([t, sub, st]) => (
          <View key={t} style={s.timeRow}>
            {st === 'done' ? <CircleCheck size={20} color={c.success} /> : st === 'now' ? <Clock size={20} color={c.progress} /> : <Circle size={20} color={c.muted} />}
            <View style={{ flex: 1 }}>
              <AppText variant="bodyMedium">{t}</AppText>
              <AppText variant="caption" tone={st === 'now' ? 'progress' : 'muted'}>{sub}</AppText>
            </View>
          </View>
        ))}
      </Group>
    </ScrollPage>
  );
};

/** F08 — Truy xuất lô. */
export const LotTraceScreen: React.FC<ScreenProps<typeof Routes.LOT_TRACE>> = ({ navigation }) => {
  const s = useStyles();
  const chain = [
    ['Kho A nhận 2.000 m', '24/10 08:10'],
    ['Xưởng cắt may cắt cho AP-1126', '26/10 07:30'],
    ['QC ghi nhận NCR-2610-004', '28/10 10:42'],
  ];
  return (
    <ScrollPage title="Lô vải 25" caption="Truy xuất lô" onBack={navigation.goBack}>
      <Group>
        <KV label="Nhà cung cấp" value="Dệt Thành Công" />
        <KV label="Nhập kho" value="24/10 · Kho A" />
        <KV label="Đã dùng" value="Đơn AP-1126 · 1.240 m" />
      </Group>
      <SectionHeader title="Chuỗi sử dụng" />
      <View style={s.chain}>
        {chain.map(([t, at], i) => (
          <View key={t} style={s.link}>
            <View style={s.rail}>
              <View style={s.node} />
              {i < chain.length - 1 ? <View style={s.bar} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: space.lg }}>
              <AppText variant="bodyMedium">{t}</AppText>
              <AppText variant="caption" tone="muted">{at}</AppText>
            </View>
          </View>
        ))}
      </View>
      <AppText variant="caption" tone="muted">Chuỗi truy xuất đầy đủ cần nối hệ thống sản xuất (MES).</AppText>
    </ScrollPage>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    card: { gap: space.sm, padding: space.lg, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    track: { height: 8, borderRadius: 4, backgroundColor: c.subtle, overflow: 'hidden' },
    fill: { height: 8, borderRadius: 4, backgroundColor: c.accent },
    step: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    changed: { borderColor: c.warning, backgroundColor: c.warningSoft },
    num: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' },
    timeRow: { flexDirection: 'row', gap: space.md, alignItems: 'center', paddingVertical: space.md, paddingHorizontal: space.lg },
    chain: { paddingLeft: space.xs },
    link: { flexDirection: 'row', gap: space.md },
    rail: { alignItems: 'center', width: 12 },
    node: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.accent, marginTop: 4 },
    bar: { flex: 1, width: 2, backgroundColor: c.line, marginTop: 2 },
  })
);
