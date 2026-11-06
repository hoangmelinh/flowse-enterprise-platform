// Kiểm tra trước buổi demo: 3 tài khoản tương tác qua API thật (server phải đang chạy).
//   node scripts/demo-3-users.mjs            chạy rồi dọn dữ liệu thử
//   node scripts/demo-3-users.mjs --keep     giữ lại việc + phiếu thử để xem trên điện thoại
// API_URL mặc định http://localhost:5001/api/v1. Cần GROQ_API_KEY trên server cho bước Flowse AI.
import con from "../src/config/connect.js";

const BASE = process.env.API_URL || "http://localhost:5001/api/v1";
const PASSWORD = process.env.DEMO_PASSWORD || "Flowse@2026";
const KEEP = process.argv.includes("--keep");
const TITLE = "[Demo] Kiểm tra cảm biến BT-07";
let failed = 0;

const ok = (label, pass, detail = "") => {
    if (!pass) failed++;
    console.log(`${pass ? "ĐẠT" : "LỖI"}  ${label}${detail ? `  · ${detail}` : ""}`);
    return pass;
};
const call = async (token, method, path, body) => {
    const res = await fetch(BASE + path, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
};
const login = async (email) => {
    const res = await fetch(`${BASE}/auth/signin`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PASSWORD }) });
    const body = await res.json().catch(() => ({}));
    ok(`Đăng nhập ${email}`, res.ok, res.ok ? body.user.name : body.message);
    return { id: body.user?.user_id, token: body.user?.access_token };
};

const minhAnh = await login("minhanh@anphat.vn"); // quản lý: giao việc, duyệt
const thanh = await login("thanh.ld@anphat.vn"); // nhân viên kỹ thuật: nhận việc
const dung = await login("dung.tq@anphat.vn"); // quản lý thứ hai: duyệt cùng phiếu
if (failed) process.exit(1);

let taskId, approvalId;
const created = [];
try {
    // 1. Minh Anh nhờ Flowse AI (Work) tạo và giao việc; chưa ghi cho tới khi áp dụng
    const ask = await call(minhAnh.token, "POST", "/ai/work", {
        message: `Tạo việc "${TITLE}" trong Vận hành Bình Dương, giao cho Lê Đức Thành, hạn 17:00 ngày mai, ưu tiên cao`,
        history: [],
    });
    const action = ask.body.data?.action;
    if (action) created.push(action.action_id);
    ok("Flowse AI soạn đề xuất tạo việc giao cho Thành", action?.action_type === "CREATE_TASK" && JSON.stringify(action.summary).includes("Thành"), action ? action.summary.rows.map((r) => r.join(": ")).join(" | ") : ask.body.message || ask.body.data?.response);
    if (!action) throw new Error("AI không soạn được đề xuất, dừng");

    const applied = await call(minhAnh.token, "POST", `/ai/actions/${action.action_id}/apply`);
    taskId = applied.body.data?.result?.task_id;
    ok("Minh Anh bấm Áp dụng → việc được tạo", applied.status === 200 && !!taskId, applied.body.data?.result?.message || applied.body.message);
    ok("Bấm Áp dụng lần hai bị chặn (409)", (await call(minhAnh.token, "POST", `/ai/actions/${action.action_id}/apply`)).status === 409);

    // 2. Thành nhận thông báo và thấy việc
    const inbox = await call(thanh.token, "GET", "/notifications?limit=20");
    ok("Thành có thông báo được giao việc", (inbox.body.notifications || []).some((n) => Number(n.entity_id) === taskId), `chưa đọc: ${inbox.body.unreadCount}`);
    ok("Thành mở được việc", (await call(thanh.token, "GET", `/tasks/${taskId}`)).status === 200);
    ok("Dũng (cùng công ty) mở được việc", (await call(dung.token, "GET", `/tasks/${taskId}`)).status === 200);

    // 3. Kiểm tra quyền: nhân viên không xoá được việc
    const del = await call(thanh.token, "DELETE", `/tasks/${taskId}`);
    ok("Thành (member) xoá việc bị từ chối (403)", del.status === 403, `HTTP ${del.status}`);
    const aiDel = await call(thanh.token, "POST", "/ai/work", { message: `Xoá việc "${TITLE}"`, history: [] });
    if (aiDel.body.data?.action) created.push(aiDel.body.data.action.action_id);
    ok("Flowse AI không soạn đề xuất xoá cho Thành", !aiDel.body.data?.action, aiDel.body.data?.response?.slice(0, 120));

    // 4. Hai quản lý cùng duyệt một phiếu: người sau nhận 409
    approvalId = (await con.query("INSERT INTO approvals (task_id, step_order, status, request_note) VALUES ($1, 1, 'PENDING', $2) RETURNING approval_id", [taskId, "[Demo] Xin duyệt vật tư kiểm tra"])).rows[0].approval_id;
    const seen = async (u) => ((await call(u.token, "GET", "/approvals/pending")).body.data || []).some((a) => a.approval_id === approvalId);
    ok("Minh Anh và Dũng đều thấy phiếu chờ duyệt", (await seen(minhAnh)) && (await seen(dung)));
    const first = await call(dung.token, "POST", `/approvals/${approvalId}/decision`, { status: "APPROVED", decisionNote: "Đồng ý" });
    ok("Dũng duyệt trước → thành công", first.status === 200, first.body.message);
    const second = await call(minhAnh.token, "POST", `/approvals/${approvalId}/decision`, { status: "APPROVED" });
    ok("Minh Anh duyệt sau → 409 'đã được người khác xử lý'", second.status === 409, second.body.message);
    ok("Phiếu không còn trong danh sách chờ của Minh Anh", !(await seen(minhAnh)));

    // 5. Lịch sử thao tác của Minh Anh có đề xuất đã áp dụng
    const history = await call(minhAnh.token, "GET", "/ai/actions");
    ok("Lịch sử thao tác ghi 'Đã áp dụng'", (history.body.data || []).some((a) => a.action_id === action.action_id && a.status === "APPLIED"));
} catch (err) {
    ok("Chạy kịch bản", false, err.message);
} finally {
    if (!KEEP) {
        // Dọn: xoá mềm việc thử, bỏ phiếu thử, thông báo và lịch sử do script tạo
        if (taskId) {
            const del = await call(minhAnh.token, "DELETE", `/tasks/${taskId}`);
            ok("Dọn: Minh Anh (manager) xoá mềm việc thử", del.status === 200, `HTTP ${del.status}`);
            await con.query("DELETE FROM notifications WHERE entity_id = $1 AND entity_type = 'task'", [taskId]).catch(() => {});
        }
        if (approvalId) await con.query("DELETE FROM approvals WHERE approval_id = $1", [approvalId]);
        if (created.length) await con.query("DELETE FROM ai_actions WHERE action_id = ANY($1::int[])", [created]);
    } else console.log(`Giữ lại: việc #${taskId}, phiếu #${approvalId}`);
    await con.end();
    console.log(failed ? `\n${failed} bước LỖI` : "\nTất cả ĐẠT");
    process.exit(failed ? 1 : 0);
}
