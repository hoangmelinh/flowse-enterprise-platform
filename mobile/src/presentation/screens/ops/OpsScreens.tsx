import React, { useEffect, useState } from 'react';
import { Package, CircleAlert, CircleCheck, CircleCheckBig, CircleDashed, Clock, TriangleAlert } from 'lucide-react-native';
import { Routes } from '../../../core/constants/routes';
import { handover, materials, syncQueue } from '../../../data/demo/fixtures';
import { AppText, Banner, BottomBar, Button, Field, Group, Row, ScrollPage, SectionHeader, Tag } from '../../components/ui';
import { ScreenProps } from '../../navigation/types';
import { FigmaAnim } from '../../components/anim/FigmaAnim';

/** Vật tư của tôi: danh sách phiếu đề nghị (mở H02 / H05). */
export const MaterialsScreen: React.FC<ScreenProps<typeof Routes.MATERIALS>> = ({ navigation }) => (
  <ScrollPage
    title="Vật tư"
    caption="Đề nghị của tôi"
    onBack={navigation.goBack}
    footer={
      <BottomBar>
        <Button title="Đề nghị vật tư" onPress={() => navigation.navigate(Routes.MATERIAL_REQUEST)} />
      </BottomBar>
    }
  >
    <Group>
      {materials.map((m) => (
        <Row key={m.id} icon={Package} title={m.title} subtitle={`${m.code} · ${m.sub}`} subtitleTone={m.tone} onPress={() => (m.id === 12 ? navigation.navigate(Routes.MATERIAL_MINE) : navigation.navigate(Routes.MATERIAL_DETAIL, { materialId: m.id }))} />
      ))}
    </Group>
    <AppText variant="caption" tone="muted">Kho cấp trước phần đang có; phần thiếu tự chuyển Mua hàng.</AppText>
  </ScrollPage>
);

const MINE_STEPS: [string, string, 'done' | 'now' | 'next'][] = [
  ['Đã duyệt', 'Trần Quốc Dũng · 09:12', 'done'],
  ['Kho cấp 2/4', 'Lê Văn Phúc · 10:05', 'done'],
  ['Chờ mua 2 cái', 'MH-2610-009 · dự kiến 29/10', 'now'],
  ['Nhận đủ', 'Bạn xác nhận', 'next'],
];

/** H02 — Phiếu vật tư của tôi: tiến trình duyệt → kho cấp → mua → nhận đủ; người đề nghị xác nhận phần đã nhận. */
export const MyMaterialScreen: React.FC<ScreenProps<typeof Routes.MATERIAL_MINE>> = ({ navigation }) => {
  return (
    <ScrollPage
      title="Vật tư"
      caption="VT-2610-012 · của tôi"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button
            title="Xác nhận đã nhận 2"
            onPress={() => navigation.replace(Routes.SUCCESS, { title: 'Đã xác nhận nhận 2 cái', body: 'Phiếu mở tới khi Mua hàng giao đủ 2 cái còn lại.', kind: 'Vật tư', code: 'VT-2610-012', anim: 'issue' })}
          />
          <Button title="Trao đổi với kho" variant="secondary" onPress={() => navigation.navigate(Routes.COMMENTS, { code: 'VT-2610-012' })} />
        </BottomBar>
      }
    >
      <AppText variant="heading" style={{ fontSize: 22, lineHeight: 28 }}>Cảm biến quang E3Z-D61 × 4</AppText>
      <Group>
        {MINE_STEPS.map(([t, sub, st]) => (
          <Row
            key={t}
            icon={st === 'done' ? CircleCheckBig : st === 'now' ? Clock : CircleDashed}
            iconTone={st === 'done' ? 'success' : st === 'now' ? 'accent' : 'muted'}
            title={t}
            titleTone={st === 'next' ? 'muted' : 'ink'}
            subtitle={sub}
            chevron={false}
          />
        ))}
      </Group>
      <AppText variant="caption" tone="muted" style={{ fontSize: 12 }}>Phiếu chỉ đóng khi bạn xác nhận đã nhận đủ.</AppText>
    </ScrollPage>
  );
};

/** I01 — Bàn giao ca. */
export const HandoverScreen: React.FC<ScreenProps<typeof Routes.HANDOVER>> = ({ navigation }) => {
  const [note, setNote] = useState('BT-07 chạy tối đa 70% tải đến khi thay vòng bi.');
  return (
    <ScrollPage
      title="Bàn giao ca"
      caption={`${handover.team} · ${handover.from} sang ${handover.to}`}
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button
            title={`Gửi cho ${handover.to.toLowerCase()}`}
            onPress={() => navigation.replace(Routes.SUCCESS, { title: 'Đã gửi cho ca chiều', body: 'Ca sáng chỉ được chốt khi ca chiều xác nhận.', kind: 'Bàn giao ca', code: 'BG-2610-030', anim: 'handover', rows: [['Việc chuyển sang', '2 việc'], ['Sự cố mở', 'BT-07 · chờ vòng bi'], ['Ca nhận', 'Ca chiều · 14:00–22:00']] })}
          />
        </BottomBar>
      }
    >
      <SectionHeader title="Việc chưa xong" count={handover.pending.length} />
      <Group>
        {handover.pending.map((t) => (
          <Row key={t.title} icon={CircleAlert} iconTone="warning" title={t.title} subtitle={t.sub} />
        ))}
      </Group>
      <Field label="Ghi chú cho ca sau" value={note} onChangeText={setNote} multiline />
    </ScrollPage>
  );
};

/** I04 — Hàng đợi đồng bộ: gói dữ liệu bay lên máy chủ trong lúc thử lại. */
export const SyncQueueScreen: React.FC<ScreenProps<typeof Routes.SYNC_QUEUE>> = ({ navigation }) => {
  const [state, setState] = useState<'idle' | 'syncing' | 'done'>('idle');
  useEffect(() => {
    if (state !== 'syncing') return;
    // shortcut: mô phỏng gửi lại; nối hàng đợi offline thật (SQLite + retry) khi có
    const t = setTimeout(() => setState('done'), 2400);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <ScrollPage
      title="Đồng bộ"
      caption="Bản nháp trên máy"
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button title={state === 'syncing' ? 'Đang đồng bộ…' : 'Thử lại 2 mục'} loading={state === 'syncing'} disabled={state === 'done'} onPress={() => setState('syncing')} />
          <Button title="Xem xung đột" variant="secondary" onPress={() => navigation.navigate(Routes.VERSION_COMPARE)} />
        </BottomBar>
      }
    >
      {state === 'syncing' ? <FigmaAnim kind="sync" loop /> : null}
      <Banner tone={state === 'done' ? 'accent' : 'warning'} text={state === 'done' ? 'Đã gửi lại 1 mục. Ảnh lỗi và bản xung đột vẫn chờ bạn xử lý.' : 'Ảnh và ghi chú vẫn giữ trên máy, không bị xoá.'} />
      <Group>
        {syncQueue.map((q) => (
          <Row
            key={q.title}
            icon={q.tone === 'success' ? CircleCheck : q.tone === 'warning' ? TriangleAlert : CircleAlert}
            iconTone={q.tone}
            title={q.title}
            subtitle={q.sub}
            subtitleTone={q.tone}
            trailing={<Tag label={q.state} tone={q.tone} />}
            chevron={false}
          />
        ))}
      </Group>
    </ScrollPage>
  );
};
