import React, { useState } from 'react';
import { Building2, Circle, CircleCheck } from 'lucide-react-native';
import { useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { useAuthStore } from '../../state/authStore';
import { AppText, BottomBar, Button, Group, Row, ScrollPage } from '../../components/ui';
import { ScreenProps } from '../../navigation/types';

/** A09 — Chọn nơi làm việc (dữ liệu thật từ /workspaces). */
export const ContextSelectScreen: React.FC<ScreenProps<typeof Routes.CONTEXT_SELECT>> = ({ navigation }) => {
  const c = useColors();
  const { user, workspaces, currentWorkspace, switchWorkspace } = useAuthStore();
  const [picked, setPicked] = useState(currentWorkspace?.id);
  const target = workspaces.find((w) => w.id === picked);
  return (
    <ScrollPage
      title={`Chào ${(user?.name || '').split(/\s+/).pop() || 'bạn'}`}
      onBack={navigation.goBack}
      footer={
        <BottomBar>
          <Button
            title="Vào Flowse"
            disabled={!target}
            onPress={async () => {
              if (target) await switchWorkspace(target);
              navigation.goBack();
            }}
          />
        </BottomBar>
      }
    >
      <AppText tone="muted">{`Bạn có ${workspaces.length} nơi làm việc. Chọn cho phiên này, đổi lại bất cứ lúc nào trong mục Tôi.`}</AppText>
      <Group>
        {workspaces.map((w) => (
          <Row
            key={w.id}
            icon={Building2}
            title={w.name}
            subtitle={`Vai trò: ${w.role}`}
            chevron={false}
            trailing={w.id === picked ? <CircleCheck size={22} color={c.accent} /> : <Circle size={22} color={c.muted} />}
            onPress={() => setPicked(w.id)}
          />
        ))}
      </Group>
    </ScrollPage>
  );
};
