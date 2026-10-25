# 📋 KẾ HOẠCH TRIỂN KHAI MOBILE APP (FLOWSE 2.0 REACT NATIVE)
## Clean Architecture Implementation Plan & Tracking

> **Vị trí tài liệu:** `plan/dev/MOBILE_IMPLEMENTATION_PLAN.md`  
> **Framework:** React Native + TypeScript (Expo / Bare workflow compatible)  
> **Kiến trúc:** Clean Architecture (Domain - Data - Presentation - Core)  
> **Nguồn đặc tả:** [FLOWSE_MOBILE_REFACTORED_SPEC_V1.md](file:///e:/flowse-enterprise-platform/plan/dev/FLOWSE_MOBILE_REFACTORED_SPEC_V1.md)

---

## 🏗️ TỔNG QUAN KIẾN TRÚC CLEAN ARCHITECTURE

```text
mobile/
├── src/
│   ├── core/                    # [Core Layer] Cấu hình toàn cục, Design Tokens, Themes, Errors
│   │   ├── config/              # API Gateway URL, Environment, Headers
│   │   ├── constants/           # RouteNames, StorageKeys, QueryKeys
│   │   ├── errors/              # DomainError, NetworkError, ConflictError
│   │   └── theme/               # Colors (Primary, SLA, States), Typography, Spacing
│   │
│   ├── domain/                  # [Domain Layer - Enterprise Business Rules] KHÔNG phụ thuộc UI/Framework
│   │   ├── entities/            # Entity nguyên bản: WorkItem, Incident, Asset, Inspection, Approval
│   │   ├── repositories/        # Interfaces/Contracts: IAuthRepo, IWorkItemRepo, IAssetRepo...
│   │   └── usecases/            # Xử lý nghiệp vụ thuần túy:
│   │       ├── auth/            # LoginUseCase, SwitchContextUseCase, LogoutUseCase
│   │       ├── workitems/       # GetMyWorkItemsUseCase, TransitionWorkItemUseCase
│   │       ├── assets/          # ResolveQrAssetUseCase, GetAssetDetailUseCase
│   │       ├── incidents/       # ReportIncidentUseCase, TriageIncidentUseCase, ResolveIncidentUseCase
│   │       ├── inspections/     # RunInspectionUseCase, SubmitInspectionResultUseCase
│   │       └── approvals/       # GetPendingApprovalsUseCase, DecideApprovalUseCase
│   │
│   ├── data/                    # [Data Layer - Data Access & Gateway]
│   │   ├── api/                 # Axios Client, Auth Interceptors, Socket.IO Client
│   │   ├── local/               # SQLite Storage, Offline Actions Queue, Secure Store
│   │   ├── mappers/             # Chuyển đổi DTO <-> Domain Entity
│   │   ├── models/              # Remote API Response DTOs & Request Schemas
│   │   └── repositories/        # Triển khai cụ thể các Interface Domain (Impl)
│   │
│   └── presentation/            # [Presentation Layer - UI & State Management]
│       ├── components/          # Reusable UI Atoms & Molecules (SLABadge, WorkflowBar, Card...)
│       ├── navigation/          # React Navigation (Root, AuthStack, MainTabs, AppStack)
│       ├── screens/             # Màn hình chức năng (Auth, Home, WorkItems, QRScan, Incidents...)
│       ├── state/               # Quản lý State: Zustand (Local UI, Auth) & TanStack Query (Server Cache)
│       └── hooks/               # Custom Hooks liên kết ViewModel / UseCases với UI
```

---

## 🚀 LỘ TRÌNH TRIỂN KHAI THEO CÁC PHASE & TRACKING

### 🟢 PHASE 1: Khởi Tạo Dự Án & Thiết Lập Bộ Khung Clean Architecture
*Mục tiêu: Thiết lập cấu trúc thư mục chuẩn mực, cấu hình TypeScript, Design Tokens và các lớp Base.*

| Task ID | Nội dung công việc | File bàn giao | Trạng thái |
| :--- | :--- | :--- | :---: |
| **MOB-P1-01** | Khởi tạo cấu trúc thư mục `mobile/` theo Clean Architecture | `mobile/src/core/`, `mobile/src/domain/`, `mobile/src/data/`, `mobile/src/presentation/` | ✅ Hoàn thành |
| **MOB-P1-02** | Cấu hình `package.json`, `tsconfig.json`, `app.json` | `mobile/package.json`, `mobile/tsconfig.json` | ✅ Hoàn thành |
| **MOB-P1-03** | Thiết lập Design System Tokens (Bảng màu chuẩn SLA, Typography, Spacing) | `mobile/src/core/theme/colors.ts`, `mobile/src/core/theme/index.ts` | ✅ Hoàn thành |
| **MOB-P1-04** | Dọn dẹp toàn bộ UI giả lập, chuẩn bị bộ khung Screen Stubs sạch sẽ sẵn sàng đón Figma Design | `mobile/src/presentation/screens/`, `mobile/src/presentation/navigation/` | ✅ Sẵn sàng cho Figma |

---

### 🟡 PHASE 2: Tầng Domain, Data Layer & Cơ Chế Xác Thực (Auth & IAM)
*Mục tiêu: Kết nối API Backend Express, xử lý JWT Access/Refresh Token và phân quyền Role-Adaptive.*

| Task ID | Nội dung công việc | File bàn giao | Trạng thái |
| :--- | :--- | :--- | :---: |
| **MOB-P2-01** | Định nghĩa Domain Entities: `User`, `Role`, `Workspace`, `Department` | `mobile/src/domain/entities/auth.ts` | ⏳ Chờ thực hiện |
| **MOB-P2-02** | Xây dựng API Client Axios kèm interceptor tự động gắn token & refresh session | `mobile/src/data/api/apiClient.ts` | ⏳ Chờ thực hiện |
| **MOB-P2-03** | Triển khai `AuthRepositoryImpl` và Use Cases `LoginUseCase`, `GetContextsUseCase` | `mobile/src/domain/usecases/auth/` | ⏳ Chờ thực hiện |
| **MOB-P2-04** | Xây dựng màn hình `LoginScreen` và `ContextSelectScreen` | `mobile/src/presentation/screens/auth/` | ⏳ Chờ thực hiện |
| **MOB-P2-05** | Thiết lập Root Navigation & cơ chế Route Guard (Bảo vệ màn hình theo quyền) | `mobile/src/presentation/navigation/` | ⏳ Chờ thực hiện |

---

### 🟡 PHASE 3: Universal Work Item & Workflow State Machine Engine
*Mục tiêu: Hiển thị danh sách công việc cá nhân/đội nhóm và thực hiện chuyển trạng thái theo quy trình.*

| Task ID | Nội dung công việc | File bàn giao | Trạng thái |
| :--- | :--- | :--- | :---: |
| **MOB-P3-01** | Định nghĩa Domain Entities: `WorkItem`, `WorkflowState`, `WorkflowTransition` | `mobile/src/domain/entities/workitem.ts` | ⏳ Chờ thực hiện |
| **MOB-P3-02** | Xây dựng `WorkItemRepositoryImpl` kết nối API `/api/v1/tasks` & `/api/v1/workflows` | `mobile/src/data/repositories/WorkItemRepositoryImpl.ts` | ⏳ Chờ thực hiện |
| **MOB-P3-03** | Component `WorkflowTransitionBar`: Hiển thị nút bấm trạng thái theo quyền | `mobile/src/presentation/components/workflow/WorkflowTransitionBar.tsx` | ⏳ Chờ thực hiện |
| **MOB-P3-04** | Component `SLABadge`: Đếm ngược thời gian SLA (`IN_SLA`, `AT_RISK`, `BREACHED`) | `mobile/src/presentation/components/workflow/SLABadge.tsx` | ⏳ Chờ thực hiện |
| **MOB-P3-05** | Màn hình `WorkItemsListScreen` (My Work / Team Work / Lọc phân loại) | `mobile/src/presentation/screens/workitems/WorkItemsListScreen.tsx` | ⏳ Chờ thực hiện |
| **MOB-P3-06** | Màn hình `WorkItemDetailScreen` hợp nhất kèm Subtasks, Bằng chứng & Timeline | `mobile/src/presentation/screens/workitems/WorkItemDetailScreen.tsx` | ⏳ Chờ thực hiện |

---

### 🟡 PHASE 4: Tác Nghiệp Hiện Trường — Quét Mã QR, Quản Lý Thiết Bị & Sự Cố
*Mục tiêu: Quét QR camera nhận diện máy móc, xem hồ sơ kỹ thuật và báo hỏng khẩn cấp.*

| Task ID | Nội dung công việc | File bàn giao | Trạng thái |
| :--- | :--- | :--- | :---: |
| **MOB-P4-01** | Định nghĩa Domain Entities: `Asset`, `Incident`, `Evidence` | `mobile/src/domain/entities/asset.ts`, `incident.ts` | ⏳ Chờ thực hiện |
| **MOB-P4-02** | Triển khai `AssetRepositoryImpl` & `IncidentRepositoryImpl` | `mobile/src/data/repositories/` | ⏳ Chờ thực hiện |
| **MOB-P4-03** | Màn hình `QRScannerScreen`: Quét mã QR, gọi resolver `/api/v1/assets/resolve` | `mobile/src/presentation/screens/scanner/QRScannerScreen.tsx` | ⏳ Chờ thực hiện |
| **MOB-P4-04** | Màn hình `AssetDetailScreen`: Xem thông số kỹ thuật, sự cố đang mở, lịch sử bảo dưỡng | `mobile/src/presentation/screens/assets/AssetDetailScreen.tsx` | ⏳ Chờ thực hiện |
| **MOB-P4-05** | Màn hình `ReportIncidentScreen`: Báo sự cố 1 chạm, đính kèm ảnh chụp camera hiện trường | `mobile/src/presentation/screens/field/ReportIncidentScreen.tsx` | ⏳ Chờ thực hiện |
| **MOB-P4-06** | Tác vụ Điều phối (Triage & Phân công kỹ thuật viên xử lý sự cố) | `mobile/src/presentation/screens/field/IncidentTriageScreen.tsx` | ⏳ Chờ thực hiện |

---

### 🟡 PHASE 5: Kiểm Tra Định Kỳ (Inspection) & Phê Duyệt Vật Tư
*Mục tiêu: Thực hiện checklist kiểm tra máy móc và đề xuất linh kiện sửa chữa liên kết.*

| Task ID | Nội dung công việc | File bàn giao | Trạng thái |
| :--- | :--- | :--- | :---: |
| **MOB-P5-01** | Định nghĩa Domain Entities: `Checklist`, `InspectionRun`, `MaterialRequest` | `mobile/src/domain/entities/inspection.ts` | ⏳ Chờ thực hiện |
| **MOB-P5-02** | Màn hình `InspectionRunnerScreen`: Chạy checklist Pass/Fail, chụp ảnh checkpoint | `mobile/src/presentation/screens/field/InspectionRunnerScreen.tsx` | ⏳ Chờ thực hiện |
| **MOB-P5-03** | Tự động hóa: Mục kiểm tra FAIL tự động kích hoạt tạo Incident liên kết | `mobile/src/domain/usecases/inspections/SubmitInspectionUseCase.ts` | ⏳ Chờ thực hiện |
| **MOB-P5-04** | Modal `RequestMaterialModal`: Đề xuất xin cấp vật tư cho sự cố, tạm dừng SLA | `mobile/src/presentation/screens/field/RequestMaterialModal.tsx` | ⏳ Chờ thực hiện |

---

### 🟡 PHASE 6: Trung Tâm Phê Duyệt & Thông Báo Realtime (Socket.IO)
*Mục tiêu: Quản lý xét duyệt tờ trình và nhận thông báo biến động quy trình tức thời.*

| Task ID | Nội dung công việc | File bàn giao | Trạng thái |
| :--- | :--- | :--- | :---: |
| **MOB-P6-01** | Định nghĩa Domain Entities & Repo cho `Approval` (`/api/v1/approvals`) | `mobile/src/domain/entities/approval.ts` | ⏳ Chờ thực hiện |
| **MOB-P6-02** | Màn hình `ApprovalInboxScreen` & `ApprovalDetailScreen` (Approve/Reject 1 chạm) | `mobile/src/presentation/screens/approvals/` | ⏳ Chờ thực hiện |
| **MOB-P6-03** | Tích hợp Realtime Socket.IO Client lắng nghe sự kiện đẩy từ Backend | `mobile/src/data/api/socketClient.ts` | ⏳ Chờ thực hiện |
| **MOB-P6-04** | Trung tâm thông báo & đếm số lượng việc cần xử lý (Badges) | `mobile/src/presentation/screens/notifications/` | ⏳ Chờ thực hiện |

---

### 🟡 PHASE 7: Đồng Bộ Ngoại Tuyến (Offline-First Sync Engine)
*Mục tiêu: Đảm bảo công nhân tại khu vực không có sóng vẫn xem được dữ liệu và ghi nhận sự cố nháp.*

| Task ID | Nội dung công việc | File bàn giao | Trạng thái |
| :--- | :--- | :--- | :---: |
| **MOB-P7-01** | Thiết lập SQLite Schema nội bộ (Cached items, Offline action queue) | `mobile/src/data/local/database.ts` | ⏳ Chờ thực hiện |
| **MOB-P7-02** | Xây dựng hàng đợi `offline_actions_queue` với Idempotency Key & Retry | `mobile/src/data/local/offlineQueue.ts` | ⏳ Chờ thực hiện |
| **MOB-P7-03** | Component `OfflineSyncBanner`: Hiển thị trạng thái kết nối & số tác vụ chờ sync | `mobile/src/presentation/components/offline/OfflineSyncBanner.tsx` | ⏳ Chờ thực hiện |
| **MOB-P7-04** | Xử lý xung đột Version (`409 Conflict`) và thông báo giải quyết xung đột | `mobile/src/presentation/components/offline/ConflictModal.tsx` | ⏳ Chờ thực hiện |

---

## 📊 TIÊU CHÍ NGHIỆM THU ĐẦU RA (ACCEPTANCE CRITERIA)
1. **Khớp 100% hợp đồng API:** Kết nối thông suốt với Backend Node/Express hiện có mà không phá vỡ cấu trúc cơ sở dữ liệu PostgreSQL.
2. **Tuân thủ Clean Architecture:** Tầng Domain hoàn toàn độc lập với UI; logic nghiệp vụ được đóng gói trong các Use Cases có thể kiểm thử đơn vị.
3. **Trải nghiệm mượt mà:** Khởi động nhanh, thao tác 1 tay thuận tiện cho công nhân hiện trường, hiển thị rõ ràng đồng hồ đếm ngược SLA và tiến trình State Machine.
