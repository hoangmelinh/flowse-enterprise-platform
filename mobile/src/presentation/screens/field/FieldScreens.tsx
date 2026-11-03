import React, { useEffect, useRef, useState } from 'react';
import { View, Image, ScrollView, StyleSheet, Linking } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Camera, CameraOff, Plus, ScanLine, TriangleAlert, Wrench, BookOpen, Circle, CircleCheck, X, Settings, List, Sparkles, Search, Clock, Check } from 'lucide-react-native';
import { useRoleScope } from '../../state/useHomeRole';
import { space, radius, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { asset, incidents, incidentTimeline, people, symptoms } from '../../../data/demo/fixtures';
import {
  AppText, Banner, BottomBar, Button, Chips, EmptyState, Fab, Field, Group, IconButton, KV, PressableScale, Row,
  Screen, ScreenHeader, ScrollPage, SectionHeader, Segmented, Tag,
} from '../../components/ui';
import { ScreenProps } from '../../navigation/types';

/** E01 — Quét mã thiết bị: tab của vai trò hiện trường, hoặc màn riêng (có nút quay lại) mở từ vai trò khác. Camera chỉ bật khi màn đang mở để tiết kiệm pin. */
export const QRScannerScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const s = useStyles();
  const c = useColors();
  const nav = useNavigation<any>();
  const focused = useIsFocused();
  const [perm, requestPerm] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const [typing, setTyping] = useState(false);
  const [torch, setTorch] = useState(false);
  const handled = useRef(false);

  const open = (code: string) => {
    if (handled.current || !code.trim()) return;
    handled.current = true; // chặn quét lặp nhiều lần trong 1 lần đưa mã vào khung
    const v = code.trim().toUpperCase();
    // K10: không đúng dạng mã thiết bị Flowse (VD BT-07); K09: mã của nhà máy khác (tiền tố DN-)
    if (!/^[A-Z]{1,4}-[A-Z0-9-]{1,10}$/.test(v)) nav.navigate(Routes.STATE, { k: 'K10' });
    else if (v.startsWith('DN-')) nav.navigate(Routes.STATE, { k: 'K09' });
    else nav.navigate(Routes.ASSET_DETAIL, { assetCode: v });
    setTimeout(() => (handled.current = false), 1200);
  };

  // Vạch quét chạy lên xuống trong khung (UI thread)
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce || !focused) return;
    y.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(y);
  }, [y, reduce, focused]);
  const line = useAnimatedStyle(() => ({ transform: [{ translateY: (y.value - 0.5) * 200 }] }));

  return (
    <SafeAreaView edges={onBack ? ['top', 'bottom'] : ['top']} style={s.scanRoot}>
      {focused && <StatusBar style="light" />}
      {perm?.granted && focused ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(r) => open(r.data)}
        />
      ) : null}
      <View style={s.scanTop}>
        {onBack ? (
          <PressableScale accessibilityRole="button" accessibilityLabel="Đóng" onPress={onBack} hitSlop={6} style={s.iconSpace}>
            <X size={22} color={SCAN.text} />
          </PressableScale>
        ) : (
          <View style={s.iconSpace} />
        )}
        <AppText variant="navTitle" style={[s.flex, s.center, { color: SCAN.text }]}>Quét mã thiết bị</AppText>
        <PressableScale accessibilityRole="button" accessibilityLabel="Quyền camera" onPress={() => nav.navigate(Routes.PERMISSIONS)} hitSlop={6} style={s.iconSpace}>
          <Settings size={22} color={SCAN.text} />
        </PressableScale>
      </View>
      <View style={s.viewfinder}>
        {!perm ? null : perm.granted ? (
          <>
            <View style={s.frame} pointerEvents="none">
              <Animated.View style={[s.scanLine, line]} />
            </View>
            <AppText style={{ color: SCAN.text }}>Đưa mã QR trên thiết bị vào khung</AppText>
          </>
        ) : (
          // K08 — camera bị chặn
          <View style={s.permCard}>
            <EmptyState
              icon={CameraOff}
              title="Flowse chưa được dùng camera"
              body="Bật camera trong cài đặt điện thoại, hoặc nhập mã in dưới QR."
              actionTitle={perm.canAskAgain ? 'Cho phép camera' : 'Mở cài đặt'}
              onAction={perm.canAskAgain ? requestPerm : Linking.openSettings}
            />
          </View>
        )}
      </View>
      {typing ? (
        <View style={s.manual}>
          <Field label="Mã in dưới QR" icon={ScanLine} value={manual} onChangeText={setManual} placeholder="Ví dụ: BT-07" autoCapitalize="characters" autoFocus onSubmitEditing={() => open(manual)} returnKeyType="go" />
          <Button title="Mở thiết bị" disabled={!manual.trim()} onPress={() => open(manual)} />
        </View>
      ) : null}
      <View style={s.scanActions}>
        <Button title="Nhập mã" variant="secondary" style={[s.flex, s.scanBtn]} icon={<List size={18} color={c.ink} />} onPress={() => setTyping((t) => !t)} />
        <Button
          title={torch ? 'Tắt đèn' : 'Đèn'}
          variant="secondary"
          style={[s.flex, s.scanBtn]}
          icon={<Sparkles size={18} color={c.ink} />}
          disabled={!perm?.granted}
          onPress={() => setTorch((t) => !t)}
        />
      </View>
    </SafeAreaView>
  );
};

// Máy quét luôn nền tối như kính ngắm camera, kể cả giao diện sáng
const SCAN = { bg: '#0E1110', text: '#FFFFFF', frame: 'rgba(255,255,255,0.9)' };

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
          <Button title="Xem hướng dẫn vận hành" variant="secondary" icon={<BookOpen size={18} color={c.ink} />} onPress={() => navigation.navigate(Routes.SOP)} />
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
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    const res = cam.granted
      ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.6 });
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
                anim: 'send',
                rows: [['Mã phiếu', 'SC-2610-031'], ['Thiết bị', code], ['Mức ảnh hưởng', 'Chạy chậm']],
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
  const s = useStyles();
  const c = useColors();
  const nav = useNavigation<any>();
  const scope = useRoleScope();
  // Kỹ thuật chỉ thấy sự cố được giao cho mình; các vai trò khác thấy cả đơn vị
  // shortcut: lọc theo tên người sửa trong dữ liệu mẫu; đổi sang assignee_id khi nối API
  const mine = scope.mine ? incidents.filter((i) => i.who.startsWith('Lê Đức Thành')) : incidents;
  const verify = mine.filter((i) => i.state === 'Chờ xác minh');
  const chips = [`Mở ${mine.length - verify.length}`, `Chờ xác minh ${verify.length}`, 'Đã đóng'];
  const [f, setF] = useState(chips[0]);
  const list = f === chips[1] ? verify : f === chips[2] ? [] : mine.filter((i) => i.state !== 'Chờ xác minh');
  return (
    <Screen>
      <ScreenHeader
        title={scope.mine ? 'Sự cố của tôi' : 'Sự cố'}
        caption={`${scope.unit} · ${scope.title}`}
        right={
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon={Search} label="Tìm sự cố" onPress={() => nav.navigate(Routes.SEARCH)} />
            <IconButton icon={Plus} label="Báo sự cố" onPress={() => nav.navigate(Routes.REPORT_INCIDENT)} />
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ gap: space.lg, paddingHorizontal: space.xl, paddingBottom: 40 }}>
        <Chips items={chips} value={f} onChange={setF} />
        {list.length ? (
          <Group>
            {list.map((i) => (
              <PressableScale key={i.id} accessibilityRole="button" scaleTo={0.99} pressedBackground={c.subtle} style={s.incident} onPress={() => nav.navigate(Routes.INCIDENT_DETAIL, { incidentId: i.id })}>
                <View style={s.incidentTop}>
                  <AppText variant="caption" tone="muted" style={{ flex: 1 }}>{`${i.code} · ${i.asset}`}</AppText>
                  <Tag label={i.sla} tone={i.tone} icon={i.tone === 'success' ? Check : Clock} />
                </View>
                <AppText variant="bodyMedium">{i.title}</AppText>
                <AppText variant="caption" tone="muted">{i.who}</AppText>
              </PressableScale>
            ))}
          </Group>
        ) : (
          <EmptyState icon={CircleCheck} title="Không có sự cố" body={scope.mine ? 'Chưa có sự cố nào giao cho bạn.' : 'Mọi thiết bị đang chạy ổn định.'} />
        )}
      </ScrollView>
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
          {i.state === 'Chờ xác minh' ? (
            <Button title="Xác minh kết quả" onPress={() => navigation.navigate(Routes.VERIFY_REPAIR, { incidentId: i.id })} />
          ) : (
            <Button title="Mở phiếu sửa chữa" onPress={() => navigation.navigate(Routes.REPAIR_ORDER, { incidentId: i.id })} />
          )}
          <Button title="Phân công kỹ thuật" variant="secondary" onPress={() => navigation.navigate(Routes.INCIDENT_TRIAGE, { incidentId: i.id })} />
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
export const IncidentTriageSheet: React.FC<ScreenProps<typeof Routes.INCIDENT_TRIAGE>> = ({ route, navigation }) => {
  const s = useStyles();
  const c = useColors();
  // E08b: sự cố quá SLA (SC-2610-019) mô phỏng lúc cả tổ đều bận
  const noneFree = route.params.incidentId === 19;
  const [fallback, setFallback] = useState('Xếp hàng chờ');
  const techs = noneFree
    ? [
        { id: 4, name: 'Lê Đức Thành', sub: 'Đang sửa BT-11 · bận đến 10:30' },
        { id: 6, name: 'Nguyễn Hoàng Nam', sub: 'Đang bảo trì định kỳ · bận đến 11:00' },
        { id: 9, name: 'Hồ Văn Bảo', sub: 'Nghỉ ca này' },
      ]
    : people.slice(2).concat({ id: 9, name: 'Hồ Văn Bảo', sub: 'Nghỉ ca này' });
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
              trailing={noneFree ? undefined : p.id === picked ? <CircleCheck size={22} color={c.accent} /> : <Circle size={22} color={c.muted} />}
              onPress={off || noneFree ? undefined : () => setPicked(p.id)}
            />
          );
        })}
      </Group>
      {noneFree ? (
        <>
          <Banner tone="warning" text="Không có kỹ thuật viên rảnh trong ca. Chọn cách xử lý:" />
          <Chips items={['Gọi ca chiều', 'Xếp hàng chờ', 'Báo trưởng ca']} value={fallback} onChange={setFallback} />
          <Button title={`${fallback} · ưu tiên cao`} onPress={navigation.goBack} />
        </>
      ) : (
        <>
          <AppText variant="label" tone="muted">Hạn xử lý</AppText>
          <Chips items={['30 phút', '1 giờ', 'Trong ca']} value={due} onChange={setDue} />
          <Button title={`Giao cho ${techs.find((t) => t.id === picked)?.name}`} onPress={navigation.goBack} />
        </>
      )}
    </View>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    scanRoot: { flex: 1, backgroundColor: SCAN.bg },
    incident: { gap: 4, paddingVertical: 14, paddingHorizontal: space.lg },
    incidentTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    scanTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.md, height: 44 },
    iconSpace: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    flex: { flex: 1 },
    center: { textAlign: 'center' },
    viewfinder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl },
    frame: { width: 248, height: 248, borderRadius: 28, borderWidth: 3, borderColor: SCAN.frame, alignItems: 'center', justifyContent: 'center' },
    scanLine: { width: 200, height: 2, borderRadius: 1, backgroundColor: c.accent },
    permCard: { alignSelf: 'stretch', marginHorizontal: space.xl, borderRadius: radius.xl, backgroundColor: c.bg },
    manual: { gap: space.sm, marginHorizontal: space.xl, marginBottom: space.md, padding: space.lg, borderRadius: radius.xl, backgroundColor: c.bg },
    scanActions: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.md },
    scanBtn: { backgroundColor: c.subtle, borderWidth: 0 },
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
