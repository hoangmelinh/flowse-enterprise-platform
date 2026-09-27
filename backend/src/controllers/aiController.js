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
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
];

// ═══════════════════════════════════════════════
// TOOL HANDLERS
// ═══════════════════════════════════════════════


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
                content: `Bạn là FlowiseAI, một trợ lý ảo AI thông minh, đa năng và chuyên nghiệp. Bạn có khả năng trả lời BẤT KỲ câu hỏi nào về mọi lĩnh vực (kiến thức chung, lập trình, toán học, văn học, v.v.) giống như ChatGPT. Đồng thời, bạn được tích hợp sâu vào hệ thống quản lý dự án Flowise để hỗ trợ luồng công việc (Spaces, Tasks).
                Danh sách các Spaces hiện tại của người dùng là: [${realSpaceNames || "Hiện chưa có Space nào"}].
                
                QUY TẮC PHẢN HỒI:
                1. LUÔN LUÔN giao tiếp bằng Tiếng Việt tự nhiên, thân thiện, tràn đầy năng lượng nhưng vẫn giữ sự chuyên nghiệp.
                2. Trình bày nội dung cực kỳ đẹp mắt bằng Markdown. Kèm theo Emojis (✨, 🚀, 📂, 📋, 💡...).
                3. Khi tạo Task nhưng Space chưa tồn tại, hãy gợi ý người dùng tạo Space đó trước.
                4. Khi liệt kê task, hiển thị bảng Markdown với các cột: Tên task, Trạng thái, Ưu tiên, Hạn.
                5. Khi đếm task, trình bày số liệu rõ ràng, dễ hiểu.
                6. Khi tìm task quá hạn, cảnh báo và gợi ý hành động.
                7. ĐA NĂNG & THẬN TRỌNG VỚI TOOLS: Bạn hãy thoải mái trò chuyện và giải đáp mọi thắc mắc của người dùng về bất cứ chủ đề gì. TUYỆT ĐỐI KHÔNG gọi hàm (function/tools) trừ khi người dùng RA LỆNH CỤ THỂ (ví dụ: "tạo task", "tạo space", "thống kê task", "tìm task quá hạn"). Nếu người dùng hỏi "bạn làm được gì?", hãy giới thiệu bạn là một AI đa năng có thể làm mọi việc từ trò chuyện, giải đáp kiến thức đến quản lý dự án.
                8. KHI TẠO TASK: Sau khi xác định được Space, bạn PHẢI hỏi người dùng muốn gán task cho ai. KHÔNG tự động gán. Gọi create_task lần đầu KHÔNG truyền assignee_name để hệ thống trả về danh sách thành viên. Sau khi người dùng chọn, gọi lại create_task với assignee_name.
                
                CẤU TRÚC PHẢN HỒI CHUẨN MỰC:
                Trình bày câu trả lời của bạn, sau đó ĐỂ TRỐNG MỘT DÒNG và cung cấp tối đa 3 câu hỏi gợi ý hành động tiếp theo, bắt đầu bằng "GỢI Ý:" dưới dạng danh sách gạch đầu dòng. Ví dụ:
                Câu trả lời Markdown của bạn...

                GỢI Ý:
                - Quản lý dự án
                - Tạo Space mới
                - Hướng dẫn dùng Flowise
                `
            },
            ...(safeHistory).map(msg => ({
                role: msg.role === 'assistant' || msg.role === 'model' || msg.role === 'ai' ? 'assistant' : 'user',
                content: msg.content
            })),
            { role: "user", content: message }
        ];

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.3-70b-versatile",
            tools: tools,
            tool_choice: "auto",
        });

        const responseMessage = completion.choices[0].message;

        if (responseMessage.tool_calls) {
            const toolCall = responseMessage.tool_calls[0];
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

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
 * POST /api/v1/ai/generate-description
 * Body: { taskName: string }
 * Generates a task description based on the task name
 */
export const generateDescription = async (req, res) => {
    try {
        const { taskName } = req.body;
        if (!taskName) return res.status(400).json({ message: "taskName is required" });

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
- CHỈNH trả về mô tả, KHÔNG giải thích thêm`
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
        return res.status(200).json({ description });
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

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Bạn là AI phân tích mức độ ưu tiên task. Dựa trên tiêu đề và mô tả task, trả về JSON với format:
{"priority": "High" | "Medium" | "Low" | "Normal", "reason": "Lý do ngắn gọn bằng tiếng Việt (1 câu)"}

Hướng dẫn phân tích:
- **High**: Lỗi nghiêm trọng (bug, crash, security), deadline gấp, ảnh hưởng nhiều người, từ khóa: urgent, critical, fix, khẩn cấp, quan trọng, lỗi
- **Medium**: Tính năng mới quan trọng, cải tiến hiệu suất, từ khóa: cải thiện, thêm, update, nâng cấp
- **Low**: Nice-to-have, UI tweaks, docs, từ khóa: chỉnh sửa nhỏ, cập nhật text, refactor
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
        
        // Parse JSON safely
        let parsed;
        try {
            // Try to extract JSON from the response
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        } catch {
            parsed = { priority: "Normal", reason: "Không thể phân tích" };
        }

        return res.status(200).json({
            priority: parsed.priority || "Normal",
            reason: parsed.reason || ""
        });
    } catch (error) {
        console.error("AI Suggest Priority Error:", error);
        return res.status(500).json({ message: "Lỗi AI", error: error.message });
    }
};
