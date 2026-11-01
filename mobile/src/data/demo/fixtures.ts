/**
 * shortcut: dữ liệu mẫu cho các màn mobile chưa có repository/API (nội dung lấy từ Figma Flowse 2.0).
 * Khi nối API: thay import từ file này bằng repository tương ứng; giữ nguyên hình dạng dữ liệu.
 */
export type Tone = 'danger' | 'warning' | 'success' | 'progress' | 'muted' | 'accent';

export const spaces = [
  { id: 1, name: 'Kế hoạch sản xuất', sub: '18 việc mở · 12 thành viên', color: '#0E7C74', project: false },
  { id: 2, name: 'Dự án ERP giai đoạn 2', sub: 'Phòng Kế hoạch · hạn 15/12 · 62%', color: '#C98512', project: true },
  { id: 3, name: 'Mở rộng dây chuyền A3', sub: 'Nhà máy Bình Dương · 40%', color: '#2F5FD0', project: true },
  { id: 4, name: 'Cải tiến liên tục', sub: '9 việc mở', color: '#C9473B', project: false },
];

export const spaceTree = [
  { id: 11, name: 'Đơn hàng tháng 11', kind: 'folder' as const, count: 13 },
  { id: 12, name: 'Đơn hàng AP-1126', kind: 'list' as const, count: 8 },
  { id: 13, name: 'Đơn hàng AP-1131', kind: 'list' as const, count: 5 },
  { id: 14, name: 'Cải tiến nội bộ', kind: 'folder' as const, count: 6 },
  { id: 15, name: 'Việc vận hành hằng ngày', kind: 'list' as const, count: 4 },
];

export const people = [
  { id: 2, name: 'Trần Thu Hà', sub: 'Phòng Kế hoạch · rảnh chiều nay' },
  { id: 3, name: 'Phạm Quốc Huy', sub: 'Phòng Kế hoạch · 7 việc mở' },
  { id: 4, name: 'Lê Đức Thành', sub: 'Tổ bảo trì · ca sáng' },
  { id: 5, name: 'Trần Quốc Dũng', sub: 'Trưởng ca · Dây chuyền A2' },
];

export const comments = [
  { who: 'Phạm Quốc Huy', at: '09:12', text: 'Đã có báo giá An Phát và Minh Long. Minh Long rẻ hơn 4% nhưng giao chậm 3 ngày.' },
  { who: 'Nguyễn Minh Anh', at: '09:20', text: '@Trần Quốc Dũng anh chọn giúp em phương án, hạn chốt là chiều nay.' },
  { who: 'Trần Quốc Dũng', at: '09:31', text: 'Chọn An Phát, giao đúng hạn quan trọng hơn.' },
];

export const asset = {
  code: 'BT-07',
  name: 'Băng tải con lăn 6 m',
  sub: 'Dây chuyền A2 · Xưởng đóng gói · Lắp 2021',
  status: 'Đang có sự cố',
  location: 'A2 · cuối chuyền',
  owner: 'Tổ bảo trì',
  lastService: '12/10/2026',
};

export const incidents = [
  { id: 24, code: 'SC-2610-024', title: 'Rung bất thường ở cụm con lăn', asset: 'BT-07', who: 'Lê Đức Thành đang sửa', sla: 'Còn 28 phút', tone: 'warning' as Tone, state: 'Đang sửa' },
  { id: 19, code: 'SC-2610-019', title: 'Cảm biến cửa tủ điện chập chờn', asset: 'Tủ điện A2', who: 'Trần Quốc Dũng đang xử lý', sla: 'Quá 1 giờ 05', tone: 'danger' as Tone, state: 'Mở' },
  { id: 21, code: 'SC-2610-021', title: 'Đầu đọc QR không nhận tín hiệu', asset: 'Đầu đọc A1', who: 'Lê Đức Thành', sla: 'Còn 3 giờ 10', tone: 'success' as Tone, state: 'Chờ xác minh' },
];

export const incidentTimeline = [
  { at: '09:02', text: 'Võ Văn Khánh báo sự cố · rung, kêu lạ' },
  { at: '09:05', text: 'Trần Quốc Dũng giao Lê Đức Thành · hạn 30 phút' },
  { at: '09:18', text: 'Lê Đức Thành bắt đầu sửa' },
];

export const symptoms = ['Rung, kêu lạ', 'Dừng máy', 'Rò rỉ', 'Nguy cơ an toàn', 'Khác'];

export const inspections = [
  { id: 18, code: 'QC-2610-018', title: 'Kiểm tra lô vải 24', sub: 'QC đầu vào · 6 tiêu chí', due: 'Hạn 10:30', tone: 'warning' as Tone },
  { id: 20, code: 'QC-2610-020', title: 'An toàn khu đóng gói', sub: 'Định kỳ tuần · 8 tiêu chí', due: 'Hôm nay', tone: 'muted' as Tone },
];

export const checklist = [
  'Số lượng khớp phiếu nhập',
  'Màu đúng mẫu duyệt',
  'Không lỗi dệt quá 2 điểm/m',
  'Độ ẩm dưới 8%',
  'Nhãn lô đầy đủ',
  'Bình chữa cháy số 3 còn hạn',
];

export const requestTypes = [
  { key: 'material', name: 'Vật tư, công cụ', sub: 'Kho xử lý · 1–2 ngày' },
  { key: 'purchase', name: 'Mua hàng', sub: 'Mua hàng · có phê duyệt' },
  { key: 'leave', name: 'Nghỉ phép', sub: 'Trưởng bộ phận duyệt' },
  { key: 'transfer', name: 'Điều động nhân sự', sub: 'Nhân sự · 2 bước' },
  { key: 'advance', name: 'Thanh toán, tạm ứng', sub: 'Tài chính · 3 bước' },
  { key: 'admin', name: 'Hành chính, IT', sub: 'Văn phòng · không cần duyệt' },
];

/** Trường form theo loại yêu cầu (G03, G03b–e) */
export const requestForms: Record<string, { title: string; fields: { label: string; placeholder: string }[]; note: string }> = {
  leave: { title: 'Nghỉ phép', fields: [{ label: 'Từ ngày', placeholder: '03/11/2026' }, { label: 'Đến ngày', placeholder: '04/11/2026' }, { label: 'Người thay', placeholder: 'Trần Thu Hà' }, { label: 'Lý do', placeholder: 'Việc gia đình' }], note: 'Người duyệt: Trần Quốc Dũng. Bạn nhận thông báo khi có quyết định.' },
  purchase: { title: 'Mua hàng', fields: [{ label: 'Mặt hàng', placeholder: 'Vòng bi 6204-2RS' }, { label: 'Số lượng', placeholder: '2 cái' }, { label: 'Cần trước', placeholder: '05/11' }, { label: 'Lý do', placeholder: 'Kho thiếu 2/4 · thay cho BT-07' }], note: 'Duyệt: Trưởng phòng Kế hoạch, rồi Mua hàng. Dưới 20 triệu không cần Giám đốc duyệt.' },
  advance: { title: 'Tạm ứng', fields: [{ label: 'Số tiền', placeholder: '3.500.000 đ' }, { label: 'Mục đích', placeholder: 'Công tác Đồng Nai 01–02/11' }, { label: 'Nhận qua', placeholder: 'Chuyển khoản' }, { label: 'Ghi chú', placeholder: 'Xăng xe, lưu trú 1 đêm' }], note: '3 bước: Trưởng phòng, Kế toán, Thủ quỹ. Hoàn ứng trong 7 ngày sau chuyến đi.' },
  transfer: { title: 'Điều động nhân sự', fields: [{ label: 'Người được điều động', placeholder: 'Võ Văn Khánh' }, { label: 'Đến đơn vị', placeholder: 'Dây chuyền A3' }, { label: 'Từ ngày', placeholder: '04/11' }, { label: 'Lý do', placeholder: 'Chạy thử dây chuyền mới' }], note: 'Trưởng 2 đơn vị cùng duyệt.' },
  admin: { title: 'Hành chính, IT', fields: [{ label: 'Hạng mục', placeholder: 'In tem nhãn AP-1126' }, { label: 'Số lượng', placeholder: '200 tem' }, { label: 'Giao tới', placeholder: 'Kho thành phẩm' }, { label: 'Cần trước', placeholder: '01/11' }], note: 'Không cần duyệt. Hành chính nhận ngay và báo khi xong.' },
  material: { title: 'Vật tư, công cụ', fields: [{ label: 'Vật tư', placeholder: 'Vòng bi 6204-2RS' }, { label: 'Số lượng', placeholder: '4 cái' }, { label: 'Cho thiết bị', placeholder: 'BT-07' }, { label: 'Lý do', placeholder: 'Thay sau sự cố SC-2610-024' }], note: 'Kho xác nhận trong 1–2 ngày; phần thiếu chuyển Mua hàng.' },
};

export const myRequests = [
  { id: 39, code: 'YC-2610-039', title: 'Cấp laptop cho nhân sự mới', sub: 'IT · Chờ bạn xác nhận đã nhận', tone: 'warning' as Tone },
  { id: 44, code: 'YC-2610-044', title: 'Tạm ứng công tác Đồng Nai', sub: 'Tài chính · Đang duyệt bước 2/3', tone: 'progress' as Tone },
  { id: 12, code: 'NP-2610-012', title: 'Nghỉ phép 03–04/11', sub: 'Nhân sự · Trả lại: cần người thay', tone: 'danger' as Tone },
];

export const requestSteps = [
  { name: 'Trưởng bộ phận', who: 'Trần Quốc Dũng · duyệt 28/10', done: true },
  { name: 'Kế toán', who: 'Đỗ Minh Khoa · đang xem', done: false, current: true },
  { name: 'Thủ quỹ chi', who: 'Chưa tới bước', done: false },
];

export const approvals = [
  { id: 9, code: 'VT-2610-009', title: 'Vật tư sửa băng tải BT-07', who: 'Nguyễn Hoàng Nam', amount: '4.860.000 đ', due: 'Cần trước 12:00', tone: 'warning' as Tone },
  { id: 44, code: 'YC-2610-044', title: 'Tạm ứng công tác Đồng Nai', who: 'Nguyễn Minh Anh', amount: '3.500.000 đ', due: '31/10', tone: 'muted' as Tone },
  { id: 13, code: 'NP-2610-013', title: 'Nghỉ phép 05/11', who: 'Trần Thu Hà', amount: '1 ngày', due: 'Phép năm', tone: 'muted' as Tone },
];

export const approvalLines = [
  { label: 'Vòng bi 6204-2RS', value: '2 cái · 1.240.000 đ' },
  { label: 'Bu lông M10×35', value: '8 cái · 96.000 đ' },
  { label: 'Cảm biến E3Z-D61', value: '1 cái · 3.524.000 đ' },
];

export const materials = [
  { id: 9, code: 'VT-2610-009', title: 'Vòng bi 6204-2RS cho BT-07', sub: 'Kho cấp 2/4 · chờ mua 2', tone: 'warning' as Tone },
  { id: 7, code: 'VT-2610-007', title: 'Dây curoa máy M-07', sub: 'Đã nhận đủ', tone: 'success' as Tone },
];

export const handover = {
  from: 'Ca sáng', to: 'Ca chiều', team: 'Tổ đóng gói 02',
  pending: [
    { title: 'Vệ sinh khu vực cuối chuyền', sub: 'Còn 40% · Lê Minh Tâm' },
    { title: 'BT-07 chờ vòng bi', sub: 'Chạy tối đa 70% tải' },
  ],
};

export const syncQueue = [
  { title: 'Báo sự cố BT-07', sub: 'Ảnh 2 vượt 10 MB · chọn lại ảnh', tone: 'danger' as Tone, state: 'Lỗi' },
  { title: 'Checklist đóng gói', sub: 'Máy chủ có bản mới hơn · cần so sánh', tone: 'warning' as Tone, state: 'Xung đột' },
  { title: 'Ghi chú sửa BT-2610-011', sub: 'Đã gửi 09:52', tone: 'success' as Tone, state: 'Đã gửi' },
];

export const notifications = [
  { id: 1, who: 'Trần Quốc Dũng', title: 'Trần Quốc Dũng nhắc bạn', sub: '"@Minh Anh chọn An Phát" · VP-2610-031', kind: 'mention', unread: true },
  { id: 2, who: 'Phạm Quốc Huy', title: 'Việc mới: Báo giá phụ liệu', sub: 'Phạm Quốc Huy giao · hạn hôm nay', kind: 'task', unread: true },
  { id: 3, who: 'IT', title: 'Laptop đã sẵn sàng bàn giao', sub: 'YC-2610-039 · xác nhận khi nhận', kind: 'request', unread: true },
  { id: 4, who: 'Đỗ Khoa', title: 'Tạm ứng được duyệt bước 1', sub: 'YC-2610-044', kind: 'approval', unread: false },
];

export const conversations = [
  { id: 1, name: 'Trần Quốc Dũng', last: 'Ok, chiều anh qua xem BT-07', at: '10:24', unread: 1, kind: 'direct' },
  { id: 2, name: '# bảo-trì-a2', last: 'Hồ Văn Bảo: Đã thay xong con lăn số 3', at: '10:02', unread: 2, kind: 'channel' },
  { id: 3, name: 'Kế hoạch sản xuất', last: 'Phạm Quốc Huy: Báo giá đã gửi', at: '09:40', unread: 0, kind: 'space' },
  { id: 4, name: 'Lê Đức Thành', last: 'Ảnh · BT-07 sau khi sửa', at: 'Hôm qua', unread: 0, kind: 'direct' },
];

export const chatMessages = [
  { mine: false, text: 'Em gửi ảnh BT-07 sau khi siết lại cụm con lăn.', meta: '10:12' },
  { mine: true, text: 'Rung giảm chưa em?', meta: '10:15' },
  { mine: false, text: 'Giảm rồi anh, còn 2.1 mm/s, trong ngưỡng.', meta: '10:20' },
  { mine: true, text: 'Ok, chiều anh qua xem BT-07.', meta: '10:24 · Đã xem' },
];

export const aiSuggestions = [
  { title: 'Soạn email báo trễ đơn hàng', sub: 'Chat · soạn nội dung' },
  { title: 'Tóm tắt tiến độ hôm nay', sub: 'Work · 12 việc đang làm' },
  { title: 'Việc quá hạn của phòng', sub: 'Work · 3 việc cần xử lý' },
  { title: 'Tạo và giao công việc', sub: 'Work · gõ như nhắn tin' },
];
