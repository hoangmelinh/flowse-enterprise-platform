/**
 * Chuyển đổi chuỗi tiếng Việt có dấu thành không dấu và chuẩn hoá slug URL
 * Ví dụ: "Cơ Khí Chính Xác An Phát" -> "co-khi-chinh-xac-an-phat"
 */
export const removeVietnameseTones = (str: string): string => {
    if (!str) return '';
    let result = str;
    // Chuyển ký tự Đ/đ riêng biệt vì chuẩn NFD không tách dấu gạch ngang của chữ Đ
    result = result.replace(/đ/g, 'd').replace(/Đ/g, 'D');
    // Chuẩn hóa NFD để tách các dấu thanh, dấu mũ, dấu móc (sắc, huyền, hỏi, ngã, nặng, ư, ơ, â, ê, ô)
    result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return result;
};

export const generateSlug = (str: string, maxLength = 50): string => {
    if (!str) return '';
    const withoutTones = removeVietnameseTones(str);
    const slug = withoutTones
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Loại bỏ dấu ngoặc kép, ký tự đặc biệt
        .replace(/\s+/g, '-')         // Thay khoảng trắng bằng dấu gạch ngang
        .replace(/-+/g, '-')          // Gộp nhiều dấu gạch ngang liên tiếp thành 1
        .replace(/^-+|-+$/g, '')      // Bỏ gạch ngang ở đầu và cuối chuỗi
        .slice(0, maxLength);
    return slug || 'workspace';
};
