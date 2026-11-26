import con from "../config/connect.js";

export const findAllWorkspacesByUserId = async (user_id) => {
    try {
        const query = `SELECT w.*, LOWER(r.role_name) AS role_name FROM workspaces w
        JOIN workspace_members wm ON w.workspace_id = wm.workspace_id
        LEFT JOIN roles r ON r.role_id = wm.role_id
                WHERE wm.user_id = $1
                    AND w.deleted_at IS NULL
                    AND wm.deleted_at IS NULL
                ORDER BY w.workspace_id`;
        const values = [user_id];
        const result = await con.query(query, values);
        return result.rows;
    } catch (error) {
        throw error;
    }
}

export const createWorkspace = async (name, description, slug, owner_id) => {
    const client = await con.connect();

    try {
        await client.query('BEGIN');

        const query = `INSERT INTO workspaces (name, description, slug, created_by) VALUES ($1, $2, $3, $4) RETURNING *`;
        const values = [name, description, slug, owner_id];
        const result = await client.query(query, values);
        const newWorkspace = result.rows[0];

        const insertMemberQuery = `
            INSERT INTO workspace_members (workspace_id, user_id, role_id) 
            VALUES ($1, $2, (SELECT role_id FROM roles WHERE LOWER(role_name) = 'admin' LIMIT 1))
            ON CONFLICT (workspace_id, user_id)
            DO UPDATE SET role_id = EXCLUDED.role_id, deleted_at = NULL
        `;
        const memberValues = [newWorkspace.workspace_id, owner_id];
        await client.query(insertMemberQuery, memberValues);

        await client.query('COMMIT');

        return newWorkspace;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export const findWorkspaceById = async (workspace_id) => {
    try {
        const query = `SELECT * FROM workspaces WHERE workspace_id = $1 AND deleted_at IS NULL`;
        const values = [workspace_id];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
}

export const updateWorkspace = async (workspace_id, name, description) => {
    try {
        const query = `UPDATE workspaces SET name = $1, description = $2 WHERE workspace_id = $3 AND deleted_at IS NULL RETURNING *`;
        const values = [name, description, workspace_id];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
}

export const deleteWorkspace = async (workspace_id, owner_id) => {
    try {
        const query = `UPDATE workspaces SET deleted_at = CURRENT_TIMESTAMP WHERE workspace_id = $1 AND created_by = $2 AND deleted_at IS NULL RETURNING *`;
        const values = [workspace_id, owner_id];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
}

export const findWorkspaceMembers = async (workspace_id) => {
    try {
        const query = `
            SELECT 
                u.user_id, 
                u.username, 
                u.name, 
                u.email, 
                u.avatar_url,
                u.department_id,
                d.name AS department_name,
                u.employee_code,
                u.is_active,
                wm.joined_at,
                LOWER(r.role_name) AS role_name,
                r.role_id
            FROM users u
            JOIN workspace_members wm ON u.user_id = wm.user_id
            LEFT JOIN roles r ON wm.role_id = r.role_id
            LEFT JOIN departments d ON u.department_id = d.department_id
                        WHERE wm.workspace_id = $1
                            AND wm.deleted_at IS NULL
                            AND u.deleted_at IS NULL
            ORDER BY r.role_id ASC, u.name ASC NULLS LAST, u.user_id ASC
        `;
        const values = [workspace_id];
        const result = await con.query(query, values);
        return result.rows;
    } catch (error) {
        throw error;
    }
}

export const getRolePermissionMatrix = async () => {
    const rolesRes = await con.query(`SELECT role_id, LOWER(role_name) AS role_name FROM roles ORDER BY role_id ASC`);
    const permsRes = await con.query(`SELECT permission_id, permission_name, description, group_name FROM permissions ORDER BY group_name, permission_id`);
    const mapRes = await con.query(`SELECT role_id, permission_id FROM role_permissions`);
    return {
        roles: rolesRes.rows,
        permissions: permsRes.rows,
        mappings: mapRes.rows,
    };
};

export const updateWorkspaceMemberProfile = async (workspace_id, user_id, { role_name, department_id, is_active }) => {
    const client = await con.connect();
    try {
        await client.query('BEGIN');
        const memCheck = await client.query(
            `SELECT wm.role_id, LOWER(r.role_name) AS current_role
             FROM workspace_members wm
             LEFT JOIN roles r ON wm.role_id = r.role_id
             WHERE wm.workspace_id = $1 AND wm.user_id = $2 AND wm.deleted_at IS NULL`,
            [workspace_id, user_id]
        );
        if (memCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return null;
        }

        if (role_name) {
            const roleRes = await client.query(`SELECT role_id FROM roles WHERE LOWER(role_name) = LOWER($1) LIMIT 1`, [role_name]);
            if (roleRes.rows.length === 0) {
                throw new Error(`Vai trò không hợp lệ: ${role_name}`);
            }
            await client.query(
                `UPDATE workspace_members SET role_id = $1 WHERE workspace_id = $2 AND user_id = $3 AND deleted_at IS NULL`,
                [roleRes.rows[0].role_id, workspace_id, user_id]
            );
        }

        if (department_id !== undefined) {
            if (department_id !== null) {
                const deptCheck = await client.query(`SELECT workspace_id FROM departments WHERE department_id = $1`, [department_id]);
                if (deptCheck.rows.length === 0 || (deptCheck.rows[0].workspace_id && Number(deptCheck.rows[0].workspace_id) !== Number(workspace_id))) {
                    throw new Error('Phòng ban không thuộc nơi làm việc này');
                }
            }
            await client.query(`UPDATE users SET department_id = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`, [department_id, user_id]);
        }

        if (typeof is_active === 'boolean') {
            if (is_active === false) {
                const otherWsRes = await client.query(
                    `SELECT COUNT(*)::int AS n
                     FROM workspace_members wm
                     JOIN workspaces w ON w.workspace_id = wm.workspace_id
                     WHERE wm.user_id = $1 AND wm.workspace_id <> $2 AND wm.deleted_at IS NULL AND w.deleted_at IS NULL`,
                    [user_id, workspace_id]
                );
                if (otherWsRes.rows[0]?.n > 0) {
                    const err = new Error('Tài khoản này đang tham gia Workspace khác; hãy dùng thao tác Gỡ khỏi Workspace thay vì khóa tài khoản toàn hệ thống.');
                    err.statusCode = 409;
                    throw err;
                }
            }
            await client.query(`UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`, [is_active, user_id]);
        }

        await client.query('COMMIT');
        const updated = await findWorkspaceMembers(workspace_id);
        return updated.find((m) => Number(m.user_id) === Number(user_id)) || null;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const findWorkspaceInvitations = async (workspace_id) => {
    try {
        const query = `SELECT wi.*, u.username as invited_by_username, u.name as invited_by_name
                       FROM workspace_invitations wi 
                       LEFT JOIN users u ON wi.invited_by = u.user_id AND u.deleted_at IS NULL
                       WHERE wi.workspace_id = $1 
                       ORDER BY wi.created_at DESC`;
        const values = [workspace_id];
        const result = await con.query(query, values);
        return result.rows;
    } catch (error) {
        throw error;
    }
};

export const createWorkspaceInvitation = async (workspace_id, email, role_id, invited_by) => {
    try {
        const query = `INSERT INTO workspace_invitations (workspace_id, email, role_id, invited_by) 
                       VALUES ($1, $2, $3, $4) RETURNING *`;
        const values = [workspace_id, email, role_id, invited_by];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

export const findInvitationByToken = async (token) => {
    try {
        const query = `SELECT * FROM workspace_invitations WHERE token = $1`;
        const values = [token];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

export const acceptWorkspaceInvitation = async (invitation_id) => {
    const client = await con.connect();
    try {
        await client.query('BEGIN');

        const updateQuery = `UPDATE workspace_invitations 
                            SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP 
                            WHERE invitation_id = $1 AND status = 'pending' 
                            RETURNING *`;
        const invitation = await client.query(updateQuery, [invitation_id]);

        if (invitation.rows.length === 0) return null;

        const inv = invitation.rows[0];

        // Find user by email and add to workspace
        const userQuery = `SELECT user_id FROM users WHERE email = $1 AND deleted_at IS NULL`;
        const userResult = await client.query(userQuery, [inv.email]);

        if (userResult.rows.length > 0) {
            const insertMemberQuery = `INSERT INTO workspace_members (workspace_id, user_id, role_id) 
                                      VALUES ($1, $2, $3)
                                      ON CONFLICT (workspace_id, user_id)
                                      DO UPDATE SET role_id = EXCLUDED.role_id, deleted_at = NULL`;
            await client.query(insertMemberQuery, [inv.workspace_id, userResult.rows[0].user_id, inv.role_id]);
        }

        await client.query('COMMIT');
        return invitation.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const rejectWorkspaceInvitation = async (invitation_id) => {
    try {
        const query = `UPDATE workspace_invitations SET status = 'rejected' 
                       WHERE invitation_id = $1 AND status = 'pending' RETURNING *`;
        const values = [invitation_id];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

export const addWorkspaceMember = async (workspace_id, user_id, role_id) => {
    try {
        const query = `INSERT INTO workspace_members (workspace_id, user_id, role_id) 
                       VALUES ($1, $2, $3)
                       ON CONFLICT (workspace_id, user_id)
                       DO UPDATE SET role_id = EXCLUDED.role_id, deleted_at = NULL
                       RETURNING *`;
        const values = [workspace_id, user_id, role_id];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

export const removeWorkspaceMember = async (workspace_id, user_id) => {
    try {
        const query = `UPDATE workspace_members SET deleted_at = CURRENT_TIMESTAMP WHERE workspace_id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING *`;
        const values = [workspace_id, user_id];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

export const updateMemberRole = async (workspace_id, user_id, role_id) => {
    try {
        const query = `UPDATE workspace_members SET role_id = $1 
                       WHERE workspace_id = $2 AND user_id = $3 AND deleted_at IS NULL RETURNING *`;
        const values = [role_id, workspace_id, user_id];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
};

