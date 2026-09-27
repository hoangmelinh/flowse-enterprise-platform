# AGENT.md — Flowse 2.0 Engineering Instructions

> Tài liệu này là chỉ dẫn bắt buộc cho AI coding agent khi làm việc với dự án **Flowse 2.0**.
> Mục tiêu là giúp agent hiểu đúng domain, kiến trúc, stack, phạm vi và các nguyên tắc kỹ thuật để không tự ý biến dự án thành một hệ thống khác.

---

## 1. Project identity

**Product:** Flowse 2.0  
**Repository:** `flowse-enterprise-platform`  
**Local folder gợi ý:** `flowse-v2`  
**Định hướng:** Enterprise Digital Workplace & Workflow Platform cho doanh nghiệp sản xuất, phục vụ đồng thời khối **Office** và **Field/Operations**.

Flowse 2.0 là sự phát triển tiếp theo của Flowse 1.0, **không phải rewrite từ đầu**.

Flowse 1.0 đã có nền tảng quản lý dự án/công việc gồm:

- Workspace / Space / Folder / List
- Task / Kanban / Assignee / Priority / Deadline
- Sprint / Milestone
- Time tracking
- Direct message / Channel / Space chat
- Comment / Attachment
- Notification
- AI hỗ trợ tạo task/space, thống kê và gợi ý priority
- Authentication, Google OAuth, JWT, OTP email
- RBAC: Admin / Manager / Member
- Rate limiting

Flowse 2.0 **kế thừa các chức năng trên** và mở rộng sang:

- Universal Work Item
- Enterprise Workflow
- Approval
- SLA & Escalation
- Incident Management
- Inspection / Checklist
- QR / Asset Context
- Realtime Web–Mobile
- Offline-first Mobile
- Audit Trail
- Async processing / Queue
- Performance / Load testing

### Product principle

> **Web để quản trị và điều phối. Mobile để thực thi công việc. Workflow để điều phối nghiệp vụ.**

---

## 2. Source of truth

Khi có mâu thuẫn, ưu tiên theo thứ tự:

1. **SRS Flowse 2.0 v1.1**
2. Business rules đã được người dùng/giảng viên xác nhận sau SRS
3. File này (`AGENT.md`)
4. Kiến trúc và hành vi hiện có của Flowse 1.0
5. Suy luận của agent

### Không được tự bịa nghiệp vụ

Một số nghiệp vụ sản xuất vẫn cần khảo sát thực tế, ví dụ:

- Ai được quyền close/reopen Incident
- Severity cụ thể gồm những mức nào
- SLA bắt đầu, pause, resume trong trường hợp nào
- Approval có bao nhiêu cấp
- Transition nào được phép thực hiện offline
- Ai được triage và reassignment
- Khi thiếu vật tư thì luồng chuyển qua phòng ban nào

Nếu chưa có yêu cầu rõ ràng:

- **Không hard-code giả định.**
- Ghi `TODO(BUSINESS-RULE)` hoặc hỏi lại trước khi triển khai logic khó đảo ngược.
- Không dùng kiến thức chung để thay thế quy trình nghiệp vụ chưa được xác nhận.

---

## 3. Technology baseline — DO NOT REWRITE

### 3.1 Existing Web — reuse Flowse 1.0

- React 19
- TypeScript 5.9
- Vite 7
- React Router 7
- Redux Toolkit
- Ant Design 6
- TailwindCSS 4
- React Hook Form
- Zod
- Axios
- i18next
- Vitest

Existing frontend root:

```text
frontend/
└── src/
    ├── api/
    ├── assets/
    ├── components/
    ├── hooks/
    ├── i18n/
    ├── layouts/
    ├── pages/
    ├── routes/
    ├── store/
    ├── types/
    └── utils/
```

### 3.2 Existing Backend — reuse Flowse 1.0

**Backend chính thức là Node.js/Express, KHÔNG dùng Spring Boot.**

- Node.js 20+
- Express 5
- ES Modules (`type: module`)
- PostgreSQL 16 (`pg`)
- JWT
- bcrypt
- cookie-parser
- CORS
- express-rate-limit
- Google Auth Library
- Groq SDK
- Resend
- Multer

Existing backend root:

```text
backend/
└── src/
    ├── config/
    ├── controllers/
    ├── middlewares/
    ├── models/
    ├── routes/
    ├── utils/
    └── server.js
```

### 3.3 Mobile

- React Native + TypeScript
- React Navigation
- TanStack Query cho server state
- Zustand hoặc state solution nhẹ cho local UI state
- SQLite cho offline cache / offline action queue
- Reanimated + Gesture Handler cho animation/gesture
- Firebase Cloud Messaging cho push notification
- QR / Camera integration
- Secure storage cho token/secret phía mobile

Nếu bootstrap mobile mới, ưu tiên **Expo Development Build** trừ khi một native dependency bắt buộc React Native CLI.

### 3.4 Platform services mở rộng cho Flowse 2.0

Các thành phần sau là **mở rộng dần**, không được làm cho Flowse 1.0 hiện tại ngừng chạy chỉ vì chúng chưa sẵn sàng:

- Redis — cache, rate limit coordination, realtime coordination
- RabbitMQ — async jobs/domain events
- WebSocket — realtime update
- MinIO/Object Storage — attachment/evidence
- FCM — mobile push notification
- k6 hoặc JMeter — load testing

---

## 4. Repository strategy

Ưu tiên giữ cấu trúc kế thừa để giảm rủi ro migration:

```text
flowse-enterprise-platform/
├── backend/                # Node.js + Express, kế thừa Flowse 1.0
├── frontend/               # React + Vite, kế thừa Flowse 1.0
├── mobile/                 # React Native
├── docs/                   # SRS, API, ADR, diagrams
├── infrastructure/         # docker/nginx/redis/rabbitmq config nếu cần
├── scripts/
├── docker-compose.yml
├── AGENT.md
└── README.md
```

### Không được

- Di chuyển toàn bộ `frontend/` sang `apps/web/` chỉ để “đẹp cấu trúc”.
- Rewrite Node/Express thành Spring/Nest/Fastify nếu không có yêu cầu rõ ràng.
- Convert toàn bộ backend JavaScript sang TypeScript trong một commit lớn.
- Đổi toàn bộ database schema hoặc API chỉ để phù hợp style mới.
- Xóa các chức năng Flowse 1.0 đang hoạt động mà không có migration/backward compatibility plan.

---

## 5. Architecture rules

### 5.1 Architecture style

Flowse 2.0 sử dụng:

> **Modular Monolith + Event-driven components**

Không chuyển sang microservices chỉ để tăng “độ phức tạp”.

Backend Node/Express vẫn là một deployable unit trong MVP, nhưng code mới phải được chia rõ module/domain để có thể tách service sau này nếu cần.

### 5.2 Suggested backend domains

Khi mở rộng backend, nhóm logic theo domain thay vì tạo controller khổng lồ:

```text
Auth / Identity
Workspace / Project
Work Item
Workflow
Approval
SLA
Incident
Inspection
Asset / QR
Notification
Realtime
Offline Sync
Audit
AI
```

Không bắt buộc refactor toàn bộ Flowse 1.0 ngay lập tức. Áp dụng cấu trúc module **incrementally**.

### 5.3 API compatibility

- Endpoint Flowse 1.0 đang được frontend sử dụng phải được giữ tương thích nếu chưa có migration plan.
- Chức năng 2.0 có thể dùng namespace mới như `/api/v2/...` nếu thay đổi contract đáng kể.
- Không âm thầm thay response schema của endpoint cũ.
- Khi deprecate endpoint, document rõ endpoint thay thế.

### 5.4 Database is the system of record

Redis, WebSocket và RabbitMQ chỉ hỗ trợ performance/realtime/async.

**PostgreSQL là nguồn dữ liệu chính.**

WebSocket event không được coi là nguồn sự thật. Client reconnect phải có thể fetch lại trạng thái chuẩn qua API.

---

## 6. Core domain model

### 6.1 Universal Work Item

Flowse 2.0 sử dụng khái niệm **Work Item** làm abstraction chung cho công việc nghiệp vụ.

Các type dự kiến:

```text
TASK
REQUEST
INCIDENT
APPROVAL
INSPECTION
MAINTENANCE
```

Các thuộc tính chung tối thiểu:

```text
id
code
type
title
description
creator
assignee / assignees
priority
status
workflow_id
sla_policy_id (nullable)
due_at
created_at
updated_at
version
```

### 6.2 Backward compatibility với Task của Flowse 1.0

**Không xóa/đổi Task model cũ một cách phá vỡ hệ thống.**

Trước khi migration Task → Work Item:

1. Kiểm tra toàn bộ bảng/model/API hiện có.
2. Thiết kế migration hoặc compatibility layer.
3. Đảm bảo Web Flowse 1.0 vẫn chạy.
4. Viết script migration có thể review.
5. Có rollback plan.

Nếu chưa đủ thông tin, giữ Task hiện tại và xây Work Item theo hướng additive.

---

## 7. Workflow Engine rules

Workflow là core của Flowse 2.0.

Một workflow gồm:

- Definition
- States
- Transitions
- Allowed roles/permissions
- Required fields/conditions
- Approval rules
- SLA rules
- Notification/automation hooks

Ví dụ Incident:

```text
REPORTED
  -> TRIAGED
  -> ASSIGNED
  -> IN_PROGRESS
  -> WAITING_VERIFY
  -> RESOLVED
```

### Mọi transition phải

1. Kiểm tra current state.
2. Kiểm tra user permission/resource scope.
3. Kiểm tra transition có hợp lệ không.
4. Validate required data.
5. Ghi thay đổi trong transaction.
6. Tăng `version` nếu entity hỗ trợ optimistic locking.
7. Ghi Audit Log.
8. Sau commit mới phát domain event/realtime notification.

### Không được

- Cho client tự gửi status bất kỳ và backend chỉ `UPDATE status = ?`.
- Hard-code toàn bộ workflow vào UI.
- Cho AI bypass workflow rule.
- Cho WebSocket event thay thế transaction trong DB.

---

## 8. Approval rules

Approval phải là business action server-side, không chỉ là nút UI.

Mỗi approval action cần kiểm tra:

- Người dùng có phải approver hợp lệ không
- Work Item đang ở đúng state không
- Request có còn hiệu lực không
- Quyền theo department/project/resource scope
- Version hiện tại để tránh approve dữ liệu cũ

Action chính:

```text
APPROVE
REJECT
```

Có thể mở rộng delegate/reassign/multi-level sau khi nghiệp vụ được xác nhận.

Approval quan trọng **mặc định online-only** trừ khi SRS/business rule cho phép offline.

---

## 9. SLA & Escalation

SLA khác deadline thông thường.

Có thể gồm:

- response SLA
- resolution SLA
- warning threshold
- escalation target

SLA calculations nên chạy bằng worker/scheduler, không phụ thuộc người dùng mở màn hình.

Khi dùng RabbitMQ:

- API ghi transaction trước.
- Tác vụ SLA/notification nặng xử lý async.
- Event phải idempotent khi consumer retry.

Không tự ý định nghĩa pause/resume condition khi nghiệp vụ chưa xác nhận.

---

## 10. Field Operations

MVP Field tập trung vào:

- Incident
- Inspection
- Checklist
- Asset Context
- Evidence
- Field Work Item

### Canonical demo flow

```text
Worker scans QR
  -> Report Incident + evidence
  -> Supervisor triage
  -> Assign Technician
  -> Technician processes
  -> Upload evidence
  -> Supervisor/QA verifies
  -> Resolved
```

Nếu cần vật tư:

```text
Incident
  -> Internal/Purchase Request
  -> Approval
  -> Procurement/Store processing
  -> Return to repair flow
```

Đây là use case chính để chứng minh liên kết **Field ↔ Office**.

---

## 11. QR / Asset Context

QR là **context resolver**, không phải lõi duy nhất của hệ thống.

QR có thể đại diện cho:

- asset
- machine
- room
- area
- inspection point

QR chỉ nên chứa:

- opaque identifier hoặc token an toàn

Không encode dữ liệu nhạy cảm trực tiếp trong QR.

Flow chuẩn:

```text
Scan QR
  -> resolve identifier
  -> permission check
  -> load context
  -> show valid actions
```

Ví dụ context asset:

- Open Work Items
- Report Incident
- Checklist
- History

Nếu không có QR, user vẫn phải có cách search/select asset bằng UI.

---

## 12. Offline-first Mobile

Offline-first **không có nghĩa là toàn bộ app hoạt động offline**.

### Offline-capable mặc định

- Xem dữ liệu đã cache
- Checklist
- Draft note/comment
- Chụp ảnh/evidence local
- Draft Incident
- Một số transition an toàn được business rule cho phép

### Online-only mặc định

- Permission/RBAC changes
- Workflow configuration
- User administration
- Approval nhạy cảm
- Destructive actions
- Các action đòi hỏi state server realtime mới nhất

### Local persistence

SQLite tối thiểu cần hỗ trợ:

```text
cached_work_items
offline_actions
cached_assets
cached_workflows
sync_metadata
```

`offline_actions` tối thiểu:

```text
id
action_type
entity_type
entity_id
payload
base_version
idempotency_key
created_at
status
retry_count
last_error
```

### Sync strategy

Khi online lại:

1. Gom action thành batch phù hợp.
2. Giới hạn concurrency.
3. Gửi idempotency key.
4. Retry bằng exponential backoff + jitter.
5. So sánh `base_version` với server.
6. Nếu conflict, trả `409 Conflict` và không overwrite âm thầm.
7. UI phải hiển thị trạng thái Pending Sync / Sync Failed / Conflict.

### Conflict rule

Ví dụ:

```text
Mobile base_version = 5
Server current_version = 6
=> CONFLICT
```

Không dùng “last write wins” cho status/workflow action quan trọng nếu không có business rule rõ ràng.

---

## 13. Realtime rules

Realtime dùng WebSocket cho:

- assignment
- work item status
- comment/mention
- approval update
- incident update
- notification counters
- dashboard refresh hint

### Reliability

- WebSocket chỉ là delivery mechanism.
- Mọi state quan trọng phải persist DB trước.
- Client reconnect phải re-fetch hoặc sync missed state.
- Không assume event được nhận đúng một lần.
- Event handler nên idempotent.

Nếu chạy nhiều backend instance, dùng Redis Pub/Sub hoặc cơ chế shared broker để phối hợp realtime.

---

## 14. Async processing / RabbitMQ

Các tác vụ không cần trả response ngay nên được xử lý async:

- Push notification
- Email
- SLA calculations/escalations
- Analytics event
- AI analysis
- Một số file processing

Ví dụ:

```text
POST Incident
  -> validate
  -> DB transaction
  -> publish INCIDENT_CREATED
  -> HTTP 201

Consumers:
  -> Notification worker
  -> SLA worker
  -> Analytics worker
  -> AI worker
```

### Queue safety

- Consumer phải chịu được retry.
- Dùng idempotency/deduplication với event quan trọng.
- Log dead-letter/failure rõ ràng.
- Không để lỗi AI làm fail việc tạo Incident/Task.

Nếu chưa triển khai transactional outbox, document rõ risk “DB commit thành công nhưng publish event thất bại”. Ưu tiên outbox cho critical events khi scope cho phép.

---

## 15. AI Work Copilot

AI là **Copilot**, không phải authority.

Allowed use cases:

- Natural language → draft Task/Work Item
- Summarize Work Item/comments
- Classify request
- Suggest priority
- Suggest assignee
- Detect potentially overdue work
- Natural-language query trên dữ liệu user có quyền xem

### AI safety/business rules

AI không được tự động:

- approve/reject business request
- đổi permission
- đóng incident nhạy cảm
- bypass workflow
- assign người dùng trái RBAC/resource scope
- ghi dữ liệu quan trọng mà không qua validation

Mọi AI output dùng để tạo action phải đi qua **deterministic validation + authorization** giống request thủ công.

---

## 16. Security rules

### Existing baseline

- JWT access token
- Refresh token
- Google OAuth 2.0
- OTP email
- bcrypt
- Rate limiting
- RBAC

### Mandatory rules

- Authorization luôn kiểm tra server-side.
- Không tin role/department/assignee do client tự khai.
- Không log password, token, OTP hoặc secret.
- Không commit `.env`.
- Không hard-code API key.
- Validate input bằng schema/explicit validation.
- Sanitize file name/path và kiểm tra file type/size.
- QR không chứa sensitive business data.
- Audit action quan trọng.

### Mobile secrets

Không lưu refresh token/secret lâu dài bằng plain AsyncStorage.

Dùng platform secure storage (Keychain/Keystore/SecureStore tương đương).

---

## 17. RBAC and resource scope

RBAC không chỉ là `Admin / Manager / Member` ở UI.

Permission có thể phụ thuộc:

- organization/workspace
- project/space
- department
- work item ownership
- assignee
- supervisor relation
- asset/area scope

Ví dụ:

- Technician không mặc định được xem HR data.
- Manager Department A không mặc định quản lý Department B.
- Người dùng chỉ được scan/xem Asset nếu có scope phù hợp.

Mọi endpoint mới phải xác định:

1. authentication requirement
2. role/permission requirement
3. resource scope requirement

---

## 18. Audit requirements

Các action quan trọng phải có Audit Log:

```text
actor_id
action
entity_type
entity_id
before
after
timestamp
request/device metadata nếu cần
```

Audit event tối thiểu cho:

- workflow transition
- approval/reject
- assignment/reassignment
- permission change
- SLA escalation
- incident close/reopen (nếu có)
- critical configuration change

Audit không được phụ thuộc hoàn toàn vào frontend.

Không xóa audit record bằng flow CRUD thông thường.

---

## 19. Database rules

- PostgreSQL 16 là primary DB.
- Mọi schema change phải có script migration/schema patch được commit.
- Không chỉ sửa schema trực tiếp trên Supabase rồi bỏ qua source control.
- Dùng parameterized query.
- Transaction cho các operation thay đổi nhiều bảng liên quan.
- Index các query path quan trọng sau khi đo/quan sát query.
- Pagination bắt buộc cho danh sách lớn.
- Cursor pagination được ưu tiên cho timeline/feed lớn.
- Timestamp lưu UTC, format hiển thị theo timezone client.

### Optimistic locking

Entity có thể chỉnh offline/concurrently nên có `version` hoặc cơ chế tương đương.

Update quan trọng nên dạng logic:

```sql
UPDATE ...
SET ..., version = version + 1
WHERE id = $1 AND version = $2;
```

Nếu affected rows = 0 → conflict hoặc stale state.

---

## 20. Performance and scalability

Không claim “chịu hàng triệu request” nếu chưa benchmark.

Thiết kế hướng tới horizontal scalability:

```text
Client
  -> Load Balancer
  -> Node API instance 1..N
  -> PostgreSQL / Redis / RabbitMQ
```

### Performance principles

- Backend instance nên stateless khi có thể.
- Cache dữ liệu đọc thường xuyên nhưng có chiến lược invalidation.
- Không cache permission theo cách làm stale quá lâu.
- Query phải pagination.
- Tránh N+1 query.
- File lớn upload trực tiếp Object Storage qua presigned URL khi triển khai storage service.
- Tác vụ nặng chuyển async nếu không cần synchronous response.

### Offline reconnect burst

Phải tính đến tình huống nhiều mobile reconnect cùng lúc.

Dùng:

- batch sync
- bounded concurrency
- exponential backoff
- jitter
- idempotency

### Load testing

Khi có endpoint quan trọng ổn định, benchmark bằng k6/JMeter theo các mức ví dụ:

```text
100 users
500 users
1000 users
2000 users
```

Theo dõi:

- throughput
- average latency
- p95 latency
- error rate
- CPU
- RAM
- DB connections

Không tối ưu mù; benchmark trước/sau thay đổi quan trọng.

---

## 21. Frontend Web rules

### Preserve existing stack and patterns

- React + TypeScript + Vite
- Redux Toolkit cho global client state hiện có
- Axios qua API layer hiện có
- React Hook Form + Zod cho form mới nếu phù hợp
- Ant Design/Tailwind theo design system hiện tại

### UI principles

- Không gọi API trực tiếp lung tung trong presentational component.
- Tái sử dụng API client/hook/service layer.
- Permission-sensitive UI phải ẩn/disable hợp lý nhưng backend vẫn là lớp enforce thật.
- Mọi page quan trọng phải có loading / empty / error states.
- Không hard-code workflow states trong nhiều component khác nhau; dùng metadata/config từ backend khi workflow động.

---

## 22. Mobile UX rules

Mobile **không phải bản Web thu nhỏ**.

Role-adaptive experience:

### Office user

Ưu tiên:

- My Work
- Approvals
- Projects
- Messages
- Calendar/deadlines

### Field user

Ưu tiên:

- Shift/context summary nếu có
- Incidents
- Inspections
- Active work
- Scan QR
- Offline/sync status

### Manager

Ưu tiên:

- Approvals
- SLA risk
- Critical incidents
- Team workload
- Notifications

### Mandatory UX states

Mobile phải thể hiện rõ:

- Online / offline
- Pending sync
- Sync failed
- Conflict
- SLA warning
- Critical priority

Không để user tưởng dữ liệu đã được gửi server nếu action vẫn pending local.

---

## 23. Coding conventions

### General

- Tên code (variable/function/class/file API) dùng English rõ nghĩa.
- UI content có thể i18n Vietnamese/English.
- Function nhỏ, một trách nhiệm.
- Tránh magic number/string cho status/type/permission.
- Domain constants/enums phải tập trung.
- Comment giải thích **why**, không comment điều code đã nói rõ.
- Không tạo abstraction phức tạp nếu chưa có ít nhất hai use case thật.

### Backend JavaScript

- Giữ ES Modules.
- Async code dùng `async/await`.
- Error phải đi qua centralized error handling pattern hiện có.
- Không swallow exception.
- Không return stack trace cho client production.
- SQL dùng parameter binding.

### Frontend TypeScript

- Không dùng `any` tràn lan.
- Public API/type quan trọng phải có type rõ ràng.
- Reuse types khi phù hợp, nhưng không cố share type làm coupled Web/Mobile với DB schema.

### React Native

- Tách screen, feature component, data hook, local persistence/sync logic.
- Không đặt toàn bộ offline sync trong một screen component.
- Background/retry logic phải test độc lập nếu có thể.

---

## 24. Testing requirements

Mỗi thay đổi business logic quan trọng phải có test ở mức phù hợp.

### Frontend

Repo hiện có Vitest. Sau thay đổi liên quan Web, chạy tối thiểu:

```bash
cd frontend
npm run type-check
npm run lint
npm test
npm run build
```

### Backend

Backend hiện tại chưa có test harness thực sự (`npm test` đang placeholder).

Khi bắt đầu thêm Workflow/Approval/SLA/Sync:

- Thiết lập backend test framework trước khi logic trở nên phức tạp.
- Ưu tiên integration test cho API + DB transition quan trọng.
- Test workflow transition, permission, version conflict, idempotency.

Không được nói “all tests pass” nếu backend chưa có test thật.

### Critical test cases

Bắt buộc ưu tiên:

- Invalid workflow transition
- Unauthorized transition
- Double approval
- Duplicate idempotency key
- Offline stale version → 409
- Queue retry không tạo duplicate side effect
- Realtime reconnect vẫn lấy được final state
- QR token không truy cập asset ngoài permission scope

---

## 25. Existing commands

### Backend

```bash
cd backend
npm install
npm run dev
# production
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run type-check
npm run lint
npm test
npm run build
```

### Existing Docker Compose

```bash
docker compose up --build -d
docker compose down
```

Hiện docker compose kế thừa Flowse 1.0 chạy frontend/backend, DB dùng PostgreSQL/Supabase theo environment hiện có.

Khi thêm Redis/RabbitMQ/MinIO, bổ sung incrementally và không phá startup path hiện tại nếu không cần thiết.

---

## 26. Environment and secrets

Tất cả environment variable mới phải:

1. Được đọc từ environment/config.
2. Được thêm vào `.env.example` với placeholder an toàn.
3. Được mô tả trong README/docs nếu cần.
4. Không commit secret thật.

Ví dụ nhóm biến có thể xuất hiện:

```text
REDIS_URL
RABBITMQ_URL
MINIO_ENDPOINT
MINIO_ACCESS_KEY
MINIO_SECRET_KEY
FCM_...
```

Không ghi secret thật vào docs, test fixture hoặc source code.

---

## 27. Git and change discipline

Ưu tiên commit nhỏ, có mục đích rõ ràng.

Conventional commit gợi ý:

```text
feat(workflow): add transition validation
feat(mobile): add offline action queue
fix(sync): prevent duplicate incident creation
refactor(auth): extract permission guard
perf(my-work): add indexed paginated query
test(approval): cover stale approval version
```

Không gom vào một commit:

- schema migration lớn
- rewrite UI
- backend refactor
- feature mới

nếu có thể tách độc lập.

---

## 28. Documentation obligations

Khi thay đổi một business capability đáng kể, agent cần cập nhật tài liệu tương ứng:

- API contract / OpenAPI
- DB migration/schema docs
- SRS/TBD nếu business requirement thay đổi
- Architecture Decision Record (ADR) nếu đổi quyết định kiến trúc lớn
- README nếu startup/config thay đổi

### ADR cần có khi

- Chuyển queue/broker
- Đổi authentication strategy
- Đổi offline conflict strategy
- Chuyển Modular Monolith → Microservices
- Thay database/storage core
- Rewrite framework chính

---

## 29. MVP priorities

Ưu tiên theo thứ tự giá trị nghiệp vụ:

### Tier 1 — must work end-to-end

1. Identity / RBAC
2. Existing Project / Task baseline
3. My Work
4. Work Item foundation
5. Workflow transition
6. Approval
7. SLA basic
8. Incident
9. Audit

### Tier 2 — mobile/field differentiation

10. React Native mobile
11. QR Asset Context
12. Inspection / Checklist
13. Realtime Web–Mobile
14. Push notification
15. Selected offline operations + sync

### Tier 3 — advanced / optimization

16. Redis caching
17. RabbitMQ async processing
18. AI enhancements
19. Advanced analytics
20. Advanced Workflow Builder
21. NFC
22. Load optimization beyond measured need

Không hy sinh Tier 1 để làm feature “wow” Tier 3.

---

## 30. Out of scope unless explicitly approved

Không tự mở rộng Flowse 2.0 thành:

- ERP đầy đủ
- MES đầy đủ
- Payroll
- Accounting suite
- Full HRM
- CRM hoàn chỉnh
- Video meeting platform
- Google Docs/Sheets clone
- Slack replacement hoàn chỉnh
- Kubernetes multi-cluster platform
- Microservice zoo
- Custom AI model training platform

Communication chỉ phục vụ work collaboration; không biến dự án thành messaging product chính.

---

## 31. Definition of Done

Một feature chỉ được coi là hoàn thành khi phù hợp phạm vi và có tối thiểu:

- Business rule rõ ràng
- Authorization server-side
- Validation
- Error handling
- DB migration nếu cần
- Audit nếu là action quan trọng
- Loading/error/empty state ở UI liên quan
- Test cho logic quan trọng
- Không phá chức năng Flowse 1.0 liên quan
- Docs/API update nếu contract thay đổi

Đối với mobile offline feature cần thêm:

- pending state
- retry behavior
- idempotency
- conflict behavior
- reconnect test

---

## 32. Agent workflow before coding

Trước một task đáng kể, agent phải làm theo thứ tự:

1. Đọc yêu cầu/SRS liên quan.
2. Inspect code hiện tại trước khi tạo abstraction mới.
3. Xác định code path Flowse 1.0 bị ảnh hưởng.
4. Xác định business rule đã rõ hay còn TBD.
5. Đề xuất thay đổi nhỏ nhất đạt mục tiêu.
6. Xác định migration/backward compatibility nếu có.
7. Implement.
8. Run lint/type-check/test/build phù hợp.
9. Tóm tắt thay đổi và limitation còn lại.

### Khi không chắc

Ưu tiên:

> **Preserve existing behavior + ask/mark TBD**

thay vì:

> **Invent rule + rewrite architecture**

---

## 33. Final project mental model

Agent phải luôn giữ mental model này khi phát triển Flowse 2.0:

```text
                    FLOWSE 2.0

      OFFICE                        FIELD
        │                             │
Project / Task                 Incident / Inspection
Request / Approval               QR / Checklist
        │                             │
        └──────────┬──────────────────┘
                   │
              WORK ITEM
                   │
            WORKFLOW ENGINE
              ┌────┼────┐
              │    │    │
           Approval SLA Audit
              │    │    │
              └────┼────┘
                   │
       Node.js / Express Backend
                   │
      PostgreSQL + Redis + RabbitMQ
                   │
          Web + React Native Mobile
```

Flowse 2.0 không phải “Trello Mobile”.

Flowse 2.0 là:

> **một nền tảng quản lý công việc và workflow doanh nghiệp kế thừa Flowse 1.0, mở rộng từ project management sang enterprise work management, đồng thời kết nối Office và Field trên Web–Mobile.**

