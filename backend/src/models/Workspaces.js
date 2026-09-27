import con from "../config/connect.js";

export const findAllWorkspacesByUserId = async (user_id) => {
    try {
        const query = `SELECT w.* FROM workspaces w
        JOIN workspace_members wm ON w.workspace_id = wm.workspace_id
                WHERE wm.user_id = $1
                    AND w.deleted_at IS NULL
                    AND wm.deleted_at IS NULL`;
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
                r.role_name
            FROM users u
            JOIN workspace_members wm ON u.user_id = wm.user_id
            LEFT JOIN roles r ON wm.role_id = r.role_id
                        WHERE wm.workspace_id = $1
                            AND wm.deleted_at IS NULL
                            AND u.deleted_at IS NULL
        `;
        const values = [workspace_id];
        const result = await con.query(query, values);
        return result.rows;
    } catch (error) {
        throw error;
    }
}

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

