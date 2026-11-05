# Kịch bản demo Flowse

## Trước giờ demo (sáng hôm demo, khoảng 10 phút)

1. Làm mới dữ liệu demo để hạn việc khớp "hôm nay":
   ```
   cd backend
   node src/config/seed_anphat.js
   ```
   Thấy dòng `✓ An Phát: workspace 1, 11 người` là xong. Chạy lại bao nhiêu lần cũng được.
2. Bật backend: `cd backend && npm run dev` (cổng 5001). Kiểm tra: mở `http://localhost:5001/db-health` thấy `"database":"connected"`.
3. Bật web: `cd frontend && npm run dev`, mở `http://localhost:5173`.
4. Bật app mobile: chọn **Cách A** hoặc **Cách B** bên dưới.

## Tài khoản (mật khẩu chung `Flowse@2026`)

| Người | Email | Vai trò | Dùng để demo |
|---|---|---|---|
| Nguyễn Minh Anh | minhanh@anphat.vn | Chuyên viên kế hoạch (manager) | Việc của tôi, phiếu duyệt, Flowse AI |
| Trần Quốc Dũng | dung.tq@anphat.vn | Quản đốc xưởng đóng gói (manager) | Sự cố BT-07 có SLA, duyệt phiếu của Minh Anh |
| Lê Đức Thành | thanh.ld@anphat.vn | Kỹ thuật (member) | Sự cố được giao |
| Quản trị An Phát | quantri@anphat.vn | Admin | Xem mọi sự cố |

Lưu ý: Minh Anh ở Phòng Kế hoạch nên **không thấy sự cố của xưởng**, đây là phân quyền đúng. Demo sự cố thì đăng nhập Dũng.

## App mobile

### Cách A — Dữ liệu mẫu (an toàn, không cần mạng). Dùng làm mặc định

`mobile/.env.local` có `EXPO_PUBLIC_DEMO=1`, rồi:
```
cd mobile
npx expo start --clear
```
Quét QR bằng Expo Go. Đăng nhập email bất kỳ.

Đường đi gợi ý:
1. Mở app: cảnh 3D khởi động → đăng nhập → chọn nơi làm việc.
2. Trang **Hôm nay** (B01): dòng việc có vòng trạng thái, nút **Flowse AI** viền chuyển màu.
3. **Flowse AI**: hoạt ảnh khởi động → gợi ý "Soạn email báo trễ đơn hàng" → chữ hiện dần → Sao chép.
4. **Tôi → Trang chủ theo vai trò** → chọn **Kỹ thuật**: thanh tab đổi thành Việc sửa · Quét · Sự cố…; chọn **Trưởng phòng**: Tổng quan · Nhóm · Duyệt.
5. **Quét** → nhập mã `BT-07` → hồ sơ thiết bị → **Báo sự cố** → hoạt ảnh gửi.
6. **Duyệt** → phiếu vật tư BT-07 → **Duyệt** → hoạt ảnh người đóng dấu (G10).
7. Ra màn đăng nhập → **Tiếp tục với Google** → hoạt ảnh nhân vật mở cửa (A11) → chọn tài khoản.
8. Mật khẩu `sai` hoặc `khoa` ở màn đăng nhập để xem màn lỗi / tài khoản bị khoá.

### Cách B — Dữ liệu thật từ backend (cần máy và điện thoại chung Wi-Fi)

1. Lấy IP máy: `ipconfig` → IPv4, ví dụ `192.168.1.20`.
2. `mobile/.env.local`: đổi `EXPO_PUBLIC_DEMO=0`, thêm `EXPO_PUBLIC_API_URL=http://192.168.1.20:5001/api/v1`.
3. Windows hỏi tường lửa cho Node thì chọn **Allow**.
4. `npx expo start --clear`, đăng nhập `minhanh@anphat.vn` / `Flowse@2026`.

Chạy thật: đăng nhập, nơi làm việc, trang Hôm nay (6 việc của Minh Anh), **Flowse AI Chat trả lời bằng AI thật** (hỏi "Hôm nay tôi có việc gì quá hạn?"). Các màn còn lại vẫn là dữ liệu mẫu.

Wi-Fi chập chờn thì quay về Cách A (đổi lại `EXPO_PUBLIC_DEMO=1`).

## Web

Đăng nhập Minh Anh hoặc Dũng. Có thể bấm **Đăng nhập bằng Google** với email đã thêm vào *Test users* của Google Cloud.

## Giới hạn cần biết khi bị hỏi

- Đăng nhập Google trên điện thoại cần bản dev build và Client ID iOS/Android; Expo Go chạy ở dạng xem thử.
- Email mời chỉ gửi được tới `dangnm.b23dt045@stu.ptit.edu.vn` (Resend chưa có tên miền riêng); người khác nhận link mời để copy.
- AI dùng Groq miễn phí (khoảng 1.000 lượt/ngày), mỗi câu khoảng 2 giây.
- Phần lớn màn mobile còn dùng dữ liệu mẫu; nối API thật theo `tasks/todo.md` (Việc 8 trở đi).
