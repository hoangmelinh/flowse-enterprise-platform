import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Search, CircleCheck, Circle, TriangleAlert, Package } from 'lucide-react-native';
import { radius, space, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { handover, incidents, inspections, materials, myRequests } from '../../../data/demo/fixtures';
import { AppText, Banner, BottomBar, Button, Field, Group, KV, Row, ScrollPage, SectionHeader, Segmented, Stat, StatRow } from '../../components/ui';
import { ScreenProps } from '../../navigation/types';

const REPAIR_STEPS = ['Kiểm tra cụm con lăn', 'Siết lại bu lông đế', 'Thay vòng bi 6204-2RS', 'Chạy thử 70% tải 15 phút'];

/** E09 / E10 / E11 — Phiếu sửa chữa: làm từng bước rồi gửi xác minh. */
export const RepairOrderScreen: React.FC<ScreenProps<typeof Routes.REPAIR_ORDER>> = ({ route, navigation }) => {
  const c = useColors();
  const i = incidents.find((x) => x.id === route.params.incidentId) ?? incidents[0];
  const [done, setDone] = useState<boolean[]>(REPAIR_STEPS.map(() => false));
  const [note, setNote] = useState('');
  const all = done.every(Boolean);
  return (
    <ScrollPage
      title="Phiếu sửa chữa"
      caption={`${i.code} · ${i.asset}`}
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button
            title={all ? 'Gửi xác minh' : `Còn ${done.filter((d) => !d).length} bước`}
            disabled={!all || !note.trim()}
            onPress={() => navigation.replace(Routes.SUCCESS, { title: 'Đã gửi xác minh', body: 'Trưởng ca nhận thông báo để xác minh kết quả sửa.', kind: 'Sửa chữa', code: i.code, anim: 'send' })}
          />
          <Button title="Đề nghị vật tư" variant="secondary" icon={<Package size={18} color={c.ink} />} onPress={() => navigation.navigate(Routes.MATERIAL_REQUEST)} />
        </BottomBar>
      }
    >
      <AppText variant="title" style={{ fontSize: 24, lineHeight: 30 }}>{i.title}</AppText>
      <Group>
        {REPAIR_STEPS.map((s, k) => (
          <Row
            key={s}
            icon={done[k] ? CircleCheck : Circle}
            iconTone={done[k] ? 'success' : 'muted'}
            title={s}
            chevron={false}
            onPress={() => setDone((d) => d.map((v, j) => (j === k ? !v : v)))}
          />
        ))}
      </Group>
      <Field label="Kết quả sửa (bắt buộc)" value={note} onChangeText={setNote} placeholder="Đo rung còn 2.1 mm/s, trong ngưỡng" multiline />
    </ScrollPage>
  );
};

/** I02 — Nhận bàn giao ca: ca sau xác nhận thì ca trước mới được chốt. */
export const HandoverReceiveScreen: React.FC<ScreenProps<typeof Routes.HANDOVER_RECEIVE>> = ({ navigation }) => (
  <ScrollPage
    title="Nhận bàn giao"
    caption="Từ Trần Quốc Dũng · 14:02"
    onBack={navigation.goBack}
    footer={
      <BottomBar>
        <Button
          title="Xác nhận nhận ca"
          onPress={() => navigation.replace(Routes.SUCCESS, { title: 'Đã nhận ca', body: 'Ca trước đã được chốt.', kind: 'Bàn giao ca', code: 'BG-2610-030', anim: 'handover', rows: [['Việc chuyển sang', '2 việc'], ['Sự cố mở', 'BT-07 · chờ vòng bi'], ['Ca nhận', 'Ca chiều · 14:00–22:00']] })}
        />
        <Button title="Cần bổ sung" variant="secondary" onPress={navigation.goBack} />
      </BottomBar>
    }
  >
    <Banner tone="warning" text="BT-07 chạy tối đa 70% tải đến khi thay vòng bi." />
    <Group>
      <KV label="Việc chuyển sang" value={`${handover.pending.length} việc`} />
      <KV label="Sự cố mở" value="BT-07 · chờ vòng bi" />
      <KV label="Người trong ca" value="6 người" />
    </Group>
    <AppText variant="caption" tone="muted">Ca trước chỉ được chốt khi bạn xác nhận.</AppText>
  </ScrollPage>
);

/** H03 — Kho cấp phát: cấp phần đang có, phần thiếu chuyển mua hàng. */
export const MaterialIssueScreen: React.FC<ScreenProps<typeof Routes.MATERIAL_ISSUE>> = ({ navigation }) => (
  <ScrollPage
    title="Kho cấp phát"
    caption={materials[0].code}
    onBack={navigation.goBack}
    footer={
      <BottomBar>
        <Button
          title="Cấp 2 và chuyển mua 2"
          onPress={() => navigation.replace(Routes.SUCCESS, { title: 'Đã cấp 2 · chuyển mua 2', body: 'Người nhận đã được báo; phần thiếu chuyển cho Mua hàng.', kind: 'Vật tư', code: materials[0].code, anim: 'issue', rows: [['Cấp lần này', '2 cái'], ['Chuyển mua', '2 cái'], ['Người nhận', 'Nguyễn Hoàng Nam']] })}
        />
        <Button title="Báo hết hàng" variant="secondary" onPress={navigation.goBack} />
      </BottomBar>
    }
  >
    <Banner tone="warning" text="Thực tế kho còn 2/4. Cấp trước phần đang có, phần thiếu chuyển mua hàng." />
    <Group>
      <KV label="Yêu cầu" value="4 cái" />
      <KV label="Thực tế trong kho" value="2 cái" />
      <KV label="Cấp lần này" value="2 cái" />
      <KV label="Chuyển mua" value="2 cái" tone="warning" />
    </Group>
    <Group>
      <KV label="Người nhận" value="Nguyễn Hoàng Nam · Tổ bảo trì" />
    </Group>
  </ScrollPage>
);

const HOURS: [string, number][] = [['6h', 230], ['7h', 245], ['8h', 250], ['9h', 170], ['10h', 190], ['11h', 240], ['12h', 255], ['13h', 260]];

/** D11 — Sản lượng theo ca. shortcut: số liệu mẫu, nối nguồn báo cáo sản xuất khi backend có API. */
export const ProductionScreen: React.FC<ScreenProps<typeof Routes.PRODUCTION>> = ({ navigation }) => {
  const s = useStyles();
  const [shift, setShift] = useState(0);
  return (
    <ScrollPage title="Sản lượng" caption="Dây chuyền A2" onBack={navigation.goBack}>
      <Segmented items={['Ca sáng', 'Ca chiều', 'Ca đêm']} value={shift} onChange={setShift} />
      <StatRow>
        <Stat value="1.840" label="Thùng" />
        <Stat value="92%" label="Kế hoạch" />
        <Stat value="27 ph" label="Dừng máy" tone="warning" />
      </StatRow>
      <View style={s.chart} accessibilityLabel="Biểu đồ thùng mỗi giờ">
        {HOURS.map(([h, v]) => (
          <View key={h} style={s.col}>
            <View style={[s.bar, { height: v * 0.36 }, v < 200 && s.low]} />
            <AppText variant="micro" tone="muted">{h}</AppText>
          </View>
        ))}
      </View>
      <Group>
        <Row icon={TriangleAlert} iconTone="warning" title="BT-07 dừng 27 phút" subtitle="SC-2610-024 · −60 thùng" onPress={() => navigation.navigate(Routes.INCIDENT_DETAIL, { incidentId: 24 })} />
      </Group>
    </ScrollPage>
  );
};

/** D12 — Tìm kiếm chung theo mã/tên trên mọi loại phiếu. */
export const SearchScreen: React.FC<ScreenProps<typeof Routes.SEARCH>> = ({ navigation }) => {
  const [q, setQ] = useState('');
  const k = q.trim().toLowerCase();
  const hits = k
    ? [
        ...incidents.map((x) => ({ key: `i${x.id}`, title: x.title, sub: `${x.code} · Sự cố`, go: () => navigation.navigate(Routes.INCIDENT_DETAIL, { incidentId: x.id }), text: `${x.code} ${x.title} ${x.asset}` })),
        ...myRequests.map((x) => ({ key: `r${x.id}`, title: x.title, sub: `${x.code} · Yêu cầu`, go: () => navigation.navigate(Routes.REQUEST_DETAIL, { requestId: x.id }), text: `${x.code} ${x.title}` })),
        ...inspections.map((x) => ({ key: `q${x.id}`, title: x.title, sub: `${x.code} · Kiểm tra`, go: () => navigation.navigate(Routes.INSPECTION_RUNNER, { inspectionId: x.id }), text: `${x.code} ${x.title}` })),
      ].filter((h) => h.text.toLowerCase().includes(k))
    : [];
  return (
    <ScrollPage title="Tìm kiếm" caption="Trong mọi mục" onBack={navigation.goBack}>
      <Field label="Từ khoá" icon={Search} value={q} onChangeText={setQ} placeholder="BT-07, SC-2610, laptop…" autoFocus />
      {k ? (
        hits.length ? (
          <>
            <SectionHeader title="Kết quả" count={hits.length} />
            <Group>
              {hits.map((h) => (
                <Row key={h.key} title={h.title} subtitle={h.sub} onPress={h.go} />
              ))}
            </Group>
          </>
        ) : (
          <AppText tone="muted">{`Không có kết quả cho "${q.trim()}".`}</AppText>
        )
      ) : (
        <AppText variant="caption" tone="muted">Gõ mã phiếu (SC-, VT-, YC-, QC-) để mở thẳng phiếu.</AppText>
      )}
    </ScrollPage>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    chart: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, padding: space.lg, height: 150, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    col: { flex: 1, alignItems: 'center', gap: 4 },
    bar: { width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: c.accent },
    low: { backgroundColor: c.warning },
  })
);
