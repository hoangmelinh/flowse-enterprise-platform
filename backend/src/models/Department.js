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
}

export default Department;
