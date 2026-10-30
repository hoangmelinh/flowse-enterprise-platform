import React, { useRef, useState } from 'react';
import { View, Image, ScrollView, StyleSheet, Linking } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CameraOff, Plus, ScanLine, TriangleAlert, Wrench, BookOpen, Circle, CircleCheck } from 'lucide-react-native';
import { space, radius, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { asset, incidents, incidentTimeline, people, symptoms } from '../../../data/demo/fixtures';
import {
  AppText, Banner, BottomBar, Button, Chips, EmptyState, Fab, Field, Group, IconButton, KV, PressableScale, Row,
  Screen, ScreenHeader, ScrollPage, SectionHeader, Segmented, Tag,
} from '../../components/ui';
import { ScreenProps } from '../../navigation/types';

/** E01 — Quét mã thiết bị (tab hiện trường). Camera chỉ bật khi tab đang mở để tiết kiệm pin. */
export const QRScannerScreen: React.FC = () => {
  const s = useStyles();
  const c = useColors();
  const nav = useNavigation<any>();
  const focused = useIsFocused();
  const [perm, requestPerm] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const handled = useRef(false);

  const open = (code: string) => {
    if (handled.current || !code.trim()) return;
    handled.current = true; // chặn quét lặp nhiều lần trong 1 lần đưa mã vào khung
    nav.navigate(Routes.ASSET_DETAIL, { assetCode: code.trim().toUpperCase() });
    setTimeout(() => (handled.current = false), 1200);
  };

  return (
    <Screen>
      <ScreenHeader title="Quét mã" caption="Đưa mã QR trên thiết bị vào khung" />
      <View style={s.scanBody}>
        {!perm ? null : perm.granted ? (
          <View style={s.camera}>
            {focused && (
              <CameraView style={StyleSheet.absoluteFill} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={(r) => open(r.data)} />
            )}
            <View style={s.frame} pointerEvents="none" />
          </View>
        ) : (
          // K08 — camera bị chặn
          <EmptyState
            icon={CameraOff}
            title="Flowse chưa được dùng camera"
            body="Bật camera trong cài đặt điện thoại, hoặc nhập mã in dưới QR."
            actionTitle={perm.canAskAgain ? 'Cho phép camera' : 'Mở cài đặt'}
            onAction={perm.canAskAgain ? requestPerm : Linking.openSettings}
          />
        )}
        <Field label="Nhập mã thủ công" icon={ScanLine} value={manual} onChangeText={setManual} placeholder="Ví dụ: BT-07" autoCapitalize="characters" onSubmitEditing={() => open(manual)} returnKeyType="go" />
        <Button title="Mở thiết bị" variant="secondary" disabled={!manual.trim()} onPress={() => open(manual)} icon={<ScanLine size={18} color={c.ink} />} />
      </View>
    </Screen>
  );
};

/** E02 — Hồ sơ thiết bị. */
export const AssetDetailScreen: React.FC<ScreenProps<typeof Routes.ASSET_DETAIL>> = ({ route, navigation }) => {
  const s = useStyles();
  const c = useColors();
  const code = route.params.assetCode;
  const open = incidents.filter((i) => i.asset === code);
  return (
    <ScrollPage
      title={code === asset.code ? `${asset.name.split(' ').slice(0, 2).join(' ')} ${code}` : code}
      caption={asset.sub.split(' · ').slice(0, 2).join(' · ')}
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Báo sự cố" variant="danger" icon={<TriangleAlert size={18} color={c.onAccent} />} onPress={() => navigation.navigate(Routes.REPORT_INCIDENT, { assetCode: code })} />
          <Button title="Xem hướng dẫn vận hành" variant="secondary" icon={<BookOpen size={18} color={c.ink} />} />
        </BottomBar>
      }
    >
      <View style={s.assetCard}>
        <View style={s.assetIcon}>
          <Wrench size={28} color={c.accent} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="heading">{code}</AppText>
          <AppText variant="caption" tone="muted">{asset.name} · {asset.sub.split(' · ').pop()}</AppText>
          {open.length ? <Tag label={asset.status} tone="danger" /> : <Tag label="Đang chạy ổn định" tone="success" />}
        </View>
      </View>
      <Group>
        <KV label="Vị trí" value={asset.location} />
        <KV label="Phụ trách" value={asset.owner} />
        <KV label="Bảo trì gần nhất" value={asset.lastService} />
      </Group>
      <SectionHeader title="Sự cố đang mở" count={open.length} />
      {open.length ? (
        <Group>
          {open.map((i) => (
            <Row key={i.id} icon={Circle} iconTone="progress" title={i.title} subtitle={`${i.code} · ${i.who} · ${i.sla}`} onPress={() => navigation.navigate(Routes.INCIDENT_DETAIL, { incidentId: i.id })} />
          ))}
        </Group>
      ) : (
        <AppText variant="caption" tone="muted">Không có sự cố nào đang mở.</AppText>
      )}
    </ScrollPage>
  );
};

/** E03 / E04 — Báo sự cố (≤ 1 phút): chọn hiện tượng, mức ảnh hưởng, ảnh, mô tả ngắn. */
export const ReportIncidentScreen: React.FC<ScreenProps<typeof Routes.REPORT_INCIDENT>> = ({ route, navigation }) => {
  const s = useStyles();
  const c = useColors();
  const code = route.params?.assetCode ?? 'BT-07';
  const [symptom, setSymptom] = useState(symptoms[0]);
  const [impact, setImpact] = useState(1);
  const [desc, setDesc] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const similar = incidents.find((i) => i.asset === code);

  const addPhoto = async () => {
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 }).catch(() => ImagePicker.launchImageLibraryAsync({ quality: 0.6 }));
    if (!res.canceled) setPhotos((p) => [...p, res.assets[0].uri].slice(0, 3));
  };

  return (
    <ScrollPage
      title="Báo sự cố"
      caption={`${code} · tự điền từ mã QR`}
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          {/* shortcut: gửi qua IncidentRepository khi nối API; offline thì đưa vào hàng đợi đồng bộ */}
          <Button
            title="Gửi báo cáo"
            onPress={() =>
              navigation.replace(Routes.SUCCESS, {
                title: 'Đã gửi tới Trưởng ca',
                body: 'Trần Quốc Dũng nhận thông báo lúc này. Bạn sẽ được báo khi có người tiếp nhận.',
                kind: 'Sự cố',
                code: 'SC-2610-031',
                primary: 'Xem phiếu SC-2610-031',
              })
            }
          />
        </BottomBar>
      }
    >
      {similar ? <Banner tone="warning" text={`${code} đã có 1 sự cố mở cách đây 18 phút (${similar.code}). Thêm thông tin vào phiếu đó giúp kỹ thuật xử lý nhanh hơn.`} /> : null}
      <View style={{ gap: space.sm }}>
        <AppText variant="label" tone="muted">Chuyện gì đang xảy ra?</AppText>
        <Chips items={symptoms} value={symptom} onChange={setSymptom} />
      </View>
      <View style={{ gap: space.sm }}>
        <AppText variant="label" tone="muted">Ảnh hưởng</AppText>
        <Segmented items={['Vẫn chạy', 'Chạy chậm', 'Đã dừng']} value={impact} onChange={setImpact} />
      </View>
      <Field label="Mô tả ngắn" value={desc} onChangeText={setDesc} placeholder="Cụm con lăn giữa kêu lạch cạch khi tải nặng" multiline />
      <View style={s.photos}>
        {photos.map((u) => (
          <Image key={u} source={{ uri: u }} style={s.photo} />
        ))}
        {photos.length < 3 && (
          <PressableScale accessibilityRole="button" accessibilityLabel="Thêm ảnh" onPress={addPhoto} style={[s.photo, s.addPhoto]}>
            {photos.length ? <Plus size={22} color={c.muted} /> : <Camera size={22} color={c.muted} />}
          </PressableScale>
        )}
      </View>
    </ScrollPage>
  );
};

/** E06 — Sự cố theo SLA (tab hiện trường). */
export const IncidentsScreen: React.FC = () => {
  const nav = useNavigation<any>();
  const [f, setF] = useState('Mở');
  const list = incidents.filter((i) => (f === 'Chờ xác minh' ? i.state === 'Chờ xác minh' : f === 'Đã đóng' ? false : i.state !== 'Chờ xác minh'));
  return (
    <Screen>
      <ScreenHeader title="Sự cố" caption="Dây chuyền A2 · Trưởng ca" right={<IconButton icon={ScanLine} label="Quét mã" onPress={() => nav.navigate(Routes.MAIN_TABS, { screen: Routes.QR_SCANNER })} />} />
      <ScrollView contentContainerStyle={{ gap: space.lg, paddingHorizontal: space.xl, paddingBottom: 100 }}>
        <Chips items={['Mở', 'Chờ xác minh', 'Đã đóng']} value={f} onChange={setF} />
        {list.length ? (
          <Group>
            {list.map((i) => (
              <Row key={i.id} title={i.title} subtitle={`${i.code} · ${i.who}`} trailing={<Tag label={i.sla} tone={i.tone} />} chevron={false} onPress={() => nav.navigate(Routes.INCIDENT_DETAIL, { incidentId: i.id })} />
            ))}
          </Group>
        ) : (
          <EmptyState icon={CircleCheck} title="Không có sự cố" body="Mọi thiết bị đang chạy ổn định." />
        )}
      </ScrollView>
      <Fab label="Báo sự cố" onPress={() => nav.navigate(Routes.REPORT_INCIDENT)} />
    </Screen>
  );
};

/** E07 — Chi tiết sự cố + dòng thời gian. */
export const IncidentDetailScreen: React.FC<ScreenProps<typeof Routes.INCIDENT_DETAIL>> = ({ route, navigation }) => {
  const s = useStyles();
  const i = incidents.find((x) => x.id === route.params.incidentId) ?? incidents[0];
  return (
    <ScrollPage
      title="Sự cố"
      caption={i.code}
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Phân công kỹ thuật" onPress={() => navigation.navigate(Routes.INCIDENT_TRIAGE, { incidentId: i.id })} />
          <Button title="Trao đổi" variant="secondary" onPress={() => navigation.navigate(Routes.COMMENTS, { code: i.code })} />
        </BottomBar>
      }
    >
      <View style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Tag label={i.state} tone="progress" />
          <Tag label={i.sla} tone={i.tone} />
        </View>
        <AppText variant="title" style={{ fontSize: 24, lineHeight: 30 }}>{i.title}</AppText>
      </View>
      <Group>
        <KV label="Thiết bị" value={i.asset} />
        <KV label="Mức ảnh hưởng" value="Chạy chậm" />
        <KV label="Người xử lý" value={i.who.replace(' đang sửa', '').replace(' đang xử lý', '')} />
      </Group>
      <SectionHeader title="Ghi nhận" />
      <View style={s.timeline}>
        {incidentTimeline.map((e, k) => (
          <View key={k} style={s.event}>
            <View style={s.eventDot} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyMedium">{e.text}</AppText>
              <AppText variant="caption" tone="muted">{e.at}</AppText>
            </View>
          </View>
        ))}
      </View>
    </ScrollPage>
  );
};

/** E08 / E08b — Sheet phân công nhanh (có trạng thái không ai rảnh). */
export const IncidentTriageSheet: React.FC<ScreenProps<typeof Routes.INCIDENT_TRIAGE>> = ({ navigation }) => {
  const s = useStyles();
  const c = useColors();
  const techs = people.slice(2).concat({ id: 9, name: 'Hồ Văn Bảo', sub: 'Nghỉ ca này' });
  const [picked, setPicked] = useState(techs[0].id);
  const [due, setDue] = useState('30 phút');
  return (
    <View style={s.sheet}>
      <AppText variant="heading">Giao kỹ thuật</AppText>
      <Group>
        {techs.map((p) => {
          const off = p.sub.startsWith('Nghỉ');
          return (
            <Row
              key={p.id}
              title={p.name}
              subtitle={p.sub}
              chevron={false}
              trailing={p.id === picked ? <CircleCheck size={22} color={c.accent} /> : <Circle size={22} color={c.muted} />}
              onPress={off ? undefined : () => setPicked(p.id)}
            />
          );
        })}
      </Group>
      <AppText variant="label" tone="muted">Hạn xử lý</AppText>
      <Chips items={['30 phút', '1 giờ', 'Trong ca']} value={due} onChange={setDue} />
      <Button title={`Giao cho ${techs.find((t) => t.id === picked)?.name}`} onPress={navigation.goBack} />
    </View>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    scanBody: { flex: 1, gap: space.lg, paddingHorizontal: space.xl, paddingBottom: space.xl },
    camera: { flex: 1, minHeight: 280, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
    frame: { width: 220, height: 220, borderRadius: radius.xl, borderWidth: 3, borderColor: c.accent },
    assetCard: { flexDirection: 'row', gap: space.md, alignItems: 'center', padding: space.lg, borderRadius: radius.xl, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    assetIcon: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
    photos: { flexDirection: 'row', gap: space.md },
    photo: { width: 96, height: 96, borderRadius: radius.md },
    addPhoto: { borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
    timeline: { gap: space.lg, paddingLeft: space.xs },
    event: { flexDirection: 'row', gap: space.md },
    eventDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, backgroundColor: c.accent },
    sheet: { flex: 1, gap: space.lg, padding: space.xl, backgroundColor: c.bg },
  })
);
