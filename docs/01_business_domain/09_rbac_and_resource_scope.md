# 🛡️ PHÂN QUYỀN HỆ THỐNG & PHẠM VI TÀI NGUYÊN (RBAC & RESOURCE SCOPE)

> **Phân hệ:** Bảo mật & Quản lý danh tính (IAM)  
> **Áp dụng cho:** Toàn bộ người dùng Web & Mobile  
> **Thuộc hệ thống:** [Tài liệu đặc tả nghiệp vụ Flowse 2.0](file:///c:/Users/Vinh%20Nguyen/MOBILE/flowse-enterprise-platform/docs/)

---

## 1. NGUYÊN TẮC THIẾT KẾ TINH GỌN (PRAGMATIC RBAC)

Để đảm bảo vừa đáp ứng đầy đủ yêu cầu nghiệp vụ thực tế của doanh nghiệp sản xuất, vừa giữ mã nguồn tinh gọn cho Bài tập lớn (tránh Over-engineering):
* **Cấp độ Tổ chức (Workspace Roles):** Hệ thống kế thừa trọn vẹn mô hình 3 vai trò gốc của Flowse 1.0:
  1. **`Admin`**: Quản trị viên hệ thống (quản lý thành viên, phòng ban, cấu hình quy trình, xem audit log).
  2. **`Manager`**: Trưởng phòng / Trưởng ca / Quản đốc (phân công việc, duyệt đề xuất, nghiệm thu sự cố, giám sát Dashboard).
  3. **`Member`**: Nhân viên / Thành viên tổ chức (quét QR báo sự cố, nhận việc được giao, tick checklist, trao đổi bình luận).
* **Cấp độ Hiện trường (Field Execution Context):** 
  * Thay vì tạo ra hàng loạt vai trò cứng trong cơ sở dữ liệu (`Technician`, `QA`, `Worker`), hệ thống xác định quyền hạn thông qua **Vai trò ngữ cảnh (Contextual Responsibility)**:
    * Khi một `Member` được gán vào `assignee_id` của một Sự cố $\rightarrow$ Họ tự động có quyền Kỹ thuật viên xử lý (`Technician`) trên sự cố đó.
    * Khi một `Member` tạo ra sự cố $\rightarrow$ Họ là Người báo cáo (`Reporter`).

---

## 2. MA TRẬN QUYỀN THEO HÀNH ĐỘNG (ACTION PERMISSION MATRIX)

Mọi API nghiệp vụ được bảo vệ bởi middleware kiểm tra quyền hạn chi tiết:

| Nhóm hành động (Action Key) | Mô tả hành động | `Admin` | `Manager` | `Member` (Người thường) | `Member` (Được giao việc / Assignee) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **`work_item.create`** | Tạo Task / Báo sự cố / Tạo đề xuất | ✓ | ✓ | ✓ | ✓ |
| **`work_item.view_all`** | Xem toàn bộ việc trong Workspace | ✓ | ✓ | Chỉ xem việc phòng mình | Chỉ xem việc phòng mình |
| **`work_item.assign`** | Phân công người xử lý cho sự cố/task | ✓ | ✓ | ✗ | ✗ |
| **`work_item.start`** | Tiếp nhận chuyển sang `IN_PROGRESS` | ✓ | ✓ | ✗ | ✓ |
| **`work_item.on_hold`** | Tạm dừng chờ linh kiện (`ON_HOLD`) | ✓ | ✓ | ✗ | ✓ |
| **`work_item.verify`** | Nghiệm thu và đóng sự cố (`RESOLVED`) | ✓ | ✓ | ✗ | ✗ |
| **`approval.decision`** | Bấm Duyệt (`APPROVE`) hoặc Từ chối | ✓ | ✓ | ✗ | ✗ |
| **`workflow.manage`** | Sửa định nghĩa quy trình State Machine | ✓ | ✓ | ✗ | ✗ |
| **`audit.view`** | Tra cứu nhật ký kiểm toán hệ thống | ✓ | ✓ | ✗ | ✗ |

---

## 3. PHẠM VI TÀI NGUYÊN THEO PHÒNG BAN (DEPARTMENT RESOURCE SCOPE)

Bên cạnh vai trò, quyền truy cập dữ liệu còn bị ràng buộc bởi **Phạm vi tài nguyên (Resource Scope)** theo cấu trúc tổ chức:

```text
                        WORKSPACE TỔNG CÔNG TY
                 ┌──────────────────┴──────────────────┐
                 ▼                                     ▼
        PHÂN XƯỞNG CƠ KHÍ A                   PHÂN XƯỞNG LẮP RÁP B
    ┌─────────────────────────┐           ┌─────────────────────────┐
    │ Quản lý: Trần Văn Quản  │           │ Quản lý: Lê Thị Trưởng  │
    │ Nhân viên: Nguyễn Kỹ Thuật│         │ Nhân viên: Phạm Lắp Ráp │
    │ Thiết bị: Máy CNC-024   │           │ Thiết bị: Dây chuyền LC │
    └─────────────────────────┘           └─────────────────────────┘
```

### Quy tắc kiểm tra (Enforcement Rules):
1. **Cô lập dữ liệu sự cố:** Kỹ thuật viên thuộc *Phân xưởng Cơ khí A* khi mở tab My Work chỉ nhìn thấy các sự cố của các thiết bị thuộc Phân xưởng A; không nhìn thấy máy móc của Phân xưởng B.
2. **Cô lập thẩm quyền phê duyệt:** Quản đốc *Phân xưởng A* chỉ có quyền bấm duyệt (`Approve`) các đề xuất vật tư phát sinh từ các sự cố trong phân xưởng của mình; không được duyệt chéo sang phân xưởng khác.
3. **Admin toàn quyền:** Chỉ có tài khoản mang vai trò `Admin` mới có quyền xem Dashboard và điều phối công việc xuyên suốt toàn bộ các phân xưởng.
