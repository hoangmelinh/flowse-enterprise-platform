# 📡 DANH MỤC HỢP ĐỒNG API TOÀN HỆ THỐNG (API CONTRACT MATRIX)

> **Phân hệ:** Giao thức giao tiếp Backend ↔ Frontend / Mobile  
> **Phiên bản API:** `/api/v1`  
> **Thuộc hệ thống:** [Tài liệu đặc tả nghiệp vụ Flowse 2.0](file:///c:/Users/Vinh%20Nguyen/MOBILE/flowse-enterprise-platform/docs/)

---

## 1. NGUYÊN TẮC THIẾT KẾ & QUY CHUẨN MÃ LỖI

* **Định dạng dữ liệu:** Mọi phản hồi đều theo chuẩn JSON:
  ```json
  {
    "success": true,
    "data": { ... },
    "message": "Thông báo thân thiện nếu có"
  }
  ```
* **Quy chuẩn mã lỗi HTTP:**
  * `200 OK` / `201 Created`: Yêu cầu thực thi thành công.
  * `400 Bad Request`: Thiếu trường bắt buộc, dữ liệu không đúng định dạng.
  * `401 Unauthorized`: Chưa đăng nhập hoặc Access Token hết hạn.
  * `403 Forbidden`: Người dùng không đủ quyền thực hiện hành động này trong Workspace.
  * `404 Not Found`: Không tìm thấy bản ghi.
  * `409 Conflict`: **Xung đột phiên bản dữ liệu ngoại tuyến (Optimistic Lock mismatch: `base_version < current_version`)**.
  * `429 Too Many Requests`: Vượt ngưỡng Rate Limiting.
  * `500 Internal Server Error`: Lỗi máy chủ.

---

## 2. BẢNG DANH MỤC ENDPOINTS THEO PHÂN HỆ

### 2.1. Xác thực & Người dùng (Identity & Access Management)
| Phương thức | Đường dẫn API | Mục đích nghiệp vụ | Quyền tối thiểu |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Đăng ký tài khoản người dùng mới | Public |
| `POST` | `/api/v1/auth/login` | Đăng nhập bằng Email/Password $\rightarrow$ Cấp Cookie JWT | Public |
| `POST` | `/api/v1/auth/google-login` | Đăng nhập nhanh bằng Google OAuth 2.0 | Public |
| `POST` | `/api/v1/auth/refresh-token` | Làm mới Access Token khi token cũ hết hạn | Public |
| `POST` | `/api/v1/auth/logout` | Hủy phiên làm việc và xóa Cookies | Authenticated |
| `GET` | `/api/v1/users/profile` | Lấy thông tin cá nhân và quyền của user hiện tại | `Member` |
| `GET` | `/api/v1/departments` | Lấy danh sách các phòng ban/phân xưởng trong hệ thống | `Member` |

### 2.2. Đối tượng công việc & Máy trạng thái (Work Items & Workflow Engine)
| Phương thức | Đường dẫn API | Mục đích nghiệp vụ | Quyền tối thiểu |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/work-items/my-work` | Lấy danh sách việc của tôi (Today, Overdue, Waiting) | `Member` |
| `GET` | `/api/v1/work-items/:id` | Xem thông tin chi tiết một Work Item kèm lịch sử | `Member` |
| `POST` | `/api/v1/work-items` | Tạo Work Item mới (Task, Incident, Request) | `Member` |
| `GET` | `/api/v1/workflows/:id/transitions` | Lấy danh sách các bước chuyển hợp lệ cho item | `Member` |
| `POST` | `/api/v1/workflows/:id/transition` | Thực thi bước chuyển trạng thái trong State Machine | Tùy `allowed_roles` |
| `GET` | `/api/v1/workflows` | Danh sách các định nghĩa quy trình đang áp dụng | `Manager` |

### 2.3. Sự cố hiện trường (Incident Management)
| Phương thức | Đường dẫn API | Mục đích nghiệp vụ | Quyền tối thiểu |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/incidents` | Danh sách sự cố hiện trường kèm trạng thái và bộ lọc | `Member` |
| `POST` | `/api/v1/incidents` | Báo sự cố máy móc mới (tự động khởi tạo Response SLA) | `Member` |
| `POST` | `/api/v1/incidents/:id/assign` | Quản đốc chỉ định Kỹ thuật viên xử lý | `Manager` |
| `POST` | `/api/v1/incidents/:id/evidence` | Tải ảnh chụp hiện trường hoặc ảnh sau sửa chữa | `Member` |
| `POST` | `/api/v1/incidents/:id/reopen` | Mở lại sự cố trong vòng 24 giờ sau khi đã đóng | `Manager` |

### 2.4. Trung tâm phê duyệt (Approval Center)
| Phương thức | Đường dẫn API | Mục đích nghiệp vụ | Quyền tối thiểu |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/approvals/pending` | Danh sách các đề xuất đang chờ cấp quản lý xem xét | `Manager` |
| `POST` | `/api/v1/approvals/:id/decision` | Ra quyết định phê duyệt (`APPROVED`) hoặc từ chối (`REJECTED`) | `Manager`, `Admin` |

### 2.5. Kiểm tra bảo dưỡng & Checklist (Inspection Engine)
| Phương thức | Đường dẫn API | Mục đích nghiệp vụ | Quyền tối thiểu |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/inspections/templates` | Lấy danh mục các mẫu checklist định kỳ | `Member` |
| `GET` | `/api/v1/inspections/:id` | Lấy chi tiết phiếu kiểm tra kèm danh sách câu hỏi | `Member` |
| `POST` | `/api/v1/inspections/:id/submit` | Nộp kết quả kiểm tra (tự kích hoạt sự cố nếu có lỗi) | `Member` |

### 2.6. Định danh thiết bị & Ngữ cảnh QR (Asset & QR Context)
| Phương thức | Đường dẫn API | Mục đích nghiệp vụ | Quyền tối thiểu |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/assets` | Danh mục toàn bộ máy móc thiết bị trong xưởng | `Member` |
| `GET` | `/api/v1/assets/:id` | Xem chi tiết thông số và hồ sơ bảo dưỡng của máy | `Member` |
| `GET` | `/api/v1/assets/resolve?token=...` | **Giải mã mã QR Opaque Token, trả về Digital Context** | `Member` |
| `POST` | `/api/v1/assets` | Khai báo máy móc mới vào hệ thống | `Admin` |
| `POST` | `/api/v1/assets/:id/rotate-qr` | Cấp lại mã QR mới khi tem cũ bị lộ hoặc hỏng | `Admin` |

### 2.7. Tác nghiệp ngoại tuyến (Offline Batch Sync)
| Phương thức | Đường dẫn API | Mục đích nghiệp vụ | Quyền tối thiểu |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/sync/batch` | **Đẩy gói đồng bộ ngoại tuyến theo lô kèm `idempotency_key` và `base_version`** | `Member` |

### 2.8. Trợ lý AI Copilot
| Phương thức | Đường dẫn API | Mục đích nghiệp vụ | Quyền tối thiểu |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/ai/query` | Truy vấn câu hỏi công việc bằng ngôn ngữ tự nhiên | `Member` |
| `POST` | `/api/v1/ai/summarize-incident` | AI tóm tắt diễn biến sự cố từ các bình luận | `Member` |
| `POST` | `/api/v1/ai/draft-action` | AI trích xuất thông tin để tạo thẻ Action Card xem trước | `Member` |
