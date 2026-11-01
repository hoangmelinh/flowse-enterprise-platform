import React from 'react';
import { ActivityIndicator, Linking, View, StyleSheet } from 'react-native';
import {
  SquareCheckBig, WifiOff, Lock, SearchX, RefreshCw, CameraOff, Building2, QrCode, ImageOff, UserX, LucideIcon,
} from 'lucide-react-native';
import { space } from '../../../core/theme';
import { Routes } from '../../../core/constants/routes';
import { AppText, BottomBar, Button, EmptyState, ScreenHeader, Screen } from '../../components/ui';
import { ScreenProps } from '../../navigation/types';

type Go = 'back' | 'home' | 'context' | 'create' | 'settings' | 'inbox' | 'scan' | 'approvals';
interface StateDef {
  caption: string;
  title: string;
  icon: LucideIcon;
  heading: string;
  body: string;
  actions: [string, Go][];
}

/** K01–K12 trong Figma (K07 "Rời màn hình?" dùng hộp thoại hệ thống khi rời form). */
const STATES = {
  K01: { caption: 'Phòng Kế hoạch', title: 'Công việc', icon: SquareCheckBig, heading: 'Đang tải công việc của bạn', body: '', actions: [] },
  K02: { caption: 'Phòng Kế hoạch', title: 'Công việc', icon: SquareCheckBig, heading: 'Chưa có việc nào', body: 'Việc được giao cho bạn sẽ hiện ở đây. Bạn cũng có thể tự tạo việc.', actions: [['Tạo công việc', 'create']] },
  K03: { caption: 'Phòng Kế hoạch', title: 'Công việc', icon: WifiOff, heading: 'Chưa tải được dữ liệu', body: 'Kiểm tra mạng rồi thử lại. Bản nháp bạn đang nhập vẫn được giữ.', actions: [['Thử lại', 'back']] },
  K04: { caption: 'Liên kết từ thông báo', title: 'Không có quyền', icon: Lock, heading: 'Phiếu ngoài phạm vi của bạn', body: 'Phiếu thuộc Nhà máy Đồng Nai. Đổi nơi làm việc nếu bạn có vai trò ở đó.', actions: [['Đổi nơi làm việc', 'context'], ['Về trang chủ', 'home']] },
  K05: { caption: 'QR hoặc liên kết', title: 'Không tìm thấy', icon: SearchX, heading: 'Nội dung đã bị xóa', body: 'CV-2610-040 đã bị người tạo xóa lúc 09:31.', actions: [['Về hộp thư', 'inbox']] },
  K06: { caption: 'VP-2610-031', title: 'Xung đột', icon: RefreshCw, heading: 'Việc vừa được cập nhật', body: 'Trần Quốc Dũng đổi hạn sang 31/10 trong lúc bạn sửa. Tải lại để xem bản mới; nội dung bạn nhập được giữ.', actions: [['Tải lại và giữ nháp', 'back']] },
  K08: { caption: 'Quét mã', title: 'Cần camera', icon: CameraOff, heading: 'Flowse chưa được dùng camera', body: 'Bật camera trong cài đặt điện thoại, hoặc nhập mã in dưới QR.', actions: [['Mở cài đặt', 'settings'], ['Nhập mã thủ công', 'back']] },
  K09: { caption: 'Quét mã · mã hợp lệ', title: 'Ngoài phạm vi', icon: Building2, heading: 'Thiết bị thuộc Nhà máy Đồng Nai', body: 'Bạn chưa có quyền ở nhà máy này nên Flowse không hiển thị hồ sơ thiết bị.', actions: [['Quét mã khác', 'back'], ['Đổi nơi làm việc', 'context']] },
  K10: { caption: 'Quét mã', title: 'Không nhận diện được', icon: QrCode, heading: 'Mã này không thuộc Flowse', body: 'Kiểm tra nhãn trên thiết bị rồi quét lại, hoặc nhập mã in bên dưới, ví dụ BT-07.', actions: [['Quét lại', 'back'], ['Nhập mã thủ công', 'back']] },
  K11: { caption: 'Báo sự cố BT-07', title: 'Tải ảnh lỗi', icon: ImageOff, heading: 'Ảnh 2 chưa tải lên', body: 'Ảnh 14,2 MB vượt giới hạn 10 MB. Chọn ảnh khác hoặc gửi không kèm ảnh này.', actions: [['Chọn lại ảnh', 'back'], ['Gửi không kèm ảnh', 'back']] },
  K12: { caption: 'YC-2610-051', title: 'Phê duyệt', icon: UserX, heading: 'Bạn là người đề nghị phiếu này', body: 'Phiếu tự động chuyển tới Phó phòng Phạm Quốc Huy để duyệt.', actions: [['Về danh sách', 'approvals']] },
  G11: { caption: 'YC-2610-044', title: 'Phê duyệt', icon: RefreshCw, heading: 'Phiếu đã được xử lý ở nơi khác', body: 'Đỗ Minh Khoa đã duyệt lúc 10:14 trên máy tính. Nút Duyệt đã ẩn.', actions: [['Tải lại phiếu', 'approvals']] },
} satisfies Record<string, StateDef>;

export type StateKey = keyof typeof STATES;
export const STATE_KEYS = Object.keys(STATES) as StateKey[];
export const stateHeading = (k: StateKey) => STATES[k].heading;

/** Trạng thái dùng chung: đang tải, trống, mất mạng, thiếu quyền, không tìm thấy, xung đột… */
export const StateScreen: React.FC<ScreenProps<typeof Routes.STATE>> = ({ route, navigation }) => {
  const d: StateDef = STATES[route.params.k];
  const go = (g: Go) => {
    if (g === 'settings') return void Linking.openSettings();
    if (g === 'home') return navigation.popToTop();
    if (g === 'context') return navigation.replace(Routes.CONTEXT_SELECT);
    if (g === 'create') return navigation.replace(Routes.CREATE_WORK_ITEM);
    if (g === 'inbox') return navigation.popTo(Routes.MAIN_TABS, { screen: Routes.INBOX });
    if (g === 'approvals') return navigation.popTo(Routes.APPROVALS);
    navigation.goBack();
  };
  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title={d.title} caption={d.caption} onBack={navigation.goBack} />
      <View style={styles.body}>
        {route.params.k === 'K01' ? (
          <View style={styles.loading} accessibilityRole="progressbar">
            <ActivityIndicator size="large" />
            <AppText tone="muted">{d.heading}</AppText>
          </View>
        ) : (
          <EmptyState icon={d.icon} title={d.heading} body={d.body} />
        )}
      </View>
      {d.actions.length ? (
        <BottomBar>
          {d.actions.map(([t, g], i) => (
            <Button key={t} title={t} variant={i === 0 ? 'primary' : 'secondary'} onPress={() => go(g)} />
          ))}
        </BottomBar>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: space.xl },
  loading: { alignItems: 'center', gap: space.md },
});
