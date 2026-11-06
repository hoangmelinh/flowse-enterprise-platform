// Flowse AI chế độ Work: AI đề xuất thao tác trên công việc, người dùng bấm Áp dụng thì mới ghi.
// Mỗi thao tác kiểm tra lại quyền và dữ liệu lúc áp dụng (không tin bản đã kiểm lúc đề xuất).
import con from "../config/connect.js";
import { AppError } from "../middlewares/errorMiddleware.js";
import { checkInheritedWorkspacePermission, checkSpacePermission } from "./Permission.js";
import { findAssignableMembersForSpace } from "./AI.js";
import { assignUserToTask, createTaskForList, deleteTask, unassignUserFromTask, updateTask } from "./Task.js";
import { createActivity } from "./ActivityLogs.js";
import { createAssignNotificationIfNotExists } from "./Notifications.js";

const PRIORITIES = ["Urgent", "High", "Normal", "Low"];
const PRIORITY_VI = { Urgent: "Khẩn", High: "Cao", Normal: "Bình thường", Low: "Thấp" };
const fail = (msg, status = 400) => {
    throw new AppError(msg, status, "AI_ACTION_INVALID");
};
// So khớp tên không phân biệt dấu/hoa thường: "thanh" khớp "Lê Đức Thành"
const norm = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase().trim();

const can = async (spaceId, userId, perm) =>
    (await checkSpacePermission(spaceId, userId, perm)) || (await checkInheritedWorkspacePermission(spaceId, userId, perm));
const requirePerm = async (space, userId, perm, what) => {
    if (!(await can(space.space_id, userId, perm))) fail(`Bạn không có quyền ${what} trong không gian "${space.name}".`, 403);
};

const words = (s) => norm(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/**
 * Chọn đúng một mục theo tên: khớp hẳn trước, rồi khớp theo từ trọn vẹn ("Hà" khớp "Trần Thu Hà"
 * nhưng không khớp "Thành"); nhiều kết quả thì hỏi lại.
 */
const pick = (rows, name, label, key = "name") => {
    const n = norm(name);
    const q = words(name);
    const exact = rows.filter((r) => norm(r[key]) === n);
    const hits = exact.length ? exact : rows.filter((r) => q.length && q.every((w) => words(r[key]).includes(w)));
    if (hits.length === 1) return hits[0];
    if (!hits.length) fail(`Không tìm thấy ${label} "${name}". Có: ${rows.map((r) => r[key]).join(", ") || "không có"}.`);
    fail(`"${name}" khớp nhiều ${label}: ${hits.map((r) => r[key]).join(", ")}. Hỏi người dùng chọn một.`);
};

// Cùng điều kiện "thấy được" với models/AI.js: thành viên không gian, hoặc không gian công khai của công ty mình
const VISIBLE = `s.deleted_at IS NULL AND (
    EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = s.space_id AND sm.user_id = $1 AND sm.deleted_at IS NULL)
    OR (s.is_private = FALSE AND EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = s.workspace_id AND wm.user_id = $1 AND wm.deleted_at IS NULL)))`;

const findSpace = async (userId, name) => {
    const { rows } = await con.query(`SELECT s.space_id, s.name FROM spaces s WHERE ${VISIBLE} ORDER BY s.name`, [userId]);
    return pick(rows, name, "không gian");
};

const findList = async (space, name) => {
    const { rows } = await con.query("SELECT list_id, name FROM lists WHERE space_id = $1 AND deleted_at IS NULL ORDER BY position, list_id", [space.space_id]);
    if (!rows.length) fail(`Không gian "${space.name}" chưa có danh sách nào.`);
    return name ? pick(rows, name, `danh sách trong "${space.name}"`) : rows[0];
};

const findStatus = async (space, name) => {
    const { rows } = await con.query("SELECT status_id, status_name FROM task_status WHERE space_id = $1 ORDER BY position", [space.space_id]);
    return pick(rows, name, `trạng thái trong "${space.name}"`, "status_name");
};

const findTask = async (userId, taskId) => {
    if (!Number.isInteger(Number(taskId)) || taskId === null || taskId === "") fail("Thiếu mã việc (task_id). Tìm việc bằng search_tasks trước.");
    const { rows } = await con.query(
        `SELECT t.task_id, t.name, t.priority, t.due_date, t.status_id, ts.status_name,
                l.list_id, l.name AS list_name, s.space_id, s.name AS space_name
         FROM tasks t JOIN lists l ON l.list_id = t.list_id JOIN spaces s ON s.space_id = l.space_id
         LEFT JOIN task_status ts ON ts.status_id = t.status_id
         WHERE t.task_id = $2 AND t.deleted_at IS NULL AND l.deleted_at IS NULL AND ${VISIBLE}`,
        [userId, Number(taskId)]
    );
    return rows[0] || fail(`Không tìm thấy việc #${taskId} (đã xoá hoặc bạn không xem được).`, 404);
};

const findMembers = async (space, names) => {
    if (!names?.length) return [];
    const members = (await findAssignableMembersForSpace(space.space_id)).map((m) => ({ ...m, name: m.name || m.username }));
    return names.map((n) => pick(members, n, `thành viên của "${space.name}"`));
};

/** "2026-11-06" hoặc "2026-11-06 15:00" theo giờ Việt Nam (cột due_date lưu giờ VN). Chỉ có ngày thì hạn 17:00. */
const parseDue = (d) => {
    if (d == null || d === "") return undefined;
    const m = String(d).trim().match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/);
    if (!m || Number.isNaN(Date.parse(m[1]))) fail(`Hạn "${d}" không hợp lệ, cần dạng YYYY-MM-DD hoặc YYYY-MM-DD HH:mm.`);
    return `${m[1]} ${m[2] || "17:00"}:00`;
};
const parsePriority = (p) => {
    if (p == null || p === "") return undefined;
    return PRIORITIES.find((x) => norm(x) === norm(p)) || fail(`Mức ưu tiên "${p}" không hợp lệ: ${PRIORITIES.join(", ")}.`);
};
const showDue = (d) => (d ? String(d).slice(0, 16) : "Chưa đặt");
const showDate = (d) => (d ? new Date(d).toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).slice(0, 16) : "Chưa đặt");
const clip = (s, n = 200) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/**
 * Đọc đề xuất của AI thành thao tác cụ thể (id thật) và kiểm quyền. Dùng cả lúc đề xuất lẫn lúc áp dụng.
 * Trả { plan, summary }: plan để thực hiện, summary để hiện cho người dùng xem lại.
 */
const resolve = async (userId, type, a) => {
    if (type === "CREATE_TASK") {
        const title = clip(a.title, 255) || fail("Thiếu tên việc.");
        const space = await findSpace(userId, a.space_name || fail("Thiếu không gian (space_name) để tạo việc."));
        await requirePerm(space, userId, "TASK_CREATE", "tạo việc");
        const list = await findList(space, a.list_name);
        const people = await findMembers(space, a.assignee_names);
        if (people.length) await requirePerm(space, userId, "TASK_ASSIGN", "giao việc");
        const due = parseDue(a.due_date);
        const priority = parsePriority(a.priority) || "Normal";
        return {
            plan: { list_id: list.list_id, name: title, description: clip(a.description, 2000) || null, priority, due_date: due || null, assignee_ids: people.map((p) => p.user_id) },
            summary: {
                title: "Tạo việc",
                rows: [["Việc", title], ["Nơi", `${space.name} › ${list.name}`], ["Người làm", people.map((p) => p.name).join(", ") || "Chưa giao"], ["Hạn", showDue(due)], ["Ưu tiên", PRIORITY_VI[priority]]],
            },
        };
    }

    const task = await findTask(userId, a.task_id);
    const here = { space_id: task.space_id, name: task.space_name };

    if (type === "UPDATE_TASK") {
        await requirePerm(here, userId, "TASK_UPDATE", "sửa việc");
        const plan = { task_id: task.task_id, fields: {} };
        const rows = [["Việc", `#${task.task_id} ${task.name}`]];
        const title = clip(a.title, 255);
        if (title && title !== task.name) (plan.fields.name = title), rows.push(["Tên", `${task.name} → ${title}`]);
        if (a.description != null && a.description !== "") (plan.fields.description = clip(a.description, 2000)), rows.push(["Mô tả", "Cập nhật mô tả"]);
        const priority = parsePriority(a.priority);
        if (priority && priority !== task.priority) (plan.fields.priority = priority), rows.push(["Ưu tiên", `${PRIORITY_VI[task.priority] || task.priority || "—"} → ${PRIORITY_VI[priority]}`]);
        const due = parseDue(a.due_date);
        if (due) (plan.fields.due_date = due), rows.push(["Hạn", `${showDate(task.due_date)} → ${showDue(due)}`]);

        // Chuyển sang không gian / danh sách khác: trạng thái là của từng không gian nên đổi theo
        let target = here;
        if (a.space_name) target = await findSpace(userId, a.space_name);
        if (target.space_id !== here.space_id) await requirePerm(target, userId, "TASK_CREATE", "chuyển việc vào");
        if (a.space_name || a.list_name) {
            const list = await findList(target, a.list_name);
            if (list.list_id !== task.list_id) (plan.list_id = list.list_id), rows.push(["Nơi", `${task.space_name} › ${task.list_name} → ${target.name} › ${list.name}`]);
        }
        let status = a.status_name ? await findStatus(target, a.status_name) : null;
        if (!status && target.space_id !== here.space_id) {
            // Giữ trạng thái cùng tên ở không gian mới, không có thì về trạng thái mặc định
            const { rows: st } = await con.query(
                "SELECT status_id, status_name FROM task_status WHERE space_id = $1 ORDER BY (LOWER(status_name) = LOWER($2)) DESC, is_default DESC, position LIMIT 1",
                [target.space_id, task.status_name || ""]
            );
            status = st[0] || null;
        }
        if (status && status.status_id !== task.status_id) (plan.status_id = status.status_id), rows.push(["Trạng thái", `${task.status_name || "—"} → ${status.status_name}`]);
        if (rows.length === 1) fail("Không có gì thay đổi so với hiện tại.");
        return { plan, summary: { title: "Sửa việc", rows } };
    }

    if (type === "ASSIGN_TASK") {
        await requirePerm(here, userId, "TASK_ASSIGN", "giao việc");
        const add = await findMembers(here, a.add_names);
        const remove = await findMembers(here, a.remove_names);
        if (!add.length && !remove.length) fail("Cần ít nhất một người để giao hoặc bỏ giao.");
        const rows = [["Việc", `#${task.task_id} ${task.name}`]];
        if (add.length) rows.push(["Giao cho", add.map((p) => p.name).join(", ")]);
        if (remove.length) rows.push(["Bỏ giao", remove.map((p) => p.name).join(", ")]);
        return { plan: { task_id: task.task_id, name: task.name, add: add.map((p) => p.user_id), remove: remove.map((p) => p.user_id) }, summary: { title: "Giao việc", rows } };
    }

    if (type === "DELETE_TASK") {
        await requirePerm(here, userId, "TASK_DELETE", "xoá việc");
        return {
            plan: { task_id: task.task_id },
            summary: { title: "Xoá việc", rows: [["Việc", `#${task.task_id} ${task.name}`], ["Nơi", `${task.space_name} › ${task.list_name}`], ["Cách xoá", "Ẩn khỏi danh sách, dữ liệu vẫn giữ để khôi phục"]] },
        };
    }
    fail(`Loại thao tác không hỗ trợ: ${type}`);
};

const view = (r) => ({ action_id: r.action_id, action_type: r.action_type, status: r.status, summary: r.summary, result: r.result, created_at: r.created_at, decided_at: r.decided_at });

/** Lưu một đề xuất chờ người dùng xác nhận. Lỗi (thiếu quyền, sai tên...) ném AppError để AI báo lại người dùng. */
export const proposeAction = async (userId, type, args) => {
    const { summary } = await resolve(userId, type, args);
    const { rows } = await con.query("INSERT INTO ai_actions (user_id, action_type, args, summary) VALUES ($1, $2, $3, $4) RETURNING *", [userId, type, args, summary]);
    return view(rows[0]);
};

const execute = async (userId, type, plan) => {
    if (type === "CREATE_TASK") {
        const task = await createTaskForList({ listId: plan.list_id, name: plan.name, description: plan.description, priority: plan.priority, due_date: plan.due_date, assignee_ids: plan.assignee_ids, created_by: userId });
        createActivity(task.task_id, userId, "created", null, { by: "flowse_ai" }).catch(() => {});
        for (const id of plan.assignee_ids.filter((id) => id !== userId))
            createAssignNotificationIfNotExists(id, userId, task.task_id, `Bạn đã được giao task "${plan.name}".`).catch(() => {});
        return { task_id: task.task_id, message: `Đã tạo việc #${task.task_id} "${plan.name}".` };
    }
    if (type === "UPDATE_TASK") {
        // list_id/status_id ghi thẳng vì updateTask chỉ cho chuyển trong cùng không gian; resolve đã kiểm hai id này
        if (plan.list_id || plan.status_id)
            await con.query("UPDATE tasks SET list_id = COALESCE($2, list_id), status_id = COALESCE($3, status_id) WHERE task_id = $1 AND deleted_at IS NULL", [plan.task_id, plan.list_id || null, plan.status_id || null]);
        if (Object.keys(plan.fields).length) await updateTask(plan.task_id, plan.fields);
        createActivity(plan.task_id, userId, "updated", null, { ...plan.fields, list_id: plan.list_id, status_id: plan.status_id, by: "flowse_ai" }).catch(() => {});
        return { task_id: plan.task_id, message: `Đã cập nhật việc #${plan.task_id}.` };
    }
    if (type === "ASSIGN_TASK") {
        for (const id of plan.add) {
            await assignUserToTask(plan.task_id, id);
            createActivity(plan.task_id, userId, "assigned", null, { user_id: id, by: "flowse_ai" }).catch(() => {});
            if (id !== userId) createAssignNotificationIfNotExists(id, userId, plan.task_id, `Bạn đã được giao task "${plan.name}".`).catch(() => {});
        }
        for (const id of plan.remove) {
            await unassignUserFromTask(plan.task_id, id);
            createActivity(plan.task_id, userId, "unassigned", { user_id: id }, { by: "flowse_ai" }).catch(() => {});
        }
        return { task_id: plan.task_id, message: `Đã cập nhật người làm việc #${plan.task_id}.` };
    }
    // DELETE_TASK: xoá mềm (deleted_at), khôi phục được bằng cách đặt lại deleted_at = NULL
    await deleteTask(plan.task_id);
    createActivity(plan.task_id, userId, "deleted", null, { by: "flowse_ai" }).catch(() => {});
    return { task_id: plan.task_id, message: `Đã xoá việc #${plan.task_id} khỏi danh sách.` };
};

/** Áp dụng đề xuất của chính người dùng. Giữ chỗ bằng PENDING → APPLYING để bấm hai lần không chạy hai lần. */
export const applyAction = async (userId, actionId) => {
    const { rows } = await con.query(
        "UPDATE ai_actions SET status = 'APPLYING' WHERE action_id = $1 AND user_id = $2 AND status = 'PENDING' AND created_at > NOW() - INTERVAL '1 day' RETURNING *",
        [actionId, userId]
    );
    const row = rows[0];
    if (!row) {
        const { rows: had } = await con.query("SELECT status FROM ai_actions WHERE action_id = $1 AND user_id = $2", [actionId, userId]);
        if (!had[0]) fail("Không tìm thấy đề xuất.", 404);
        fail(had[0].status === "PENDING" ? "Đề xuất đã quá 1 ngày, hãy nhờ Flowse AI soạn lại." : "Đề xuất này đã được xử lý.", 409);
    }
    try {
        const { plan } = await resolve(userId, row.action_type, row.args);
        const result = await execute(userId, row.action_type, plan);
        const done = await con.query("UPDATE ai_actions SET status = 'APPLIED', result = $2, decided_at = NOW() WHERE action_id = $1 RETURNING *", [actionId, result]);
        return view(done.rows[0]);
    } catch (err) {
        await con.query("UPDATE ai_actions SET status = 'FAILED', result = $2, decided_at = NOW() WHERE action_id = $1", [actionId, { message: err.message }]);
        throw err;
    }
};

export const cancelAction = async (userId, actionId) => {
    const { rows } = await con.query("UPDATE ai_actions SET status = 'CANCELLED', decided_at = NOW() WHERE action_id = $1 AND user_id = $2 AND status = 'PENDING' RETURNING *", [actionId, userId]);
    return rows[0] ? view(rows[0]) : fail("Không tìm thấy đề xuất đang chờ.", 404);
};

/** Lịch sử thao tác (L10): đề xuất của người dùng trong 30 ngày gần nhất. */
export const listActions = async (userId) => {
    const { rows } = await con.query("SELECT * FROM ai_actions WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days' ORDER BY created_at DESC LIMIT 100", [userId]);
    return rows.map(view);
};

/** Tìm việc cho AI (chỉ việc người hỏi xem được), kèm id để AI đề xuất sửa/giao/xoá đúng việc. */
export const searchTasksForAi = async (userId, a = {}) => {
    const params = [userId];
    const where = [];
    const like = (col, v) => (params.push(`%${v}%`), where.push(`${col} ILIKE $${params.length}`));
    if (a.query) like("t.name", a.query);
    if (a.space_name) like("s.name", a.space_name);
    if (a.status_name) like("ts.status_name", a.status_name);
    if (a.assignee_name) {
        params.push(`%${a.assignee_name}%`);
        where.push(`EXISTS (SELECT 1 FROM task_assigns ta JOIN users u ON u.user_id = ta.user_id
            WHERE ta.task_id = t.task_id AND ta.deleted_at IS NULL AND (u.name ILIKE $${params.length} OR u.username ILIKE $${params.length}))`);
    }
    if (a.overdue) where.push("t.due_date < NOW() AND COALESCE(ts.is_done_state, FALSE) = FALSE");
    const limit = Math.min(Math.max(Number(a.limit) || 20, 1), 50);
    const { rows } = await con.query(
        `SELECT t.task_id, t.name, s.name AS space, l.name AS list, ts.status_name AS status, t.priority, t.due_date,
                (SELECT string_agg(COALESCE(u.name, u.username), ', ') FROM task_assigns ta JOIN users u ON u.user_id = ta.user_id
                  WHERE ta.task_id = t.task_id AND ta.deleted_at IS NULL) AS assignees
         FROM tasks t JOIN lists l ON l.list_id = t.list_id JOIN spaces s ON s.space_id = l.space_id
         LEFT JOIN task_status ts ON ts.status_id = t.status_id
         WHERE t.deleted_at IS NULL AND l.deleted_at IS NULL AND ${VISIBLE} ${where.map((w) => `AND ${w}`).join(" ")}
         ORDER BY t.due_date NULLS LAST, t.task_id DESC LIMIT ${limit}`,
        params
    );
    return rows.map((r) => ({ ...r, name: clip(r.name, 120), assignees: clip(r.assignees, 200) || null, due_date: r.due_date ? showDate(r.due_date) : null }));
};

/** Không gian người hỏi thấy được, kèm danh sách và trạng thái, để AI chọn đúng nơi tạo/chuyển việc. */
export const workspaceMapForAi = async (userId) => {
    const { rows } = await con.query(
        `SELECT s.name,
                (SELECT string_agg(l.name, ' | ' ORDER BY l.position, l.list_id) FROM lists l WHERE l.space_id = s.space_id AND l.deleted_at IS NULL) AS lists,
                (SELECT string_agg(ts.status_name, ' | ' ORDER BY ts.position) FROM task_status ts WHERE ts.space_id = s.space_id) AS statuses
         FROM spaces s WHERE ${VISIBLE} ORDER BY s.name`,
        [userId]
    );
    return rows;
};

/** Thành viên có thể giao việc trong một không gian người hỏi xem được (công cụ list_members của AI). */
export const membersForAi = async (userId, spaceName) => {
    const space = await findSpace(userId, spaceName || fail("Thiếu tên không gian."));
    return (await findAssignableMembersForSpace(space.space_id)).map((m) => ({ name: m.name || m.username }));
};
