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
  return `http://localhost:5001${cleanPath}`;
};

export default getFileUrl;
