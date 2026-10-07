# 🚨 QUẢN LÝ SỰ CỐ HIỆN TRƯỜNG (INCIDENT MANAGEMENT)

> **Phân hệ:** Tác nghiệp hiện trường (Field Operations)  
> **Áp dụng cho:** Công nhân, Kỹ thuật viên bảo trì, Trưởng ca, Quản lý sản xuất  
> **Thuộc hệ thống:** [Tài liệu đặc tả nghiệp vụ Flowse 2.0](file:///c:/Users/Vinh%20Nguyen/MOBILE/flowse-enterprise-platform/docs/)

---

## 1. MỤC TIÊU & BÀI TOÁN THỰC TẾ

Tại các nhà máy và phân xưởng sản xuất, khi xảy ra sự cố máy móc:
* Công nhân thường báo bằng miệng, gọi điện thoại hoặc nhắn tin Zalo không có cấu trúc.
* Thông tin bị thất lạc, không rõ máy nào, triệu chứng ra sao, ai chịu trách nhiệm sửa chữa.
* Không có bằng chứng hình ảnh ban đầu dẫn đến việc tranh cãi về nguyên nhân gây hỏng hóc.
* Cấp quản lý không nắm được thời gian dừng máy (Downtime) và không kiểm soát được tiến độ xử lý.

**Phân hệ Quản lý Sự cố Flowse 2.0** giải quyết triệt để vấn đề này bằng cách số hóa toàn diện từ lúc quét mã QR trên thân máy, phân loại mức độ khẩn cấp, điều phối kỹ thuật viên, theo dõi đồng hồ SLA cho đến khi nghiệm thu nghiệm ngặt.

---

## 2. BẢNG PHÂN LOẠI MỨC ĐỘ NGHIÊM TRỌNG (SEVERITY LEVELS)

Hệ thống chuẩn hóa 4 mức độ nghiêm trọng (Severity Matrix), gắn liền với cam kết thời gian phản hồi (Response SLA) và thời gian giải quyết triệt để (Resolution SLA):

| Mức độ (Severity) | Tên gọi | Định nghĩa & Tiêu chí tác động thực tế | Cam kết phản hồi (Response SLA) | Cam kết khắc phục (Resolve SLA) | Chế độ tính giờ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`CRITICAL` (P1)** | Cực kỳ khẩn cấp | Dừng toàn bộ dây chuyền sản xuất; Nguy cơ cháy nổ, mất an toàn lao động nghiêm trọng. | **15 phút** | **2 giờ** | 24/7 (Kể cả ban đêm/ngày nghỉ) |
| **`HIGH` (P2)** | Nghiêm trọng | Hỏng hóc tại cụm máy trạm quan trọng nhưng có máy dự phòng chia tải; Giảm 50% năng suất. | **30 phút** | **4 giờ** | 24/7 |
| **`MEDIUM` (P3)** | Trung bình | Máy vẫn hoạt động nhưng có dấu hiệu bất thường (nóng máy, rung lắc, rò rỉ dầu nhẹ). | **2 giờ** | **12 giờ** | Giờ làm việc tiêu chuẩn |
| **`LOW` (P4)** | Thấp | Lỗi thẩm mỹ, đèn báo hiệu hỏng, lớp sơn bảo vệ bong tróc, vệ sinh công nghiệp. | **8 giờ** | **48 giờ** | Giờ làm việc tiêu chuẩn |

> [!NOTE]
> * **Response Time (Thời gian phản hồi):** Tính từ lúc sự cố được gửi (`REPORTED`) cho đến khi có Quản lý tiếp nhận phân công (`ASSIGNED`) hoặc Kỹ thuật viên bấm tiếp nhận (`IN_PROGRESS`).
> * **Resolution Time (Thời gian khắc phục):** Tính từ lúc Kỹ thuật viên bắt đầu xử lý đến khi hoàn tất sửa chữa và gửi nghiệm thu (`WAITING_VERIFY`).

---

## 3. MA TRẬN TRÁCH NHIỆM RACI (RACI MATRIX)

| Bước nghiệp vụ | Công nhân vận hành (`Worker/Operator`) | Kỹ thuật viên bảo trì (`Technician`) | Trưởng ca / Quản đốc (`Supervisor/Manager`) | Kiểm soát chất lượng (`QA Inspector`) |
| :--- | :---: | :---: | :---: | :---: |
| **1. Quét QR & Gửi báo cáo sự cố** | **R** (Thực hiện) | C (Được thông báo) | I (Được thông báo) | I |
| **2. Triage & Đánh giá mức độ Severity** | I | C (Tư vấn kỹ thuật) | **A / R** (Quyết định) | I |
| **3. Phân công người xử lý (Assignment)** | I | I | **A / R** (Chỉ định) | I |
| **4. Tiếp nhận & Thực hiện sửa chữa** | I | **A / R** (Trực tiếp làm) | S (Giám sát) | I |
| **5. Đề xuất xin cấp linh kiện thay thế** | I | **R** (Lập yêu cầu) | **A** (Phê duyệt) | I |
| **6. Nghiệm thu kỹ thuật sau sửa chữa** | C (Chạy thử máy) | R (Giải trình kết quả) | **A** (Ký xác nhận) | **R** (Kiểm tra độc lập) |
| **7. Đóng sự cố & Lưu nhật ký thiết bị** | I | I | **A / R** (Đóng hồ sơ) | I |

*(Chú thích: R = Responsible - Người thực hiện; A = Accountable - Người chịu trách nhiệm phê duyệt; C = Consulted - Người được hỏi ý kiến; I = Informed - Người được thông báo).*

---

## 4. QUẢN LÝ BẰNG CHỨNG HÌNH ẢNH (EVIDENCE LIFECYCLE)

Để ngăn chặn việc nghiệm thu hình thức, hệ thống áp dụng cơ chế **Bằng chứng hai đầu (Two-ended Evidence Protocol)**:

```text
    ┌───────────────────────┐            ┌───────────────────────┐
    │  BẰNG CHỨNG BAN ĐẦU   │            │  BẰNG CHỨNG NGHIỆM THU│
    │  (Initial Evidence)   │            │  (Resolved Evidence)  │
    └──────────┬────────────┘            └───────────┬───────────┘
               │                                     │
               ▼                                     ▼
      Ảnh chụp góc rộng                     Ảnh chụp chi tiết máy
    + Chi tiết vị trí lỗi                 sau khi đã thay đồ mới
    + Thời gian & Tọa độ GPS              + Video máy chạy thử êm
               │                                     │
               └───────────────┬─────────────────────┘
                               ▼
              Đối chiếu trực quan trên Web Console
                    trước khi bấm Phê duyệt
```

1. **Initial Evidence (Bắt buộc lúc tạo sự cố):**
   * Người báo cáo phải chụp ảnh trực tiếp từ camera của app (không dùng ảnh cũ trong thư viện để tránh gian lận).
   * Hệ thống tự động ghi nhận metadata: thời gian chụp, mã QR máy và thông tin người chụp.
2. **Resolved Evidence (Bắt buộc lúc nghiệm thu):**
   * Khi hoàn tất sửa chữa, Kỹ thuật viên bắt buộc phải chụp ảnh linh kiện mới đã được lắp đặt hoàn chỉnh.
   * Nếu không có ảnh này, Workflow Engine sẽ **chặn đứng bước chuyển sang trạng thái `WAITING_VERIFY`**.

---

## 5. ĐIỀU KIỆN MỞ LẠI SỰ CỐ (REOPEN PROTOCOL)

* Trong vòng **24 giờ** kể từ thời điểm sự cố chuyển sang `RESOLVED`:
  * Nếu máy móc vận hành thử nghiệm bị tái phát đúng hiện tượng lỗi cũ, Quản lý hoặc Công nhân vận hành có quyền bấm **Mở lại sự cố (Reopen Incident)**.
  * Hệ thống tự động chuyển trạng thái từ `RESOLVED` quay lại `IN_PROGRESS` và gán lại cho Kỹ thuật viên đã xử lý trước đó.
  * Bản ghi kiểm toán ghi nhận đây là sự cố bị Reopen (Trừ điểm KPI chất lượng sửa chữa).
* Sau 24 giờ không có khiếu nại, sự cố tự động khóa vĩnh viễn (`CLOSED`) và trở thành dữ liệu lịch sử bảo dưỡng của máy.
