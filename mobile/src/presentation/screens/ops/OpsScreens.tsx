import React, { useState } from 'react';
import { Package, CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react-native';
import { Routes } from '../../../core/constants/routes';
import { handover, materials, syncQueue } from '../../../data/demo/fixtures';
import { AppText, Banner, BottomBar, Button, Field, Group, Row, ScrollPage, SectionHeader, Tag } from '../../components/ui';
import { ScreenProps } from '../../navigation/types';

/** H02 — Theo dõi vật tư. */
export const MaterialsScreen: React.FC<ScreenProps<typeof Routes.MATERIALS>> = ({ navigation }) => (
  <ScrollPage
    title="Vật tư"
    caption="Đề nghị của tôi"
    onBack={navigation.goBack}
    footer={
      <BottomBar>
        <Button title="Đề nghị vật tư" onPress={() => navigation.navigate(Routes.REQUEST_FORM, { typeKey: 'material' })} />
      </BottomBar>
    }
  >
    <Group>
      {materials.map((m) => (
        <Row key={m.id} icon={Package} title={m.title} subtitle={`${m.code} · ${m.sub}`} subtitleTone={m.tone} />
      ))}
    </Group>
    <AppText variant="caption" tone="muted">Kho cấp trước phần đang có; phần thiếu tự chuyển Mua hàng.</AppText>
  </ScrollPage>
);

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
            onPress={() => navigation.replace(Routes.SUCCESS, { title: 'Đã gửi cho ca chiều', body: 'Ca sáng chỉ được chốt khi ca chiều xác nhận.', kind: 'Bàn giao ca', code: 'BG-2610-030' })}
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

/** I03 / I04 — Hàng đợi đồng bộ khi mất mạng. */
export const SyncQueueScreen: React.FC<ScreenProps<typeof Routes.SYNC_QUEUE>> = ({ navigation }) => (
  <ScrollPage
    title="Đồng bộ"
    caption="Bản nháp trên máy"
    onBack={navigation.goBack}
    footer={
      <BottomBar>
        <Button title="Thử lại 2 mục" />
        <Button title="Xem xung đột" variant="secondary" />
      </BottomBar>
    }
  >
    <Banner text="Ảnh và ghi chú vẫn giữ trên máy, không bị xoá." />
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
