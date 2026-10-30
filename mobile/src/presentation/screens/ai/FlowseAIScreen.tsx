import React, { useState } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { FileText, LayoutGrid, TriangleAlert, Plus } from 'lucide-react-native';
import { radius, space, Colors, makeStyles } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { aiSuggestions } from '../../../data/demo/fixtures';
import { AppText, Bubble, Composer, Group, Row, Screen, ScreenHeader, Segmented } from '../../components/ui';
import { ScreenProps } from '../../navigation/types';

const ICONS = [FileText, LayoutGrid, TriangleAlert, Plus];

/** Logo Flowse AI: ô tối 3 thanh gradient (giống bản v1.3 đã đưa sang 2.0). */
const AIMark: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <Svg width={size} height={size} viewBox="0 0 120 120">
    <Rect width={120} height={120} rx={32} fill="#0B2326" />
    <Rect x={22} y={30} width={78} height={14} rx={7} fill="#2DD4BF" />
    <Rect x={22} y={54} width={56} height={14} rx={7} fill="#8B5CF6" />
    <Rect x={22} y={78} width={36} height={14} rx={7} fill="#F59E0B" />
  </Svg>
);

/** L01 / L02 / L03 — Flowse AI: gợi ý, chat và đề xuất (AI đề xuất, người dùng xác nhận). */
export const FlowseAIScreen: React.FC<ScreenProps<typeof Routes.FLOWSE_AI>> = ({ navigation }) => {
  const s = useStyles();
  const [mode, setMode] = useState(0);
  const [msgs, setMsgs] = useState<{ mine: boolean; text: string }[]>([]);

  // shortcut: trả lời mẫu; nối POST /ai/chat (backend đã có aiRoutes) khi bật AI trên mobile
  const ask = (q: string) =>
    setMsgs((m) => [
      ...m,
      { mine: true, text: q },
      { mine: false, text: mode === 0 ? 'Bản nháp cho bạn đã sẵn sàng. Bạn xem lại trước khi gửi nhé.' : 'Mình đã soạn đề xuất. Bạn xem lại và xác nhận trước khi áp dụng.' },
    ]);

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Flowse AI" caption="Minh Anh · Phòng Kế hoạch" onBack={navigation.goBack} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={msgs}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={s.page}
          ListHeaderComponent={
            <View style={{ gap: space.xl }}>
              <View style={s.hero}>
                <View style={{ flex: 1, gap: 6 }}>
                  <AppText variant="title" style={{ fontSize: 22, lineHeight: 28 }}>{'Hỏi nhanh.\nLàm ngay.'}</AppText>
                  <AppText variant="caption" tone="muted">AI đề xuất, bạn xác nhận.</AppText>
                </View>
                <AIMark size={56} />
              </View>
              <Segmented items={['Chat', 'Work']} value={mode} onChange={setMode} />
              {msgs.length === 0 ? (
                <>
                  <AppText variant="section">Gợi ý cho bạn</AppText>
                  <Group>
                    {aiSuggestions.map((g, i) => (
                      <Row key={g.title} icon={ICONS[i]} title={g.title} subtitle={g.sub} onPress={() => ask(g.title)} />
                    ))}
                  </Group>
                  <View style={s.note}>
                    <AppText variant="caption" tone="accent">Flowse AI chỉ đề xuất. Mọi thay đổi dữ liệu cần bạn xác nhận.</AppText>
                  </View>
                </>
              ) : null}
            </View>
          }
          renderItem={({ item }) => <Bubble text={item.text} mine={item.mine} />}
        />
        <Composer placeholder="Hỏi hoặc giao việc" onSend={ask} attach={false} />
      </KeyboardAvoidingView>
    </Screen>
  );
};

const useStyles = makeStyles((c: Colors) =>
  StyleSheet.create({
    page: { gap: space.md, paddingHorizontal: space.xl, paddingBottom: space.xl },
    // Viền gradient chạy quanh khung (L01): bản tĩnh dùng viền accent + quầng sáng tím nhẹ
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
  })
);
