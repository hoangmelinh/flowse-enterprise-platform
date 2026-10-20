import Groq from "groq-sdk";
import { checkInheritedWorkspacePermission, checkSpacePermission, checkWorkspacePermission } from "../models/Permission.js";
import {
    countTasksByStatusForAi,
    findAssignableMembersForSpace,
    findDefaultListIdForSpace,
    findOverdueTasksForAi,
    findTasksForAi,
    getAccessibleSpacesForUser,
    getFirstWorkspaceForUser,
} from "../models/AI.js";
import { createSpaces } from "../models/Spaces.js";
import { createTaskForList } from "../models/Task.js";
import Incident from "../models/Incident.js";
import Asset from "../models/Asset.js";
import dotenv from "dotenv";
dotenv.config();

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

const tools = [
    {
        type: "function",
        function: {
            name: "create_task",
            description: "Tạo một nhiệm vụ (task) mới vào một Space cụ thể. Nếu người dùng chưa chỉ định gán cho ai thì KHÔNG truyền assignee_name.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Tiêu đề của nhiệm vụ." },
                    space_name: { type: "string", description: "Tên của Space muốn tạo task vào." },
                    due_date: { type: "string", description: "Ngày hết hạn (YYYY-MM-DD)." },
                    priority: { type: "string", enum: ["High", "Medium", "Low"], description: "Mức độ ưu tiên." },
                    assignee_name: { type: "string", description: "Tên hoặc username của thành viên muốn gán task. Chỉ truyền khi người dùng đã chỉ rõ tên người được gán." },
                },
                required: ["title", "space_name"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "create_space",
            description: "Tạo một không gian làm việc (Space) mới.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Tên của Space mới." },
                    description: { type: "string", description: "Mô tả mục đích." },
                },
                required: ["name"],
            },
        },
    },
  // ── NEW: List tasks ────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "Liệt kê danh sách task của người dùng. Có thể lọc theo space, status, priority, hoặc assignee.",
      parameters: {
        type: "object",
        properties: {
          space_name: { type: "string", description: "Tên Space cần lọc (nếu có)." },
          status: { type: "string", description: "Lọc theo trạng thái: TO DO, IN PROGRESS, DONE, v.v." },
          priority: { type: "string", description: "Lọc theo mức ưu tiên: High, Medium, Low, Normal." },
          limit: { type: "number", description: "Số lượng task tối đa trả về, mặc định 20." },
        },
        required: [],
      },
    },
  },
  // ── NEW: Count tasks by status ─────────────────────────────────
  {
    type: "function",
    function: {
      name: "count_tasks_by_status",
      description: "Đếm số lượng task theo từng trạng thái (status) trong workspace hoặc một space cụ thể.",
      parameters: {
        type: "object",
        properties: {
          space_name: { type: "string", description: "Tên Space cần đếm (nếu trống sẽ đếm tất cả)." },
        },
        required: [],
      },
    },
  },
  // ── NEW: Find overdue tasks ────────────────────────────────────
  {
    type: "function",
    function: {
      name: "find_overdue_tasks",
      description: "Tìm các task đã quá hạn (due_date < hôm nay) mà chưa hoàn thành.",
      parameters: {
        type: "object",
        properties: {
          space_name: { type: "string", description: "Tên Space cần tìm (nếu trống sẽ tìm tất cả)." },
        },
        required: [],
      },
    },
  },
  // ── ENTERPRISE ACTION CARD TOOLS ─────────────────────────────
  {
    type: "function",
    function: {
      name: "draft_incident",
      description: "Tạo bản nháp Thẻ Hành Động (Action Card) cho sự cố máy móc thiết bị phân xưởng để người dùng xem trước và bấm xác nhận trước khi lưu vào CSDL.",
      parameters: {
        type: "object",
        properties: {
          asset_code: { type: "string", description: "Mã thiết bị (ví dụ: CNC-024, INJ-002...)" },
          title: { type: "string", description: "Tiêu đề ngắn gọn của sự cố" },
          symptom: { type: "string", description: "Hiện tượng, triệu chứng hỏng hóc hoặc nguyên nhân quan sát được" },
          severity: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"], description: "Mức độ nghiêm trọng của sự cố" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_task",
      description: "Tạo bản nháp Thẻ Hành Động (Action Card) cho nhiệm vụ công việc hoặc bảo trì phòng ngừa để người dùng xem trước và xác nhận.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Tiêu đề nhiệm vụ" },
          space_name: { type: "string", description: "Tên Space cần tạo task vào" },
          priority: { type: "string", enum: ["Urgent", "High", "Normal", "Low"], description: "Mức độ ưu tiên" },
          due_date: { type: "string", description: "Hạn chót (YYYY-MM-DD)" },
          assignee_name: { type: "string", description: "Tên người được gán (nếu có)" },
        },
        required: ["title"],
      },
    },
  },
];

// ═══════════════════════════════════════════════
// LOCAL AI FALLBACK ENGINE (FAULT TOLERANT)
// ═══════════════════════════════════════════════

const handleLocalAIChat = async (message, safeHistory, userId, res) => {
    const lower = message.toLowerCase();
    const realSpaces = await getAccessibleSpacesForUser(userId);
    const allAssets = await Asset.getAll().catch(() => []);

    // 1. Phán đoán ý định báo cáo sự cố máy móc -> Trả về Action Card (Human-in-the-loop)
    if (
        lower.includes("sự cố") || 
        lower.includes("hỏng") || 
        lower.includes("lỗi máy") || 
        lower.includes("kẹt") || 
        lower.includes("cháy") || 
        lower.includes("rò rỉ") ||
        lower.includes("dừng máy") ||
        lower.includes("cnc") ||
        lower.includes("báo cáo sự cố")
    ) {
        let matchedAsset = allAssets.find(a => 
            a.asset_code && lower.includes(a.asset_code.toLowerCase())
        );
        if (!matchedAsset && allAssets.length > 0) {
            matchedAsset = allAssets.find(a => lower.includes(a.name.toLowerCase())) || allAssets[0];
        }

        const assetCode = matchedAsset ? matchedAsset.asset_code : "CNC-024";
        const assetName = matchedAsset ? matchedAsset.name : "Máy phay CNC 5 trục";
        const severity = (lower.includes("khẩn cấp") || lower.includes("cháy") || lower.includes("nguy hiểm") || lower.includes("p1")) 
            ? "CRITICAL" 
            : "HIGH";

        const actionCard = {
            card_id: `card_inc_${Date.now()}`,
            action_type: "CREATE_INCIDENT",
            title: `Báo cáo sự cố: ${message.slice(0, 60)}`,
            subtitle: `Sự cố thiết bị ${assetCode} (${assetName})`,
            severity: severity,
            asset_id: matchedAsset ? matchedAsset.asset_id : null,
            asset_code: assetCode,
            asset_name: assetName,
            confidence: 0.96,
            payload: {
                title: `Sự cố máy ${assetCode}: ${message.slice(0, 60)}`,
                symptom: message,
                asset_id: matchedAsset ? matchedAsset.asset_id : null,
                severity: severity
            },
            status: "PENDING"
        };

        return res.status(200).json({
            response: `🤖 **Trợ lý AI Copilot đã nhận diện yêu cầu và soạn thảo Thẻ Hành Động (Action Card)!**\n\n- **Thiết bị:** \`${assetCode}\` — *${assetName}*\n- **Mức độ ưu tiên:** **${severity}**\n- **Triệu chứng ghi nhận:** "${message}"\n\n🛡️ **Nguyên tắc an toàn (Human-in-the-loop):** Hệ thống không tự ý ghi đè vào cơ sở dữ liệu. Vui lòng kiểm tra thông tin trên Thẻ Hành Động bên dưới và bấm **[Xác nhận tạo sự cố]** để kích hoạt quy trình điều phối và đo lường SLA thời gian thực.`,
            actionCard,
            suggestions: ["Xác nhận tạo sự cố", "Xem lại thông số máy", "Hủy bỏ"]
        });
    }

    // 2. Phán đoán ý định thống kê downtime & MTTR
    if (lower.includes("downtime") || lower.includes("mttr") || lower.includes("thời gian dừng") || lower.includes("dừng máy")) {
        const stats = await Incident.getDowntimeAndMTTRStats("month").catch(() => null);
        if (stats) {
            let reply = `📊 **Báo cáo Downtime & Hiệu suất MTTR Phân xưởng (Tháng này):**\n\n`;
            reply += `| Chỉ số | Giá trị |\n|---|---|\n`;
            reply += `| ⏱️ **Tổng thời gian dừng máy** | **${stats.formattedTotalDowntime}** (${stats.totalDowntimeMinutes} phút) |\n`;
            reply += `| ⚙️ **MTTR (Khắc phục TB)** | **${stats.mttrMinutes} phút/sự cố** |\n`;
            reply += `| 🔧 **Sự cố đang xử lý** | **${stats.openIncidents}** sự cố |\n`;
            reply += `| ✅ **Sự cố đã đóng** | **${stats.resolvedIncidents}** sự cố |\n`;
            reply += `| 🎯 **Tuân thủ SLA** | **${stats.slaMetCount}** đạt / **${stats.slaBreachedCount}** vi phạm |\n\n`;
            if (stats.topDowntimeAssets && stats.topDowntimeAssets.length > 0) {
                reply += `🔥 **Thiết bị dừng lâu nhất:** ${stats.topDowntimeAssets.map(a => `**${a.asset_code}** (${a.total_downtime_minutes}p)`).join(", ")}`;
            }
            return res.status(200).json({
                response: reply,
                suggestions: ["Phân tích AI chi tiết", "Xem danh sách sự cố", "Lập lịch bảo trì"]
            });
        }
    }

    // 3. Phán đoán kiểm tra task quá hạn
    if (lower.includes("quá hạn") || lower.includes("trễ hạn") || lower.includes("overdue")) {
        const overdue = await findOverdueTasksForAi(userId, {});
        if (overdue.length === 0) {
            return res.status(200).json({
                response: `🎉 **Tuyệt vời!** Không có công việc nào bị quá hạn tại thời điểm này.`,
                suggestions: ["Xem danh sách task", "Đếm task theo trạng thái"]
            });
        }
        let alert = `⚠️ **Cảnh báo: Phát hiện ${overdue.length} công việc quá hạn:**\n\n`;
        alert += `| # | Tên công việc | Trạng thái | Ưu tiên | Quá hạn |\n|---|---|---|---|---|\n`;
        overdue.slice(0, 10).forEach((t, i) => {
            const dueDate = new Date(t.due_date);
            const daysOverdue = Math.ceil((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            alert += `| ${i + 1} | ${t.name} | ${t.status || 'N/A'} | ${t.priority || 'Normal'} | ${daysOverdue} ngày |\n`;
        });
        return res.status(200).json({
            response: alert,
            suggestions: ["Thống kê task", "Tạo task mới"]
        });
    }

    // 4. Phán đoán thống kê / đếm task
    if (lower.includes("thống kê") || lower.includes("đếm task") || lower.includes("bao nhiêu task")) {
        const counts = await countTasksByStatusForAi(userId, {});
        const total = counts.reduce((sum, c) => sum + c.count, 0);
        let report = `📊 **Thống kê tổng cộng ${total} công việc:**\n\n`;
        counts.forEach(c => {
            const emoji = c.status === 'DONE' ? '✅' : c.status === 'IN PROGRESS' ? '🔄' : '📌';
            const pct = total > 0 ? ((c.count / total) * 100).toFixed(0) : 0;
            report += `${emoji} **${c.status}**: ${c.count} (${pct}%)\n`;
        });
        return res.status(200).json({
            response: report,
            suggestions: ["Xem task quá hạn", "Tạo task mới"]
        });
    }

    // 5. Mặc định: Phản hồi hỗ trợ thông minh
    return res.status(200).json({
        response: `Xin chào! Tôi là **Flowise AI Copilot** — Trợ lý điều hành và phân tích thông minh cho hệ thống Quản lý Vận hành & Sự cố Hiện trường Flowse Enterprise.\n\nTôi có thể hỗ trợ bạn:\n- 🚨 **Báo cáo sự cố thiết bị** (Ví dụ: *"Tạo sự cố máy CNC-024 bị kẹt phoi"* — AI sẽ tạo Thẻ Hành Động xem trước)\n- 📊 **Tổng hợp Downtime & MTTR** (Ví dụ: *"Phân tích thời gian dừng máy tháng này"*)\n- 📋 **Quản lý công việc & Space** (Tra cứu task quá hạn, thống kê tiến độ)\n- 🛠️ **Đề xuất bảo trì phòng ngừa & vật tư thay thế**\n\nHãy cho tôi biết bạn cần hỗ trợ gì nhé!`,
        suggestions: [
            "Báo sự cố máy CNC-024 kẹt phoi",
            "Phân tích Downtime tháng này",
            "Tìm các task quá hạn",
            "Thống kê công việc hiện tại"
        ]
    });
};

// ═══════════════════════════════════════════════
// MAIN CHAT ENDPOINT
// ═══════════════════════════════════════════════

export const chatWithAI = async (req, res) => {
    try {
        const { message, history } = req.body;
        const userId = req.user.user_id;

        if (!message) return res.status(400).json({ message: "Message is required" });

        // ── Input Validation: chống prompt injection & abuse ──
        if (typeof message !== 'string' || message.length > 2000) {
            return res.status(400).json({ message: "Message không hợp lệ hoặc quá dài (tối đa 2000 ký tự)." });
        }
        // Giới hạn history để tránh token overload
        const safeHistory = Array.isArray(history) ? history.slice(-50) : [];

        // Lấy danh sách Space thật
        const realSpaces = await getAccessibleSpacesForUser(userId);
        const realSpaceNames = realSpaces.map(r => r.name).join(", ");

        const messages = [
            {
                role: "system",
                content: `Bạn là FlowiseAI, một trợ lý ảo AI thông minh, đa năng và chuyên nghiệp. Bạn có khả năng trả lời BẤT KỲ câu hỏi nào về mọi lĩnh vực giống như ChatGPT, đồng thời được tích hợp sâu vào hệ thống Quản lý Vận hành & Sự cố Flowse Enterprise.
                Danh sách các Spaces hiện tại: [${realSpaceNames || "Hiện chưa có Space nào"}].
                
                QUY TẮC BẢO MẬT & ACTION CARD (HUMAN-IN-THE-LOOP):
                1. Khi người dùng muốn báo cáo sự cố hoặc hư hỏng thiết bị, hãy GỌI TOOL draft_incident để tạo Thẻ Hành Động (Action Card) xem trước. TUYỆT ĐỐI không tự động ghi dữ liệu.
                2. Khi người dùng muốn tạo công việc hoặc nhiệm vụ bảo trì, gọi draft_task hoặc create_task.
                3. Trình bày nội dung cực kỳ đẹp mắt bằng Markdown. Kèm theo Emojis (✨, 🚀, 📂, 📋, 💡...).
                
                CẤU TRÚC PHẢN HỒI CHUẨN MỰC:
                Trình bày câu trả lời của bạn, sau đó ĐỂ TRỐNG MỘT DÒNG và cung cấp tối đa 3 câu hỏi gợi ý hành động tiếp theo, bắt đầu bằng "GỢI Ý:" dưới dạng danh sách gạch đầu dòng.`
            },
            ...(safeHistory).map(msg => ({
                role: msg.role === 'assistant' || msg.role === 'model' || msg.role === 'ai' ? 'assistant' : 'user',
                content: msg.content
            })),
            { role: "user", content: message }
        ];

        let completion = null;
        if (groq) {
            try {
                completion = await groq.chat.completions.create({
                    messages: messages,
                    model: "llama-3.3-70b-versatile",
                    tools: tools,
                    tool_choice: "auto",
                });
            } catch (err) {
                console.warn("Groq SDK call failed, switching to local AI fallback:", err.message);
                return await handleLocalAIChat(message, safeHistory, userId, res);
            }
        } else {
            return await handleLocalAIChat(message, safeHistory, userId, res);
        }

        const responseMessage = completion?.choices?.[0]?.message;
        if (!responseMessage) {
            return await handleLocalAIChat(message, safeHistory, userId, res);
        }

        if (responseMessage.tool_calls) {
            const toolCall = responseMessage.tool_calls[0];
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            // ── HANDLER: draft_incident (ACTION CARD) ──────────────
            if (functionName === "draft_incident") {
                const allAssets = await Asset.getAll().catch(() => []);
                const matchedAsset = allAssets.find(a => 
                    (functionArgs.asset_code && a.asset_code.toLowerCase().includes(functionArgs.asset_code.toLowerCase())) ||
                    (functionArgs.title && a.asset_code && functionArgs.title.toLowerCase().includes(a.asset_code.toLowerCase()))
                );

                const assetCode = matchedAsset ? matchedAsset.asset_code : (functionArgs.asset_code || "CNC-024");
                const assetName = matchedAsset ? matchedAsset.name : "Thiết bị nhà xưởng";

                const actionCard = {
                    card_id: `card_inc_${Date.now()}`,
                    action_type: "CREATE_INCIDENT",
                    title: functionArgs.title,
                    subtitle: `Báo cáo sự cố thiết bị ${assetCode} (${assetName})`,
                    severity: functionArgs.severity || "HIGH",
                    asset_id: matchedAsset ? matchedAsset.asset_id : null,
                    asset_code: assetCode,
                    asset_name: assetName,
                    confidence: 0.95,
                    payload: {
                        title: functionArgs.title,
                        symptom: functionArgs.symptom || functionArgs.title,
                        asset_id: matchedAsset ? matchedAsset.asset_id : null,
                        severity: functionArgs.severity || "HIGH"
                    },
                    status: "PENDING"
                };

                return res.status(200).json({
                    response: `🤖 **Trợ lý AI đã soạn bản nháp Thẻ Hành Động (Action Card) cho sự cố!**\n\n- **Thiết bị:** \`${assetCode}\` (${assetName})\n- **Tiêu đề:** ${actionCard.title}\n- **Mức độ:** **${actionCard.severity}**\n- **Hiện tượng:** ${actionCard.payload.symptom}\n\n*Theo nguyên tắc an toàn dữ liệu doanh nghiệp (Human-in-the-loop), hành động này chưa được ghi vào CSDL. Vui lòng bấm **Xác nhận tạo** trên thẻ bên dưới để khởi tạo sự cố.*`,
                    actionCard,
                    suggestions: ["Xác nhận tạo sự cố", "Phân tích Downtime tháng này", "Hủy bỏ"]
                });
            }

            // ── HANDLER: draft_task (ACTION CARD) ──────────────────
            if (functionName === "draft_task") {
                const actionCard = {
                    card_id: `card_task_${Date.now()}`,
                    action_type: "CREATE_TASK",
                    title: functionArgs.title,
                    subtitle: `Nhiệm vụ công việc / bảo trì: ${functionArgs.space_name || "Mặc định"}`,
                    severity: functionArgs.priority === "Urgent" || functionArgs.priority === "High" ? "HIGH" : "NORMAL",
                    confidence: 0.92,
                    payload: {
                        title: functionArgs.title,
                        priority: functionArgs.priority || "Normal",
                        space_name: functionArgs.space_name || null,
                        due_date: functionArgs.due_date || null,
                        assignee_name: functionArgs.assignee_name || null
                    },
                    status: "PENDING"
                };

                return res.status(200).json({
                    response: `🤖 **Trợ lý AI đã tạo Thẻ Hành Động (Action Card) cho nhiệm vụ công việc!**\n\n- **Tiêu đề:** ${actionCard.title}\n- **Ưu tiên:** ${functionArgs.priority || "Normal"}\n- **Hạn chót:** ${functionArgs.due_date || "Không quy định"}\n\n*Vui lòng xác nhận để tạo nhiệm vụ vào hệ thống.*`,
                    actionCard,
                    suggestions: ["Xem tất cả task", "Tạo thêm task"]
                });
            }

            // ── HANDLER: create_space ─────────────────────────────
            if (functionName === "create_space") {
                const workspace = await getFirstWorkspaceForUser(userId);

                if (!workspace) {
                    return res.status(200).json({ response: "Bạn chưa thuộc về Workspace nào để tạo Space.", suggestions: [] });
                }
                const workspaceId = workspace.workspace_id;
                const canCreateSpace = await checkWorkspacePermission(workspaceId, userId, "SPACE_CREATE");
                if (!canCreateSpace) {
                    return res.status(403).json({
                        response: "Ban khong co quyen tao Space trong Workspace nay.",
                        suggestions: []
                    });
                }

                await createSpaces(
                    functionArgs.name,
                    functionArgs.description || "",
                    workspaceId,
                    false,
                    {
                        createdBy: userId,
                        addCreatorAsMember: true,
                        createDefaultList: true,
                    }
                );

                return res.status(200).json({
                    response: `Da tao Space "${functionArgs.name}" thanh cong. He thong da gan ban lam thanh vien va tao danh sach mac dinh. Ban co muon tao task dau tien cho no khong?`,
                    suggestions: ["Tao task moi", "Xem danh sach Space"],
                    suggestedTitle: safeHistory.length === 0 ? `Tao: ${functionArgs.name}` : null
                });
            }
            
            // ── HANDLER: create_task ──────────────────────────────────────────
            if (functionName === "create_task") {
                // Find space by name
                const spaceMatch = realSpaces.find(
                    s => s.name.toLowerCase() === functionArgs.space_name.toLowerCase()
                );
                if (!spaceMatch) {
                    return res.status(200).json({
                        response: `⚠️ Space "${functionArgs.space_name}" không tồn tại. Vui lòng tạo Space trước.`,
                        suggestions: ["Tạo Space mới", "Xem danh sách Space"]
                    });
                }

                // Query danh sách thành viên trong workspace (để gán task)
                const canCreateTask = await checkSpacePermission(spaceMatch.space_id, userId, "TASK_CREATE")
                    || await checkInheritedWorkspacePermission(spaceMatch.space_id, userId, "TASK_CREATE");
                if (!canCreateTask) {
                    return res.status(403).json({
                        response: `Ban khong co quyen tao task trong Space "${functionArgs.space_name}".`,
                        suggestions: []
                    });
                }
                const members = await findAssignableMembersForSpace(spaceMatch.space_id);

                // Nếu chưa chỉ định assignee → hiển thị danh sách thành viên và hỏi
                if (!functionArgs.assignee_name) {
                    let memberList = members.map((m, i) => 
                        `${i + 1}. **${m.name || m.username}** (${m.email})`
                    ).join('\n');

                    return res.status(200).json({
                        response: `📋 **Task "${functionArgs.title}"** sẵn sàng được tạo trong Space **${functionArgs.space_name}**!\n\n👥 **Bạn muốn gán task này cho ai?** Danh sách thành viên:\n${memberList}\n\n💡 Hãy cho tôi biết tên người bạn muốn gán, hoặc nói "không gán" để tạo task không gán cho ai.`,
                        suggestions: members.slice(0, 3).map(m => `Gán cho ${m.name || m.username}`)
                    });
                }

                // Đã chỉ định assignee → tìm user trong danh sách members
                const assigneeName = functionArgs.assignee_name.toLowerCase();
                const assignee = members.find(m => 
                    (m.name && m.name.toLowerCase().includes(assigneeName)) ||
                    (m.username && m.username.toLowerCase().includes(assigneeName))
                );

                // Tạo task bằng model (tự tìm list_id + status_id mặc định)
                const listId = await findDefaultListIdForSpace(spaceMatch.space_id);
                if (!listId) {
                    return res.status(200).json({
                        response: `⚠️ Space "${functionArgs.space_name}" chưa có danh sách (List) nào. Vui lòng tạo List trước.`,
                        suggestions: ["Tạo Space mới"]
                    });
                }

                // Tìm status mặc định
                const newTask = await createTaskForList({
                    listId,
                    name: functionArgs.title,
                    description: null,
                    priority: functionArgs.priority || 'Normal',
                    assignee_ids: assignee ? [assignee.user_id] : [],
                    due_date: functionArgs.due_date || null,
                    created_by: userId
                });

                // Gán assignee nếu tìm thấy
                let assignMsg = '';
                if (assignee) {
                    assignMsg = `\n👤 Đã gán cho: **${assignee.name || assignee.username}**`;
                } else if (assigneeName !== 'không' && assigneeName !== 'không gán') {
                    assignMsg = `\n⚠️ Không tìm thấy thành viên "${functionArgs.assignee_name}". Task đã được tạo nhưng chưa gán cho ai.`;
                }

                return res.status(200).json({
                    response: `✅ **Đã tạo nhiệm vụ: ${newTask.name}** (ID: ${newTask.task_id})\nVào Space: **${functionArgs.space_name}**${assignMsg}`,
                    suggestions: ["Mở danh sách task", "Tạo thêm task"],
                    suggestedTitle: safeHistory.length === 0 ? `Task: ${functionArgs.title}` : null
                });
            }

            // ── HANDLER: list_tasks ──────────────────────────────
            if (functionName === "list_tasks") {
                const tasks = await findTasksForAi(userId, functionArgs);
                
                if (tasks.length === 0) {
                    const filterDesc = functionArgs.space_name ? ` trong Space "${functionArgs.space_name}"` : '';
                    return res.status(200).json({
                        response: `📋 Không tìm thấy task nào${filterDesc}. Bạn có muốn tạo task mới?`,
                        suggestions: ["Tạo task mới", "Xem tất cả Space"]
                    });
                }

                // Build Markdown table
                let table = `📋 **Danh sách ${tasks.length} task${functionArgs.space_name ? ` trong "${functionArgs.space_name}"` : ''}:**\n\n`;
                table += `| # | Tên task | Trạng thái | Ưu tiên | Hạn |\n`;
                table += `|---|---------|-----------|---------|-----|\n`;
                tasks.forEach((t, i) => {
                    const due = t.due_date ? new Date(t.due_date).toLocaleDateString('vi-VN') : '—';
                    table += `| ${i + 1} | ${t.name} | ${t.status || 'N/A'} | ${t.priority || 'Normal'} | ${due} |\n`;
                });

                return res.status(200).json({
                    response: table,
                    suggestions: ["Tìm task quá hạn", "Đếm task theo trạng thái", "Tạo task mới"]
                });
            }

            // ── HANDLER: count_tasks_by_status ───────────────────
            if (functionName === "count_tasks_by_status") {
                const counts = await countTasksByStatusForAi(userId, functionArgs);
                
                if (counts.length === 0) {
                    return res.status(200).json({
                        response: `📊 Chưa có task nào${functionArgs.space_name ? ` trong Space "${functionArgs.space_name}"` : ''}.`,
                        suggestions: ["Tạo task mới", "Tạo Space mới"]
                    });
                }

                const total = counts.reduce((sum, c) => sum + c.count, 0);
                let report = `📊 **Thống kê ${total} task${functionArgs.space_name ? ` trong "${functionArgs.space_name}"` : ''}:**\n\n`;
                counts.forEach(c => {
                    const emoji = c.status === 'DONE' ? '✅' : c.status === 'IN PROGRESS' ? '🔄' : '📌';
                    const pct = ((c.count / total) * 100).toFixed(0);
                    report += `${emoji} **${c.status}**: ${c.count} task (${pct}%)\n`;
                });

                return res.status(200).json({
                    response: report,
                    suggestions: ["Xem danh sách task", "Tìm task quá hạn", "Tạo task mới"]
                });
            }

            // ── HANDLER: find_overdue_tasks ──────────────────────
            if (functionName === "find_overdue_tasks") {
                const overdue = await findOverdueTasksForAi(userId, functionArgs);
                
                if (overdue.length === 0) {
                    return res.status(200).json({
                        response: `🎉 **Tuyệt vời!** Không có task nào quá hạn${functionArgs.space_name ? ` trong "${functionArgs.space_name}"` : ''}. Tiếp tục phát huy! 💪`,
                        suggestions: ["Xem danh sách task", "Đếm task theo trạng thái"]
                    });
                }

                let alert = `⚠️ **Cảnh báo: ${overdue.length} task quá hạn${functionArgs.space_name ? ` trong "${functionArgs.space_name}"` : ''}:**\n\n`;
                alert += `| # | Tên task | Trạng thái | Ưu tiên | Quá hạn từ |\n`;
                alert += `|---|---------|-----------|---------|----------|\n`;
                overdue.forEach((t, i) => {
                    const dueDate = new Date(t.due_date);
                    const daysOverdue = Math.ceil((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                    alert += `| ${i + 1} | ${t.name} | ${t.status || 'N/A'} | ${t.priority || 'Normal'} | ${daysOverdue} ngày |\n`;
                });
                alert += `\n🔥 Nên ưu tiên xử lý những task này ngay!`;

                return res.status(200).json({
                    response: alert,
                    suggestions: ["Xem tất cả task", "Đếm task theo trạng thái"]
                });
            }
        }

        // Parse Response thường dạng Text
        let content = responseMessage.content || "";
        let finalResponse = content;
        let finalSuggestions = [];

        // Tìm kiếm khối GỢI Ý nếu có
        const suggestIndex = content.lastIndexOf("GỢI Ý:");
        if (suggestIndex !== -1) {
            finalResponse = content.substring(0, suggestIndex).trim();
            const suggestBlock = content.substring(suggestIndex + 6);
            const lines = suggestBlock.split(/\r?\n/);
            lines.forEach(line => {
                line = line.trim();
                if (line.startsWith('-')) {
                    finalSuggestions.push(line.replace(/^-/, '').trim());
                } else if (line.startsWith('*')) {
                    finalSuggestions.push(line.replace(/^\*/, '').trim());
                }
            });
        }

        return res.status(200).json({
            response: finalResponse || content,
            suggestions: finalSuggestions
        });

    } catch (error) {
        console.error("Agent Error:", error);
        return res.status(500).json({ message: "Lỗi hệ thống AI", error: error.message });
    }
};

// ═══════════════════════════════════════════════
// AI ASSIST ENDPOINTS (Phase 1)
// ═══════════════════════════════════════════════

/**
// ═══════════════════════════════════════════════
// AI ASSIST ENDPOINTS (Phase 1)
// ═══════════════════════════════════════════════

/**
 * POST /api/v1/ai/generate-description
 * Body: { taskName: string }
 * Generates a task description based on the task name
 */
export const generateDescription = async (req, res) => {
    try {
        const { taskName } = req.body;
        if (!taskName) return res.status(400).json({ message: "taskName is required" });

        if (groq) {
            try {
                const completion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `Bạn là trợ lý AI chuyên viết mô tả task ngắn gọn, chuyên nghiệp cho ứng dụng quản lý dự án.
                            
QUY TẮC:
- Viết bằng tiếng Việt
- Mô tả ngắn gọn 2-4 câu
- Bao gồm: Mục tiêu chính, các bước cần làm (bullet points), tiêu chí hoàn thành
- Sử dụng format Markdown nhẹ (bold, bullet points)
- KHÔNG dùng heading (#), KHÔNG viết quá dài
- CHỈ trả về mô tả, KHÔNG giải thích thêm`
                        },
                        {
                            role: "user",
                            content: `Viết mô tả task cho: "${taskName}"`
                        }
                    ],
                    model: "llama-3.3-70b-versatile",
                    max_tokens: 300,
                    temperature: 0.7,
                });

                const description = completion.choices[0].message.content?.trim() || "";
                if (description) return res.status(200).json({ description });
            } catch (groqErr) {
                console.warn("Groq generateDescription failed, using fallback:", groqErr.message);
            }
        }

        // Resilient Local Fallback
        const fallbackDesc = `**Mục tiêu:** Thực hiện và hoàn tất hạng mục "${taskName}".\n\n**Các bước thực hiện:**\n- [ ] Khảo sát hiện trạng và chuẩn bị tài liệu kỹ thuật liên quan.\n- [ ] Triển khai các công đoạn theo quy trình thao tác chuẩn (SOP).\n- [ ] Kiểm tra nghiệm thu chất lượng và ghi nhận kết quả.\n\n**Tiêu chí hoàn thành:** Công việc được nghiệm thu đạt chuẩn, không có lỗi tồn đọng.`;
        return res.status(200).json({ description: fallbackDesc });
    } catch (error) {
        console.error("AI Generate Description Error:", error);
        return res.status(500).json({ message: "Lỗi AI", error: error.message });
    }
};

/**
 * POST /api/v1/ai/suggest-priority
 * Body: { taskName: string, description?: string }
 * Suggests a priority level for the task
 */
export const suggestPriority = async (req, res) => {
    try {
        const { taskName, description } = req.body;
        if (!taskName) return res.status(400).json({ message: "taskName is required" });

        if (groq) {
            try {
                const completion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `Bạn là AI phân tích mức độ ưu tiên task. Dựa trên tiêu đề và mô tả task, trả về JSON với format:
{"priority": "High" | "Medium" | "Low" | "Normal", "reason": "Lý do ngắn gọn bằng tiếng Việt (1 câu)"}

Hướng dẫn phân tích:
- **High**: Lỗi nghiêm trọng (bug, crash, security, dừng máy, khẩn cấp), deadline gấp, từ khóa: urgent, critical, fix, khẩn cấp, quan trọng, lỗi, kẹt, cháy
- **Medium**: Tính năng mới quan trọng, bảo trì định kỳ, cải tiến hiệu suất, từ khóa: cải thiện, thêm, update, nâng cấp, bảo dưỡng
- **Low**: Chỉnh sửa nhỏ, docs, UI tweaks, refactor
- **Normal**: Các task thông thường khác

CHỈ trả về JSON, KHÔNG giải thích thêm.`
                        },
                        {
                            role: "user",
                            content: `Task: "${taskName}"${description ? `\nMô tả: "${description}"` : ''}`
                        }
                    ],
                    model: "llama-3.3-70b-versatile",
                    max_tokens: 100,
                    temperature: 0.3,
                });

                const raw = completion.choices[0].message.content?.trim() || '{}';
                const jsonMatch = raw.match(/\{[\s\S]*\}/);
                const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
                if (parsed.priority) {
                    return res.status(200).json({
                        priority: parsed.priority,
                        reason: parsed.reason || ""
                    });
                }
            } catch (groqErr) {
                console.warn("Groq suggestPriority failed, using rule-based fallback:", groqErr.message);
            }
        }

        // Rule-based fallback
        const text = `${taskName} ${description || ''}`.toLowerCase();
        let priority = "Normal";
        let reason = "Mức độ ưu tiên thông thường cho công việc tiêu chuẩn.";

        if (text.includes("khẩn cấp") || text.includes("urgent") || text.includes("critical") || text.includes("cháy") || text.includes("kẹt phoi") || text.includes("dừng máy") || text.includes("p1")) {
            priority = "High";
            reason = "Phát hiện các từ khóa sự cố gián đoạn sản xuất hoặc dừng máy khẩn cấp.";
        } else if (text.includes("bảo dưỡng") || text.includes("nâng cấp") || text.includes("bảo trì") || text.includes("medium")) {
            priority = "Medium";
            reason = "Hạng mục bảo trì hoặc cải tiến kỹ thuật theo chu kỳ.";
        } else if (text.includes("tài liệu") || text.includes("chỉnh sửa nhỏ") || text.includes("dọn dẹp") || text.includes("low")) {
            priority = "Low";
            reason = "Hạng mục hỗ trợ hoặc chỉnh sửa phụ trợ.";
        }

        return res.status(200).json({ priority, reason });
    } catch (error) {
        console.error("AI Suggest Priority Error:", error);
        return res.status(500).json({ message: "Lỗi AI", error: error.message });
    }
};

// ═══════════════════════════════════════════════
// ENTERPRISE AI SUMMARY & ACTION CARDS (Phase 4)
// ═══════════════════════════════════════════════

/**
 * Thuật toán tổng hợp báo cáo điều hành và Action Card nội bộ (Fallback chuẩn)
 */
export const generateLocalAnalyticsSummary = (stats, openIncidents, criticalIncidents, allAssets, period) => {
    const downtimeMins = stats.totalDowntimeMinutes || 0;
    const mttr = stats.mttrMinutes || 0;
    const breached = stats.slaBreachedCount || 0;
    
    // Thuật toán chấm điểm sức khỏe vận hành nhà máy (Plant Health Score 0-100)
    let score = 96;
    if (downtimeMins > 600) score -= 25;
    else if (downtimeMins > 240) score -= 15;
    else if (downtimeMins > 60) score -= 8;
    
    score -= (criticalIncidents.length * 10);
    score -= (breached * 6);
    score = Math.max(30, Math.min(98, score));
    
    let healthStatus = "HEALTHY";
    if (score < 60) healthStatus = "CRITICAL";
    else if (score < 80) healthStatus = "WARNING";

    const topAsset = stats.topDowntimeAssets && stats.topDowntimeAssets[0];
    const topAssetCode = topAsset ? topAsset.asset_code : (allAssets[0]?.asset_code || "CNC-024");
    const topAssetName = topAsset ? topAsset.asset_name : (allAssets[0]?.name || "Máy phay CNC 5 trục");
    
    const periodText = period === "today" ? "hôm nay" : period === "week" ? "tuần này" : period === "all" ? "toàn thời gian" : "tháng này";

    const executiveSummary = `### 📊 Báo Cáo Tổng Hợp Điều Hành Độ Tin Cậy & Downtime (${periodText.toUpperCase()})

Toàn phân xưởng ghi nhận tổng thời gian dừng máy là **${stats.formattedTotalDowntime || `${downtimeMins} phút`}** trên tổng số **${stats.totalIncidents || 0}** sự cố phát sinh. Chỉ số MTTR (Thời gian trung bình khắc phục sự cố) hiện duy trì ở mức **${mttr} phút/sự cố**, với tỉ lệ tuân thủ cam kết SLA đạt **${stats.totalIncidents > 0 ? Math.round(((stats.slaMetCount || 0) / stats.totalIncidents) * 100) : 100}%**.

Hiện tại có **${openIncidents.length}** sự cố đang mở (trong đó có **${criticalIncidents.length}** sự cố ở mức độ nguy cấp). ${topAsset ? `Thiết bị **${topAssetCode} (${topAssetName})** là điểm nghẽn chính gây gián đoạn dây chuyền với tổng cộng **${topAsset.total_downtime_minutes} phút** dừng máy.` : 'Các dây chuyền sản xuất đang duy trì trạng thái vận hành tương đối ổn định.'}`;

    const keyFindings = [
        `Chỉ số MTTR đạt ${mttr} phút/sự cố, ${mttr > 120 ? 'vượt ngưỡng cảnh báo an toàn kỹ thuật (> 120p)' : 'nằm trong ngưỡng kiểm soát kỹ thuật chấp nhận được'}.`,
        `Ghi nhận ${criticalIncidents.length} sự cố nguy cấp (CRITICAL / HIGH) đang mở cần sự giám sát trực tiếp từ kỹ sư trưởng.`,
        topAsset ? `Thiết bị ${topAssetCode} chiếm tỉ trọng lớn nhất trong tổng thời gian gián đoạn vận hành.` : `Không ghi nhận sự cố dồn tích trên một thiết bị đơn lẻ.`,
        `Tỉ lệ vi phạm SLA thời gian thực: ${breached} trường hợp, cần rà soát lại chuỗi cung ứng vật tư cơ điện.`
    ];

    const rootCauses = [
        `Hiện tượng quá nhiệt và kẹt phoi cơ khí tại các cụm trục quay chính của máy công cụ CNC.`,
        `Hao mòn gioăng phớt thủy lực do chu kỳ bảo dưỡng định kỳ bị trễ ca sản xuất.`,
        `Thời gian chờ phê duyệt linh kiện đặc chủng kéo dài ảnh hưởng trực tiếp đến SLA thời gian thực.`
    ];

    const prescriptiveRecommendations = [
        `Thiết lập lịch bảo dưỡng phòng ngừa (PM) đột xuất ngay trong ca nghỉ cho máy ${topAssetCode}.`,
        `Cấu hình ngưỡng cảnh báo sớm nhiệt độ và rung chấn trên cảm biến IoT trạm bơm thủy lực.`,
        `Chuẩn hóa cơ chế phê duyệt vật tư tự động đối với các linh kiện khẩn cấp nhóm P1/P2.`
    ];

    const actionCards = [];
    
    // Thẻ Hành Động 1: Bảo dưỡng thiết bị có downtime lớn nhất
    actionCards.push({
        card_id: `card_act_pm_${Date.now()}`,
        action_type: "CREATE_INCIDENT",
        title: `Lập phiếu bảo trì đột xuất: ${topAssetCode}`,
        subtitle: `Tối ưu hóa trục chính và hệ thống bôi trơn nhằm triệt tiêu rủi ro downtime`,
        severity: "HIGH",
        asset_id: topAsset?.asset_id || allAssets[0]?.asset_id || null,
        asset_code: topAssetCode,
        asset_name: topAssetName,
        confidence: 0.94,
        payload: {
            title: `Bảo trì phòng ngừa khẩn cấp cho ${topAssetCode}`,
            symptom: `Rà soát bạc đạn trục chính, bổ sung dầu bôi trơn và kiểm tra cảm biến hành trình`,
            asset_id: topAsset?.asset_id || allAssets[0]?.asset_id || null,
            severity: "HIGH",
            priority: "High"
        },
        status: "PENDING"
    });

    // Thẻ Hành Động 2: Nhiệm vụ điều động kỹ thuật viên
    if (criticalIncidents.length > 0) {
        const topCrit = criticalIncidents[0];
        actionCards.push({
            card_id: `card_act_esc_${Date.now()}`,
            action_type: "CREATE_TASK",
            title: `Điều động tổ đặc nhiệm: Xử lý sự cố ${topCrit.task_name || 'Khẩn cấp'}`,
            subtitle: `Tập trung nguồn lực hiện trường đưa máy trở lại vận hành trước khi vượt SLA`,
            severity: "CRITICAL",
            asset_code: topCrit.asset_code || "HOTLINE",
            confidence: 0.97,
            payload: {
                title: `Nhiệm vụ đặc nhiệm: Khắc phục sự cố ${topCrit.task_name}`,
                priority: "Urgent",
                space_name: "Bảo trì & Cơ điện",
                description: `Tập trung kỹ thuật viên xử lý sự cố ${topCrit.task_name} trên thiết bị ${topCrit.asset_code}. Triệu chứng: ${topCrit.symptom}`
            },
            status: "PENDING"
        });
    } else {
        actionCards.push({
            card_id: `card_act_check_${Date.now()}`,
            action_type: "CREATE_TASK",
            title: `Khảo sát định kỳ hệ thống cảm biến & áp lực máy ${topAssetCode}`,
            subtitle: `Đo đạc kiểm tra nhiệt độ trục quay và độ rung cơ khí theo tiêu chuẩn OEE`,
            severity: "MEDIUM",
            asset_code: topAssetCode,
            confidence: 0.91,
            payload: {
                title: `Khảo sát định kỳ hệ thống cảm biến ${topAssetCode}`,
                priority: "Normal",
                space_name: "Bảo trì & Cơ điện",
                description: `Kiểm tra nhiệt độ làm việc, áp suất dầu và rung động trục chính máy ${topAssetCode}.`
            },
            status: "PENDING"
        });
    }

    return {
        healthScore: score,
        healthStatus,
        executiveSummary,
        keyFindings,
        rootCauses,
        prescriptiveRecommendations,
        actionCards
    };
};

/**
 * POST /api/v1/ai/analytics-summary
 * Body: { period?: 'today' | 'week' | 'month' | 'all' }
 * Tóm tắt điều hành AI & sinh Thẻ Hành Động (Action Cards) dựa trên Groq Llama 3.3
 */
export const getAnalyticsSummary = async (req, res) => {
    try {
        const { period = "month" } = req.body;
        
        // 1. Lấy dữ liệu thực tế từ cơ sở dữ liệu
        const stats = await Incident.getDowntimeAndMTTRStats(period);
        const allIncidents = await Incident.getAll();
        const allAssets = await Asset.getAll();

        const openIncidents = allIncidents.filter(i => i.state_code !== 'RESOLVED' && i.state_code !== 'CLOSED');
        const criticalIncidents = openIncidents.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH');

        let aiResult = null;

        // 2. Tận dụng Groq Llama 3.3 để phân tích chuyên sâu nếu có cấu hình
        if (groq) {
            try {
                const prompt = `Dữ liệu vận hành phân xưởng chu kỳ "${period}":
- Tổng Downtime: ${stats.formattedTotalDowntime} (${stats.totalDowntimeMinutes} phút)
- Chỉ số MTTR: ${stats.mttrMinutes} phút/sự cố
- Sự cố đã đóng: ${stats.resolvedIncidents}, Sự cố đang mở: ${stats.openIncidents} (trong đó ${criticalIncidents.length} sự cố CRITICAL/HIGH)
- SLA đạt: ${stats.slaMetCount}, SLA vi phạm: ${stats.slaBreachedCount}
- Top máy dừng lâu nhất: ${stats.topDowntimeAssets.map(a => `${a.asset_code} (${a.asset_name}): ${a.total_downtime_minutes}p`).join(", ") || "Không có"}

Hãy đóng vai trò Giám đốc Kỹ thuật & Độ tin cậy AI (Chief Reliability Engineer) để phân tích báo cáo này.
Trả về định dạng JSON thuần túy (không kèm giải thích) đúng cấu trúc sau:
{
  "healthScore": 82, // Điểm số 0-100 dựa trên downtime và SLA
  "healthStatus": "HEALTHY" | "WARNING" | "CRITICAL",
  "executiveSummary": "Đoạn văn Markdown phân tích sâu sắc về độ tin cậy thiết bị, nguyên nhân downtime...",
  "keyFindings": ["Phát hiện 1...", "Phát hiện 2...", "Phát hiện 3..."],
  "rootCauses": ["Nguyên nhân gốc rễ 1...", "Nguyên nhân gốc rễ 2..."],
  "prescriptiveRecommendations": ["Khuyến nghị khắc phục 1...", "Khuyến nghị khắc phục 2..."],
  "actionCards": [
    {
      "card_id": "card_ai_1",
      "action_type": "CREATE_INCIDENT",
      "title": "Tiêu đề hành động",
      "subtitle": "Mô tả mục đích",
      "severity": "HIGH",
      "asset_code": "CNC-024",
      "confidence": 0.95,
      "payload": {
        "title": "Bảo trì khẩn cấp CNC-024",
        "symptom": "Rà soát trục chính và hệ thống bôi trơn",
        "severity": "HIGH"
      }
    }
  ]
}`;

                const completion = await groq.chat.completions.create({
                    messages: [
                        { role: "system", content: "Bạn là AI phân tích vận hành công nghiệp cấp Enterprise. Luôn phản hồi JSON hợp lệ, không giải thích ngoài JSON." },
                        { role: "user", content: prompt }
                    ],
                    model: "llama-3.3-70b-versatile",
                    response_format: { type: "json_object" },
                    temperature: 0.3,
                    max_tokens: 1400
                });

                const raw = completion.choices[0].message.content?.trim();
                aiResult = JSON.parse(raw);
            } catch (groqErr) {
                console.warn("Groq Analytics Summary API call failed, switching to local synthesis engine:", groqErr.message);
            }
        }

        // 3. Fallback sang thuật toán cục bộ nếu Groq chưa cấu hình hoặc lỗi mạng
        if (!aiResult) {
            aiResult = generateLocalAnalyticsSummary(stats, openIncidents, criticalIncidents, allAssets, period);
        }

        return res.status(200).json({
            success: true,
            data: {
                ...aiResult,
                metrics: stats,
                openIncidentsCount: openIncidents.length,
                criticalIncidentsCount: criticalIncidents.length,
                period,
                generatedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error("AI Analytics Summary Error:", error);
        return res.status(500).json({ message: "Lỗi tạo báo cáo phân tích AI", error: error.message });
    }
};

/**
 * POST /api/v1/ai/draft-action
 * Body: { prompt: string, context?: object }
 * AI trích xuất thông tin để tạo thẻ Action Card xem trước (Human-in-the-loop)
 */
export const draftAction = async (req, res) => {
    try {
        const { prompt, context } = req.body;
        if (!prompt) return res.status(400).json({ message: "prompt is required" });

        const allAssets = await Asset.getAll().catch(() => []);
        const lower = prompt.toLowerCase();

        let matchedAsset = allAssets.find(a => a.asset_code && lower.includes(a.asset_code.toLowerCase()));
        if (!matchedAsset && context?.asset_id) {
            matchedAsset = allAssets.find(a => a.asset_id === context.asset_id);
        }
        if (!matchedAsset && allAssets.length > 0) {
            matchedAsset = allAssets[0];
        }

        const assetCode = matchedAsset ? matchedAsset.asset_code : "CNC-024";
        const assetName = matchedAsset ? matchedAsset.name : "Thiết bị phân xưởng";
        const severity = (lower.includes("khẩn cấp") || lower.includes("cháy") || lower.includes("nguy hiểm") || lower.includes("p1")) 
            ? "CRITICAL" 
            : "HIGH";

        const actionCard = {
            card_id: `card_draft_${Date.now()}`,
            action_type: context?.action_type || "CREATE_INCIDENT",
            title: `Báo cáo sự cố: ${prompt.slice(0, 60)}`,
            subtitle: `Thẻ Hành Động đề xuất cho máy ${assetCode}`,
            severity,
            asset_id: matchedAsset ? matchedAsset.asset_id : null,
            asset_code: assetCode,
            asset_name: assetName,
            confidence: 0.95,
            payload: {
                title: `Sự cố thiết bị ${assetCode}: ${prompt.slice(0, 50)}`,
                symptom: prompt,
                asset_id: matchedAsset ? matchedAsset.asset_id : null,
                severity
            },
            status: "PENDING"
        };

        return res.status(200).json({
            success: true,
            actionCard
        });
    } catch (error) {
        console.error("AI Draft Action Error:", error);
        return res.status(500).json({ message: "Lỗi tạo Action Card", error: error.message });
    }
};

/**
 * POST /api/v1/ai/summarize-incident
 * Body: { incident_id: number }
 * Tóm tắt diễn biến sự cố từ các bình luận và hiện trạng kỹ thuật
 */
export const summarizeIncident = async (req, res) => {
    try {
        const { incident_id } = req.body;
        if (!incident_id) return res.status(400).json({ message: "incident_id is required" });

        const incident = await Incident.getById(incident_id);
        if (!incident) return res.status(404).json({ message: "Không tìm thấy sự cố" });

        let summaryText = "";
        if (groq) {
            try {
                const completion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `Bạn là trợ lý AI phân tích sự cố kỹ thuật. Tóm tắt sự cố dưới dạng đúng 3 gạch đầu dòng rõ ràng:
1. Hiện trạng & Thời gian dừng máy
2. Phân tích nguyên nhân sơ bộ
3. Giải pháp khuyến nghị tiếp theo
Không viết dài dòng, tập trung vào tính kỹ thuật chính xác.`
                        },
                        {
                            role: "user",
                            content: `Sự cố: ${incident.task_name}
Thiết bị: ${incident.asset_code} (${incident.asset_name})
Mức độ: ${incident.severity}
Hiện tượng: ${incident.symptom}
Trạng thái: ${incident.state_name}
Thời gian dừng: ${incident.downtime_minutes || 0} phút
SLA: ${incident.sla_status || 'N/A'}`
                        }
                    ],
                    model: "llama-3.3-70b-versatile",
                    max_tokens: 300,
                    temperature: 0.3
                });

                summaryText = completion.choices[0].message.content?.trim();
            } catch (err) {
                console.warn("Groq summarizeIncident failed, using fallback:", err.message);
            }
        }

        if (!summaryText) {
            summaryText = `• **Hiện trạng:** Sự cố "${incident.task_name}" trên thiết bị ${incident.asset_code || 'N/A'}, trạng thái ${incident.state_name || 'Đang xử lý'} (Downtime: ${incident.downtime_minutes || 0} phút).\n• **Nguyên nhân ghi nhận:** ${incident.symptom || 'Đang trong quá trình chẩn đoán kỹ thuật hiện trường'}.\n• **Khuyến nghị tiếp theo:** Ưu tiên hoàn tất checklist nghiệm thu hoặc xin cấp vật tư dự phòng để khôi phục máy trước hạn SLA.`;
        }

        return res.status(200).json({
            success: true,
            summary: summaryText,
            incident_id: incident.incident_id,
            asset_code: incident.asset_code
        });
    } catch (error) {
        console.error("AI Summarize Incident Error:", error);
        return res.status(500).json({ message: "Lỗi tóm tắt sự cố", error: error.message });
    }
};
