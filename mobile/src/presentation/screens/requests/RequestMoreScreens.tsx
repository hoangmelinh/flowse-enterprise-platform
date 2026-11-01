import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { CircleCheck, Clock, Circle, Minus, Plus, Paperclip } from 'lucide-react-native';
import { space, radius, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { materials, myRequests } from '../../../data/demo/fixtures';
import { AppText, Banner, BottomBar, Button, Chips, Field, Group, IconButton, KV, PressableScale, Row, ScrollPage, SectionHeader, Tag } from '../../components/ui';
import { ScreenProps } from '../../navigation/types';

// shortcut: nội dung mẫu theo Figma (G05, G05b, G12, H01, H04, H05); nối API yêu cầu/vật tư khi backend có

/** G05 / G05b — Cần bổ sung thông tin: sửa trường bị trả lại rồi gửi lại. */
export const RequestEditScreen: React.FC<ScreenProps<typeof Routes.REQUEST_EDIT>> = ({ route, navigation }) => {
  const r = myRequests.find((x) => x.id === route.params.requestId) ?? myRequests[2];
  const [sub, setSub] = useState('');
  return (
    <ScrollPage
      title="Sửa yêu cầu"
      caption={`${r.code} · Cần bổ sung`}
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button
            title="Gửi lại"
            disabled={!sub.trim()}
            onPress={() => navigation.replace(Routes.SUCCESS, { title: 'Đã gửi lại yêu cầu', body: 'Trần Quốc Dũng thấy lịch sử chỉnh sửa và trường đã sửa.', kind: 'Nghỉ phép', code: r.code })}
          />
          <Button title="Huỷ yêu cầu" variant="secondary" onPress={navigation.popToTop} />
        </BottomBar>
      }
    >
      <Banner tone="warning" text={'Trần Quốc Dũng trả lại lúc 10:05: "Chọn người thay trong ngày 03/11, Hà đang trực kho."'} />
      <Group>
        <KV label="Từ ngày" value="03/11/2026" />
        <KV label="Đến ngày" value="04/11/2026" />
        <KV label="Loại" value="Phép năm · còn 7 ngày" />
        <KV label="Lý do" value="Việc gia đình" />
      </Group>
      <Field label={sub.trim() ? 'Người thay · đã sửa' : 'Người thay'} value={sub} onChangeText={setSub} placeholder="Chọn người thay" invalid={!sub.trim()} />
      <AppText variant="caption" tone="muted">Bắt buộc trước khi gửi lại. Trường đã sửa được đánh dấu; người duyệt thấy lịch sử chỉnh sửa.</AppText>
      <Chips items={['Phạm Quốc Huy', 'Lê Đức Thành']} value={sub} onChange={setSub} />
    </ScrollPage>
  );
};

/** G12 — Ủy quyền duyệt khi vắng mặt. */
export const DelegationScreen: React.FC<ScreenProps<typeof Routes.DELEGATION>> = ({ navigation }) => {
  const [who, setWho] = useState('Phạm Quốc Huy');
  return (
    <ScrollPage
      title="Ủy quyền"
      caption="Khi vắng mặt"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button
            title="Xác nhận ủy quyền"
            onPress={() => navigation.replace(Routes.SUCCESS, { title: `Đã ủy quyền cho ${who}`, body: 'Từ 28/10 08:00 đến 30/10 17:00. Mọi quyết định ghi "duyệt thay".', kind: 'Ủy quyền', code: 'UQ-2610-002', anim: 'handover' })}
          />
        </BottomBar>
      }
    >
      <AppText tone="muted">Người nhận chỉ duyệt thay trong thời gian và loại phiếu bạn chọn. Mọi quyết định ghi "duyệt thay".</AppText>
      <AppText variant="label" tone="muted">Người duyệt thay</AppText>
      <Chips items={['Phạm Quốc Huy', 'Trần Thu Hà']} value={who} onChange={setWho} />
      <Group>
        <KV label="Chức vụ" value={who === 'Phạm Quốc Huy' ? 'Phó phòng' : 'Điều độ'} />
        <KV label="Thời gian" value="28/10 08:00 → 30/10 17:00" />
        <KV label="Loại phiếu" value="Vật tư dưới 20 triệu, nghỉ phép" />
      </Group>
    </ScrollPage>
  );
};

const Stepper: React.FC<{ value: number; onChange: (v: number) => void; label: string }> = ({ value, onChange, label }) => {
  const s = useStyles();
  return (
    <View style={s.stepper}>
      <IconButton icon={Minus} label={`Giảm ${label}`} onPress={() => onChange(Math.max(1, value - 1))} />
      <AppText variant="heading" style={s.qty} accessibilityLabel={`${label}: ${value}`}>{String(value)}</AppText>
      <IconButton icon={Plus} label={`Tăng ${label}`} onPress={() => onChange(value + 1)} />
    </View>
  );
};

/** H01 — Đề nghị vật tư từ phiếu sửa (tự điền thiết bị, sự cố). */
export const MaterialRequestScreen: React.FC<ScreenProps<typeof Routes.MATERIAL_REQUEST>> = ({ navigation }) => {
  const [items, setItems] = useState([
    { name: 'Vòng bi 6204-2RS', sub: 'Cái · thay gối đỡ', qty: 2 },
    { name: 'Bu lông M10×35', sub: 'Cái · liên kết cụm con lăn', qty: 8 },
  ]);
  const [extra, setExtra] = useState('');
  return (
    <ScrollPage
      title="Đề nghị vật tư"
      caption="Liên kết BT-2610-011 · SC-2610-024"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button
            title="Gửi đề nghị"
            onPress={() => navigation.replace(Routes.SUCCESS, { title: 'Đã gửi đề nghị vật tư', body: 'Trần Quốc Dũng duyệt rồi kho cấp. Phần thiếu tự chuyển Mua hàng.', kind: 'Vật tư, công cụ', code: 'VT-2610-018' })}
          />
        </BottomBar>
      }
    >
      <Banner text="Đã tự điền thiết bị BT-07 và sự cố SC-2610-024." />
      <Group>
        {items.map((it, i) => (
          <Row
            key={it.name}
            title={it.name}
            subtitle={it.sub}
            chevron={false}
            trailing={<Stepper label={it.name} value={it.qty} onChange={(q) => setItems((a) => a.map((v, j) => (j === i ? { ...v, qty: q } : v)))} />}
          />
        ))}
      </Group>
      <Field
        label="Thêm vật tư"
        value={extra}
        onChangeText={setExtra}
        placeholder="Tên hoặc mã vật tư"
        returnKeyType="done"
        onSubmitEditing={() => {
          if (!extra.trim()) return;
          setItems((a) => [...a, { name: extra.trim(), sub: 'Cái', qty: 1 }]);
          setExtra('');
        }}
      />
      <Group>
        <KV label="Cần trước" value="Hôm nay 12:00" tone="warning" />
      </Group>
    </ScrollPage>
  );
};

const PO_STEPS = ['Tìm nguồn', 'Đã đặt', 'Đang giao', 'Đã giao'];

/** H04 — Cập nhật mua hàng (theo dõi nội bộ). */
export const PurchaseUpdateScreen: React.FC<ScreenProps<typeof Routes.PURCHASE_UPDATE>> = ({ navigation }) => {
  const s = useStyles();
  const [step, setStep] = useState(1);
  return (
    <ScrollPage
      title="Mua hàng"
      caption="MH-2610-009 · từ VT-2610-012"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Lưu tiến độ" onPress={navigation.goBack} />
        </BottomBar>
      }
    >
      <AppText variant="label" tone="muted">Trạng thái</AppText>
      <View style={s.steps}>
        {PO_STEPS.map((t, i) => (
          <PressableScale key={t} accessibilityRole="radio" accessibilityState={{ selected: i === step }} onPress={() => setStep(i)} style={[s.stepPill, i <= step && s.stepDone, i === step && s.stepNow]}>
            <AppText variant="label" tone={i === step ? 'bg' : i < step ? 'accent' : 'muted'}>{t}</AppText>
          </PressableScale>
        ))}
      </View>
      <Group>
        <KV label="Nhà cung cấp" value="Omron Việt Nam" />
        <KV label="Tham chiếu" value="PO-NCC-2610-221" />
        <KV label="Dự kiến giao" value="29/10/2026 · 09:00" />
      </Group>
      <AppText variant="caption" tone="muted">Theo dõi nội bộ. Không tạo đơn mua kế toán hay trừ tồn ERP.</AppText>
    </ScrollPage>
  );
};

/** H05 — Chi tiết phiếu vật tư. */
export const MaterialDetailScreen: React.FC<ScreenProps<typeof Routes.MATERIAL_DETAIL>> = ({ route, navigation }) => {
  const s = useStyles();
  const c = useColors();
  const m = materials.find((x) => x.id === route.params.materialId) ?? materials[0];
  const steps: [string, string, 'done' | 'now'][] = [
    ['Duyệt', 'Trần Quốc Dũng · 28/10', 'done'],
    ['Kho cấp', 'Cấp 2/4 · 30/10 10:05', 'done'],
    ['Mua hàng', 'Đang hỏi giá 2 cái', 'now'],
  ];
  return (
    <ScrollPage
      title="Phiếu vật tư"
      caption={`${m.code} · Vật tư`}
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Trao đổi" variant="secondary" onPress={() => navigation.navigate(Routes.COMMENTS, { code: m.code })} />
        </BottomBar>
      }
    >
      <AppText variant="title" style={{ fontSize: 24, lineHeight: 30 }}>{m.title}</AppText>
      <Tag label={m.sub} tone={m.tone} />
      <Group>
        <KV label="Yêu cầu" value="4 cái" />
        <KV label="Đã cấp" value="2 cái · chuyển mua 2" tone="warning" />
        <Row icon={Paperclip} title="Chứng từ" subtitle="phieu-xuat-kho-0412.jpg" chevron={false} />
      </Group>
      <SectionHeader title="Tiến trình" />
      <Group>
        {steps.map(([t, sub, st]) => (
          <View key={t} style={s.timeRow}>
            {st === 'done' ? <CircleCheck size={20} color={c.success} /> : <Clock size={20} color={c.progress} />}
            <View style={{ flex: 1 }}>
              <AppText variant="bodyMedium">{t}</AppText>
              <AppText variant="caption" tone="muted">{sub}</AppText>
            </View>
          </View>
        ))}
        <View style={s.timeRow}>
          <Circle size={20} color={c.muted} />
          <AppText variant="bodyMedium" tone="muted">Người đề nghị xác nhận nhận đủ</AppText>
        </View>
      </Group>
    </ScrollPage>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, backgroundColor: c.subtle },
    qty: { minWidth: 28, textAlign: 'center' },
    steps: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    stepPill: { paddingHorizontal: 14, height: 36, justifyContent: 'center', borderRadius: radius.full, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    stepDone: { backgroundColor: c.accentSoft, borderColor: c.accentSoft },
    stepNow: { backgroundColor: c.ink, borderColor: c.ink },
    timeRow: { flexDirection: 'row', gap: space.md, alignItems: 'center', paddingVertical: space.md, paddingHorizontal: space.lg },
  })
);
