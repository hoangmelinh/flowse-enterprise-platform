# 🏷️ ĐỊNH DANH THIẾT BỊ & NGỮ CẢNH SỐ (ASSET & QR CONTEXT)

> **Phân hệ:** Cầu nối định danh vật lý (Physical-to-Digital Gateway)  
> **Áp dụng cho:** Máy móc, Dây chuyền, Phòng máy, Trạm kiểm tra  
> **Thuộc hệ thống:** [Tài liệu đặc tả nghiệp vụ Flowse 2.0](file:///c:/Users/Vinh%20Nguyen/MOBILE/flowse-enterprise-platform/docs/)

---

## 1. VAI TRÒ CỦA MÃ QR TRONG HỆ THỐNG

Trong Flowse 2.0, mã QR **không phải là nơi chứa dữ liệu thô**, mà đóng vai trò là một **Bộ định vị ngữ cảnh an toàn (Context Resolver)**:
* **Không làm:** In trực tiếp thông số kỹ thuật, mật khẩu hay dữ liệu nhạy cảm vào mã QR (vì bất kỳ ai dùng điện thoại thường quét vào cũng đọc được).
* **Cách làm chuẩn:** Mã QR chỉ chứa một chuỗi định danh ngẫu nhiên, không thể đoán trước (**Opaque Token** hoặc UUID bảo mật).
* Khi nhân viên dùng Mobile App quét mã QR, ứng dụng sẽ gửi chuỗi Token này lên máy chủ kèm theo Token xác thực người dùng. Máy chủ kiểm tra quyền hạn rồi mới trả về **Ngữ cảnh số (Digital Context)** của thiết bị tương ứng.

---

## 2. QUY CHUẨN MÃ QR BẢO MẬT (OPAQUE TOKEN PROTOCOL)

* **Chuỗi mã hóa trong QR:** Có định dạng chuẩn:
  `flw://asset/resolve?token=flw_tok_8f9a2c3d4e5f6a7b8c9d`
* **Cơ chế xoay vòng mã (Token Rotation):** Nếu tem QR dán trên máy bị chụp trộm hoặc rò rỉ ra ngoài, Quản trị viên trên Web Console chỉ cần bấm nút *"Tạo lại mã QR" (Rotate Token)*. Hệ thống sẽ cấp một Token mới mà không làm mất lịch sử vận hành hay thông tin của máy móc.

---

## 3. GÓI DỮ LIỆU NGỮ CẢNH SỐ (DIGITAL CONTEXT PAYLOAD)

Khi gọi API `GET /api/v1/assets/resolve?token=...`, máy chủ trả về toàn bộ bức tranh thời gian thực của máy móc:

```json
{
  "success": true,
  "data": {
    "asset": {
      "id": "e2b3c4d5-6789-4abc-9def-0123456789ab",
      "code": "CNC-024",
      "name": "Máy phay CNC 5 trục Haas VF-2",
      "location": "Phân xưởng Cơ khí chính xác - Khu A",
      "status": "OPERATIONAL", // 'OPERATIONAL' | 'WARNING' | 'DOWN' | 'MAINTENANCE'
      "installed_at": "2023-05-15T00:00:00Z",
      "last_inspected_at": "2026-10-06T08:30:00Z"
    },
    "active_incidents": [
      {
        "id": "inc-001",
        "code": "INC-2026-088",
        "title": "Rung lắc nhẹ trục chính",
        "severity": "MEDIUM",
        "status": "ASSIGNED",
        "assignee_name": "Nguyễn Văn Kỹ Thuật"
      }
    ],
    "pending_inspections": [
      {
        "id": "ins-012",
        "template_name": "Kiểm tra mức dầu bôi trơn đầu ca",
        "due_today": true
      }
    ],
    "recent_history": [
      {
        "date": "2026-09-20",
        "event": "Thay lọc dầu động cơ định kỳ 500 giờ"
      }
    ],
    "allowed_actions": [
      "REPORT_INCIDENT",
      "START_INSPECTION",
      "VIEW_MANUAL"
    ]
  }
}
```

---

## 4. LUỒNG THAO TÁC NGƯỜI DÙNG KHI QUÉT MÃ (USER EXPERIENCE FLOW)

```text
               Người dùng hướng camera quét QR máy
                                 │
                                 ▼
                     Ứng dụng giải mã Token
                                 │
                                 ▼
                    Gọi API kiểm tra quyền hạn
                                 │
                                 ▼
            MỞ MÀN HÌNH ACTION SHEET DÀNH RIÊNG CHO MÁY
    ┌─────────────────────────────────────────────────────────┐
    │ 🏭 Máy phay CNC-024 (Khu A2)                            │
    │ Trạng thái: Đang hoạt động • Lần bảo dưỡng gần nhất: 6/10│
    ├─────────────────────────────────────────────────────────┤
    │ ⚠️ 1 Sự cố đang xử lý: "Rung lắc trục chính" (P3)        │
    │ 📋 1 Phiếu kiểm tra cần làm hôm nay                      │
    ├─────────────────────────────────────────────────────────┤
    │ [ 🚨 BÁO SỰ CỐ MỚI ]  [ 📋 THỰC HIỆN KIỂM TRA ]         │
    │ [ 📜 XEM LỊCH SỬ ]    [ 📖 HƯỚNG DẪN KỸ THUẬT ]         │
    └─────────────────────────────────────────────────────────┘
```

### Ưu điểm vượt trội:
* Công nhân không cần nhớ máy này tên gì, mã số bao nhiêu để gõ tìm kiếm thủ công.
* Giảm 80% thời gian thao tác nhập liệu tại hiện trường.
* Ngăn chặn hoàn toàn việc công nhân báo sự cố nhầm sang máy khác.
