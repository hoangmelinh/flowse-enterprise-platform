import con from "../config/connect.js";

class Department {
  static async getAll(workspaceId = null, allowedWorkspaceIds = null) {
    const values = [];
    let where = "";
    if (workspaceId) {
      values.push(Number(workspaceId));
      where = `WHERE d.workspace_id = $1`;
    } else if (Array.isArray(allowedWorkspaceIds)) {
      if (allowedWorkspaceIds.length === 0) return [];
      values.push(allowedWorkspaceIds.map(Number));
      where = `WHERE d.workspace_id = ANY($1::int[])`;
    }
    const res = await con.query(`
      SELECT 
        d.*,
        u.name AS manager_name,
        u.email AS manager_email,
        (SELECT COUNT(*) FROM users WHERE department_id = d.department_id AND deleted_at IS NULL) AS member_count
      FROM departments d
      LEFT JOIN users u ON d.manager_id = u.user_id
      ${where}
      ORDER BY d.department_id ASC
    `, values);
    return res.rows;
  }

  static async getById(departmentId) {
    const res = await con.query(
      `SELECT d.*, u.name AS manager_name 
       FROM departments d
       LEFT JOIN users u ON d.manager_id = u.user_id
       WHERE d.department_id = $1`,
      [departmentId]
    );
    return res.rows[0] || null;
  }

  static async create({ name, code, manager_id = null, parent_id = null, workspace_id }) {
    const res = await con.query(
      `INSERT INTO departments (name, code, manager_id, parent_id, workspace_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, code, manager_id, parent_id, workspace_id]
    );
    return res.rows[0];
  }

  static async update(departmentId, { name, code, manager_id, parent_id }) {
    const res = await con.query(
      `UPDATE departments
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           manager_id = COALESCE($3, manager_id),
           parent_id = COALESCE($4, parent_id)
       WHERE department_id = $5
       RETURNING *`,
      [name, code, manager_id, parent_id, departmentId]
    );
    return res.rows[0];
  }

  /**
   * Lấy cây phân cấp phòng ban / phân xưởng (Hierarchical Enterprise Structure)
   * Cấp 1: Phân xưởng/Khối -> Cấp 2: Dây chuyền -> Cấp 3: Tổ/Ca
   */
  static async getHierarchyTree(workspaceId = null, allowedWorkspaceIds = null) {
    const all = await this.getAll(workspaceId, allowedWorkspaceIds);
    const map = new Map();
    all.forEach((d) => map.set(d.department_id, { ...d, children: [] }));

    const tree = [];
    all.forEach((d) => {
      if (d.parent_id && map.has(d.parent_id)) {
        map.get(d.parent_id).children.push(map.get(d.department_id));
      } else {
        tree.push(map.get(d.department_id));
      }
    });
    return tree;
  }

  /**
   * Truy vấn danh sách Department ID mà user có thẩm quyền truy cập (Resource Scope) trong đúng Workspace.
   * Admin -> null (toàn quyền trong Workspace đó).
   */
  static async getAccessibleDepartmentIds(userId, userRole = null, workspaceId = null) {
    if (!userRole) {
      const rRes = workspaceId
        ? await con.query(
            `SELECT LOWER(r.role_name) as role_name
             FROM workspace_members wm
             JOIN roles r ON wm.role_id = r.role_id
             WHERE wm.user_id = $1 AND wm.workspace_id = $2 AND wm.deleted_at IS NULL
             LIMIT 1`,
            [userId, Number(workspaceId)]
          )
        : await con.query(
            `SELECT LOWER(r.role_name) as role_name
             FROM workspace_members wm
             JOIN roles r ON wm.role_id = r.role_id
             WHERE wm.user_id = $1 AND wm.deleted_at IS NULL
             ORDER BY wm.workspace_id ASC LIMIT 1`,
            [userId]
          );
      userRole = rRes.rows[0]?.role_name || 'member';
    }

    if (userRole === 'admin') {
      return null; // Admin has universal scope within the authorized workspace
    }

    const wsFilter = workspaceId ? `AND workspace_id = $2` : '';
    const childWsFilter = workspaceId ? `AND d.workspace_id = $2` : '';
    const params = workspaceId ? [userId, Number(workspaceId)] : [userId];

    const query = `
      WITH RECURSIVE sub_departments AS (
        SELECT department_id, parent_id, manager_id
        FROM departments
        WHERE (manager_id = $1 OR department_id = (SELECT department_id FROM users WHERE user_id = $1))
          ${wsFilter}
        
        UNION ALL
        
        SELECT d.department_id, d.parent_id, d.manager_id
        FROM departments d
        JOIN sub_departments sd ON d.parent_id = sd.department_id
        WHERE 1=1 ${childWsFilter}
      )
      SELECT DISTINCT department_id FROM sub_departments;
    `;

    const res = await con.query(query, params);
    return res.rows.map((r) => r.department_id);
  }

  /**
   * Truy vấn danh sách Department ID mà user có quyền QUẢN LÝ (Management Scope) trong đúng Workspace.
   */
  static async getManagedDepartmentIds(userId, userRole = null, workspaceId = null) {
    if (!userRole) {
      const rRes = workspaceId
        ? await con.query(
            `SELECT LOWER(r.role_name) as role_name
             FROM workspace_members wm
             JOIN roles r ON wm.role_id = r.role_id
             WHERE wm.user_id = $1 AND wm.workspace_id = $2 AND wm.deleted_at IS NULL
             LIMIT 1`,
            [userId, Number(workspaceId)]
          )
        : await con.query(
            `SELECT LOWER(r.role_name) as role_name
             FROM workspace_members wm
             JOIN roles r ON wm.role_id = r.role_id
             WHERE wm.user_id = $1 AND wm.deleted_at IS NULL
             ORDER BY wm.workspace_id ASC LIMIT 1`,
            [userId]
          );
      userRole = rRes.rows[0]?.role_name || 'member';
    }

    if (userRole === 'admin') {
      return null;
    }

    const wsFilter = workspaceId ? `AND workspace_id = $2` : '';
    const childWsFilter = workspaceId ? `AND d.workspace_id = $2` : '';
    const params = workspaceId ? [userId, Number(workspaceId)] : [userId];

    const query = `
      WITH RECURSIVE managed_hierarchy AS (
        SELECT department_id, parent_id, manager_id
        FROM departments
        WHERE manager_id = $1 ${wsFilter}
        
        UNION ALL
        
        SELECT d.department_id, d.parent_id, d.manager_id
        FROM departments d
        JOIN managed_hierarchy mh ON d.parent_id = mh.department_id
        WHERE 1=1 ${childWsFilter}
      )
      SELECT DISTINCT department_id FROM managed_hierarchy;
    `;

    const res = await con.query(query, params);
    const ids = res.rows.map((r) => r.department_id);

    if (userRole === 'manager' && ids.length === 0 && workspaceId) {
      const allDepts = await con.query(`SELECT department_id FROM departments WHERE workspace_id = $1`, [Number(workspaceId)]);
      return allDepts.rows.map((r) => r.department_id);
    }

    return ids;
  }

  /**
   * Kiểm tra xem user có phải là cấp quản lý của một phòng ban cụ thể không
   */
  static async isManagerOfDepartment(userId, targetDepartmentId, workspaceId = null) {
    if (!targetDepartmentId) return false;
    const managedIds = await this.getManagedDepartmentIds(userId, null, workspaceId);
    if (managedIds === null) return true;
    return managedIds.includes(parseInt(targetDepartmentId, 10));
  }

  /**
   * Kiểm tra xem một department cụ thể có nằm trong phạm vi tài nguyên của user không
   */
  static async isDepartmentInScope(userId, targetDepartmentId, userRole = null, workspaceId = null) {
    if (!targetDepartmentId) return true;
    const accessibleIds = await this.getAccessibleDepartmentIds(userId, userRole, workspaceId);
    if (accessibleIds === null) return true;
    return accessibleIds.includes(parseInt(targetDepartmentId, 10));
  }
}

export default Department;

