// Dữ liệu demo "Công ty An Phát · Nhà máy Bình Dương" khớp app mobile (fixtures) và Figma: node src/config/seed_anphat.js
// Chạy lại được: người dùng theo email, không gian / danh sách / thiết bị theo tên hoặc mã, việc theo tên.
// Tài khoản mới dùng chung mật khẩu DEMO_PASSWORD (in ra khi chạy).
import 'dotenv/config';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import con from './connect.js';
import Incident from '../models/Incident.js';

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Flowse@2026';
const WS_NAME = 'Công ty An Phát · Nhà máy Bình Dương';
// Tài khoản đã có giữ mật khẩu cũ; thêm --reset-passwords để đặt lại tất cả về DEMO_PASSWORD
const RESET_PASSWORDS = process.argv.includes('--reset-passwords');

const PEOPLE = [
  ['minhanh', 'Nguyễn Minh Anh', 'minhanh@anphat.vn', 'manager'],
  ['dungtq', 'Trần Quốc Dũng', 'dung.tq@anphat.vn', 'manager'],
  ['huypq', 'Phạm Quốc Huy', 'huy.pq@anphat.vn', 'manager'],
  ['thanhld', 'Lê Đức Thành', 'thanh.ld@anphat.vn', 'member'],
  ['hatt', 'Trần Thu Hà', 'ha.tt@anphat.vn', 'member'],
  ['namnh', 'Nguyễn Hoàng Nam', 'nam.nh@anphat.vn', 'member'],
  ['tamlm', 'Lê Minh Tâm', 'tam.lm@anphat.vn', 'member'],
  ['khanhvv', 'Võ Văn Khánh', 'khanh.vv@anphat.vn', 'member'],
  ['khoadm', 'Đỗ Minh Khoa', 'khoa.dm@anphat.vn', 'member'],
  ['ngoctt', 'Trần Thị Ngọc', 'ngoc.tt@anphat.vn', 'member'],
  ['quantri', 'Quản trị An Phát', 'quantri@anphat.vn', 'admin'],
];

const one = async (sql, params) => (await con.query(sql, params)).rows[0];
/** Thời điểm cách hôm nay `days` ngày, lúc `hour`:`min` giờ máy. */
const at = (days, hour, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, min, 0, 0);
  return d;
};

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const id = {};
  for (const [username, name, email] of PEOPLE) {
    const u = await one(
      `INSERT INTO users (username, name, email, password_hash) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name,
         password_hash = CASE WHEN $5 THEN EXCLUDED.password_hash ELSE users.password_hash END
       RETURNING user_id`,
      [username, name, email, hash, RESET_PASSWORDS]
    );
    id[username] = u.user_id;
  }

  // Workspace: dùng lại workspace demo cũ của Minh Anh (đổi tên), hoặc tạo mới
  let ws = await one(`SELECT w.workspace_id FROM workspaces w JOIN workspace_members wm ON wm.workspace_id = w.workspace_id WHERE wm.user_id = $1 AND w.deleted_at IS NULL ORDER BY w.workspace_id LIMIT 1`, [id.minhanh]);
  if (!ws) ws = await one(`INSERT INTO workspaces (name, description, slug, created_by) VALUES ($1, $2, 'an-phat-binh-duong', $3) RETURNING workspace_id`, [WS_NAME, 'Nhà máy Bình Dương', id.minhanh]);
  const wsId = ws.workspace_id;
  await con.query(`UPDATE workspaces SET name = $2, description = 'Nhà máy Bình Dương' WHERE workspace_id = $1`, [wsId, WS_NAME]);
  for (const [username, , , role] of PEOPLE) {
    await con.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role_id) VALUES ($1, $2, (SELECT role_id FROM roles WHERE role_name = $3))
       ON CONFLICT (workspace_id, user_id) DO UPDATE SET role_id = EXCLUDED.role_id, deleted_at = NULL`,
      [wsId, id[username], role]
    );
  }

  // Phòng ban / phân xưởng (bảng departments chưa có cột workspace, dùng mã AP_ để khỏi trùng)
  const dept = async (code, name, managerId, parentId = null) =>
    (await one(
      `INSERT INTO departments (name, code, manager_id, parent_id) VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, manager_id = EXCLUDED.manager_id, parent_id = EXCLUDED.parent_id
       RETURNING department_id`,
      [name, code, managerId, parentId]
    )).department_id;
  const dPlan = await dept('AP_PLAN', 'Phòng Kế hoạch', id.dungtq);
  const dPack = await dept('AP_PACK', 'Xưởng đóng gói', id.dungtq);
  const dLineA2 = await dept('AP_LINE_A2', 'Dây chuyền A2', id.dungtq, dPack);
  await dept('AP_MAINT', 'Tổ bảo trì', id.huypq);
  await dept('AP_QA', 'QA/QC', id.ngoctt);

  // Không gian, danh sách và trạng thái
  const space = async (name, description) => {
    const s = (await one(`SELECT space_id FROM spaces WHERE workspace_id = $1 AND name = $2 AND deleted_at IS NULL`, [wsId, name]))
      ?? (await one(`INSERT INTO spaces (workspace_id, name, description, created_by) VALUES ($1, $2, $3, $4) RETURNING space_id`, [wsId, name, description, id.minhanh]));
    const statuses = [['Cần làm', '#9CA3AF', false, true], ['Đang làm', '#2F5FD0', false, false], ['Chờ review', '#C98512', false, false], ['Hoàn thành', '#0E7C74', true, false]];
    for (const [i, [st, color, done, def]] of statuses.entries()) {
      await con.query(`INSERT INTO task_status (space_id, status_name, color, position, is_done_state, is_default) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (space_id, status_name) DO NOTHING`, [s.space_id, st, color, i, done, def]);
    }
    return s.space_id;
  };
  const list = async (spaceId, name) =>
    ((await one(`SELECT list_id FROM lists WHERE space_id = $1 AND name = $2 AND deleted_at IS NULL`, [spaceId, name]))
      ?? (await one(`INSERT INTO lists (space_id, name, created_by) VALUES ($1, $2, $3) RETURNING list_id`, [spaceId, name, id.minhanh]))).list_id;
  const statusId = async (spaceId, name) => (await one(`SELECT status_id FROM task_status WHERE space_id = $1 AND status_name = $2`, [spaceId, name])).status_id;

  const sPlan = await space('Kế hoạch sản xuất', 'Đơn hàng, vật tư và lịch giao của Phòng Kế hoạch');
  const lOrder = await list(sPlan, 'Đơn hàng AP-1126');
  const lRequest = await list(sPlan, 'Yêu cầu & phê duyệt');
  const sOps = await space('Vận hành Bình Dương', 'Sự cố thiết bị và bảo trì hiện trường');
  const lIncident = await list(sOps, 'Sự cố thiết bị');

  // Việc: tạo nếu chưa có (theo tên trong danh sách), giao cho người làm
  const task = async (listId, spaceId, name, { by, to, status = 'Cần làm', due = null, priority = 'Normal', type = 'TASK', dept: deptId = null }) => {
    let t = await one(`SELECT task_id FROM tasks WHERE list_id = $1 AND name = $2 AND deleted_at IS NULL`, [listId, name]);
    if (!t) {
      t = await one(
        `INSERT INTO tasks (list_id, name, created_by, status_id, due_date, priority, work_item_type, department_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING task_id`,
        [listId, name, by, await statusId(spaceId, status), due, priority, type, deptId]
      );
    } else {
      // Chạy lại seed hôm sau: dời hạn theo ngày mới để màn "Hôm nay" vẫn đúng
      await con.query(`UPDATE tasks SET due_date = $2, status_id = $3 WHERE task_id = $1`, [t.task_id, due, await statusId(spaceId, status)]);
    }
    // Việc ở trạng thái Hoàn thành có thời điểm xong; việc khác thì chưa xong
    await con.query(`UPDATE tasks SET completed_at = CASE WHEN $2 THEN COALESCE(completed_at, now()) ELSE NULL END WHERE task_id = $1`, [t.task_id, status === 'Hoàn thành']);
    if (to) await con.query(`INSERT INTO task_assigns (task_id, user_id, assigned_by) VALUES ($1, $2, $3) ON CONFLICT (task_id, user_id) DO UPDATE SET deleted_at = NULL`, [t.task_id, to, by]);
    return t.task_id;
  };
  const tChot = await task(lOrder, sPlan, 'Chốt kế hoạch vật tư tháng 11', { by: id.dungtq, to: id.minhanh, status: 'Đang làm', due: at(-1, 17), priority: 'High', dept: dPlan });
  await task(lOrder, sPlan, 'Rà soát hồ sơ nghiệm thu AP-1126', { by: id.dungtq, to: id.minhanh, due: at(0, 16, 30), dept: dPlan });
  await task(lOrder, sPlan, 'Cập nhật lịch giao lô 1', { by: id.minhanh, to: id.minhanh, due: at(0, 17), dept: dPlan });
  await task(lOrder, sPlan, 'Báo cáo tiến độ đơn PO-2410', { by: id.dungtq, to: id.minhanh, status: 'Chờ review', due: at(2, 17), dept: dPlan });
  await task(lOrder, sPlan, 'Bổ sung biên bản nghiệm thu', { by: id.minhanh, to: id.huypq, status: 'Đang làm', due: at(0, 8), priority: 'High', dept: dPlan });
  await task(lOrder, sPlan, 'Báo giá phụ liệu từ 2 NCC', { by: id.minhanh, to: id.huypq, due: at(0, 9, 30), dept: dPlan });

  // Thiết bị Dây chuyền A2
  const asset = async (code, name, location) =>
    (await one(
      `INSERT INTO assets (asset_code, name, location, department_id, qr_token, status) VALUES ($1, $2, $3, $4, $5, 'OPERATIONAL')
       ON CONFLICT (asset_code) DO UPDATE SET name = EXCLUDED.name, location = EXCLUDED.location, department_id = EXCLUDED.department_id
       RETURNING asset_id`,
      [code, name, location, dLineA2, crypto.randomBytes(12).toString('hex')]
    )).asset_id;
  const bt07 = await asset('BT-07', 'Băng tải con lăn 6 m', 'Dây chuyền A2 · Xưởng đóng gói');
  await asset('MD-03', 'Máy dán thùng', 'Dây chuyền A2 · Cuối chuyền');
  const tuDien = await asset('TD-A2', 'Tủ điện A2', 'Dây chuyền A2 · Đầu chuyền');
  const dauDoc = await asset('QR-A1', 'Đầu đọc QR A1', 'Dây chuyền A1');

  // Sự cố qua model thật để có SLA và workflow; chỉ tạo khi thiết bị chưa có sự cố mở
  const incident = async (assetId, title, symptom, severity, reporter, technician) => {
    const open = await one(`SELECT incident_id FROM incidents WHERE asset_id = $1 AND resolved_at IS NULL LIMIT 1`, [assetId]);
    if (open) return open.incident_id;
    const inc = await Incident.reportIncident({ title, symptom, asset_id: assetId, reported_by: reporter, severity, list_id: lIncident });
    if (technician) await Incident.assignTechnician({ incidentId: inc.incident_id, technicianId: technician, assignedBy: id.dungtq });
    return inc.incident_id;
  };
  const incBt07 = await incident(bt07, 'Rung bất thường ở cụm con lăn', 'BT-07 rung mạnh, có tiếng kêu ở cụm con lăn giữa', 'HIGH', id.khanhvv, id.thanhld);
  await incident(tuDien, 'Cảm biến cửa tủ điện chập chờn', 'Đèn báo cửa tủ điện nhấp nháy, cảm biến lúc nhận lúc không', 'CRITICAL', id.dungtq, null);
  await incident(dauDoc, 'Đầu đọc QR không nhận tín hiệu', 'Đầu đọc không đọc được mã lô ở đầu dây chuyền A1', 'MEDIUM', id.tamlm, id.thanhld);

  // Phiếu chờ duyệt (người duyệt để trống: manager của workspace và trưởng phòng ban đều thấy)
  const request = async (name, by, note, incidentId = null) => {
    const t = await task(lRequest, sPlan, name, { by, type: 'REQUEST', dept: dPlan });
    const has = await one(`SELECT approval_id FROM approvals WHERE task_id = $1`, [t]);
    if (!has) await con.query(`INSERT INTO approvals (task_id, step_order, status, request_note, incident_id) VALUES ($1, 1, 'PENDING', $2, $3)`, [t, note, incidentId]);
  };
  await request('VT-2610-009 · Vật tư sửa băng tải BT-07', id.namnh, 'Vòng bi 6204-2RS × 2, bu lông M10×35 × 8, cảm biến E3Z-D61 × 1 · 4.860.000 ₫ · cần trước 12:00', incBt07);
  await request('YC-2610-044 · Tạm ứng công tác Đồng Nai', id.minhanh, '3.500.000 ₫ · công tác Đồng Nai 01–02/11 · chuyển khoản');
  await request('NP-2610-013 · Nghỉ phép 05/11', id.hatt, '1 ngày phép năm · người thay: Phạm Quốc Huy');

  // Các không gian khác của văn phòng (C01) và việc của cả nhóm (D04: tải việc theo người)
  const sSales = await space('Kinh doanh', 'Báo giá, đơn hàng và chăm sóc khách');
  const lSales = await list(sSales, 'Đơn hàng PO-2410');
  const sHr = await space('Nhân sự & hành chính', 'Tuyển dụng, hồ sơ và tài sản văn phòng');
  const lHr = await list(sHr, 'Tài sản & cấp phát');
  const sKaizen = await space('Cải tiến liên tục', 'Đề xuất cải tiến Kaizen của nhà máy');
  const lKaizen = await list(sKaizen, 'Kaizen quý 4');
  await task(lOrder, sPlan, 'Đối chiếu tồn kho vải', { by: id.minhanh, to: id.minhanh, status: 'Hoàn thành', due: at(-2, 17), dept: dPlan });
  await task(lOrder, sPlan, 'Lập lịch ca tuần 45', { by: id.dungtq, to: id.hatt, status: 'Đang làm', due: at(1, 12), dept: dPlan });
  await task(lOrder, sPlan, 'Kiểm tra phụ liệu lô 25', { by: id.dungtq, to: id.hatt, due: at(-1, 15), dept: dPlan });
  await task(lOrder, sPlan, 'Cập nhật định mức chỉ may lô 2', { by: id.minhanh, to: id.thanhld, due: at(3, 17), dept: dPlan });
  await task(lSales, sSales, 'Gửi báo giá đơn AP-1131', { by: id.dungtq, to: id.minhanh, due: at(3, 10), dept: dPlan });
  await task(lSales, sSales, 'Xác nhận lịch giao PO-2410 với khách', { by: id.minhanh, to: id.huypq, status: 'Chờ review', due: at(1, 9), dept: dPlan });
  await task(lHr, sHr, 'Cấp laptop cho nhân sự mới', { by: id.minhanh, to: id.minhanh, status: 'Chờ review', due: at(0, 18), dept: dPlan });
  await task(lKaizen, sKaizen, 'Giảm thời gian chuyển đổi khuôn máy dán thùng', { by: id.huypq, to: id.huypq, due: at(7, 17) });
  await task(lIncident, sOps, 'Bảo trì định kỳ máy dán thùng MD-03', { by: id.dungtq, to: id.thanhld, due: at(0, 15) });
  await task(lIncident, sOps, 'Kiểm tra khu vực cuối chuyền', { by: id.dungtq, to: id.tamlm, status: 'Chờ review', due: at(0, 11), dept: dLineA2 });
  await task(lIncident, sOps, 'Vệ sinh khu vực cuối chuyền', { by: id.dungtq, to: id.khanhvv, status: 'Đang làm', due: at(0, 13, 30), dept: dLineA2 });

  // Trao đổi trong việc (C10), chỉ thêm khi việc chưa có bình luận
  if (!(await one(`SELECT 1 FROM comments WHERE task_id = $1 LIMIT 1`, [tChot]))) {
    const say = (userId, content, minsAgo) =>
      con.query(`INSERT INTO comments (task_id, user_id, content, created_at) VALUES ($1, $2, $3, now() - make_interval(mins => $4))`, [tChot, userId, content, minsAgo]);
    await say(id.huypq, 'Báo giá NCC thứ hai em gửi qua mail rồi, chênh 4% so với An Phát.', 180);
    await say(id.dungtq, '@Minh Anh chọn An Phát, giao đúng hạn quan trọng hơn giá.', 95);
    await say(id.minhanh, 'Dạ em chốt An Phát, chiều nay gửi kế hoạch vật tư cho anh duyệt.', 40);
  }

  // Hội thoại (J05–J07): chat riêng Minh Anh – Dũng và kênh bảo trì
  const conversation = async (type, name, members, messages) => {
    const found = name
      ? await one(`SELECT conversation_id FROM conversations WHERE workspace_id = $1 AND name = $2`, [wsId, name])
      : await one(
          `SELECT c.conversation_id FROM conversations c WHERE c.workspace_id = $1 AND c.type = 'DIRECT'
             AND (SELECT array_agg(user_id ORDER BY user_id) FROM conversation_members m WHERE m.conversation_id = c.conversation_id) = $2::int[]`,
          [wsId, [...members].sort((a, b) => a - b)]
        );
    if (found) return;
    const c = await one(`INSERT INTO conversations (workspace_id, type, name, created_by) VALUES ($1, $2, $3, $4) RETURNING conversation_id`, [wsId, type, name, members[0]]);
    for (const u of members) await con.query(`INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [c.conversation_id, u]);
    for (const [sender, content, minsAgo] of messages) {
      await con.query(`INSERT INTO messages (conversation_id, sender_id, content, created_at) VALUES ($1, $2, $3, now() - make_interval(mins => $4))`, [c.conversation_id, sender, content, minsAgo]);
    }
  };
  await conversation('DIRECT', null, [id.minhanh, id.dungtq], [
    [id.dungtq, 'Em gửi ảnh BT-07 sau khi siết lại cụm con lăn giúp anh nhé.', 70],
    [id.minhanh, 'Dạ em vừa nhận từ anh Thành, rung giảm rõ rồi ạ.', 62],
    [id.dungtq, 'Rung giảm chưa em?', 58],
    [id.minhanh, 'Ok, chiều anh qua xem BT-07.', 55],
  ]);
  await conversation('CHANNEL', 'bảo-trì-a2', [id.dungtq, id.thanhld, id.namnh, id.minhanh, id.huypq], [
    [id.namnh, 'Đã thay xong con lăn số 3, chạy thử 70% tải 15 phút, chưa thấy rung lại.', 120],
    [id.thanhld, 'Ok anh, 10:30 em đo và gửi số liệu lên kênh.', 110],
    [id.dungtq, 'Chọn An Phát cho vòng bi, giao đúng hạn quan trọng hơn.', 90],
  ]);

  // Thông báo của Minh Anh (J01); dedup_key để chạy lại không nhân đôi
  const notify = (key, actor, type, content, minsAgo) =>
    con.query(
      `INSERT INTO notifications (user_id, actor_id, entity_type, type, content, is_read, created_at, dedup_key)
       SELECT $1::int, $2::int, 'TASK', $3::varchar, $4::text, false, now() - make_interval(mins => $5::int), $6::varchar
       WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = $1::int AND dedup_key = $6::varchar)`,
      [id.minhanh, actor, type, content, minsAgo, key]
    );
  await notify('seed-ap-mention', id.dungtq, 'MENTION', 'Trần Quốc Dũng nhắc bạn: "@Minh Anh chọn An Phát" · Chốt kế hoạch vật tư tháng 11', 95);
  await notify('seed-ap-assign', id.huypq, 'TASK_ASSIGNED', 'Việc mới: Báo giá phụ liệu từ 2 NCC · Phạm Quốc Huy giao · hạn hôm nay', 150);
  await notify('seed-ap-laptop', id.dungtq, 'REQUEST_UPDATED', 'Laptop đã sẵn sàng bàn giao · xác nhận khi nhận', 200);
  await notify('seed-ap-advance', id.dungtq, 'APPROVAL', 'Tạm ứng công tác Đồng Nai được duyệt bước 1 · YC-2610-044', 26 * 60);

  console.log(`✓ An Phát: workspace ${wsId}, ${PEOPLE.length} người, mật khẩu chung "${DEMO_PASSWORD}"`);
  await con.end();
}

main().catch(async (e) => {
  console.error('Seed An Phát lỗi:', e.message);
  await con.end().catch(() => {});
  process.exit(1);
});
