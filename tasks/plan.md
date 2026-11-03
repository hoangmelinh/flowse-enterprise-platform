# Kế hoạch: Hoàn thiện backend để app mobile Flowse 2.0 chạy dữ liệu thật

Lập ngày 2026-11-03. Danh sách việc chi tiết (tiêu chí xong, cách kiểm tra): `tasks/todo.md`.

## Tổng quan

App mobile (Expo 58, nhánh `feature/mobile-flowse-2-ui`) đã có đủ màn A–L nhưng gần như mọi màn chạy bằng dữ liệu mẫu (`mobile/src/data/demo/fixtures.ts`, `EXPO_PUBLIC_DEMO=1`). Mobile mới gọi backend ở 20 chỗ (đăng nhập, việc của tôi, sự cố, thiết bị, phê duyệt). Backend (Express 5 + PostgreSQL) đã có nhiều route nhưng:

1. Còn lỗi phân quyền và mất dữ liệu từ đợt audit 2026-10-30 (chưa sửa).
2. Có 3 chỗ mobile và backend gọi lệch đường dẫn.
3. Thiếu hẳn các nhóm nghiệp vụ: Yêu cầu (G), Vật tư (H), Bàn giao ca (I), NCR (F06–F07), An toàn (I06–I07), Nhóm/Đơn vị (D), Tìm kiếm, cài đặt thông báo, lịch sử AI, trang chủ theo vai trò.
4. Không có test tự động (`npm test` chỉ in lỗi).

Mục tiêu: tắt chế độ demo mà mọi màn A–L vẫn chạy được trên backend thật, với phân quyền đúng theo nơi làm việc.

## Đã có / còn thiếu (đối chiếu với mobile)

| Nhóm màn | Backend hiện có | Còn thiếu |
|---|---|---|
| A Đăng nhập | signin, google, refresh, signout | khóa sau nhiều lần sai (A07), quên mật khẩu không cần đăng nhập (A04–A06) |
| B Trang chủ vai trò | `work-items/my-work` | vai trò chi tiết (TP, TC, KT, QC, QLDC, QLPX, QLN, KHO, MH, QT), số liệu tổng hợp theo vai trò |
| C/D Công việc | tasks, spaces, folders, lists, comments, assignees, workflows | khối lượng việc theo người (D04–D06), đơn vị/dây chuyền kèm số liệu (D07–D08), tạo việc qua `work-items` |
| E Sự cố | incidents, assign, evidence, reopen, request-parts, assets, QR | đủ để nối; lỗi quyền xoá + clean-test-data |
| F Kiểm tra | templates, checklist theo thiết bị, submit | danh sách kiểm tra được giao (F01), N/A, NCR (F06–F07) |
| G Yêu cầu & duyệt | approvals pending + decision | tạo/xem/sửa/hủy yêu cầu, loại yêu cầu, ủy quyền (G12) |
| H Vật tư | chỉ `incidents/:id/request-parts` | phiếu vật tư, cấp một phần, chuyển mua, theo dõi mua |
| I Ca & an toàn | sync batch | bàn giao ca, nhật ký bàn giao, báo nguy cơ, liên hệ khẩn cấp |
| J Hộp thư | notifications, messages, conversations | cài đặt thông báo (J03, J11) |
| L Flowse AI | chat, query, draft-action… | trả lời dạng stream, lịch sử thao tác (L10) |

## Quyết định kiến trúc

- **Giữ cấu trúc hiện tại:** route → controller → model (SQL thuần qua `pg`), migration SQL đánh số trong `backend/src/config/migrations/`. Không thêm ORM hay framework.
- **Hợp đồng API theo backend:** khi mobile và backend lệch đường dẫn, sửa phía mobile (repository) cho khớp route đã có. Chỉ thêm route mới khi thật sự thiếu nghiệp vụ.
- **Yêu cầu và Vật tư là work item:** `tasks.work_item_type` đã có `REQUEST`. Yêu cầu và phiếu vật tư dùng chung bảng `tasks` + `approvals` + workflow, thêm bảng con cho chi tiết (dòng vật tư, trường form). Tránh dựng một hệ thứ hai song song.
- **Vai trò chi tiết gắn theo phòng ban:** 5 vai trò hiện có (admin, manager, member, technician, qa) không đủ cho 12 trang chủ. Thêm mã vai trò công việc (`home_role`) vào thành viên phòng ban và trả về qua `/users/contexts`. Mobile `useHomeRole` đọc giá trị này thay cho đoán từ quyền.
- **Mọi kiểm tra quyền phải giới hạn trong workspace:** admin/manager chỉ có quyền trong workspace của họ (sửa lỗi audit).
- **Test:** dùng `node --test` có sẵn trong Node (giống mobile), gọi app qua HTTP trên một database test riêng (`TEST_DATABASE_URL`). Mỗi lỗi sửa có một test thất bại trước khi sửa.
- **Ngoài phạm vi (P2 hoặc cần hệ thống ngoài):** F08 truy xuất lô (cần MES), Thẩm định hợp đồng, Sản lượng theo ca (cần nguồn báo cáo sản xuất), số tồn kho thật (cần hệ thống kho), thông báo đẩy (cần `expo-notifications` + máy chủ đẩy).

## Thứ tự và lý do

Bảo mật trước, vì nối dữ liệu thật mà phân quyền còn hở là lộ dữ liệu công ty khác. Tiếp theo là nối những gì đã có (rẻ nhất, mở được nhiều màn). Sau đó mới đến nghiệp vụ mới, chia theo lát dọc: mỗi việc gồm migration + API + test + nối màn mobile, và xong việc nào là dùng được ngay.

### Giai đoạn 0: Nền móng (việc 1)
- [ ] Việc 1: Bộ test backend chạy được

### Giai đoạn 1: Vá bảo mật và mất dữ liệu (việc 2–6)
- [ ] Việc 2: Giới hạn quyền admin/manager trong workspace
- [ ] Việc 3: Socket chỉ cho vào phòng của chính mình
- [ ] Việc 4: Khóa xoá sự cố, bỏ clean-test-data, bảo vệ /uploads
- [ ] Việc 5: WorkflowEngine không tự xác minh khi AI lỗi
- [ ] Việc 6: Bỏ đoán sự cố bằng regex, chống gửi trùng khi sync
- [ ] **Điểm dừng 1:** test xanh, xem lại cùng người dùng

### Giai đoạn 2: Nối mobile với API đã có (việc 7–12)
- [ ] Việc 7: Sửa 3 chỗ lệch đường dẫn mobile ↔ backend
- [ ] Việc 8: Vai trò công việc (home_role) trong /users/contexts
- [ ] Việc 9: Đăng nhập sai và khóa tài khoản (A03, A07, A08)
- [ ] Việc 10: Quên mật khẩu (A04–A06)
- [ ] Việc 11: Hộp thư và tin nhắn thật (J01, J05–J10)
- [ ] Việc 12: Kiểm tra được giao và gửi kết quả (F01–F05)
- [ ] **Điểm dừng 2:** tắt demo, chạy được A, B01, C, D01, E, F, J trên máy thật

### Giai đoạn 3: Nghiệp vụ mới (việc 13–21)
- [ ] Việc 13: Tạo và theo dõi yêu cầu (G01–G04)
- [ ] Việc 14: Trả lại, sửa, hủy yêu cầu và xác nhận bàn giao (G05, G06)
- [ ] Việc 15: Ủy quyền duyệt (G12)
- [ ] **Điểm dừng 3**
- [ ] Việc 16: Phiếu vật tư (H01, H02, H05)
- [ ] Việc 17: Kho cấp một phần và theo dõi mua (H03, H04)
- [ ] Việc 18: Bàn giao ca (I01, I02, I08, I09)
- [ ] **Điểm dừng 4**
- [ ] Việc 19: NCR từ kết quả kiểm tra (F06, F07)
- [ ] Việc 20: Báo nguy cơ và liên hệ khẩn cấp (I06, I07)
- [ ] Việc 21: Nhóm và đơn vị (D04–D08)
- [ ] **Điểm dừng 5**

### Giai đoạn 4: Hoàn thiện (việc 22–25)
- [ ] Việc 22: Trang chủ theo vai trò (B02–B12)
- [ ] Việc 23: Tìm kiếm (Search)
- [ ] Việc 24: Cài đặt thông báo (J03, J11)
- [ ] Việc 25: Flowse AI: trả lời dạng stream và lịch sử thao tác (L01–L10)
- [ ] **Điểm dừng cuối:** tắt `EXPO_PUBLIC_DEMO`, chạy hết A–L

## Có thể làm song song

Xong Giai đoạn 1 và việc 8 rồi thì có thể làm song song: G (13–15), H (16–17), I (18, 20), F (19), D (21). Các nhóm này đụng bảng khác nhau. Migration vẫn phải đánh số tuần tự, nên chốt số migration trước khi chia việc.

## Rủi ro

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Chưa có test nên sửa phân quyền dễ làm hỏng chỗ khác | Cao | Làm việc 1 trước; mỗi lỗi có test tái hiện |
| Migration chạy trên database đang dùng chung | Cao | Migration chỉ thêm (`ADD COLUMN IF NOT EXISTS`, bảng mới), chạy thử trên DB test trước |
| Mô hình vai trò mới (home_role) đổi cách mobile chọn tab và trang chủ | Trung bình | Mặc định suy ra từ vai trò cũ khi trống, nên dữ liệu cũ vẫn chạy |
| Groq API hết hạn mức hoặc chậm | Trung bình | Stream có thời gian chờ, lỗi trả về thông báo rõ; L08 đã có luồng ngoại tuyến |
| Chưa biết backend chạy ở đâu (máy cá nhân, Docker, cloud) | Trung bình | Hỏi người dùng (mục Câu hỏi); Dockerfile đã có |

## Câu hỏi cần người dùng trả lời

1. ~~Database ở đâu?~~ Đã chốt 2026-11-03: Supabase (Session pooler, `DATABASE_URL` trong `backend/.env`, project `tnydhjutbhsowndjvmys`, vùng eu-west-1, đang trống). Test cần thêm một project Supabase riêng cho `TEST_DATABASE_URL`.
2. Mã vai trò công việc nhập ở đâu: trong Web quản trị (đã có?) hay chỉ seed sẵn cho bản demo?
3. Email quên mật khẩu gửi qua Resend (đã có `emailService`): đã có tên miền gửi và khóa API thật chưa?
4. Các mục P2 ở trên (MES, kho, hợp đồng, thông báo đẩy) giữ ngoài phạm vi như đề xuất được không?
