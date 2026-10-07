# 📦 ĐẶC TẢ ĐỐI TƯỢNG CÔNG VIỆC PHỔ QUÁT (UNIVERSAL WORK ITEM)

> **Phân hệ:** Lõi dữ liệu nghiệp vụ (Core Domain Entity)  
> **Áp dụng cho:** Toàn bộ hệ thống Web & Mobile  
> **Thuộc hệ thống:** [Tài liệu đặc tả nghiệp vụ Flowse 2.0](file:///c:/Users/Vinh%20Nguyen/MOBILE/flowse-enterprise-platform/docs/)

---

## 1. BẢN CHẤT CỦA UNIVERSAL WORK ITEM

Trong Flowse 1.0, thực thể duy nhất là `Task` phục vụ công việc văn phòng thông thường. Khi mở rộng sang môi trường doanh nghiệp và nhà máy, các dạng công việc rất đa dạng: sự cố máy hỏng, đề xuất xin vật tư, phiếu duyệt của sếp, lịch kiểm tra định kỳ... Nếu tạo ra các bảng cơ sở dữ liệu riêng rẽ cho từng loại, hệ thống sẽ bị xé nhỏ, không thể gom chung vào màn hình **My Work**, không thể theo dõi tiến độ đồng bộ và gây vỡ kiến trúc.

**Universal Work Item (UWI)** là mô hình dữ liệu trừu tượng hóa: Mọi đối tượng công việc đều chia sẻ chung một **Tập thuộc tính cốt lõi (Shared Core Attributes)** và mở rộng bằng các trường dữ liệu động theo từng loại hình cụ thể.

```text
               ┌──────────────────────────────────────┐
               │         UNIVERSAL WORK ITEM          │
               │ (ID, Code, Type, Title, Assignee...) │
               └──────────────────┬───────────────────┘
         ┌──────────────┬─────────┴───────┬──────────────┬──────────────┐
         ▼              ▼                 ▼              ▼              ▼
     ┌───────┐    ┌───────────┐     ┌───────────┐   ┌──────────┐  ┌────────────┐
     │ TASK  │    │ INCIDENT  │     │  REQUEST  │   │ APPROVAL │  │ INSPECTION │
     └───────┘    └───────────┘     └───────────┘   └──────────┘  └────────────┘
     Việc dự án   Sự cố thiết bị    Xin cấp vật tư  Phiếu xét duyệt  Kiểm tra máy
```

---

## 2. NĂM LOẠI HÌNH WORK ITEM CHÍNH (WORK ITEM TYPES)

| Loại (Type) | Mô tả & Ngữ cảnh sử dụng | Người khởi tạo điển hình | Chu trình vòng đời tiêu biểu |
| :--- | :--- | :--- | :--- |
| **`TASK`** | Công việc dự án, công việc văn phòng thông thường (kế thừa từ Flowse 1.0). | Thành viên nhóm / Quản lý | `TODO` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `REVIEW` $\rightarrow$ `DONE` |
| **`INCIDENT`** | Sự cố phát sinh tại hiện trường nhà xưởng (máy hỏng, rò rỉ, lỗi vận hành). | Công nhân / Kỹ thuật viên | `REPORTED` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` |
| **`REQUEST`** | Đề xuất nội bộ: Xin cấp linh kiện, mua vật tư mới, xin tạm ứng. | Kỹ thuật viên / Nhân viên | `CREATED` $\rightarrow$ `APPROVAL` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED` |
| **`APPROVAL`** | Phiếu phê duyệt dành riêng cho cấp quản lý ra quyết định. | Hệ thống sinh ra từ Request | `PENDING` $\rightarrow$ `APPROVED` hoặc `REJECTED` |
| **`INSPECTION`** | Phiếu kiểm tra bảo dưỡng thiết bị theo checklist định kỳ. | Trưởng ca giao định kỳ | `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` (hoặc `FAILED`) |

---

## 3. TẬP THUỘC TÍNH CỐT LÕI (SHARED CORE ATTRIBUTES)

Mọi Work Item bất kể thuộc loại nào đều sở hữu đầy đủ các trường sau trong bảng `work_items`:

```sql
CREATE TABLE work_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,           -- Mã định danh hiển thị (vd: TSK-001, INC-102, REQ-054)
    type VARCHAR(30) NOT NULL,                  -- 'TASK' | 'INCIDENT' | 'REQUEST' | 'APPROVAL' | 'INSPECTION'
    title VARCHAR(255) NOT NULL,                -- Tiêu đề ngắn gọn của đầu việc
    description TEXT,                           -- Chi tiết mô tả nội dung
    status VARCHAR(50) NOT NULL,                -- Trạng thái hiện tại trong State Machine
    priority VARCHAR(20) DEFAULT 'MEDIUM',      -- 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
    
    -- Quan hệ tổ chức & Phân cấp
    workspace_id UUID NOT NULL,                 -- Thuộc không gian làm việc nào
    project_id UUID,                            -- Thuộc dự án nào (dành cho Task)
    parent_id UUID,                             -- Khóa ngoại trỏ đến Work Item cha (hỗ trợ Subtask, hoặc Request gắn với Incident)
    
    -- Nhân sự phụ trách
    creator_id UUID NOT NULL,                   -- Người tạo bản ghi
    assignee_id UUID,                           -- Người chịu trách nhiệm xử lý chính
    
    -- Quy trình & Cam kết thời gian
    workflow_id UUID NOT NULL,                  -- Gắn với định nghĩa quy trình nào
    sla_policy_id UUID,                         -- Gắn với chính sách SLA nào
    due_at TIMESTAMPTZ,                         -- Thời hạn hoàn thành (Deadline)
    sla_breach_at TIMESTAMPTZ,                  -- Mốc thời gian vi phạm SLA
    
    -- Kiểm soát đồng thời & Vết kiểm toán
    version INT DEFAULT 1 NOT NULL,             -- Optimistic Locking (chống ghi đè xung đột)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. CƠ CHẾ KẾ THỪA VÀ MỞ RỘNG (EXTENSION SCHEMAS)

Để giữ cấu trúc dữ liệu chuẩn mực và hiệu năng cao, các thông tin đặc thù của từng loại được lưu vào bảng quan hệ phụ thuộc (1-1):

### 4.1. Mở rộng cho Sự cố: `incident_details`
* `asset_id`: ID của thiết bị/máy móc gặp sự cố.
* `severity`: Mức độ nghiêm trọng (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
* `symptom_summary`: Tóm tắt triệu chứng lỗi khi công nhân báo.
* `root_cause`: Nguyên nhân gốc rễ (ghi nhận sau khi kỹ thuật viên tháo dỡ).
* `resolution_summary`: Phương án khắc phục đã thực hiện.
* `initial_evidence_url`: Ảnh chụp hiện trường lúc báo sự cố.
* `resolved_evidence_url`: Ảnh chụp máy sau khi đã sửa xong để nghiệm thu.

### 4.2. Mở rộng cho Đề xuất vật tư: `request_details`
* `request_type`: 'SPARE_PART' | 'EQUIPMENT' | 'BUDGET'.
* `urgency`: Mức độ khẩn cấp.
* `item_name`: Tên linh kiện/thiết bị cần cấp.
* `quantity`: Số lượng.
* `estimated_cost`: Dự toán kinh phí.
* `justification`: Lý do đề xuất (tự động điền mã Incident liên quan nếu phát sinh từ sự cố).

### 4.3. Mở rộng cho Phiếu kiểm tra: `inspection_details`
* `asset_id`: Thiết bị được kiểm tra.
* `template_id`: Mẫu checklist áp dụng.
* `passed_items_count`: Số hạng mục đạt.
* `failed_items_count`: Số hạng mục không đạt.
* `total_items_count`: Tổng số hạng mục kiểm tra.
* `auto_generated_incident_id`: Mã sự cố tự động sinh ra (nếu có lỗi kiểm tra).

---

## 5. TƯƠNG THÍCH NGƯỢC VỚI TASK CỦA FLOWSE 1.0

> [!IMPORTANT]
> **Nguyên tắc kỹ thuật:** Không đập bỏ hoặc phá vỡ cấu trúc Task cũ của phiên bản 1.0.

* Các màn hình cũ (Kanban Board, List View, Sprint View, Time Tracking) tiếp tục hoạt động bình thường trên các bản ghi có `type = 'TASK'`.
* Khi tạo Task mới từ giao diện Web 1.0, hệ thống tự động gán `type = 'TASK'` và gắn với quy trình mặc định `Standard Task Workflow`.
* Mọi API cũ gọi đến Task được ánh xạ (map) trong suốt sang bảng `work_items`, đảm bảo toàn bộ mã nguồn Frontend 1.0 không bị lỗi runtime.
