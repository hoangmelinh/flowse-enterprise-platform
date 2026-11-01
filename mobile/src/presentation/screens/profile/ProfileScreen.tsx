import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Building2, Bell, RefreshCw, Sparkles, ArrowLeftRight, Package, ClipboardCheck, Stamp, LogOut, BarChart3,
  Users, Network, Wrench, Siren, ShieldAlert, Palette, LayoutDashboard, KeyRound, History,
} from 'lucide-react-native';
import { space, useColors } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { approvals, inspections, syncQueue } from '../../../data/demo/fixtures';
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
        <Row icon={RefreshCw} title="Đồng bộ" subtitle={`${syncQueue.length} mục trên máy`} onPress={go(Routes.SYNC_QUEUE)} />
        <Row icon={Sparkles} title="Flowse AI" subtitle="Hỏi, soạn và làm việc cùng bạn" onPress={go(Routes.FLOWSE_AI)} />
      </Group>
      <Group>
        {capabilities.canApprove ? <Row icon={Stamp} title="Cần tôi duyệt" subtitle={`${approvals.length} phiếu đang chờ`} onPress={go(Routes.APPROVALS)} /> : null}
        <Row icon={ClipboardCheck} title="Kiểm tra chất lượng" subtitle={`${inspections.length} kiểm tra hôm nay`} onPress={go(Routes.INSPECTIONS)} />
        <Row icon={ArrowLeftRight} title="Bàn giao ca" subtitle="Ca sáng sang ca chiều" onPress={go(Routes.HANDOVER)} />
        <Row icon={ArrowLeftRight} title="Nhận bàn giao ca" subtitle="Từ ca sáng · chờ bạn xác nhận" onPress={go(Routes.HANDOVER_RECEIVE)} />
        <Row icon={Package} title="Vật tư" subtitle="Đề nghị và theo dõi" onPress={go(Routes.MATERIALS)} />
        <Row icon={Package} title="Kho cấp phát" subtitle="VT-2610-009 chờ cấp" onPress={go(Routes.MATERIAL_ISSUE)} />
        <Row icon={BarChart3} title="Sản lượng" subtitle="Dây chuyền A2 · theo ca" onPress={go(Routes.PRODUCTION)} />
        <Row icon={Wrench} title="Bảo trì định kỳ" subtitle="13/21 hạng mục tháng này" onPress={go(Routes.PM_LIST)} />
        <Row icon={History} title="Nhật ký bàn giao" subtitle="1 phiếu chờ xác nhận" onPress={go(Routes.HANDOVER_LOG)} />
      </Group>
      {capabilities.canAssignWork ? (
        <Group>
          <Row icon={Users} title="Nhóm" subtitle="Phòng Kế hoạch · 6 người" onPress={go(Routes.TEAM)} />
          <Row icon={Network} title="Đơn vị" subtitle="Nhà máy Bình Dương" onPress={go(Routes.UNITS)} />
        </Group>
      ) : null}
      <Group>
        <Row icon={Siren} iconTone="danger" title="Khẩn cấp an toàn" subtitle="Gọi trực an toàn" onPress={go(Routes.EMERGENCY)} />
        <Row icon={ShieldAlert} iconTone="warning" title="Báo nguy cơ an toàn" subtitle="Không khẩn cấp" onPress={go(Routes.HAZARD_REPORT)} />
      </Group>
      <Group>
        <Row icon={Palette} title="Giao diện & chuyển động" subtitle="Sáng, tối, hiệu ứng 3D" onPress={go(Routes.APPEARANCE)} />
        <Row icon={KeyRound} title="Quyền truy cập" subtitle="Camera, thông báo, vị trí" onPress={go(Routes.PERMISSIONS)} />
        <Row icon={LayoutDashboard} title="Trang chủ theo vai trò" subtitle="Xem thử B01–B12 và trạng thái" onPress={go(Routes.ROLE_PICKER)} />
      </Group>
      <Button title="Đăng xuất" variant="secondary" icon={<LogOut size={18} color={c.danger} />} loading={isLoading} onPress={logout} />
    </ScrollPage>
  );
};

const styles = StyleSheet.create({
  me: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
