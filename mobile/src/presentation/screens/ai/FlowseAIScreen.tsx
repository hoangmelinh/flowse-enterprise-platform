import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { FileText, LayoutGrid, TriangleAlert, Plus, History, CloudOff, Lock, CircleHelp } from 'lucide-react-native';
import { radius, space, Colors, makeStyles, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { aiSuggestions } from '../../../data/demo/fixtures';
import {
  AppText, Banner, BottomBar, Bubble, Button, Chips, Composer, Field, Group, IconButton, KV, Row, Screen, ScreenHeader, ScrollPage, Segmented, Stat, StatRow, Tag,
} from '../../components/ui';
import { ScreenProps } from '../../navigation/types';
import * as Clipboard from 'expo-clipboard';
import { AILaunch, AILogo } from './AILaunch';

const ICONS = [FileText, LayoutGrid, TriangleAlert, Plus];
// shortcut: bản nháp mẫu theo Figma L02, Ngắn hơn / Trang trọng hơn trả lại cùng bản; nối POST /ai/chat để soạn thật
const DRAFT = 'Kính gửi anh Tuấn,\nĐơn PO-2410 sẽ giao ngày 30/10 thay vì 28/10 do lô vải về muộn. Chúng tôi ưu tiên dây chuyền A2 và cập nhật lại trước 17:00 hôm nay.';
type Card = 'draft' | 'summary' | 'proposal' | 'applied' | 'missing' | 'denied' | 'offline';
type Msg = { id: number; mine: boolean; text: string; card?: Card; streaming?: boolean };

/**
 * Trả lời hiện dần từng chữ như đang gõ. Có chấm "đang soạn" trước chữ đầu tiên.
 * shortcut: chạy chữ có sẵn ở máy; khi nối /ai/chat thì đổi sang nhận từng đoạn qua stream (SSE) và nối vào `text`.
 */
const StreamBubble: React.FC<{ text: string; onDone: () => void; onGrow: () => void }> = ({ text, onDone, onGrow }) => {
  const [n, setN] = useState(0);
  useEffect(() => {
    // Nhịp như gõ thật: chờ 350 ms rồi mỗi 24 ms thêm 1 từ
    const words = text.split(/(\s+)/);
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      i += 2; // từ + khoảng trắng
      const len = words.slice(0, i).join('').length;
      setN(len);
      if (len >= text.length) return onDone();
      timer = setTimeout(tick, 24 + Math.random() * 40);
    };
    timer = setTimeout(tick, 350);
    return () => clearTimeout(timer);
    // chỉ chạy một lần cho mỗi tin
  }, []);
  useEffect(onGrow, [n]);
  return <Bubble text={n ? `${text.slice(0, n)}${n < text.length ? ' ▍' : ''}` : '•••'} mine={false} />;
};

// shortcut: trả lời mẫu theo Figma L02–L09; nối POST /ai/chat (backend đã có aiRoutes) khi bật AI trên mobile
const workCard = (q: string): Card =>
  /tóm tắt|quá hạn|tiến độ/i.test(q) ? 'summary' : /nhắc/i.test(q) ? 'missing' : /hồ thị lan|a1/i.test(q) ? 'denied' : /cập nhật/i.test(q) ? 'offline' : 'proposal';
const cardText: Record<Card, string> = {
  draft: 'Bản nháp cho bạn:',
  summary: 'Phòng Kế hoạch có 18 việc mở, 3 quá hạn. Chậm nhất là việc của Phạm Quốc Huy.',
  proposal: 'Mình đã soạn công việc. Bạn xem lại trước khi áp dụng.',
  applied: 'Đã tạo VP-2610-052 và báo cho Lê Đức Thành lúc 10:14.',
  missing: 'Mình cần thêm 2 thông tin trước khi nhắc:',
  denied: 'Bạn chưa có quyền giao việc ngoài Phòng Kế hoạch. Mình có thể soạn yêu cầu gửi Trưởng dây chuyền A1.',
  offline: 'Đã lưu trên máy. Khi mất mạng mình vẫn soạn được nội dung, nhưng chưa phân tích được dữ liệu mới.',
};

/** L01–L09 — Flowse AI: Chat soạn nội dung, Work đề xuất thao tác; mọi thay đổi dữ liệu cần người dùng xác nhận. */
export const FlowseAIScreen: React.FC<ScreenProps<typeof Routes.FLOWSE_AI>> = ({ route, navigation }) => {
  const s = useStyles();
  const [mode, setMode] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [launching, setLaunching] = useState(true);
  const launched = useCallback(() => setLaunching(false), []);
  const nextId = useRef(1);
  const push = (...m: Omit<Msg, 'id'>[]) => setMsgs((x) => [...x, ...m.map((v) => ({ ...v, id: nextId.current++ }))]);
  const finish = (id: number) => setMsgs((x) => x.map((m) => (m.id === id ? { ...m, streaming: false } : m)));
  const listRef = useRef<FlatList<Msg>>(null);
  const toEnd = useCallback(() => listRef.current?.scrollToEnd({ animated: true }), []);
  const replaceCard = (id: number, card?: Card) => setMsgs((x) => (card ? x.map((m) => (m.id === id ? { ...m, card, text: cardText[card] } : m)) : x.filter((m) => m.id !== id)));

  useEffect(() => {
    if (route.params?.applied) push({ mine: false, text: cardText.applied, card: 'applied', streaming: true });
    // chỉ chạy khi quay về từ L05 với cờ applied
  }, [route.params?.applied]);

  const run = (q: string, work: boolean) => {
    if (!work) return push({ mine: true, text: q }, { mine: false, text: cardText.draft, card: 'draft', streaming: true });
    const card = workCard(q);
    push({ mine: true, text: q }, { mine: false, text: cardText[card], card, streaming: true });
  };
  const ask = (q: string) => run(q, mode === 1);

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title="Flowse AI"
        caption="Minh Anh · Phòng Kế hoạch"
        onBack={navigation.goBack}
        right={<IconButton icon={History} label="Lịch sử thao tác" onPress={() => navigation.navigate(Routes.AI_HISTORY)} />}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          onContentSizeChange={toEnd}
          data={msgs}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={s.page}
          ListHeaderComponent={
            <View style={{ gap: space.xl }}>
              <View style={s.hero}>
                <View style={{ flex: 1, gap: 6 }}>
                  <AppText variant="title" style={{ fontSize: 22, lineHeight: 28 }}>{'Hỏi nhanh.\nLàm ngay.'}</AppText>
                  <AppText variant="caption" tone="muted">AI đề xuất, bạn xác nhận.</AppText>
                </View>
                <AILogo size={56} />
              </View>
              <Segmented items={['Chat', 'Work']} value={mode} onChange={setMode} />
              {msgs.length === 0 ? (
                <>
                  <AppText variant="section">Gợi ý cho bạn</AppText>
                  <Group>
                    {aiSuggestions.map((g, i) => (
                      <Row
                        key={g.title}
                        icon={ICONS[i]}
                        title={g.title}
                        subtitle={g.sub}
                        onPress={() => {
                          const work = g.sub.startsWith('Work');
                          setMode(work ? 1 : 0);
                          run(g.q, work);
                        }}
                      />
                    ))}
                  </Group>
                  <View style={s.note}>
                    <AppText variant="caption" tone="accent">Flowse AI chỉ đề xuất. Mọi thay đổi dữ liệu cần bạn xác nhận.</AppText>
                  </View>
                </>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ gap: space.sm }}>
              {item.streaming ? <StreamBubble text={item.text} onDone={() => finish(item.id)} onGrow={toEnd} /> : <Bubble text={item.text} mine={item.mine} />}
              {item.card && !item.streaming ? <AICard card={item.card} onChange={(c) => replaceCard(item.id, c)} onAsk={(q) => run(q, false)} navigation={navigation} /> : null}
            </View>
          )}
        />
        <Composer placeholder={msgs.length ? 'Hỏi tiếp' : mode === 0 ? 'Hỏi hoặc giao việc' : 'Giao việc như nhắn tin'} onSend={ask} attach={false} />
      </KeyboardAvoidingView>
      {launching ? <AILaunch onDone={launched} /> : null}
    </Screen>
  );
};

/** Thẻ kết quả: L02 bản nháp (Chat); Work: L03 tóm tắt, L04 đề xuất, L06 đã áp dụng, L07 thiếu thông tin, L08 mất mạng, L09 thiếu quyền. */
const AICard: React.FC<{ card: Card; onChange: (c?: Card) => void; onAsk: (q: string) => void; navigation: ScreenProps<typeof Routes.FLOWSE_AI>['navigation'] }> = ({ card, onChange, onAsk, navigation }) => {
  const s = useStyles();
  const c = useColors();
  const [undo, setUndo] = useState(5);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (card !== 'applied' || undo <= 0) return;
    const t = setTimeout(() => setUndo((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [card, undo]);

  switch (card) {
    case 'draft':
      return (
        <View style={s.card}>
          <AppText>{DRAFT}</AppText>
          <View style={s.chipRow}>
            <Button title={copied ? 'Đã chép' : 'Sao chép'} size="sm" variant="secondary" onPress={() => Clipboard.setStringAsync(DRAFT).then(() => setCopied(true))} />
            <Button title="Ngắn hơn" size="sm" variant="secondary" onPress={() => onAsk('Viết ngắn hơn.')} />
            <Button title="Trang trọng hơn" size="sm" variant="secondary" onPress={() => onAsk('Viết trang trọng hơn.')} />
          </View>
        </View>
      );
    case 'summary':
      return (
        <View style={s.card}>
          <StatRow>
            <Stat value={18} label="Đang mở" />
            <Stat value={3} label="Quá hạn" tone="danger" />
            <Stat value={4} label="Xong" tone="success" />
          </StatRow>
          <Row title="Bổ sung biên bản nghiệm thu" subtitle="Phạm Quốc Huy · quá 2 giờ" subtitleTone="danger" chevron={false} />
          <View style={s.actions}>
            <Button title="Nhắc Huy" size="sm" style={s.flex} />
            <Button title="Giao lại" size="sm" variant="secondary" style={s.flex} onPress={() => navigation.navigate(Routes.REASSIGN, { title: 'Bổ sung biên bản nghiệm thu', from: 'Phạm Quốc Huy' })} />
          </View>
          <Button title="Xem cả 3" size="sm" variant="secondary" onPress={() => navigation.navigate(Routes.MEMBER_WORK, { name: 'Phạm Quốc Huy' })} />
        </View>
      );
    case 'proposal':
      return (
        <View style={s.card}>
          <Tag label="Tạo & giao việc" tone="accent" />
          <AppText variant="heading">Kiểm tra lô vải 24</AppText>
          <View>
            <KV label="Vị trí" value="QC đầu vào" />
            <KV label="Người làm" value="Lê Đức Thành" />
            <KV label="Hạn" value="31/10 · 15:00" />
            <KV label="Ưu tiên" value="Cao" tone="danger" />
            <KV label="Nhắc việc" value="14:00 · trước 1 giờ" />
          </View>
          <View style={s.actions}>
            <Button title="Chỉnh sửa" size="sm" variant="secondary" style={s.flex} onPress={() => navigation.navigate(Routes.AI_REVIEW)} />
            <Button title="Xác nhận" size="sm" style={s.flex} onPress={() => onChange('applied')} />
          </View>
          <Button title="Hủy đề xuất" size="sm" variant="secondary" onPress={() => onChange()} />
        </View>
      );
    case 'applied':
      return (
        <View style={s.card}>
          <Row title="Kiểm tra lô vải 24" subtitle="QC đầu vào · 31/10 15:00 · Lê Đức Thành" onPress={() => navigation.navigate(Routes.WORK_ITEM_DETAIL, { workItemId: 105, title: 'Kiểm tra lô vải 24' })} />
          {undo > 0 ? <Button title={`Hoàn tác · còn ${undo} giây`} size="sm" variant="secondary" onPress={() => onChange('proposal')} /> : null}
        </View>
      );
    case 'missing':
      return (
        <View style={s.card}>
          <KV label="Nhắc ai?" value="Cả phòng Kế hoạch (6 người)" />
          <KV label="Hạn nộp" value="Chưa có" tone="warning" />
          <AppText variant="caption" tone="muted">Trả lời ngay trong ô bên dưới.</AppText>
        </View>
      );
    case 'denied':
      return (
        <View style={s.card}>
          <Row icon={Lock} title="Gửi yêu cầu phê duyệt" subtitle="Đến Trưởng dây chuyền A1 · Trần Quốc Dũng" onPress={() => navigation.navigate(Routes.SUCCESS, { title: 'Đã gửi yêu cầu phê duyệt', body: 'Trưởng dây chuyền A1 nhận yêu cầu giao việc cho Hồ Thị Lan.', kind: 'Phối hợp', code: 'PH-2610-007' })} />
          <Row icon={CircleHelp} title="Chọn người khác" subtitle="Chỉ hiện người trong Phòng Kế hoạch" onPress={() => navigation.navigate(Routes.ASSIGN_SHEET)} />
        </View>
      );
    case 'offline':
      return (
        <View style={s.card}>
          <Banner tone="warning" text="Mất kết nối. Thao tác đã xác nhận sẽ tự gửi khi có mạng." />
          <View style={s.offlineHead}>
            <CloudOff size={16} color={c.warning} />
            <AppText variant="label" tone="warning">Cập nhật trạng thái · Chờ gửi</AppText>
          </View>
          <AppText variant="bodyMedium">Kiểm tra cảm biến băng tải</AppText>
          <View>
            <KV label="Trạng thái" value="Đang làm → Chờ review" />
            <KV label="Người review" value="Trần Quốc Dũng" />
            <KV label="Lưu lúc" value="23:42 · trên thiết bị" />
          </View>
          <Button title="1 thao tác đang chờ · Chạm để hủy" size="sm" variant="secondary" onPress={() => onChange()} />
        </View>
      );
  }
};

/** L05 — Xem lại & chỉnh sửa đề xuất trước khi áp dụng. */
export const AiReviewScreen: React.FC<ScreenProps<typeof Routes.AI_REVIEW>> = ({ navigation }) => {
  const [title, setTitle] = useState('Kiểm tra lô vải 24');
  const [desc, setDesc] = useState('Đối chiếu số lượng, màu và ghi lỗi vào phiếu QC.');
  return (
    <ScrollPage
      title="Xem lại công việc"
      caption="Đề xuất từ Flowse AI"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Xác nhận áp dụng" disabled={!title.trim()} onPress={() => navigation.popTo(Routes.FLOWSE_AI, { applied: true })} />
        </BottomBar>
      }
    >
      <Banner text="Flowse AI đã điền sẵn. Sửa bất kỳ trường nào trước khi áp dụng." />
      <Field label="Tên công việc" value={title} onChangeText={setTitle} />
      <Field label="Mô tả" value={desc} onChangeText={setDesc} multiline />
      <Group>
        <KV label="Danh sách" value="QC đầu vào" />
        <KV label="Người làm" value="Lê Đức Thành" />
        <KV label="Hạn" value="31/10 · 15:00" />
        <KV label="Ưu tiên" value="Cao" tone="danger" />
        <KV label="Nhắc việc" value="14:00 · trước 1 giờ" />
      </Group>
      <AppText variant="caption" tone="muted">Sau khi áp dụng, Lê Đức Thành nhận thông báo ngay.</AppText>
    </ScrollPage>
  );
};

const HISTORY: [string, string, string, 'warning' | 'success' | 'muted' | 'progress'][] = [
  ['Kiểm tra cảm biến băng tải', '29/10 23:42 · Cập nhật trạng thái', 'Chờ gửi', 'warning'],
  ['Kiểm tra lô vải 24', '29/10 23:40 · Tạo & giao việc', 'Đã áp dụng', 'success'],
  ['Báo cáo sản lượng ca chiều', '28/10 16:05 · Nhắc việc', 'Đã hủy', 'muted'],
  ['Thay dây curoa máy M-07', '28/10 09:12 · Giao việc', 'Chờ phê duyệt', 'progress'],
];

/** L10 — Lịch sử thao tác của Flowse AI (chỉ thao tác thay đổi dữ liệu). */
export const AiHistoryScreen: React.FC<ScreenProps<typeof Routes.AI_HISTORY>> = ({ navigation }) => {
  const [f, setF] = useState('Tất cả');
  const list = HISTORY.filter((h) => f === 'Tất cả' || h[2] === f);
  return (
    <ScrollPage
      title="Lịch sử thao tác"
      caption="Flowse AI · 7 ngày gần đây"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title="Về Flowse AI" variant="secondary" onPress={navigation.goBack} />
        </BottomBar>
      }
    >
      <Chips items={['Tất cả', 'Đã áp dụng', 'Đã hủy']} value={f} onChange={setF} />
      <Group>
        {list.map(([t, sub, tag, tone]) => (
          <Row key={t} title={t} subtitle={sub} trailing={<Tag label={tag} tone={tone} />} chevron={false} />
        ))}
      </Group>
      <AppText variant="caption" tone="muted">Chỉ lưu thao tác thay đổi dữ liệu. Nội dung Chat không nằm trong lịch sử này.</AppText>
    </ScrollPage>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    page: { gap: space.md, paddingHorizontal: space.xl, paddingBottom: space.xl },
    // Viền gradient chạy quanh khung (L01): bản tĩnh dùng viền accent + quầng sáng nhẹ
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      padding: 18,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.accent,
      boxShadow: '-8px 0 22px rgba(45,212,191,0.22), 8px 0 22px rgba(236,72,153,0.18), 0 8px 22px rgba(59,130,246,0.2)',
    },
    note: { padding: space.md, borderRadius: radius.md, backgroundColor: c.accentSoft },
    card: { gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 1, borderColor: c.line },
    actions: { flexDirection: 'row', gap: space.sm },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    offlineHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  })
);
