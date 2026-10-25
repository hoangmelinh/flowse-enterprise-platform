/**
 * Flowse 2.0 Mobile Enterprise Theme Colors
 * Thiết kế chuẩn UI công nghiệp cao cấp: Tối ưu tương phản, rõ ràng khi làm việc ngoài hiện trường.
 */

export const colors = {
  // Brand colors
  primary: '#2563EB',       // Blue 600 - Màu nhận diện chính
  primaryDark: '#1D4ED8',   // Blue 700
  primaryLight: '#60A5FA',  // Blue 400
  accent: '#06B6D4',        // Cyan 500

  // SLA Status Colors (Đồng hồ đếm ngược SLA)
  sla: {
    inSla: '#10B981',       // Xanh lục - An toàn
    inSlaBg: '#ECFDF5',
    atRisk: '#F59E0B',      // Vàng hổ phách - Cảnh báo nguy cơ (>80%)
    atRiskBg: '#FFFBEB',
    breached: '#EF4444',    // Đỏ - Đã vi phạm SLA
    breachedBg: '#FEF2F2',
  },

  // Work Item Types (Màu phân biệt loại đầu việc)
  workItemType: {
    TASK: '#3B82F6',        // Xanh dương
    INCIDENT: '#EF4444',    // Đỏ còi báo động
    INSPECTION: '#8B5CF6',  // Tím kiểm định
    REQUEST: '#F59E0B',     // Cam yêu cầu phê duyệt
  },

  // Priority Colors
  priority: {
    urgent: '#DC2626',      // Khẩn cấp
    high: '#EA580C',        // Cao
    normal: '#3B82F6',      // Bình thường
    low: '#6B7280',         // Thấp
  },

  // Neutral / Industrial Dark & Light Palette
  neutral: {
    white: '#FFFFFF',
    background: '#0B0F19',  // Dark slate nền chính hiện đại
    card: '#161F30',        // Thẻ công việc tối
    cardBorder: '#233047',  // Viền phân tách thẻ
    textPrimary: '#F8FAFC', // Chữ sáng nổi bật
    textSecondary: '#94A3B8', // Chữ phụ
    textMuted: '#64748B',   // Chữ mờ / placeholder
    divider: '#1E293B',
    surfaceHover: '#1E293B',
  },

  // Light Mode Fallback
  light: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
  },

  // System States
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#0EA5E9',
  },

  // Offline banner
  offline: {
    bannerBg: '#78350F',
    bannerText: '#FEF3C7',
    badge: '#D97706',
  }
};
