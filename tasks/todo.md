# Việc cần làm: Hoàn thiện backend Flowse 2.0

Kế hoạch và lý do: `tasks/plan.md`. Lệnh dùng chung:
- Test backend: `cd backend && npm test` (việc 1 sẽ tạo lệnh này)
- Kiểm tra mobile: `cd mobile && npx tsc --noEmit && npm test`
- Chạy thử thật: `mobile/.env.local` bỏ `EXPO_PUBLIC_DEMO=1`, trỏ `EXPO_PUBLIC_API_URL` tới backend

Mọi việc phải qua chuẩn chung: test mới xanh, test cũ không đỏ, không còn `console.log` thừa, migration chỉ thêm (không xóa cột hay bảng).

---

## Giai đoạn 0: Nền móng

### Việc 1: Bộ test backend chạy được
**Mô tả:** Tách `app` khỏi `server.listen` để test gọi được app mà không mở cổng. Thêm `npm test` chạy `node --test` trên database test (`TEST_DATABASE_URL`), có bước dựng schema bằng các migration và seed tối thiểu (2 workspace, mỗi nơi 1 admin, 1 manager, 1 member).
**Tiêu chí xong:**
- [ ] `npm test` chạy được một test mẫu: đăng nhập seed rồi `GET /api/v1/users/profile` trả 200
- [ ] Hai lần chạy liên tiếp đều xanh (DB test được dựng lại sạch)
**Kiểm tra:** `cd backend && npm test`
**Phụ thuộc:** Không (cần câu trả lời câu hỏi 1 trong plan)
**File:** `backend/src/server.js`, `backend/src/app.js` (mới), `backend/test/helpers.js` (mới), `backend/test/smoke.test.js` (mới), `backend/package.json`
**Cỡ:** M

---

## Giai đoạn 1: Vá bảo mật và mất dữ liệu

### Việc 2: Giới hạn quyền admin/manager trong workspace
**Mô tả:** `Approval.makeDecision`, `WorkflowEngine.getUserRolesForTask`, `requireAdmin` và `requireManagerOrAdmin` đang coi admin/manager là có quyền ở mọi công ty. Đổi sang kiểm tra vai trò trong workspace của phiếu hoặc việc.
**Tiêu chí xong:**
- [ ] Manager workspace A duyệt phiếu của workspace B: nhận 403, phiếu không đổi
- [ ] Manager workspace A chuyển trạng thái việc của workspace B: nhận 403
- [ ] Manager duyệt phiếu trong chính workspace của mình: vẫn 200
**Kiểm tra:** `npm test` (thêm `test/authz.test.js`)
**Phụ thuộc:** 1
**File:** `backend/src/models/Approval.js`, `backend/src/core/WorkflowEngine.js`, `backend/src/middlewares/roleMiddlewares.js`, `backend/test/authz.test.js`
**Cỡ:** M

### Việc 3: Socket chỉ cho vào phòng của chính mình
**Mô tả:** `join_room` hiện cho client vào phòng bất kỳ (kể cả `user_<id>` của người khác). Khi `workspaceId` rỗng thì đang phát cho mọi người. Chỉ cho vào phòng của chính user, workspace và hội thoại mà họ là thành viên; không có workspace thì không phát.
**Tiêu chí xong:**
- [ ] User 1 xin vào `user_2`: bị từ chối, không nhận tin của user 2
- [ ] Gửi thông báo với `workspaceId = null`: không client nào nhận
**Kiểm tra:** `npm test` (test dùng `socket.io-client` có sẵn trong node_modules của socket.io, hoặc gọi thẳng hàm kiểm tra phòng)
**Phụ thuộc:** 1
**File:** `backend/src/services/socketService.js`, `backend/src/services/notificationService.js`, `backend/test/socket.test.js`
**Cỡ:** S

### Việc 4: Khóa xoá sự cố, bỏ clean-test-data, bảo vệ /uploads
**Mô tả:** `DELETE /incidents/:id` không kiểm tra quyền. `POST /incidents/clean-test-data` xoá mọi việc tên "Test%" của mọi công ty. `/uploads` ai cũng mở được.
**Tiêu chí xong:**
- [ ] Member xoá sự cố: 403. Manager trong cùng workspace xoá: 200
- [ ] Route clean-test-data không còn
- [ ] `GET /uploads/<file>` không có token: 401. Có token và cùng workspace: 200
**Kiểm tra:** `npm test`, rồi mobile mở ảnh sự cố khi đã đăng nhập (ảnh vẫn hiện)
**Phụ thuộc:** 1, 2
**File:** `backend/src/routes/incidentRoutes.js`, `backend/src/controllers/incidentController.js`, `backend/src/server.js`, `backend/test/incident.test.js`
**Cỡ:** S

### Việc 5: WorkflowEngine không tự xác minh khi AI lỗi
**Mô tả:** Khi AI Vision lỗi, engine tự ghi VERIFIED với điểm 80. `required_fields` được thoả chỉ bằng một `note` bất kỳ. Lời gọi AI chạy bên trong transaction đang khóa dòng.
**Tiêu chí xong:**
- [ ] AI lỗi: kết quả là `PENDING_REVIEW`, không phải VERIFIED
- [ ] Thiếu trường bắt buộc (ví dụ `downtime_minutes`): chuyển trạng thái bị từ chối, kèm tên trường thiếu
- [ ] Gọi AI xong mới mở transaction ghi kết quả (không giữ khóa khi chờ mạng)
**Kiểm tra:** `npm test` (giả AI lỗi bằng biến môi trường hoặc truyền hàm giả)
**Phụ thuộc:** 1
**File:** `backend/src/core/WorkflowEngine.js`, `backend/src/services/aiVisionService.js`, `backend/test/workflow.test.js`
**Cỡ:** M

### Việc 6: Bỏ đoán sự cố bằng regex, chống gửi trùng khi sync
**Mô tả:** Approval tìm sự cố bằng regex "sự cố #(\d+)" trong ghi chú, nên có thể tác động nhầm sự cố khác. Sync batch kiểm tra `idempotency_key` rồi mới ghi, nên hai lần gửi cùng lúc sẽ ghi 2 lần.
**Tiêu chí xong:**
- [ ] Approval chỉ dùng cột liên kết rõ ràng (`incident_id`) trên phiếu; ghi chú chứa "sự cố #5" không tác động sự cố 5
- [ ] Hai request sync cùng `idempotency_key` gửi song song: chỉ 1 bản ghi; request sau nhận kết quả của request trước
- [ ] Unique index trên `offline_sync_logs(idempotency_key)` + `INSERT … ON CONFLICT`
**Kiểm tra:** `npm test`
**Phụ thuộc:** 1
**File:** `backend/src/models/Approval.js`, `backend/src/models/Sync.js`, `backend/src/config/migrations/006_integrity_fixes.sql` (mới), `backend/test/sync.test.js`
**Cỡ:** M

## Điểm dừng 1 (sau việc 1–6)
- [x] `npm test` xanh hết (22/22)
- [x] Cập nhật memory `backend-audit-findings` (đánh dấu đã sửa)
- [ ] Xem lại cùng người dùng trước khi nối mobile

---

## Giai đoạn 2: Nối mobile với API đã có

### Việc 7: Sửa 3 chỗ lệch đường dẫn mobile ↔ backend
**Mô tả:** Mobile gọi `GET /approvals` (backend là `/approvals/pending`), `POST /tasks` (backend là `POST /work-items`), `POST /tasks/:id/assign` (backend là `POST /tasks/:id/assignees`). Sửa phía mobile cho khớp, và kiểm tra lại các trường trả về (snake_case → camelCase trong repository).
**Tiêu chí xong:**
- [ ] Tắt demo: danh sách duyệt, tạo việc, giao việc chạy trên backend thật
- [ ] Demo adapter vẫn chạy (đường dẫn mới cũng có trong `demoAdapter.ts`)
**Kiểm tra:** `cd mobile && npx tsc --noEmit`; chạy Expo Go với backend thật: tạo việc rồi thấy nó trong D01
**Phụ thuộc:** Điểm dừng 1
**File:** `mobile/src/data/repositories/ApprovalRepositoryImpl.ts`, `mobile/src/data/repositories/WorkItemRepositoryImpl.ts`, `mobile/src/data/api/demoAdapter.ts`
**Cỡ:** S

### Việc 8: Vai trò công việc (home_role) trong /users/contexts
**Mô tả:** Thêm cột `home_role` (TP, CN, TC, KT, QC, QLDC, QLPX, QLN, KHO, MH, QT, VP) vào thành viên phòng ban. `/users/contexts` trả về giá trị này. Khi trống thì suy ra từ vai trò cũ. Mobile `useHomeRole` đọc từ đây, còn lựa chọn ở "Trang chủ theo vai trò" chỉ để xem thử.
**Tiêu chí xong:**
- [ ] Seed có mỗi vai trò 1 người; đăng nhập người KT thì thấy thanh tab Việc sửa · Quét · Sự cố · Hộp thư · Tôi
- [ ] Người cũ chưa có `home_role`: technician ra KT, các vai trò còn lại ra VP
**Kiểm tra:** `npm test` (contexts trả đúng `home_role`); mobile đăng nhập 2 tài khoản khác vai trò
**Phụ thuộc:** Điểm dừng 1
**File:** `backend/src/config/migrations/007_home_role.sql`, `backend/src/controllers/userControllers.js`, `backend/src/config/seed_demo.js`, `mobile/src/presentation/state/useHomeRole.ts`, `mobile/src/presentation/state/authStore.ts`
**Cỡ:** M

### Việc 9: Đăng nhập sai và khóa tài khoản (A03, A07, A08)
**Mô tả:** Đếm số lần sai mật khẩu, khóa 15 phút sau 5 lần. Thông báo lỗi khớp mobile ("Sai email hoặc mật khẩu. Còn N lần thử…", "Tài khoản tạm khóa…"). Mobile gọi `/auth/refresh` khi gặp 401 trước khi báo hết phiên.
**Tiêu chí xong:**
- [ ] Sai lần thứ 5: trả 423 kèm thời điểm mở khóa; đúng mật khẩu trong lúc khóa vẫn bị từ chối
- [ ] Đăng nhập đúng: bộ đếm về 0
- [ ] Access token hết hạn: mobile tự refresh 1 lần; refresh hỏng mới ra A08
**Kiểm tra:** `npm test` (`auth.test.js`); mobile nhập sai 5 lần thì ra A07
**Phụ thuộc:** Điểm dừng 1
**File:** `backend/src/controllers/authControllers.js`, `backend/src/config/migrations/008_login_lockout.sql`, `mobile/src/data/api/apiClient.ts`, `backend/test/auth.test.js`
**Cỡ:** M

### Việc 10: Quên mật khẩu (A04–A06)
**Mô tả:** Hai route công khai: `POST /auth/forgot-password` (gửi mã hoặc link qua `emailService` có sẵn, luôn trả 200 để không lộ email nào có tài khoản) và `POST /auth/reset-password` (mã dùng 1 lần, hết hạn 15 phút). Nối các màn A04–A06.
**Tiêu chí xong:**
- [ ] Email không tồn tại: vẫn trả 200, không gửi mail
- [ ] Mã đúng: đổi được mật khẩu, mọi phiên cũ bị thu hồi; dùng lại mã: 400
- [ ] Bị giới hạn tần suất (`rateLimitMiddleware` có sẵn)
**Kiểm tra:** `npm test` (thay `emailService` bằng hàm giả); mobile đi hết A04 → A06
**Phụ thuộc:** 9
**File:** `backend/src/routes/authRoutes.js`, `backend/src/controllers/authControllers.js`, `backend/src/config/migrations/009_password_reset.sql`, `mobile/src/presentation/screens/auth/AccountScreens.tsx`, `backend/test/reset.test.js`
**Cỡ:** M

### Việc 11: Hộp thư và tin nhắn thật (J01, J05–J10)
**Mô tả:** Backend đã có notifications, conversations, messages và socket. Thêm repository phía mobile và thay fixtures ở `InboxScreens` / `InboxMoreScreens`. Tin mới đến qua socket. Mất mạng thì tin chờ gửi lại (J10).
**Tiêu chí xong:**
- [ ] J01 hiện thông báo thật; chạm vào thì đánh dấu đã đọc (`PATCH /:id/read`)
- [ ] Gửi tin ở J06: máy khác trong cùng hội thoại nhận trong 2 giây
- [ ] Không có mạng: tin hiện "Chưa gửi · Chạm để gửi lại", có mạng thì gửi được
**Kiểm tra:** mobile 2 máy (hoặc máy + web); `npx tsc --noEmit`
**Phụ thuộc:** 3, 7
**File:** `mobile/src/data/repositories/InboxRepositoryImpl.ts` (mới), `mobile/src/presentation/screens/inbox/InboxScreens.tsx`, `mobile/src/presentation/screens/inbox/InboxMoreScreens.tsx`
**Cỡ:** M

### Việc 12: Kiểm tra được giao và gửi kết quả (F01–F05)
**Mô tả:** Thêm `GET /inspections/assigned` (đợt kiểm tra hôm nay của tôi: chưa làm / đã gửi). Submit nhận được kết quả N/A. Mobile thay fixtures `inspections` / `checklist` bằng API.
**Tiêu chí xong:**
- [ ] F01 hiện đúng đợt được giao theo người đăng nhập
- [ ] Gửi có mục N/A: N/A không tính vào số đạt hay không đạt; mục không đạt tạo việc khắc phục (logic đã có)
- [ ] Đã gửi thì không sửa được (409)
**Kiểm tra:** `npm test` (`inspection.test.js`); mobile chạy F01 → F05
**Phụ thuộc:** 2, 7
**File:** `backend/src/routes/inspectionRoutes.js`, `backend/src/controllers/inspectionController.js`, `backend/src/models/Inspection.js`, `mobile/src/data/repositories/InspectionRepositoryImpl.ts` (mới), `mobile/src/presentation/screens/requests/RequestScreens.tsx`
**Cỡ:** M

## Điểm dừng 2 (sau việc 7–12)
- [ ] Tắt demo: A, B01, C, D01, E, F, J chạy trên backend thật bằng Expo Go
- [ ] `npm test` (backend) và `npx tsc --noEmit` (mobile) xanh

---

## Giai đoạn 3: Nghiệp vụ mới

### Việc 13: Tạo và theo dõi yêu cầu (G01–G04)
**Mô tả:** Bảng `request_types` (loại, form, chuỗi duyệt) và `request_fields` (giá trị form). Tạo yêu cầu = tạo work item `REQUEST` + các bước approval theo loại. Có `GET /requests/mine` (lọc: đang mở, cần bổ sung, đã xong) và `GET /requests/:id` (kèm tiến trình từng bước).
**Tiêu chí xong:**
- [ ] Tạo nghỉ phép: phiếu mã `NP-…`, bước 1 chờ Trưởng bộ phận, người duyệt nhận thông báo
- [ ] Thiếu trường bắt buộc của loại: 400 kèm tên trường
- [ ] G04 hiện đúng 3 bước của tạm ứng với trạng thái từng bước
**Kiểm tra:** `npm test` (`request.test.js`); mobile G01 → G02 → G03 → G04
**Phụ thuộc:** Điểm dừng 2
**File:** `backend/src/config/migrations/010_requests.sql`, `backend/src/routes/requestRoutes.js`, `backend/src/controllers/requestController.js`, `backend/src/models/Request.js`, `mobile/src/data/repositories/RequestRepositoryImpl.ts`
**Cỡ:** L (nếu quá 1 phiên thì tách: 13a tạo + danh sách, 13b chi tiết + tiến trình)

### Việc 14: Trả lại, sửa, hủy yêu cầu và xác nhận bàn giao (G05, G06)
**Mô tả:** Người duyệt trả lại kèm lý do (G09). Người đề nghị sửa đúng trường bị trả lại rồi gửi lại, và lịch sử thay đổi được lưu (G05b). Có thể hủy. Yêu cầu cấp phát (IT) chỉ đóng khi người nhận xác nhận đã nhận đủ (G06).
**Tiêu chí xong:**
- [ ] Trả lại: phiếu về "Cần bổ sung", người đề nghị nhận lý do
- [ ] Gửi lại: quay về đúng bước đã trả lại, không bắt đầu lại từ bước 1
- [ ] Người khác (không phải người đề nghị) xác nhận nhận đủ: 403
**Kiểm tra:** `npm test`; mobile G05 → G05b, G06 → G06c
**Phụ thuộc:** 13
**File:** `backend/src/controllers/requestController.js`, `backend/src/models/Request.js`, `backend/src/models/Approval.js`, `mobile/src/presentation/screens/requests/RequestMoreScreens.tsx`
**Cỡ:** M

### Việc 15: Ủy quyền duyệt (G12)
**Mô tả:** Bảng `approval_delegations` (người ủy quyền, người nhận, khoảng thời gian, loại phiếu, giới hạn tiền). Pending và decision tính cả quyền được ủy. Tự duyệt phiếu của mình bị chặn và chuyển người duyệt thay (K12).
**Tiêu chí xong:**
- [ ] Trong khung giờ ủy quyền: người nhận thấy và duyệt được phiếu đúng loại, đúng giới hạn tiền
- [ ] Ngoài khung giờ, hoặc vượt 20 triệu: không thấy phiếu
- [ ] Người đề nghị là người duyệt: phiếu chuyển sang người kế tiếp
**Kiểm tra:** `npm test` (`delegation.test.js`)
**Phụ thuộc:** 13
**File:** `backend/src/config/migrations/011_delegations.sql`, `backend/src/models/Approval.js`, `backend/src/controllers/approvalController.js`, `mobile/src/presentation/screens/requests/RequestMoreScreens.tsx`
**Cỡ:** M

## Điểm dừng 3 (sau việc 13–15)
- [ ] Luồng yêu cầu G01–G12 chạy thật đầu đến cuối; người dùng xem lại

### Việc 16: Phiếu vật tư (H01, H02, H05)
**Mô tả:** Bảng `material_lines` (mặt hàng, số lượng, đã cấp, chuyển mua) gắn với work item `REQUEST` loại vật tư. `incidents/:id/request-parts` tạo phiếu này và tự điền thiết bị cùng sự cố (H01). Duyệt dùng approval có sẵn. H02 là tiến trình của người đề nghị; H05 là chi tiết đầy đủ.
**Tiêu chí xong:**
- [ ] Đề nghị từ sự cố: phiếu `VT-…` liên kết đúng sự cố; SLA sự cố tạm dừng (logic đã có)
- [ ] H02 hiện đúng 4 bước: duyệt → kho cấp → mua → nhận đủ
**Kiểm tra:** `npm test` (`material.test.js`); mobile E09 → H01 → H02
**Phụ thuộc:** 13
**File:** `backend/src/config/migrations/012_materials.sql`, `backend/src/routes/materialRoutes.js`, `backend/src/controllers/materialController.js`, `backend/src/models/Material.js`, `mobile/src/data/repositories/MaterialRepositoryImpl.ts`
**Cỡ:** M

### Việc 17: Kho cấp một phần và theo dõi mua (H03, H04)
**Mô tả:** Kho ghi số thực cấp. Phần thiếu tự tạo mục theo dõi mua (`MH-…`) với các trạng thái Tìm nguồn → Đã đặt → Đang giao → Đã giao. Người đề nghị xác nhận số đã nhận. Phiếu chỉ đóng khi đã nhận đủ.
**Tiêu chí xong:**
- [ ] Cấp 2/4: tạo `MH-…` 2 cái; phiếu ở "Chờ mua 2"
- [ ] Cấp hay nhận nhiều hơn số yêu cầu: 400
- [ ] Giao đủ và người đề nghị xác nhận: phiếu đóng, sự cố được báo
**Kiểm tra:** `npm test`; mobile H03 → H04 → H02
**Phụ thuộc:** 16
**File:** `backend/src/controllers/materialController.js`, `backend/src/models/Material.js`, `mobile/src/presentation/screens/requests/RequestMoreScreens.tsx`, `mobile/src/presentation/screens/more/MoreScreens.tsx`
**Cỡ:** M

### Việc 18: Bàn giao ca (I01, I02, I08, I09)
**Mô tả:** Bảng `shift_handovers` (ca gửi, ca nhận, việc chuyển sang, sự cố mở, ghi chú, trạng thái). Ca trước chỉ chốt khi ca sau xác nhận. Sửa sau khi chốt bắt buộc ghi lý do và lưu lịch sử. Có nhật ký theo tuần.
**Tiêu chí xong:**
- [ ] Gửi bàn giao: tự gom việc chưa xong và sự cố mở của tổ
- [ ] Người không thuộc ca nhận mà xác nhận: 403
- [ ] Sửa sau chốt mà thiếu lý do: 400; có lý do thì nhật ký hiện "Sửa sau chốt 1 lần"
**Kiểm tra:** `npm test` (`handover.test.js`); mobile I01 → I02 → I08 → I09
**Phụ thuộc:** Điểm dừng 2
**File:** `backend/src/config/migrations/013_handovers.sql`, `backend/src/routes/handoverRoutes.js`, `backend/src/controllers/handoverController.js`, `backend/src/models/Handover.js`, `mobile/src/presentation/screens/ops/SafetyScreens.tsx`
**Cỡ:** M

## Điểm dừng 4 (sau việc 16–18)
- [ ] Vật tư và bàn giao ca chạy thật; `npm test` xanh

### Việc 19: NCR từ kết quả kiểm tra (F06, F07)
**Mô tả:** Bảng `ncrs` (nguồn kiểm tra, mô tả, mức độ, số lượng ảnh hưởng, người xử lý) và `ncr_actions` (cách ly → nguyên nhân → khắc phục → theo dõi → đánh giá hiệu lực).
**Tiêu chí xong:**
- [ ] Tạo NCR từ QC chưa đạt: mã `NCR-…` liên kết đúng phiếu kiểm tra
- [ ] F07 hiện các bước theo đúng thứ tự, có hạn và trạng thái
**Kiểm tra:** `npm test`; mobile F05 → F06 → F07
**Phụ thuộc:** 12
**File:** `backend/src/config/migrations/014_ncr.sql`, `backend/src/routes/ncrRoutes.js`, `backend/src/controllers/ncrController.js`, `mobile/src/presentation/screens/field/QualityScreens.tsx`
**Cỡ:** M

### Việc 20: Báo nguy cơ và liên hệ khẩn cấp (I06, I07)
**Mô tả:** Báo nguy cơ là work item `INCIDENT` có `category = 'HAZARD'` (không thêm bảng). Người trực an toàn và điểm tập trung lấy theo nhà máy (bảng cấu hình nhỏ).
**Tiêu chí xong:**
- [ ] Gửi báo nguy cơ: người trực an toàn nhận thông báo ngay
- [ ] I06 hiện đúng người trực của ca hiện tại
**Kiểm tra:** `npm test`; mobile I06, I07
**Phụ thuộc:** Điểm dừng 2
**File:** `backend/src/config/migrations/015_safety.sql`, `backend/src/controllers/incidentController.js`, `backend/src/routes/incidentRoutes.js`, `mobile/src/presentation/screens/ops/SafetyScreens.tsx`
**Cỡ:** S

### Việc 21: Nhóm và đơn vị (D04–D08)
**Mô tả:** `GET /departments/:id/workload` (việc mở, quá hạn, rảnh theo từng người) và `GET /departments/tree?withStats=1` (số việc, quá hạn, sự cố, % đúng hạn cho mỗi đơn vị). Chỉ trong phạm vi người xem quản lý.
**Tiêu chí xong:**
- [ ] Trưởng phòng chỉ thấy người trong phòng mình; quản đốc thấy các dây chuyền của xưởng
- [ ] % đúng hạn = việc xong đúng hạn / việc xong trong 30 ngày (công thức có test)
- [ ] Một truy vấn cho cả cây, không gọi một truy vấn cho mỗi đơn vị
**Kiểm tra:** `npm test` (`workload.test.js`); mobile D04, D07, D08
**Phụ thuộc:** 8
**File:** `backend/src/routes/departmentRoutes.js`, `backend/src/controllers/departmentController.js`, `backend/src/models/Department.js`, `mobile/src/presentation/screens/work/WorkMoreScreens.tsx`
**Cỡ:** M

## Điểm dừng 5 (sau việc 19–21)
- [ ] F, I, D chạy thật; người dùng xem lại

---

## Giai đoạn 4: Hoàn thiện

### Việc 22: Trang chủ theo vai trò (B02–B12)
**Mô tả:** `GET /home/summary` trả các khối số liệu và danh sách theo `home_role` (tái dùng truy vấn của các việc 12–21). Mobile `RoleHomes` thay dữ liệu Figma bằng kết quả này, giữ nguyên cách dựng khối.
**Tiêu chí xong:**
- [ ] Mỗi vai trò nhận đúng các khối như Figma (ví dụ TP: Đang mở / Quá hạn / Chờ bạn duyệt, Cần bạn điều phối, Tải việc theo người)
- [ ] Trả về trong 300 ms với seed demo
**Kiểm tra:** `npm test` (`home.test.js`, mỗi vai trò 1 ca); mobile đăng nhập từng vai trò
**Phụ thuộc:** 8, 12–21
**File:** `backend/src/routes/homeRoutes.js`, `backend/src/controllers/homeController.js`, `mobile/src/presentation/screens/home/RoleHomes.tsx`
**Cỡ:** L (tách theo nhóm vai trò nếu dài: văn phòng / hiện trường / quản lý)

### Việc 23: Tìm kiếm (Search)
**Mô tả:** `GET /search?q=` tìm theo mã phiếu (SC-, VT-, YC-, QC-, VP-) và tên, gộp việc, sự cố, yêu cầu, thiết bị, chỉ trong phạm vi người dùng.
**Tiêu chí xong:**
- [ ] Gõ đúng mã: kết quả đầu là phiếu đó
- [ ] Không trả phiếu của workspace khác
**Kiểm tra:** `npm test`; mobile màn Search
**Phụ thuộc:** 2
**File:** `backend/src/routes/searchRoutes.js`, `backend/src/controllers/searchController.js`, `mobile/src/presentation/screens/more/MoreScreens.tsx`
**Cỡ:** S

### Việc 24: Cài đặt thông báo (J03, J11)
**Mô tả:** Lưu tùy chọn theo user (bật/tắt theo loại, giờ yên lặng, ngoại lệ luôn báo). `notificationService` tôn trọng tùy chọn; cảnh báo an toàn luôn gửi.
**Tiêu chí xong:**
- [ ] Trong giờ yên lặng: tin nhắn thường không tạo thông báo; việc được giao vẫn có
- [ ] Cảnh báo an toàn không tắt được
**Kiểm tra:** `npm test`; mobile J03, J11
**Phụ thuộc:** 11
**File:** `backend/src/config/migrations/016_notification_prefs.sql`, `backend/src/services/notificationService.js`, `backend/src/controllers/notificationsController.js`, `mobile/src/presentation/screens/inbox/InboxScreens.tsx`
**Cỡ:** S

### Việc 25: Flowse AI: trả lời dạng stream và lịch sử thao tác (L01–L10)
**Mô tả:** `POST /ai/chat` trả từng đoạn chữ (SSE) để `StreamBubble` hiện theo thời gian thật. Thao tác do AI đề xuất (draft-action) chỉ ghi khi người dùng xác nhận; mỗi thao tác lưu vào lịch sử (L10), kèm hoàn tác 5 giây. Kiểm tra quyền giống khi người dùng tự làm (L09).
**Tiêu chí xong:**
- [ ] Chữ đầu tiên hiện dưới 1,5 giây; mất mạng giữa chừng thì báo lỗi, không treo
- [ ] AI đề xuất giao việc ngoài phạm vi: 403 như khi người dùng tự giao
- [ ] L10 liệt kê thao tác đã áp dụng / đã hủy của 7 ngày gần đây
**Kiểm tra:** `npm test` (thay Groq bằng hàm giả); mobile L01 → L06, L09, L10
**Phụ thuộc:** 2
**File:** `backend/src/controllers/aiController.js`, `backend/src/models/AI.js`, `backend/src/config/migrations/017_ai_actions.sql`, `mobile/src/presentation/screens/ai/FlowseAIScreen.tsx`
**Cỡ:** M

## Điểm dừng cuối
- [ ] Bỏ `EXPO_PUBLIC_DEMO=1`, đi hết A–L trên Expo Go với backend thật
- [ ] `npm test` (backend) và `npx tsc --noEmit && npm test` (mobile) xanh
- [ ] Chạy `/ponytail:ponytail-review` trên toàn bộ thay đổi backend
