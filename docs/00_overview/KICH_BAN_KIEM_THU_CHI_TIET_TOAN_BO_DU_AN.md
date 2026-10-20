# 📋 TỔNG HỢP LUỒNG NGHIỆP VỤ & MA TRẬN KỊCH BẢN KIỂM THỬ TOÀN DIỆN
### HỆ THỐNG FLOWISE ENTERPRISE CMMS & INDUSTRIAL FSM (FLOWSE 2.0)

---

## PHẦN I: TỔNG HỢP CÁC LUỒNG HOẠT ĐỘNG CHUẨN MỰC TRONG DỰ ÁN

### 1. Luồng Vòng đời Xử lý Sự cố Hiện trường (Field Incident FSM Lifecycle)
Vận hành dựa trên Máy Trạng Thái Hữu Hạn (FSM) 6 bước nghiêm ngặt:
1. **`REPORTED` (Tiếp nhận ban đầu):** Công nhân/Kỹ thuật viên phát hiện máy móc có dấu hiệu bất thường (rung giật, quá nhiệt, kẹt phoi), mở app quét mã QR định danh trên máy, nhập triệu chứng hỏng hóc và chụp 1 tấm ảnh bằng chứng hiện trường $\rightarrow$ Gửi sự cố $\rightarrow$ Hệ thống tự động kích hoạt đồng hồ cam kết SLA.
2. **`ASSIGNED` (Điều phối & Phân công):** Quản đốc phân xưởng tiếp nhận sự cố trên Web Console, thẩm định mức độ khẩn cấp (từ P1 Critical đến P4 Low), chọn kỹ thuật viên cơ điện phụ trách và bấm **Chỉ định (Assign)**. Kỹ thuật viên nhận được thông báo phân công.
3. **`IN_PROGRESS` (Đang sửa chữa):** Kỹ thuật viên đến vị trí máy, mở ứng dụng bấm nút **[Bắt đầu xử lý (Start Work)]**. Trạng thái chuyển sang `IN_PROGRESS`. Đồng hồ đo thời gian phản hồi (Response SLA) dừng lại và ghi nhận đạt chuẩn.
4. **`ON_HOLD_PENDING_PARTS` (Tạm dừng chờ linh kiện):** Trong quá trình tháo máy, nếu phát hiện hỏng phụ tùng (ví dụ: vỡ vòng bi SKF, mòn gioăng thủy lực), kỹ thuật viên bấm **"Xin cấp linh kiện"** $\rightarrow$ Hệ thống tự sinh phiếu yêu cầu mua sắm và **TỰ ĐỘNG TẠM DỪNG ĐỒNG HỒ SLA (PAUSED)** để không trừ thời gian của kỹ thuật viên.
5. **`WAITING_VERIFY` (Chờ nghiệm thu):** Sau khi nhận linh kiện thay thế và chạy thử không tải đạt yêu cầu, kỹ thuật viên chụp ảnh hiện trường sau sửa chữa làm bằng chứng đối chiếu và bấm **[Gửi duyệt nghiệm thu]**.
6. **`RESOLVED` (Đóng sự cố):** Quản đốc kiểm tra ảnh trước và sau, xác nhận chất lượng kỹ thuật và bấm **[Đóng sự cố (Resolve)]**. Hệ thống chốt tổng thời gian dừng máy (Downtime) và cập nhật chỉ số phục hồi trung bình (MTTR).

---

### 2. Luồng Kiểm soát Cam kết SLA & Tạm dừng khi thiếu vật tư
* **Ngưỡng cam kết theo độ nghiêm trọng:**
  * **P1 - CRITICAL (Nguy cấp):** Phản hồi trong 15 phút, Xử lý dứt điểm trong 2 giờ.
  * **P2 - HIGH (Cao):** Phản hồi trong 30 phút, Xử lý dứt điểm trong 4 giờ.
  * **P3 - MEDIUM (Trung bình):** Phản hồi trong 2 giờ, Xử lý dứt điểm trong 8 giờ.
  * **P4 - LOW (Thấp):** Phản hồi trong 4 giờ, Xử lý dứt điểm trong 24 giờ.
* **Cơ chế màu sắc cảnh báo thời gian thực:**
  * 🟢 **`IN_SLA` (Màu xanh):** Thời gian còn lại an toàn (> 25%).
  * 🟡 **`WARNING` (Màu vàng cam):** Thời gian còn lại dưới 25%, cảnh báo nguy cơ trễ hẹn.
  * 🔴 **`BREACHED` (Màu đỏ):** Quá thời hạn cam kết, ghi nhận 1 vụ vi phạm SLA vào báo cáo điều hành.
* **Cơ chế Pause / Resume tự động:**
  * Khi chuyển `ON_HOLD_PENDING_PARTS` $\rightarrow$ SLA chuyển trạng thái **`PAUSED`**, đồng hồ dừng đếm.
  * Khi quản đốc duyệt cấp linh kiện $\rightarrow$ Kỹ thuật viên bấm tiếp tục sửa $\rightarrow$ SLA chuyển **`RESUMED`**, đồng hồ tiếp tục đếm ngược từ số phút còn lại trước đó.

---

### 3. Luồng Quét Mã QR & Định danh số Thiết bị (Asset Digital Identity)
1. Mỗi máy móc được gán một mã QR chứa **Token ngẫu nhiên bảo mật (Opaque Token)**, ngăn chặn việc công nhân đoán hoặc sửa URL.
2. Dùng camera điện thoại quét mã QR dán trên thân máy $\rightarrow$ Ứng dụng giải mã token và hiển thị ngay **Digital Context** của thiết bị:
   * Mã máy, tên máy, vị trí phân xưởng (ví dụ: *Máy Phay CNC-024 - Khu Vực B2*).
   * Trạng thái hoạt động (Đang chạy / Tạm dừng / Đang sửa chữa).
   * Lịch sử hỏng hóc 3 lần gần nhất và chu kỳ bảo trì phòng ngừa định kỳ.
   * Nút bấm **"Báo sự cố tức thì"** (tự động điền sẵn mã máy, vị trí, không cần gõ thủ công).

---

### 4. Luồng Tác nghiệp Ngoại tuyến & Đồng bộ Gom lô (Offline-First Delta Sync)
1. **Phát hiện mất mạng:** Khi kỹ thuật viên vào khu vực góc khuất không có Wi-Fi/4G, ứng dụng tự động nhận diện và hiển thị thanh cảnh báo màu cam: **`OfflineSyncBanner • Chế độ ngoại tuyến`**.
2. **Hàng đợi cục bộ (Local Queue):** Kỹ thuật viên vẫn tick checklist kiểm tra máy, nhập ghi chú tiến độ bình thường. Mọi hành động được đóng gói kèm mã định danh duy nhất (`idempotency_key`) và lưu vào bộ nhớ cục bộ IndexedDB/SQLite.
3. **Đồng bộ tự động khi có mạng (Delta Batch Sync):** Khi quay lại vùng có sóng, Sync Engine ngầm gom lô toàn bộ hành động đẩy lên API `/api/v1/sync/batch`. Máy chủ kiểm tra phiên bản dữ liệu (`base_version`) để chống xung đột ghi đè.
4. **Chốt chặn bàn giao ca (Shift Handover Guard):** Nếu kỹ thuật viên bấm **Đăng xuất** khi còn dữ liệu ngoại tuyến chưa gửi lên máy chủ, hệ thống sẽ bật hộp thoại cảnh báo và chặn đăng xuất để tránh mất dữ liệu ca trực.

---

### 5. Luồng Trí Tuệ Nhân Tạo Điều Hành CMMS & Thẻ Hành Động (Action Cards)
1. Quản đốc bấm mục **"Điều hành CMMS"** (`/analytics`) trên Sidebar để vào trung tâm chỉ huy toàn màn hình.
2. Mô hình AI Groq Llama 3.3 (70B) tổng hợp số liệu thực tế từ CSDL phân xưởng $\rightarrow$ tính Điểm sức khỏe nhà máy (Plant Health Score), Tổng Downtime, MTTR, và phân tích sâu 2 cột *Key Findings* & *Root Causes*.
3. AI tự động sinh **Thẻ Hành Động Doanh Nghiệp (Enterprise Action Cards)** đề xuất phương án bảo dưỡng phòng ngừa (Prescriptive PM).
4. **Cơ chế Human-in-the-loop (Người duyệt quyết định):**
   * Nếu là thẻ **"Báo cáo sự cố FSM"**: Quản đốc bấm `[Xác nhận thực hiện]` $\rightarrow$ chuyển thẳng thành sự cố thật tại mục **`Sự cố (Field)`** (`/incidents`) và bật đồng hồ SLA.
   * Nếu là thẻ **"Tạo nhiệm vụ"**: Quản đốc bấm `[Xác nhận thực hiện]` $\rightarrow$ chuyển thành thẻ công việc tại mục **`Trang chủ`** (`/home`).
   * Thẻ đã bấm duyệt sẽ **ngay lập tức biến mất khỏi danh sách chờ duyệt**, nút bấm được khóa chống spam double-click.

---

## PHẦN II: MA TRẬN KỊCH BẢN KIỂM THỬ TOÀN BỘ DỰ ÁN (CÓ ĐỦ INPUT & OUTPUT)

### Nhóm 1: Xác Thực, Phân Quyền & Không Gian Làm Việc (Auth & Workspaces)

| Mã TC | Tên ca kiểm thử | Tiền điều kiện | Các bước thực hiện | Dữ liệu Đầu vào (Input) | Kết quả Kỳ vọng / Đầu ra (Expected Output) | Tiêu chí |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-AUTH-01** | Đăng nhập tài khoản hợp lệ | Đã có tài khoản trong hệ thống | 1. Mở trang `/login`<br>2. Nhập Email & Mật khẩu<br>3. Bấm [Đăng nhập] | **Email:** `admin@flowise.com`<br>**Password:** `Password123!` | • HTTP Status: `200 OK`<br>• Cấp JWT Access Token lưu vào Redux state & localStorage<br>• Chuyển hướng người dùng vào `/home` | **PASS** |
| **TC-AUTH-02** | Đăng nhập sai mật khẩu | Người dùng nhập sai password | 1. Mở `/login`<br>2. Nhập Email đúng, Pass sai<br>3. Bấm [Đăng nhập] | **Email:** `admin@flowise.com`<br>**Password:** `WrongPass999` | • HTTP Status: `401 Unauthorized`<br>• Toast cảnh báo: *"Email hoặc mật khẩu không chính xác"*<br>• Không cấp Token, giữ nguyên trang login | **PASS** |
| **TC-WS-01** | Tạo Không gian làm việc mới | Đã đăng nhập tài khoản | 1. Bấm Workspace Switcher trên Sidebar<br>2. Chọn 'Tạo Workspace mới'<br>3. Điền tên & Bấm Lưu | **Workspace Name:** `"Phân Xưởng Cơ Khí B2"`<br>**Description:** `"Khu vực gia công CNC 5 trục"` | • HTTP Status: `201 Created`<br>• Tạo mới `workspace_id` trong CSDL<br>• Thanh Sidebar tự động chuyển sang Workspace mới vừa tạo | **PASS** |
| **TC-WS-02** | Mời thành viên vào Workspace | Là Admin của Workspace | 1. Bấm [Mời thành viên] góc dưới Sidebar<br>2. Nhập Email người cần mời<br>3. Chọn quyền Member $\rightarrow$ Bấm Gửi | **Email:** `tech.nguyen@flowise.com`<br>**Role:** `"Member"` | • Tạo bản ghi trong `workspace_members`<br>• Gửi thông báo mời thành viên tham gia xưởng | **PASS** |

---

### Nhóm 2: Quản Lý Dự Án & Nhiệm Vụ (Kanban, Sprints & Tasks)

| Mã TC | Tên ca kiểm thử | Tiền điều kiện | Các bước thực hiện | Dữ liệu Đầu vào (Input) | Kết quả Kỳ vọng / Đầu ra (Expected Output) | Tiêu chí |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-TASK-01** | Khởi tạo Sprint sản xuất mới | Đang trong Space phân xưởng | 1. Vào Space 'Phân xưởng'<br>2. Bấm nút [+] tạo Sprint<br>3. Nhập tên, ngày bắt đầu và kết thúc | **Name:** `"Sprint 24 - Đại tu máy CNC"`<br>**Start:** `2026-10-20`<br>**End:** `2026-11-03` | • Tạo Sprint trạng thái `ACTIVE`<br>• Sprint xuất hiện trên thanh điều hướng để chứa các công việc bảo trì | **PASS** |
| **TC-TASK-02** | Tạo thẻ công việc (Task) kèm mức ưu tiên | Sprint đang mở | 1. Bấm nút [Thêm công việc]<br>2. Điền tiêu đề, chọn mức độ ưu tiên, hạn chót $\rightarrow$ Bấm Lưu | **Title:** `"Thay dầu bôi trơn máy CNC-024"`<br>**Priority:** `"URGENT"`<br>**Due:** `2026-10-22` | • Thẻ công việc xuất hiện tại cột `TO DO` trên bảng Kanban<br>• Hiển thị cờ đỏ URGENT và nhãn ngày hết hạn | **PASS** |
| **TC-TASK-03** | Kéo thả Kanban cập nhật tiến độ | Có thẻ task ở cột `TO DO` | 1. Dùng chuột giữ thẻ task<br>2. Kéo từ cột `TO DO` sang `IN PROGRESS`<br>3. Thả chuột | **Drag Event:** Thẻ Task ID 104<br>**Target Column:** `"IN PROGRESS"` | • API cập nhật `status = 'IN PROGRESS'`<br>• Lịch sử hoạt động (Activity Log) ghi nhận thời điểm dời cột | **PASS** |
| **TC-TIME-01** | Bấm giờ theo dõi thời gian (Time Tracking) | Task đang xử lý | 1. Mở chi tiết công việc<br>2. Bấm nút [Bắt đầu tính giờ]<br>3. Sau khi làm xong, bấm [Dừng & Lưu] | **Task:** `"Căn chỉnh góc dao CNC"`<br>**Duration:** `45 phút`<br>**Note:** `"Đã chỉnh sai số < 0.01mm"` | • Ghi nhận 45 phút vào bảng `time_entries`<br>• Tổng thời gian làm việc của Task tăng tương ứng | **PASS** |

---

### Nhóm 3: Quản Lý Thiết Bị & Mã QR (Asset Master & QR Context)

| Mã TC | Tên ca kiểm thử | Tiền điều kiện | Các bước thực hiện | Dữ liệu Đầu vào (Input) | Kết quả Kỳ vọng / Đầu ra (Expected Output) | Tiêu chí |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-AST-01** | Khởi tạo hồ sơ thiết bị kỹ thuật mới | Quyền Quản lý thiết bị | 1. Vào mục 'Thiết bị & QR' (`/assets`)<br>2. Bấm [Thêm thiết bị mới]<br>3. Điền mã, tên, vị trí, chu kỳ PM | **Code:** `"CNC-024"`<br>**Name:** `"Máy Phay CNC 5 Trục Số 24"`<br>**Location:** `"Khu Vực B2"`<br>**PM Cycle:** `30 ngày` | • Lưu thông tin vào bảng `assets`<br>• Hệ thống tự động sinh ra một mã QR Opaque Token bảo mật | **PASS** |
| **TC-AST-02** | Xem và tải mã QR định danh số | Thiết bị đã tạo mã QR | 1. Trong danh sách thiết bị, bấm nút [Xem mã QR] tại dòng CNC-024<br>2. Bấm [Tải mã QR (PNG)] | **Asset Code:** `CNC-024` | • Hiển thị Modal mã QR sắc nét có logo Flowise<br>• Tải xuống file ảnh PNG để in dán lên vỏ máy | **PASS** |
| **TC-AST-03** | Quét mã QR tra cứu Digital Context | Đã có QR Token máy | 1. Quét mã QR của máy CNC-024 bằng camera<br>2. Hệ thống gọi API giải mã context | **QR Token:** `qr_tok_cnc024_x98f2` | • Hiển thị ngay: Tên máy, vị trí, trạng thái vận hành, 3 lần hỏng gần nhất<br>• Nút [Báo sự cố tức thì] tự động điền sẵn máy CNC-024 | **PASS** |

---

### Nhóm 4: Quản Lý Sự Cố Hiện Trường & Máy Trạng Thái FSM

| Mã TC | Tên ca kiểm thử | Tiền điều kiện | Các bước thực hiện | Dữ liệu Đầu vào (Input) | Kết quả Kỳ vọng / Đầu ra (Expected Output) | Tiêu chí |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-INC-01** | Báo sự cố khẩn cấp P1 có ảnh hiện trường | Máy móc gặp sự cố hỏng | 1. Tại `/incidents`, bấm [+ Báo cáo sự cố mới]<br>2. Chọn máy CNC-024, mức độ CRITICAL<br>3. Tải lên ảnh hiện trường hỏng<br>4. Bấm Gửi | **Title:** `"Trục chính rung giật dữ dội"`<br>**Severity:** `"CRITICAL"`<br>**Asset:** `"CNC-024"`<br>**Evidence File:** `vibrate_axis.jpg` | • Tạo sự cố trạng thái FSM: `REPORTED`<br>• Tự động kích hoạt đồng hồ Response SLA: 15 phút<br>• Thẻ sự cố màu đỏ xuất hiện tức thì trên màn hình quản lý | **PASS** |
| **TC-INC-02** | Quản đốc phân công kỹ thuật viên (Assign) | Sự cố đang ở `REPORTED` | 1. Quản đốc mở phiếu sự cố<br>2. Bấm nút [Chỉ định kỹ thuật viên]<br>3. Chọn người xử lý $\rightarrow$ Bấm Xác nhận | **Assignee:** `"Nguyễn Văn Kỹ Thuật"`<br>**Note:** `"Kiểm tra cụm bạc đạn bệ đỡ trước"` | • Trạng thái FSM chuyển sang `ASSIGNED`<br>• Kỹ thuật viên nhận được Push Notification trên ứng dụng | **PASS** |
| **TC-INC-03** | Kỹ thuật viên tiếp nhận & Bắt đầu sửa chữa | Sự cố đang ở `ASSIGNED` | 1. Kỹ thuật viên mở chi tiết sự cố<br>2. Bấm nút [Bắt đầu xử lý (Start Work)] | **Action:** `START_WORK`<br>**User:** Kỹ thuật viên phụ trách | • Trạng thái FSM chuyển sang `IN_PROGRESS`<br>• Đồng hồ Response SLA dừng và ghi nhận ĐẠT CHUẨN | **PASS** |
| **TC-INC-04** | Nghiệm thu và Đóng sự cố hoàn tất | Sự cố đang ở `WAITING_VERIFY` | 1. Kỹ thuật viên chụp ảnh sau sửa chữa $\rightarrow$ Bấm [Gửi nghiệm thu]<br>2. Quản đốc đối chiếu ảnh và bấm [Đóng sự cố (Resolve)] | **Resolution Note:** `"Đã thay bạc đạn SKF mới, bôi trơn và cân bằng động đạt chuẩn"`<br>**Action:** `RESOLVE` | • Trạng thái FSM chuyển sang `RESOLVED`<br>• Đồng hồ Resolution SLA chốt thời gian thực tế<br>• Tính tổng Downtime và cập nhật chỉ số MTTR | **PASS** |

---

### Nhóm 5: Kiểm Soát SLA & Cơ Chế Tạm Dừng Khi Chờ Linh Kiện

| Mã TC | Tên ca kiểm thử | Tiền điều kiện | Các bước thực hiện | Dữ liệu Đầu vào (Input) | Kết quả Kỳ vọng / Đầu ra (Expected Output) | Tiêu chí |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-SLA-01** | Đếm ngược SLA thời gian thực | Sự cố được tạo mức độ P2 | 1. Mở màn hình chi tiết sự cố P2<br>2. Quan sát đồng hồ đếm ngược | **Severity:** `P2 - HIGH`<br>**Target:** `4 giờ (240 phút)` | • Đồng hồ đếm lùi từng giây: `03h:59m:59s...`<br>• Nhãn trạng thái màu xanh lá: `IN_SLA` | **PASS** |
| **TC-SLA-02** | Yêu cầu linh kiện & TỰ ĐỘNG TẠM DỪNG SLA | Sự cố đang `IN_PROGRESS` | 1. Kỹ thuật viên bấm nút [Xin cấp linh kiện]<br>2. Nhập tên phụ tùng, số lượng<br>3. Bấm Gửi yêu cầu | **Part Name:** `"Vòng bi SKF-6205"`<br>**Quantity:** `2 cái`<br>**Reason:** `"Bạc đạn cũ bị vỡ bi rơ lắc"` | • Trạng thái sự cố chuyển sang `ON_HOLD_PENDING_PARTS`<br>• **ĐỒNG HỒ SLA LẬP TỨC TẠM DỪNG (`PAUSED`)**, ngừng đếm ngược để bảo vệ chỉ số cho kỹ thuật viên | **PASS** |
| **TC-SLA-03** | Nhận linh kiện & TỰ ĐỘNG KÍCH HOẠT LẠI SLA | Đang ở `ON_HOLD_PENDING_PARTS` | 1. Quản đốc duyệt xuất kho vật tư<br>2. Kỹ thuật viên nhận được linh kiện, bấm [Tiếp tục sửa chữa] | **Action:** `RESUME_WORK`<br>**User:** Kỹ thuật viên | • Trạng thái sự cố trở lại `IN_PROGRESS`<br>• **ĐỒNG HỒ SLA TỰ ĐỘNG TIẾP TỤC ĐẾM (`RESUMED`)** từ số phút còn lại trước khi dừng | **PASS** |
| **TC-SLA-04** | Cảnh báo vi phạm cam kết SLA (Breached) | Sự cố quá thời hạn cho phép | 1. Để sự cố vượt ngưỡng thời gian quy định | **Elapsed Time:** `> 4 giờ` đối với sự cố mức P2 | • Nhãn SLA chuyển sang màu đỏ rực: `VI PHẠM (BREACHED)`<br>• Bảng điều hành CMMS ghi nhận tăng thêm 1 vụ vi phạm | **PASS** |

---

### Nhóm 6: Tác Nghiệp Ngoại Tuyến (Offline-First Engine)

| Mã TC | Tên ca kiểm thử | Tiền điều kiện | Các bước thực hiện | Dữ liệu Đầu vào (Input) | Kết quả Kỳ vọng / Đầu ra (Expected Output) | Tiêu chí |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-OFF-01** | Phát hiện mất mạng & Tác nghiệp ngoại tuyến | Ứng dụng đang mở | 1. Bật Chế độ máy bay (ngắt kết nối Wi-Fi/4G)<br>2. Thực hiện tick 3 mục checklist và nhập ghi chú tiến độ | **Network Status:** `Offline`<br>**Action:** Đánh dấu checklist + Ghi chú: `"Đã tháo xong cụm nắp che"` | • Ứng dụng không bị văng lỗi hay trắng màn hình<br>• Xuất hiện banner màu cam: `Chế độ ngoại tuyến • 2 thao tác đang chờ đồng bộ`<br>• Dữ liệu lưu an toàn trong IndexedDB Queue | **PASS** |
| **TC-OFF-02** | Tự động đồng bộ gom lô khi có sóng trở lại | Đang có thao tác trong hàng đợi offline | 1. Tắt Chế độ máy bay (Khôi phục Wi-Fi/4G)<br>2. Quan sát ứng dụng | **Network Status:** `Online restored` | • Sync Engine tự động gom lô gửi lên `/api/v1/sync/batch`<br>• Khử trùng lặp qua `idempotency_key`<br>• Banner chuyển sang màu xanh: `Đã đồng bộ thành công` | **PASS** |
| **TC-OFF-03** | Chốt chặn bảo vệ bàn giao ca (Shift Handover Guard) | Có thao tác ngoại tuyến chưa đồng bộ | 1. Trong lúc còn thao tác offline chưa gửi lên server<br>2. Bấm nút [Đăng xuất] ở thanh Sidebar | **Action:** `Logout`<br>**Offline Queue:** `Còn 2 thao tác chưa gửi` | • Bật Modal cảnh báo: *"Bạn đang có thao tác ngoại tuyến chưa đồng bộ. Nếu đăng xuất bây giờ sẽ mất dữ liệu ca trực!"*<br>• Chặn đăng xuất trừ khi người dùng xác nhận | **PASS** |

---

### Nhóm 7: Trung Tâm Điều Hành CMMS & Trí Tuệ Nhân Tạo (Groq Llama 3.3)

| Mã TC | Tên ca kiểm thử | Tiền điều kiện | Các bước thực hiện | Dữ liệu Đầu vào (Input) | Kết quả Kỳ vọng / Đầu ra (Expected Output) | Tiêu chí |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-CMMS-01**| Truy cập Trung tâm Điều hành từ Sidebar | Đang ở bất kỳ màn hình nào | 1. Tìm mục có icon nhịp sóng tim 'Điều hành CMMS' trên Sidebar bên trái<br>2. Bấm vào mục này | **Route:** `/analytics` | • URL chuyển sang `/analytics`<br>• Mở toàn màn hình trung tâm điều hành với 5 Hero KPI (Điểm sức khỏe vòng cung, Tổng Downtime, MTTR, P1/P2, SLA) | **PASS** |
| **TC-CMMS-02**| Chuyển đổi bộ lọc chu kỳ điều hành | Đang ở trang Điều hành CMMS | 1. Bấm tab 'Tuần này'<br>2. Bấm nút [Phân tích lại] màu tím-hồng | **Period:** `"week"` | • Nút phân tích hiển thị icon xoay loading<br>• Các chỉ số Downtime, MTTR, % SLA tự động tính toán lại khớp với tuần hiện tại | **PASS** |
| **TC-CMMS-03**| AI phân tích nguyên nhân gốc rễ & Khuyến nghị | Có dữ liệu sự cố trong CSDL | 1. Quan sát khối 'Executive AI Synthesis' và 2 cột Findings / Root Causes | **Dữ liệu thực tế:** Máy CNC-024 dừng 1605 phút, 2 sự cố khẩn cấp | • AI Groq Llama 3.3 phân tích đúng: Hiện tượng quá nhiệt và kẹt phoi cụm trục chính<br>• Đưa ra 3 khuyến nghị kỹ thuật phòng ngừa (Prescriptive PM) | **PASS** |
| **TC-CMMS-04**| Bảng xếp hạng thiết bị điểm nghẽn Downtime | Có máy móc bị gián đoạn vận hành | 1. Cuộn xuống bảng 'Xếp Hạng Thiết Bị Điểm Nghẽn'<br>2. Xem tỷ lệ % tác động<br>3. Bấm [Xem sự cố] | **Row:** Máy CNC-024 (Chiếm 100% Downtime) | • Hiển thị thanh tiến trình màu đỏ cảnh báo mức độ ảnh hưởng<br>• Bấm [Xem sự cố] chuyển hướng sang trang Sự cố lọc đúng máy CNC-024 | **PASS** |

---

### Nhóm 8: Thẻ Hành Động Doanh Nghiệp (Enterprise Action Cards - Human-in-the-loop)

| Mã TC | Tên ca kiểm thử | Tiền điều kiện | Các bước thực hiện | Dữ liệu Đầu vào (Input) | Kết quả Kỳ vọng / Đầu ra (Expected Output) | Tiêu chí |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-ACT-01** | Phê duyệt 1-chạm Thẻ Hành Động đề xuất | Có thẻ hành động trong danh sách | 1. Tại mục Action Cards, chọn thẻ sự cố CNC-024<br>2. Bấm nút [Xác nhận thực hiện] | **Card ID:** `card_ai_1`<br>**Action:** `CREATE_INCIDENT` | • Gọi API tạo sự cố thành công<br>• **THẺ LẬP TỨC BIẾN MẤT KHỎI HÀNG ĐỢI DUYỆT**<br>• Hiện thông báo kèm nút: `[Xem tại Sự cố (Field) →]` | **PASS** |
| **TC-ACT-02** | Khóa chống click liên tục (Anti-double click) | Thẻ đang hiển thị | 1. Bấm nút [Xác nhận thực hiện] nhiều lần liên tiếp thật nhanh | **Multiple rapid clicks** | • Nút bấm bị khóa (`disabled`) ngay từ cú click đầu tiên<br>• Chỉ gửi duy nhất 1 request lên máy chủ, không bị spam hàng chục thông báo toast | **PASS** |
| **TC-ACT-03** | Hoàn tất duyệt & Đặt lại danh sách thẻ | Đã duyệt hết tất cả các thẻ | 1. Duyệt hết các thẻ trong kỳ<br>2. Bấm nút [Đặt lại danh sách duyệt] | **Action:** `RESET_ACTION_CARDS` | • Khi duyệt hết: Hiển thị Banner chúc mừng màu xanh ngọc: *"Toàn bộ Thẻ Hành Động đã được phê duyệt"*<br>• Bấm [Đặt lại]: Hàng đợi thẻ được khôi phục lại ban đầu | **PASS** |

---

### Nhóm 9: Công Cụ In Ấn Báo Cáo A4 & Xuất File PDF

| Mã TC | Tên ca kiểm thử | Tiền điều kiện | Các bước thực hiện | Dữ liệu Đầu vào (Input) | Kết quả Kỳ vọng / Đầu ra (Expected Output) | Tiêu chí |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-PRN-01** | In Báo cáo Điều hành CMMS khổ A4 dọc | Đang ở trang `/analytics` | 1. Bấm nút [In báo cáo] góc trên bên phải (hoặc nhấn `Ctrl + P`)<br>2. Kiểm tra khung xem trước Print Preview | **Print Options:** Khổ A4, Portrait, Save as PDF | • Bản in phân trang tự nhiên (2 trang), **KHÔNG CÒN LỖI 'Total: 1 sheet of paper'** bị cắt ngang<br>• Toàn bộ nội dung hiển thị đầy đủ, sắc nét | **PASS** |
| **TC-PRN-02** | Kiểm tra Header doanh nghiệp & Ẩn control web | Đang ở chế độ xem trước bản in | 1. Quan sát đầu trang 1 và các nút bấm trên bản in | **CSS Media:** `@media print` | • Xuất hiện Header in doanh nghiệp trang trọng: *"FLOWISE ENTERPRISE CMMS & RELIABILITY PLATFORM - BÁO CÁO ĐIỀU HÀNH ĐỘ TIN CẬY THIẾT BỊ"*<br>• Sidebar, nút Menu mobile, nút In, tab chọn chu kỳ bị ẩn hoàn toàn | **PASS** |
