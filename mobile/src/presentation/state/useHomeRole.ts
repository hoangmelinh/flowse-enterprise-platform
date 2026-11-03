import { useAuthStore } from './authStore';
import { HomeRole, usePrefs } from './prefsStore';

// File riêng để prefsStore không import authStore (authStore → apiClient → prefsStore sẽ thành vòng)
/** Vai trò đang dùng cho trang chủ + thanh tab: chọn thử ở Tôi, mặc định theo quyền của nơi làm việc. */
export const useHomeRole = (): HomeRole => {
  const picked = usePrefs((s) => s.homeRole);
  const field = useAuthStore((s) => s.capabilities.canExecuteRepair && !s.capabilities.canAssignWork);
  return picked ?? (field ? 'KT' : 'VP');
};

/**
 * Phạm vi của vai trò cho các tab dùng chung (Sự cố, Duyệt, Nhóm, Đơn vị): tên đơn vị, chức danh,
 * và tab Sự cố chỉ hiện việc của tôi (Kỹ thuật) hay cả đơn vị.
 * shortcut: lấy theo Figma B01–B12; thay bằng phạm vi đơn vị từ /users/contexts khi làm Việc 8 backend.
 */
export const ROLE_SCOPE: Record<HomeRole, { unit: string; title: string; mine?: boolean; workshop?: boolean }> = {
  VP: { unit: 'Phòng Kế hoạch', title: 'Chuyên viên' },
  TP: { unit: 'Phòng Kế hoạch', title: 'Trưởng phòng' },
  CN: { unit: 'Tổ đóng gói 02', title: 'Công nhân' },
  CN_OFF: { unit: 'Tổ đóng gói 02', title: 'Công nhân' },
  TC: { unit: 'Dây chuyền A2', title: 'Trưởng ca' },
  KT: { unit: 'Tổ bảo trì', title: 'Kỹ thuật', mine: true },
  QC: { unit: 'QA/QC', title: 'Kiểm tra viên' },
  QLDC: { unit: 'Dây chuyền A2', title: 'Trưởng dây chuyền' },
  QLPX: { unit: 'Xưởng đóng gói', title: 'Quản đốc', workshop: true },
  QLN: { unit: 'Nhà máy Bình Dương', title: 'Quản lý nhà máy' },
  KHO: { unit: 'Kho vật tư Bình Dương', title: 'Thủ kho' },
  MH: { unit: 'Phòng mua hàng', title: 'Mua hàng' },
  QT: { unit: 'Công ty An Phát', title: 'Quản trị' },
};

export const useRoleScope = () => ROLE_SCOPE[useHomeRole()];
