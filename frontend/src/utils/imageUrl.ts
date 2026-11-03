import { getAccessToken } from "./localStorage";

/**
 * Helper chuẩn hóa URL hình ảnh và file đính kèm
 * Tự động gắn host backend nếu là đường dẫn tương đối (/uploads/...)
 */
export const getFileUrl = (path?: string | null): string => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  // /uploads cần đăng nhập; thẻ <img> không gửi được header nên gắn token vào URL
  const token = cleanPath.startsWith("/uploads/") ? getAccessToken() : null;
  return `http://localhost:5001${cleanPath}${token ? `?token=${encodeURIComponent(token)}` : ""}`;
};

export default getFileUrl;
