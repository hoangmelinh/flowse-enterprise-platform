import con from "../config/connect.js";

class Department {
  static async getAll() {
    const res = await con.query(`
      SELECT 
        d.*,
        u.name AS manager_name,
        u.email AS manager_email,
        (SELECT COUNT(*) FROM users WHERE department_id = d.department_id) AS member_count
      FROM departments d
      LEFT JOIN users u ON d.manager_id = u.user_id
      ORDER BY d.department_id ASC
    `);
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

  static async create({ name, code, manager_id = null, parent_id = null }) {
    const res = await con.query(
      `INSERT INTO departments (name, code, manager_id, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, code, manager_id, parent_id]
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
  static async getHierarchyTree() {
    const all = await this.getAll();
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
   * Truy vấn danh sách Department ID mà user có thẩm quyền truy cập (Resource Scope)
   * Sử dụng Recursive CTE: Nếu là Manager của phân xưởng X -> có quyền trên X và toàn bộ dây chuyền/tổ con
   * Nếu là Admin -> trả về null (toàn quyền)
   */
  static async getAccessibleDepartmentIds(userId, userRole = null) {
    if (!userRole) {
      const rRes = await con.query(
        `SELECT LOWER(r.role_name) as role_name 
         FROM workspace_members wm 
         JOIN roles r ON wm.role_id = r.role_id 
         WHERE wm.user_id = $1 AND wm.deleted_at IS NULL 
         LIMIT 1`,
        [userId]
      );
      userRole = rRes.rows[0]?.role_name || 'member';
    }

    if (userRole === 'admin') {
      return null; // Admin has universal scope
    }

    const query = `
      WITH RECURSIVE sub_departments AS (
        -- Gốc: Các phòng ban mà user là Manager HOẶC là thành viên trực tiếp
        SELECT department_id, parent_id, manager_id
        FROM departments
        WHERE manager_id = $1
           OR department_id = (SELECT department_id FROM users WHERE user_id = $1)
        
        UNION ALL
        
        -- Nhánh con: Các phòng ban/dây chuyền thuộc cấp dưới
        SELECT d.department_id, d.parent_id, d.manager_id
        FROM departments d
        JOIN sub_departments sd ON d.parent_id = sd.department_id
      )
      SELECT DISTINCT department_id FROM sub_departments;
    `;

    const res = await con.query(query, [userId]);
    return res.rows.map((r) => r.department_id);
  }

  /**
   * Truy vấn danh sách Department ID mà user có quyền QUẢN LÝ (Management Scope)
   * Admin -> null (Toàn quyền quản lý)
   * Manager -> Phân xưởng mình quản lý và toàn bộ các dây chuyền/tổ/ca cấp dưới (Recursive CTE)
   * Member thông thường -> [] (Không quản lý phòng ban nào)
   */
  static async getManagedDepartmentIds(userId, userRole = null) {
    if (!userRole) {
      const rRes = await con.query(
        `SELECT LOWER(r.role_name) as role_name 
         FROM workspace_members wm 
         JOIN roles r ON wm.role_id = r.role_id 
         WHERE wm.user_id = $1 AND wm.deleted_at IS NULL 
         LIMIT 1`,
        [userId]
      );
      userRole = rRes.rows[0]?.role_name || 'member';
    }

    if (userRole === 'admin') {
      return null; // Admin has universal management scope
    }

    const query = `
      WITH RECURSIVE managed_hierarchy AS (
        -- Gốc: Phòng ban mà user trực tiếp làm Trưởng phòng / Quản đốc
        SELECT department_id, parent_id, manager_id
        FROM departments
        WHERE manager_id = $1
        
        UNION ALL
        
        -- Nhánh con: Toàn bộ dây chuyền/tổ phụ thuộc cấp dưới
        SELECT d.department_id, d.parent_id, d.manager_id
        FROM departments d
        JOIN managed_hierarchy mh ON d.parent_id = mh.department_id
      )
      SELECT DISTINCT department_id FROM managed_hierarchy;
    `;

    const res = await con.query(query, [userId]);
    const ids = res.rows.map((r) => r.department_id);

    // Nếu là Workspace Manager, cho phép quản lý tất cả phòng ban nếu chưa gán cụ thể
    if (userRole === 'manager' && ids.length === 0) {
      const allDepts = await con.query(`SELECT department_id FROM departments`);
      return allDepts.rows.map((r) => r.department_id);
    }

    return ids;
  }

  /**
   * Kiểm tra xem user có phải là cấp quản lý của một phòng ban cụ thể không
   * (Tính cả trường hợp quản lý phòng ban cha/ông cố nội trong cây phân cấp)
   */
  static async isManagerOfDepartment(userId, targetDepartmentId) {
    if (!targetDepartmentId) return false;
    const managedIds = await this.getManagedDepartmentIds(userId);
    if (managedIds === null) return true; // Admin
    return managedIds.includes(parseInt(targetDepartmentId, 10));
  }

  /**
   * Kiểm tra xem một department cụ thể có nằm trong phạm vi tài nguyên của user không
   */
  static async isDepartmentInScope(userId, targetDepartmentId, userRole = null) {
    if (!targetDepartmentId) return true;
    const accessibleIds = await this.getAccessibleDepartmentIds(userId, userRole);
    if (accessibleIds === null) return true; // Admin
    return accessibleIds.includes(parseInt(targetDepartmentId, 10));
  }
}

export default Department;

