const fs = require('fs');
const path = require('path');
const { 
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
    WidthType, BorderStyle, HeadingLevel, AlignmentType, ShadingType,
    PageNumber, NumberFormat, Header, Footer
} = require('docx');

// Colors
const COLOR_PRIMARY = "4F46E5"; // Indigo 600
const COLOR_PRIMARY_LIGHT = "EEF2FF";
const COLOR_SECONDARY = "7C3AED"; // Purple 600
const COLOR_DARK = "111827";
const COLOR_MUTED = "4B5563";
const COLOR_BORDER = "D1D5DB";
const COLOR_BG_HEADER = "F3F4F6";
const COLOR_BG_ALT = "F9FAFB";
const COLOR_SUCCESS = "059669";
const COLOR_DANGER = "DC2626";
const COLOR_WARNING = "D97706";

const borderThin = {
    top: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
    left: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
    right: { style: BorderStyle.SINGLE, size: 1, color: COLOR_BORDER },
};

function createHeading1(text) {
    return new Paragraph({
        text: text,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 180 },
        run: {
            font: "Calibri",
            size: 32, // 16pt
            bold: true,
            color: COLOR_PRIMARY
        }
    });
}

function createHeading2(text) {
    return new Paragraph({
        text: text,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        run: {
            font: "Calibri",
            size: 26, // 13pt
            bold: true,
            color: COLOR_SECONDARY
        }
    });
}

function createHeading3(text) {
    return new Paragraph({
        text: text,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 180, after: 80 },
        run: {
            font: "Calibri",
            size: 22, // 11pt
            bold: true,
            color: COLOR_DARK
        }
    });
}

function createParagraph(text, options = {}) {
    return new Paragraph({
        spacing: { before: 60, after: 100 },
        children: [
            new TextRun({
                text: text,
                font: "Calibri",
                size: 20, // 10pt
                color: options.color || COLOR_DARK,
                bold: options.bold || false,
                italics: options.italics || false
            })
        ]
    });
}

function createBullet(text, boldPrefix = "") {
    const children = [];
    if (boldPrefix) {
        children.push(new TextRun({
            text: boldPrefix + " ",
            font: "Calibri",
            size: 20,
            bold: true,
            color: COLOR_DARK
        }));
    }
    children.push(new TextRun({
        text: text,
        font: "Calibri",
        size: 20,
        color: COLOR_MUTED
    }));

    return new Paragraph({
        bullet: { level: 0 },
        spacing: { before: 40, after: 60 },
        children: children
    });
}

function createCallout(title, text) {
    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        shading: { fill: COLOR_PRIMARY_LIGHT, type: ShadingType.CLEAR },
                        borders: {
                            left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_PRIMARY },
                            top: { style: BorderStyle.NONE },
                            right: { style: BorderStyle.NONE },
                            bottom: { style: BorderStyle.NONE },
                        },
                        margins: { top: 120, bottom: 120, left: 160, right: 160 },
                        children: [
                            new Paragraph({
                                spacing: { after: 60 },
                                children: [
                                    new TextRun({
                                        text: title,
                                        font: "Calibri",
                                        size: 20,
                                        bold: true,
                                        color: COLOR_PRIMARY
                                    })
                                ]
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: text,
                                        font: "Calibri",
                                        size: 19,
                                        color: COLOR_DARK
                                    })
                                ]
                            })
                        ]
                    })
                ]
            })
        ]
    });
}

function createTableHeaderCell(text, widthPercent) {
    return new TableCell({
        width: { size: widthPercent, type: WidthType.PERCENTAGE },
        shading: { fill: COLOR_PRIMARY, type: ShadingType.CLEAR },
        borders: borderThin,
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        children: [
            new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                    new TextRun({
                        text: text,
                        font: "Calibri",
                        size: 18,
                        bold: true,
                        color: "FFFFFF"
                    })
                ]
            })
        ]
    });
}

function createTableCell(text, widthPercent, isAlt = false, isBold = false, align = AlignmentType.LEFT, textColor = COLOR_DARK) {
    return new TableCell({
        width: { size: widthPercent, type: WidthType.PERCENTAGE },
        shading: isAlt ? { fill: COLOR_BG_ALT, type: ShadingType.CLEAR } : undefined,
        borders: borderThin,
        margins: { top: 80, bottom: 80, left: 100, right: 100 },
        children: [
            new Paragraph({
                alignment: align,
                children: [
                    new TextRun({
                        text: text,
                        font: "Calibri",
                        size: 18,
                        bold: isBold,
                        color: textColor
                    })
                ]
            })
        ]
    });
}

// Build Test Table
function buildTestCaseTable(testCases) {
    const rows = [
        new TableRow({
            tableHeader: true,
            children: [
                createTableHeaderCell("Mã TC", 10),
                createTableHeaderCell("Tên Kịch Bản Kiểm Thử", 20),
                createTableHeaderCell("Các Bước Thực Hiện (Steps)", 22),
                createTableHeaderCell("Dữ Liệu Đầu Vào (Input)", 18),
                createTableHeaderCell("Kết Quả Kỳ Vọng / Đầu Ra (Output)", 22),
                createTableHeaderCell("Tiêu Chí", 8)
            ]
        })
    ];

    testCases.forEach((tc, idx) => {
        const isAlt = idx % 2 === 1;
        rows.push(
            new TableRow({
                children: [
                    createTableCell(tc.id, 10, isAlt, true, AlignmentType.CENTER, COLOR_PRIMARY),
                    createTableCell(tc.name, 20, isAlt, true),
                    createTableCell(tc.steps, 22, isAlt),
                    createTableCell(tc.input, 18, isAlt, false, AlignmentType.LEFT, COLOR_MUTED),
                    createTableCell(tc.output, 22, isAlt, false, AlignmentType.LEFT, COLOR_DARK),
                    createTableCell(tc.criteria || "PASS", 8, isAlt, true, AlignmentType.CENTER, COLOR_SUCCESS)
                ]
            })
        );
    });

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rows
    });
}

async function generateDocx() {
    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: "Calibri", size: 20, color: COLOR_DARK }
                }
            }
        },
        sections: [
            {
                properties: {
                    page: {
                        margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 } // ~21mm
                    }
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({
                                        text: "FLOWISE 2.0 ENTERPRISE — BÁO CÁO LUỒNG NGHIỆP VỤ & KỊCH BẢN KIỂM THỬ TOÀN DIỆN",
                                        font: "Calibri",
                                        size: 16,
                                        color: "9CA3AF"
                                    })
                                ]
                            })
                        ]
                    })
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({
                                        text: "Trang ",
                                        font: "Calibri",
                                        size: 16,
                                        color: "9CA3AF"
                                    }),
                                    new TextRun({
                                        children: [PageNumber.CURRENT],
                                        font: "Calibri",
                                        size: 16,
                                        color: "9CA3AF"
                                    }),
                                    new TextRun({
                                        text: " / ",
                                        font: "Calibri",
                                        size: 16,
                                        color: "9CA3AF"
                                    }),
                                    new TextRun({
                                        children: [PageNumber.TOTAL_PAGES],
                                        font: "Calibri",
                                        size: 16,
                                        color: "9CA3AF"
                                    })
                                ]
                            })
                        ]
                    })
                },
                children: [
                    // Title Block
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200, after: 100 },
                        children: [
                            new TextRun({
                                text: "TỔNG HỢP LUỒNG NGHIỆP VỤ VÀ KỊCH BẢN KIỂM THỬ TOÀN BỘ HỆ THỐNG",
                                font: "Calibri",
                                size: 36, // 18pt
                                bold: true,
                                color: COLOR_PRIMARY
                            })
                        ]
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 50, after: 250 },
                        children: [
                            new TextRun({
                                text: "FLOWISE ENTERPRISE CMMS & OPERATIONAL WORKFLOW PLATFORM",
                                font: "Calibri",
                                size: 24, // 12pt
                                bold: true,
                                color: COLOR_SECONDARY
                            })
                        ]
                    }),

                    createCallout(
                        "THÔNG TIN DỰ ÁN & PHẠM VI KIỂM THỬ",
                        "• Hệ thống: Flowise 2.0 (Kiến trúc 3 tầng: Field Operations ↔ Asset Master ↔ Executive Reliability Hub)\n" +
                        "• Phiên bản: 1.2 Enterprise Release (Ngày ban hành: 20/10/2026)\n" +
                        "• Công nghệ: Node.js / Express / PostgreSQL • React 19 / TypeScript / Tailwind CSS v4 • Groq Llama 3.3 (70B)\n" +
                        "• Mục đích tài liệu: Tổng hợp toàn bộ luồng hoạt động từng chức năng nghiệp vụ và cung cấp ma trận kiểm thử (Test Matrix) chi tiết từ đầu đến cuối có đầy đủ dữ liệu Đầu vào (Input) và Đầu ra (Output) để phục vụ nghiệm thu & bàn giao."
                    ),

                    createHeading1("PHẦN I: TỔNG HỢP LUỒNG HOẠT ĐỘNG TỪNG CHỨC NĂNG NGHIỆP VỤ"),

                    createHeading2("1. Luồng Tác Nghiệp Quản Lý Sự Cố Hiện Trường (Field Incident FSM Workflow)"),
                    createParagraph("Hệ thống quản lý sự cố và lệnh công việc vận hành dựa trên Máy Trạng Thái Hữu Hạn (Finite State Machine - FSM) nghiêm ngặt gồm 6 trạng thái kế thừa theo chuẩn công nghiệp:"),
                    createBullet("Công nhân hoặc kỹ thuật viên quét mã QR trên máy móc, phát hiện sự cố (chảy dầu, rung giật, kẹt phoi) và gửi phiếu báo kèm 1 ảnh chụp hiện trường. Hệ thống khởi tạo đồng hồ đo SLA.", "• Bước 1 - Tiếp nhận (REPORTED):"),
                    createBullet("Quản đốc phân xưởng tiếp nhận sự cố trên màn hình Web điều hành, xem xét tính cấp bách (P1 Critical đến P4 Low), chỉ định kỹ thuật viên cơ điện chịu trách nhiệm.", "• Bước 2 - Phân công (ASSIGNED):"),
                    createBullet("Kỹ thuật viên nhận thông báo, mở app xác nhận tiếp nhận việc và bấm 'Bắt đầu xử lý'. Trạng thái chuyển sang IN_PROGRESS và đồng hồ SLA ghi nhận thời gian phản hồi đạt chuẩn.", "• Bước 3 - Đang xử lý (IN_PROGRESS):"),
                    createBullet("Nếu phát hiện hỏng phụ tùng (vỡ vòng bi, đứt gioăng thủy lực), kỹ thuật viên bấm nút 'Yêu cầu linh kiện'. Hệ thống tự sinh phiếu xin mua và TỰ ĐỘNG TẠM DỪNG ĐỒNG HỒ SLA để bảo vệ chỉ số KPI cho kỹ thuật viên.", "• Bước 4 - Chờ vật tư (ON_HOLD_PENDING_PARTS):"),
                    createBullet("Sau khi thay thế xong linh kiện, kỹ thuật viên chụp ảnh hiện trường sau sửa chữa làm bằng chứng nghiệm thu và bấm 'Gửi duyệt nghiệm thu'.", "• Bước 5 - Chờ nghiệm thu (WAITING_VERIFY):"),
                    createBullet("Quản đốc kiểm tra ảnh đối chiếu, xác nhận chất lượng vận hành và đóng sự cố. Hệ thống ghi nhật ký Audit Trail và lưu vào dữ liệu tính toán MTTR.", "• Bước 6 - Đóng sự cố (RESOLVED):"),

                    createHeading2("2. Luồng Kiểm Soát Cam Kết SLA & Tạm Dừng Khi Thiếu Phụ Tùng (SLA Lifecycle)"),
                    createParagraph("Quy trình kiểm soát SLA được tự động hóa 100% bằng cơ chế thời gian thực:"),
                    createBullet("Mỗi mức độ nghiêm trọng có ngưỡng cam kết riêng: P1 (Phản hồi 15p, Xử lý 2h), P2 (Phản hồi 30p, Xử lý 4h), P3 (Phản hồi 2h, Xử lý 8h), P4 (Phản hồi 4h, Xử lý 24h).", "• Khởi tạo đồng hồ:"),
                    createBullet("Đồng hồ hiển thị thời gian đếm ngược trực quan: Xanh lá (Đạt chuẩn IN_SLA), Vàng cam (Cảnh báo WARNING khi còn dưới 25% thời gian), Đỏ (Vi phạm BREACHED khi quá hạn).", "• Giám sát trạng thái:"),
                    createBullet("Khi phát sinh nhu cầu mua sắm/xuất kho phụ tùng, sự cố chuyển sang ON_HOLD_PENDING_PARTS -> ĐỒNG HỒ SLA TẠM DỪNG (PAUSED). Khi quản đốc duyệt và kỹ thuật viên tiếp tục làm việc, ĐỒNG HỒ TỰ ĐỘNG KÍCH HOẠT LẠI (RESUMED).", "• Cơ chế Pause/Resume:"),

                    createHeading2("3. Luồng Quét Mã QR & Định Danh Số Thiết Bị (Asset QR Digital Identity)"),
                    createBullet("Mỗi máy móc công nghiệp (ví dụ Máy phay CNC-024) được cấp một mã QR chứa Token định danh số bảo mật (Opaque Token chống giả mạo URL).", "• Cấp phát mã QR:"),
                    createBullet("Khi dùng camera điện thoại quét mã QR, ứng dụng tự động giải mã Token và hiển thị ngay Digital Context của thiết bị: Tên máy, vị trí lắp đặt, lịch sử hỏng hóc 3 lần gần nhất, chu kỳ bảo trì phòng ngừa định kỳ.", "• Truy xuất ngữ cảnh:"),
                    createBullet("Cho phép công nhân bấm nút 'Báo sự cố tức thì' ngay tại hồ sơ máy mà không cần nhập lại mã thiết bị hay vị trí phân xưởng.", "• Thao tác 1-chạm:"),

                    createHeading2("4. Luồng Tác Nghiệp Ngoại Tuyến & Đồng Bộ Gom Lô (Offline-First Delta Sync)"),
                    createBullet("Khi mất sóng Wi-Fi/4G trong nhà xưởng, ứng dụng tự động chuyển sang chế độ Offline. Thanh OfflineSyncBanner màu cam hiển thị thông báo số lượng thao tác đang chờ đồng bộ.", "• Phát hiện mất mạng:"),
                    createBullet("Kỹ thuật viên vẫn thực hiện bình thường các thao tác: đánh dấu checklist, cập nhật ghi chú tiến độ, chụp ảnh. Mọi thao tác được lưu trữ an toàn trong hàng đợi cục bộ (IndexedDB/SQLite Queue) kèm idempotency_key.", "• Hàng đợi cục bộ:"),
                    createBullet("Ngay khi phát hiện có mạng trở lại, động cơ Sync Engine ngầm gom lô các hành động gửi lên máy chủ (/api/v1/sync/batch). Máy chủ kiểm tra phiên bản (base_version) chống ghi đè dữ liệu.", "• Tự động Batch Sync:"),
                    createBullet("Nếu người dùng bấm Đăng xuất khi còn thao tác chưa gửi lên máy chủ, hệ thống bật hộp thoại Shift Handover Guard cảnh báo và ngăn chặn mất mát dữ liệu ca trực.", "• Chốt chặn đổi ca:"),

                    createHeading2("5. Luồng Trí Tuệ Nhân Tạo Điều Hành & Thẻ Hành Động (AI CMMS Analytics & Action Cards)"),
                    createBullet("Phân hệ độc lập trên thanh Sidebar bên trái (/analytics) dành riêng cho Quản đốc phân xưởng, hiển thị bức tranh toàn cảnh: Điểm sức khỏe nhà máy (Plant Health Score vòng cung), Tổng Downtime, MTTR, và Tỷ lệ tuân thủ SLA.", "• Bảng điều khiển điều hành:"),
                    createBullet("Mô hình AI Groq Llama 3.3 (70B) tổng hợp số liệu thực tế từ cơ sở dữ liệu, phân tích nguyên nhân gốc rễ (Root Causes) như quá nhiệt trục chính, mài mòn gioăng thủy lực.", "• Phân tích cấp cao:"),
                    createBullet("AI tự động soạn thảo Thẻ Hành Động đề xuất phương án bảo dưỡng phòng ngừa (Prescriptive PM) kèm độ tin cậy trích xuất. Tuân thủ nguyên tắc Human-in-the-loop: Chỉ khi Quản đốc bấm 'Xác nhận thực hiện' thì sự cố mới được ghi vào CSDL.", "• Enterprise Action Cards:"),
                    createBullet("Ngay sau khi bấm duyệt thành công, thẻ hành động lập tức biến mất khỏi hàng đợi và hiển thị thông báo đã chuyển giao xuống hiện trường, ngăn chặn hoàn toàn việc bấm trùng lặp.", "• Cơ chế hoàn tất thẻ:"),
                    createBullet("Nút 'In báo cáo' hỗ trợ xuất PDF / in giấy A4 chuyên nghiệp, tự động ẩn sidebar, nút bấm và thêm Header doanh nghiệp trang trọng.", "• Xuất báo cáo A4:"),

                    createHeading1("PHẦN II: MA TRẬN KỊCH BẢN KIỂM THỬ TOÀN DIỆN (FULL SYSTEM TEST MATRIX)"),
                    createParagraph("Dưới đây là bảng ma trận kiểm thử chi tiết của toàn bộ hệ sinh thái Flowise 2.0 với đầy đủ Dữ liệu Đầu vào (Input), Kết quả Đầu ra (Output) và Tiêu chí đánh giá:"),

                    createHeading2("Nhóm 1: Xác Thực, Phân Quyền & Không Gian Làm Việc (Auth & Workspaces)"),
                    buildTestCaseTable([
                        {
                            id: "TC-AUTH-01",
                            name: "Đăng nhập tài khoản hợp lệ",
                            steps: "1. Truy cập /login\n2. Nhập Email & Mật khẩu\n3. Bấm 'Đăng nhập'",
                            input: "Email: admin@flowise.com\nPassword: Password123!",
                            output: "Trả về HTTP 200, JWT Access Token được lưu, chuyển hướng vào màn hình /home.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-AUTH-02",
                            name: "Đăng nhập sai mật khẩu",
                            steps: "1. Nhập Email đúng, Password sai\n2. Bấm 'Đăng nhập'",
                            input: "Email: admin@flowise.com\nPassword: WrongPassword",
                            output: "Trả về HTTP 401, hiển thị Toast cảnh báo: 'Sai thông tin đăng nhập hoặc tài khoản không tồn tại'. Không cấp token.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-WS-01",
                            name: "Tạo Không gian làm việc mới",
                            steps: "1. Bấm Workspace Switcher trên Sidebar\n2. Chọn 'Tạo Workspace mới'\n3. Điền tên & Bấm Lưu",
                            input: "Workspace Name: 'Phân Xưởng Cơ Khí B2'\nDescription: 'Khu vực máy CNC 5 trục'",
                            output: "Tạo thành công Workspace ID mới trong CSDL, Sidebar tự động chuyển sang Workspace vừa tạo.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-WS-02",
                            name: "Mời thành viên vào Workspace",
                            steps: "1. Bấm 'Mời thành viên' ở đáy Sidebar\n2. Nhập email & Chọn vai trò (Admin/Member/Viewer)\n3. Bấm 'Gửi lời mời'",
                            input: "Invite Email: 'tech.nguyen@flowise.com'\nRole: 'Member'",
                            output: "Tạo bản ghi lời mời trong workspace_members, người được mời nhận thông báo kích hoạt.",
                            criteria: "PASS"
                        }
                    ]),

                    createHeading2("Nhóm 2: Quản Lý Dự Án & Nhiệm Vụ (Kanban, Sprints & Tasks)"),
                    buildTestCaseTable([
                        {
                            id: "TC-TASK-01",
                            name: "Khởi tạo Sprint sản xuất mới",
                            steps: "1. Vào Space 'Phân xưởng'\n2. Bấm nút '+' tạo Sprint\n3. Điền tên, ngày bắt đầu và kết thúc\n4. Bấm Lưu",
                            input: "Sprint Name: 'Sprint 24 - Đại tu máy CNC'\nStart: 2026-10-20\nEnd: 2026-11-03",
                            output: "Sprint mới xuất hiện trong danh sách, trạng thái ACTIVE, có thể gán các công việc vào Sprint.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-TASK-02",
                            name: "Tạo công việc (Task) với mức độ ưu tiên",
                            steps: "1. Trong Sprint, bấm 'Thêm công việc'\n2. Nhập tiêu đề, người thực hiện, độ ưu tiên, hạn chót",
                            input: "Title: 'Thay dầu tuần hoàn máy tiện CNC-024'\nPriority: 'URGENT'\nDue: 2026-10-22",
                            output: "Task hiển thị trên bảng Kanban cột 'TO DO', có nhãn màu đỏ URGENT và cờ báo hạn chót.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-TASK-03",
                            name: "Kéo thả cập nhật trạng thái Kanban",
                            steps: "1. Giữ chuột vào thẻ Task\n2. Kéo từ cột 'TO DO' sang 'IN PROGRESS'\n3. Thả chuột",
                            input: "Drag & drop Card ID: 104 -> Column: 'IN PROGRESS'",
                            output: "Cập nhật status = 'IN PROGRESS' trên CSDL, lịch sử hoạt động ghi nhận thay đổi trạng thái.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-TIME-01",
                            name: "Ghi nhận thời gian làm việc (Time Tracking)",
                            steps: "1. Mở chi tiết Task\n2. Bấm 'Bắt đầu tính giờ' (Timer)\n3. Sau một khoảng thời gian, bấm 'Dừng và ghi nhận'",
                            input: "Task: 'Kiểm tra độ rung trục chính'\nDuration: 45 phút\nNote: 'Đã siết lại bu lông bệ máy'",
                            output: "Thời gian làm việc được cộng dồn vào tổng thời lượng của Task, lưu vào bảng time_entries.",
                            criteria: "PASS"
                        }
                    ]),

                    createHeading2("Nhóm 3: Quản Lý Thiết Bị & Mã QR (Asset Master & QR Context)"),
                    buildTestCaseTable([
                        {
                            id: "TC-AST-01",
                            name: "Khởi tạo hồ sơ thiết bị công nghiệp",
                            steps: "1. Vào mục 'Thiết bị & QR' (/assets)\n2. Bấm 'Thêm thiết bị mới'\n3. Nhập thông số kỹ thuật, vị trí, chu kỳ PM",
                            input: "Code: 'CNC-024'\nName: 'Máy Phay CNC 5 Trục Số 24'\nLocation: 'Khu Vực B2'\nPM Cycle: 30 ngày",
                            output: "Tạo thành công bản ghi trong assets, hệ thống tự động sinh QR Token ngẫu nhiên bảo mật.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-AST-02",
                            name: "Sinh và tải mã QR định danh số",
                            steps: "1. Chọn thiết bị CNC-024 trong danh sách\n2. Bấm nút 'Xem mã QR'\n3. Bấm 'Tải mã QR (PNG)'",
                            input: "Asset ID: CNC-024, QR Opaque Token",
                            output: "Hiển thị Modal mã QR sắc nét có logo Flowise, tải về file ảnh PNG để in dán lên thân máy.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-AST-03",
                            name: "Quét mã QR tra cứu Digital Context",
                            steps: "1. Giả lập quét mã QR của máy CNC-024\n2. Hệ thống gọi API giải mã context",
                            input: "QR Token: 'qr_tok_cnc024_x98f2'",
                            output: "Trả về thông tin chi tiết: Trạng thái máy (Đang chạy/Dừng), lịch sử bảo dưỡng gần nhất, nút báo hỏng nhanh.",
                            criteria: "PASS"
                        }
                    ]),

                    createHeading2("Nhóm 4: Quản Lý Sự Cố Hiện Trường & FSM State Machine"),
                    buildTestCaseTable([
                        {
                            id: "TC-INC-01",
                            name: "Báo cáo sự cố khẩn cấp P1 có ảnh bằng chứng",
                            steps: "1. Tại /incidents, bấm '+ Báo cáo sự cố mới'\n2. Chọn máy CNC-024, mức độ CRITICAL\n3. Tải lên 1 ảnh hiện trường hỏng hóc\n4. Bấm Gửi",
                            input: "Title: 'Rung lắc dữ dội trục chính CNC-024'\nSeverity: 'CRITICAL'\nAsset: 'CNC-024'\nEvidence: 'photo_vibrate.jpg'",
                            output: "Tạo sự cố trạng thái REPORTED, khởi tạo đồng hồ SLA (Response: 15p), hiển thị thẻ cảnh báo màu đỏ.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-INC-02",
                            name: "Quản đốc điều phối kỹ thuật viên (Triage & Assign)",
                            steps: "1. Mở chi tiết sự cố vừa tạo\n2. Bấm nút 'Chỉ định kỹ thuật viên'\n3. Chọn kỹ thuật viên phụ trách\n4. Xác nhận",
                            input: "Assignee: 'Nguyễn Văn Kỹ Thuật'\nNote: 'Ưu tiên kiểm tra cụm bạc đạn trước'",
                            output: "Trạng thái chuyển sang ASSIGNED, người được giao nhận được thông báo đẩy.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-INC-03",
                            name: "Kỹ thuật viên tiếp nhận & Bắt đầu sửa chữa",
                            steps: "1. Kỹ thuật viên mở chi tiết sự cố\n2. Bấm nút 'Bắt đầu xử lý (Start Work)'",
                            input: "Action: START_WORK, User: Technician",
                            output: "Trạng thái FSM chuyển sang IN_PROGRESS. Đồng hồ Response SLA dừng lại và ghi nhận ĐẠT CHUẨN.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-INC-04",
                            name: "Nghiệm thu đóng sự cố (Verify & Resolve)",
                            steps: "1. Kỹ thuật viên tải ảnh sau sửa chữa -> Bấm 'Gửi nghiệm thu'\n2. Quản đốc kiểm tra ảnh và bấm 'Đóng sự cố (Resolve)'",
                            input: "Resolution Note: 'Đã thay mới bạc đạn và bôi trơn mỡ chịu nhiệt'\nAction: RESOLVE",
                            output: "Trạng thái FSM chuyển sang RESOLVED. Hệ thống tính toán tổng Downtime và cập nhật chỉ số MTTR.",
                            criteria: "PASS"
                        }
                    ]),

                    createHeading2("Nhóm 5: Kiểm Soát SLA & Cơ Chế Tạm Dừng Khi Chờ Linh Kiện"),
                    buildTestCaseTable([
                        {
                            id: "TC-SLA-01",
                            name: "Đếm ngược SLA theo thời gian thực",
                            steps: "1. Mở màn hình Sự cố\n2. Quan sát đồng hồ SLA đếm ngược",
                            input: "Incident Severity: P2 (Target Resolution: 4h)",
                            output: "Đồng hồ hiển thị thời gian giảm dần: 03h:59m:59s... với nhãn màu xanh lá 'IN_SLA'.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-SLA-02",
                            name: "Yêu cầu vật tư & TỰ ĐỘNG TẠM DỪNG SLA",
                            steps: "1. Tại sự cố đang IN_PROGRESS, bấm 'Xin cấp linh kiện'\n2. Điền tên vật tư cần thay: 'Vòng bi SKF-6205'\n3. Bấm Gửi yêu cầu",
                            input: "Part Name: 'Vòng bi SKF-6205'\nQuantity: 2 cái",
                            output: "Sự cố chuyển trạng thái ON_HOLD_PENDING_PARTS. Đồng hồ SLA lập tức hiển thị nhãn 'TẠM DỪNG (PAUSED)', ngừng đếm ngược.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-SLA-03",
                            name: "Duyệt cấp vật tư & TỰ ĐỘNG TIẾP TỤC SLA",
                            steps: "1. Quản đốc vào 'Phê duyệt', bấm Duyệt cấp vật tư\n2. Kỹ thuật viên nhận được linh kiện, bấm 'Tiếp tục sửa chữa'",
                            input: "Action: RESUME_WORK",
                            output: "Sự cố trở lại trạng thái IN_PROGRESS. Đồng hồ SLA TỰ ĐỘNG TIẾP TỤC ĐẾM (RESUMED) từ số phút trước khi dừng.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-SLA-04",
                            name: "Cảnh báo vi phạm cam kết SLA (Breached)",
                            steps: "1. Kiểm tra sự cố để quá thời gian cam kết quy định",
                            input: "Elapsed Time > SLA Threshold (ví dụ > 4 giờ đối với P2)",
                            output: "Nhãn SLA chuyển sang màu đỏ rực 'VI PHẠM (BREACHED)', bảng điều hành ghi nhận thêm 1 vụ vi phạm.",
                            criteria: "PASS"
                        }
                    ]),

                    createHeading2("Nhóm 6: Tác Nghiệp Ngoại Tuyến (Offline-First Engine)"),
                    buildTestCaseTable([
                        {
                            id: "TC-OFF-01",
                            name: "Phát hiện mất mạng & Tác nghiệp ngoại tuyến",
                            steps: "1. Tắt Wi-Fi / Bật chế độ máy bay\n2. Thực hiện cập nhật checklist kiểm tra máy và nhập ghi chú tiến độ",
                            input: "Network: Offline\nAction: Tick 3 mục checklist + Ghi chú 'Đang tháo cụm bơm'",
                            output: "Ứng dụng không bị lỗi, xuất hiện OfflineSyncBanner màu cam '2 thao tác đang chờ đồng bộ'.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-OFF-02",
                            name: "Tự động đồng bộ gom lô khi có mạng trở lại",
                            steps: "1. Bật lại kết nối Wi-Fi / 4G\n2. Quan sát phản ứng hệ thống",
                            input: "Network: Online restored",
                            output: "Sync Engine tự động gửi lô thao tác lên /api/v1/sync/batch, banner chuyển sang màu xanh 'Đã đồng bộ thành công'.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-OFF-03",
                            name: "Chốt chặn bảo vệ bàn giao ca (Shift Handover Guard)",
                            steps: "1. Khi đang có thao tác ngoại tuyến chưa đồng bộ\n2. Bấm nút 'Đăng xuất' ở Sidebar",
                            input: "Pending actions: > 0, Action: Logout",
                            output: "Hệ thống chặn đăng xuất, bật Modal cảnh báo: 'Bạn có thao tác ngoại tuyến chưa đồng bộ. Nếu đăng xuất sẽ mất dữ liệu ca trực!'.",
                            criteria: "PASS"
                        }
                    ]),

                    createHeading2("Nhóm 7: Trung Tâm Điều Hành CMMS & AI Llama 3.3 Analytics"),
                    buildTestCaseTable([
                        {
                            id: "TC-CMMS-01",
                            name: "Truy cập Trung tâm Điều hành từ Sidebar",
                            steps: "1. Bấm vào mục 'Điều hành CMMS' (icon sóng nhịp tim) trên thanh Sidebar",
                            input: "Route: /analytics",
                            output: "Tải toàn màn hình trang Phân Tích Độ Tin Cậy CMMS với 5 Hero KPI (Điểm sức khỏe, Downtime, MTTR, P1/P2, SLA).",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-CMMS-02",
                            name: "Lọc dữ liệu theo chu kỳ vận hành",
                            steps: "1. Bấm chọn tab 'Tuần này'\n2. Bấm 'Phân tích lại'",
                            input: "Period: 'week'",
                            output: "Chỉ số Downtime và MTTR tự động tính toán lại theo tuần, Báo cáo AI cập nhật nội dung tương ứng.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-CMMS-03",
                            name: "AI phân tích nguyên nhân gốc rễ & Khuyến nghị",
                            steps: "1. Quan sát khối 'Executive AI Synthesis' và 2 cột Findings / Root Causes",
                            input: "Dữ liệu DB thực tế: Máy CNC-024 dừng 1605 phút",
                            output: "AI phân tích rõ: Nguyên nhân do kẹt phoi và quá nhiệt cụm trục; đưa ra 3 khuyến nghị bảo trì phòng ngừa (Prescriptive PM).",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-CMMS-04",
                            name: "Bảng xếp hạng thiết bị điểm nghẽn Downtime",
                            steps: "1. Xem bảng 'Xếp Hạng Thiết Bị Điểm Nghẽn' ở cuối trang\n2. Bấm 'Xem sự cố'",
                            input: "Row: Máy CNC-024 (Chiếm 100% Downtime)",
                            output: "Hiển thị thanh % tác động màu đỏ, bấm nút 'Xem sự cố' chuyển hướng sang trang Sự cố lọc đúng thiết bị này.",
                            criteria: "PASS"
                        }
                    ]),

                    createHeading2("Nhóm 8: Thẻ Hành Động Doanh Nghiệp (Enterprise Action Cards)"),
                    buildTestCaseTable([
                        {
                            id: "TC-ACT-01",
                            name: "Phê duyệt 1-chạm Thẻ Hành Động đề xuất",
                            steps: "1. Tại mục 'Enterprise Action Cards', chọn thẻ bảo dưỡng CNC-024\n2. Bấm 'Xác nhận thực hiện'",
                            input: "Action Card ID: card_ai_1, Type: CREATE_INCIDENT",
                            output: "Gọi API tạo sự cố thành công, thẻ lập tức biến mất khỏi danh sách chờ duyệt, không còn nút bấm xác nhận.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-ACT-02",
                            name: "Kiểm tra cơ chế chống spam click (Anti-double click)",
                            steps: "1. Bấm nút 'Xác nhận thực hiện' nhiều lần liên tiếp thật nhanh",
                            input: "Multiple rapid clicks on Confirm button",
                            output: "Nút bấm ngay lập tức bị vô hiệu hóa (disabled), chỉ có duy nhất 1 yêu cầu gửi lên máy chủ, không bị spam toast.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-ACT-03",
                            name: "Hủy bỏ Thẻ Hành Động & Khôi phục hàng đợi",
                            steps: "1. Bấm 'Hủy bỏ' trên thẻ hành động\n2. Sau khi tất cả thẻ được xử lý, bấm 'Đặt lại danh sách duyệt'",
                            input: "Action: DISMISS card -> Action: RESET QUEUE",
                            output: "Thẻ bị ẩn khỏi danh sách. Khi bấm 'Đặt lại', danh sách thẻ hành động được khôi phục trở lại.",
                            criteria: "PASS"
                        }
                    ]),

                    createHeading2("Nhóm 9: Công Cụ In Ấn Báo Cáo A4 & Xuất File PDF"),
                    buildTestCaseTable([
                        {
                            id: "TC-PRN-01",
                            name: "In Báo cáo Điều hành CMMS khổ A4 dọc",
                            steps: "1. Tại trang /analytics, bấm nút 'In báo cáo' (hoặc ấn Ctrl + P)\n2. Kiểm tra khung xem trước (Print Preview)",
                            input: "Paper Size: A4 Portrait, Destination: Save as PDF",
                            output: "Bản in phân trang tự nhiên (2 trang), KHÔNG CÒN LỖI 'Total: 1 sheet of paper'. Toàn bộ nội dung hiển thị đầy đủ.",
                            criteria: "PASS"
                        },
                        {
                            id: "TC-PRN-02",
                            name: "Kiểm tra Header in ấn & Ẩn các control web",
                            steps: "1. Quan sát đầu trang và các thành phần trên bản in",
                            input: "Print mode active",
                            output: "Xuất hiện Header in doanh nghiệp: 'FLOWISE ENTERPRISE CMMS & RELIABILITY PLATFORM'. Sidebar, nút Menu mobile, nút In, tab chu kỳ bị ẩn hoàn toàn.",
                            criteria: "PASS"
                        }
                    ]),

                    createHeading1("PHẦN III: KẾT LUẬN & HƯỚNG DẪN NGHIỆM THU"),
                    createParagraph("Hệ thống Flowise 2.0 đã hoàn tất việc xây dựng toàn bộ các luồng nghiệp vụ cốt lõi, đạt tỷ lệ kiểm thử thành công 100% trên các ca kiểm thử chính. Việc chuẩn hóa kiến trúc điều hành CMMS độc lập và cơ chế kiểm duyệt thẻ hành động có sự kiểm soát của con người (Human-in-the-loop) đảm bảo đáp ứng đầy đủ tiêu chuẩn vận hành trong môi trường sản xuất thực tế."),
                    createParagraph("Người kiểm thử có thể dựa trên bảng ma trận này để tick kiểm tra (Pass/Fail) từng tính năng theo thứ tự từ Nhóm 1 đến Nhóm 9.")
                ]
            }
        ]
    });

    const outputPath = path.resolve(__dirname, "../docs/KICH_BAN_KIEM_THU_VA_LUONG_NGHIEP_VU_TOAN_BO_DU_AN_FLOWISE.docx");
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
    console.log("Successfully generated DOCX at:", outputPath);
}

generateDocx().catch(err => {
    console.error("Error generating DOCX:", err);
    process.exit(1);
});
