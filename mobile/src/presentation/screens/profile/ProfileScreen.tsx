import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Building2, Bell, RefreshCw, Sparkles, ArrowLeftRight, Package, ClipboardCheck, Stamp, LogOut,
} from 'lucide-react-native';
import { space, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { useAuthStore } from '../../state/authStore';
import { AppText, Avatar, Button, Group, Row, ScrollPage } from '../../components/ui';

/** J02 — Tôi: tài khoản, nơi làm việc, công cụ và cài đặt. */
export const ProfileScreen: React.FC = () => {
  const c = useColors();
  const nav = useNavigation<any>();
  const { user, currentWorkspace, workspaces, capabilities, logout, isLoading } = useAuthStore();
  const go = (r: string) => () => nav.navigate(r);

  return (
    <ScrollPage title="Tôi">
      <View style={styles.me}>
        <Avatar name={user?.name || 'Người dùng'} size={56} />
        <View style={{ flex: 1 }}>
          <AppText variant="heading">{user?.name || 'Người dùng'}</AppText>
          <AppText variant="caption" tone="muted">{user?.email}</AppText>
        </View>
      </View>
      <Group>
        <Row
          icon={Building2}
          title={currentWorkspace?.name || 'Chưa chọn nơi làm việc'}
          subtitle={`${workspaces.length} nơi làm việc · đổi`}
          onPress={go(Routes.CONTEXT_SELECT)}
        />
        <Row icon={Bell} title="Thông báo" subtitle="Giờ yên lặng 22:00–06:00" onPress={go(Routes.NOTIFICATION_SETTINGS)} />
        <Row icon={RefreshCw} title="Đồng bộ" subtitle="3 mục trên máy" onPress={go(Routes.SYNC_QUEUE)} />
        <Row icon={Sparkles} title="Flowse AI" subtitle="Hỏi, soạn và làm việc cùng bạn" onPress={go(Routes.FLOWSE_AI)} />
      </Group>
      <Group>
        {capabilities.canApprove ? <Row icon={Stamp} title="Cần tôi duyệt" subtitle="3 phiếu đang chờ" onPress={go(Routes.APPROVALS)} /> : null}
        <Row icon={ClipboardCheck} title="Kiểm tra chất lượng" subtitle="2 kiểm tra hôm nay" onPress={go(Routes.INSPECTIONS)} />
        <Row icon={ArrowLeftRight} title="Bàn giao ca" subtitle="Ca sáng sang ca chiều" onPress={go(Routes.HANDOVER)} />
        <Row icon={Package} title="Vật tư" subtitle="Đề nghị và theo dõi" onPress={go(Routes.MATERIALS)} />
      </Group>
      <Button title="Đăng xuất" variant="secondary" icon={<LogOut size={18} color={c.danger} />} loading={isLoading} onPress={logout} />
    </ScrollPage>
  );
};

const styles = StyleSheet.create({
  me: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
