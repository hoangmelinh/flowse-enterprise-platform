import React, { useState } from 'react';
import { View, Linking, StyleSheet } from 'react-native';
import { CircleCheck, Clock, Circle, Phone } from 'lucide-react-native';
import { space, radius, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { Tone } from '../../../data/demo/fixtures';
import { AppText, Banner, BottomBar, Button, Chips, Field, Group, KV, Row, ScrollPage, SectionHeader, Tag } from '../../components/ui';
import { ScreenProps } from '../../navigation/types';

// shortcut: nội dung mẫu theo Figma (I05–I09); nối API đồng bộ/an toàn/bàn giao khi backend có

/** I05 — So sánh phiên bản khi xung đột; không bao giờ tự ghi đè. */
export const VersionCompareScreen: React.FC<ScreenProps<typeof Routes.VERSION_COMPARE>> = ({ navigation }) => {
  const s = useStyles();
  const side = (title: string, sub: string, fire: boolean, mine: boolean) => (
    <View style={[s.side, mine && s.mine]}>
      <AppText variant="section">{title}</AppText>
      <AppText variant="caption" tone="muted">{sub}</AppText>
      <KV label="Lối thoát hiểm" value="Đạt" tone="success" />
      <KV label="Bình chữa cháy" value={fire ? 'Đạt' : 'Không đạt'} tone={fire ? 'success' : 'danger'} />
    </View>
  );
  return (
    <ScrollPage
      title="So sánh"
      caption="Checklist đóng gói · xung đột"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Giữ bản trên máy chủ" onPress={navigation.goBack} />
          <Button title="Gửi bản của tôi thành bản mới" variant="secondary" onPress={navigation.goBack} />
        </BottomBar>
      }
    >
      {side('Máy chủ', 'Lê Minh Tâm · 09:30', false, false)}
      {side('Bản của tôi', 'Lưu 09:26', true, true)}
      <AppText variant="caption" tone="muted">Flowse không tự ghi đè bản trên máy chủ.</AppText>
    </ScrollPage>
  );
};

/** I06 — Khẩn cấp an toàn: gọi trực an toàn, Flowse không thay quy trình khẩn cấp. */
export const EmergencyScreen: React.FC<ScreenProps<typeof Routes.EMERGENCY>> = ({ navigation }) => {
  const c = useColors();
  return (
    <ScrollPage
      title="Khẩn cấp"
      caption="An toàn"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          {/* shortcut: số trực an toàn mẫu; lấy từ cấu hình nhà máy khi backend có */}
          <Button title="Gọi trực an toàn" variant="danger" icon={<Phone size={18} color={c.onAccent} />} onPress={() => Linking.openURL('tel:0901234567')} />
          <Button title="Không khẩn cấp, báo nguy cơ" variant="secondary" onPress={() => navigation.replace(Routes.HAZARD_REPORT)} />
        </BottomBar>
      }
    >
      <AppText variant="title">Có người gặp nguy hiểm?</AppText>
      <Banner tone="danger" text="Cháy, rò hóa chất, tai nạn: kích hoạt báo động và gọi trực an toàn ngay. Flowse không thay quy trình khẩn cấp." />
      <Group>
        <KV label="Trực ca sáng" value="Võ Thanh Bình" />
        <KV label="Điểm tập trung" value="Cổng B · bãi xe 2" />
      </Group>
    </ScrollPage>
  );
};

/** I07 — Báo nguy cơ an toàn. */
export const HazardReportScreen: React.FC<ScreenProps<typeof Routes.HAZARD_REPORT>> = ({ navigation }) => {
  const [level, setLevel] = useState('Cao');
  const [area, setArea] = useState('Kho hóa chất · Xưởng đóng gói');
  const [desc, setDesc] = useState('');
  return (
    <ScrollPage
      title="Báo nguy cơ"
      caption="An toàn · P1"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button
            title="Gửi báo cáo"
            disabled={!desc.trim() || !area.trim()}
            onPress={() => navigation.replace(Routes.SUCCESS, { title: 'Đã gửi tới Tổ an toàn', body: 'Trực an toàn ca sáng nhận thông báo ngay.', kind: 'An toàn', code: 'AT-2610-007', anim: 'send', rows: [['Khu vực', area], ['Mức độ', level]] })}
          />
        </BottomBar>
      }
    >
      <Field label="Khu vực" value={area} onChangeText={setArea} />
      <AppText variant="label" tone="muted">Mức độ</AppText>
      <Chips items={['Thấp', 'Trung bình', 'Cao']} value={level} onChange={setLevel} />
      <Field label="Mô tả" value={desc} onChangeText={setDesc} placeholder="Thùng dung môi rò rỉ ở kệ C2." multiline />
    </ScrollPage>
  );
};

/** I08 — Nhật ký bàn giao ca. */
export const HandoverLogScreen: React.FC<ScreenProps<typeof Routes.HANDOVER_LOG>> = ({ navigation }) => {
  const [f, setF] = useState('Tuần này');
  const log: [string, string, string, Tone][] = [
    ['Ca sáng sang Ca chiều · 30/10', 'Trần Quốc Dũng gửi Võ Văn Khánh', 'Chờ ký', 'warning'],
    ['Ca đêm sang Ca sáng · 30/10', 'Đã xác nhận 06:04 · 2 việc', 'Xong', 'success'],
    ['Ca chiều sang Ca đêm · 29/10', 'Đã xác nhận 22:06 · 0 việc', 'Xong', 'success'],
    ['Ca sáng sang Ca chiều · 29/10', 'Sửa sau chốt 1 lần · có lý do', 'Đã sửa', 'progress'],
  ];
  const list = log.filter((x) => (f.startsWith('Chờ') ? x[3] === 'warning' : f.startsWith('Sửa') ? x[3] === 'progress' : true));
  return (
    <ScrollPage
      title="Nhật ký bàn giao"
      caption="Tổ đóng gói 02"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Xuất nhật ký tuần" variant="secondary" />
        </BottomBar>
      }
    >
      <Chips items={['Tuần này', 'Chờ xác nhận 1', 'Sửa sau chốt']} value={f} onChange={setF} />
      <Group>
        {list.map(([t, sub, tag, tone]) => (
          <Row key={t} title={t} subtitle={sub} trailing={<Tag label={tag} tone={tone} />} onPress={() => navigation.navigate(Routes.HANDOVER_DETAIL)} />
        ))}
      </Group>
      <AppText variant="caption" tone="muted">Phiếu đã chốt chỉ sửa được kèm lý do; mọi lần sửa đều lưu lịch sử.</AppText>
    </ScrollPage>
  );
};

/** I09 — Chi tiết phiếu bàn giao. */
export const HandoverDetailScreen: React.FC<ScreenProps<typeof Routes.HANDOVER_DETAIL>> = ({ navigation }) => {
  const s = useStyles();
  const c = useColors();
  const steps: [string, string, 'done' | 'now' | 'next'][] = [
    ['Ca sáng gửi', 'Trần Quốc Dũng · 13:52', 'done'],
    ['Ca chiều nhận', 'Võ Văn Khánh · chưa xác nhận', 'now'],
    ['Chốt ca', 'Tự chốt khi ca chiều xác nhận', 'next'],
  ];
  return (
    <ScrollPage
      title="Phiếu bàn giao"
      caption="BG-2610-030 · Tổ đóng gói 02"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Trao đổi" variant="secondary" onPress={() => navigation.navigate(Routes.COMMENTS, { code: 'BG-2610-030' })} />
        </BottomBar>
      }
    >
      <AppText variant="heading">Ca sáng sang Ca chiều · 30/10</AppText>
      <Group>
        <KV label="Việc chuyển sang" value="2 việc" />
        <KV label="Sự cố mở" value="BT-07 · chờ vòng bi" tone="warning" />
        <KV label="Ghi chú" value="BT-07 chạy tối đa 70% tải" />
      </Group>
      <SectionHeader title="Tiến trình" />
      <Group>
        {steps.map(([t, sub, st]) => (
          <View key={t} style={s.timeRow}>
            {st === 'done' ? <CircleCheck size={20} color={c.success} /> : st === 'now' ? <Clock size={20} color={c.progress} /> : <Circle size={20} color={c.muted} />}
            <View style={{ flex: 1 }}>
              <AppText variant="bodyMedium">{t}</AppText>
              <AppText variant="caption" tone="muted">{sub}</AppText>
            </View>
          </View>
        ))}
      </Group>
    </ScrollPage>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    side: { gap: space.xs, padding: space.lg, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    mine: { borderColor: c.accent },
    timeRow: { flexDirection: 'row', gap: space.md, alignItems: 'center', paddingVertical: space.md, paddingHorizontal: space.lg },
  })
);
