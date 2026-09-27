import con from "../config/connect.js";

export const createInvitations = async (workspace_id, email, token, invited_by, role) => {
    try {
        const query = `
            INSERT INTO workspace_invitations (workspace_id, email, token, invited_by, role_id) 
            VALUES ($1, $2, $3, $4, (SELECT role_id FROM roles WHERE LOWER(role_name) = LOWER($5) LIMIT 1)) 
            RETURNING *;
        `;
        const result = await con.query(query, [workspace_id, email, token, invited_by, role]);

        return result.rows[0];
    } catch (error) {
        console.error("Database Error in createInvitations:", error);
        throw error;
    }
};

export const checkExistingInvitation = async (workspace_id, email) => {
    try {
        const query = `SELECT * FROM workspace_invitations WHERE workspace_id = $1 AND email = $2 AND status = 'pending'`;
        const result = await con.query(query, [workspace_id, email]);
        return result.rows[0];
    } catch (error) {
        console.error("Database Error in checkExistingInvitation:", error);
        throw error;
    }
};

export const deleteInvitation = async (invitation_id) => {
    try {
        const query = `DELETE FROM workspace_invitations WHERE invitation_id = $1`;
        const result = await con.query(query, [invitation_id]);
        return result.rowCount > 0;
    } catch (error) {
        console.error("Database Error in deleteInvitation:", error);
        throw error;
    }
};

export const addMemberToWorkspace = async (workspace_id, user_id, role_id) => {
    try {
        const query = `
            INSERT INTO workspace_members (workspace_id, user_id, role_id) 
            VALUES ($1, $2, $3) 
            ON CONFLICT (workspace_id, user_id)
            DO UPDATE SET deleted_at = NULL, role_id = EXCLUDED.role_id
            RETURNING *;
        `;
        const result = await con.query(query, [workspace_id, user_id, role_id]);
        return result.rows[0];
    } catch (error) {
        console.error("Database Error in addMemberToWorkspace:", error);
        throw error;
    }
};

export const updateInvitationStatus = async (invitation_id, status) => {
    try {
        const query = `UPDATE workspace_invitations SET status = $1 WHERE invitation_id = $2`;
        const result = await con.query(query, [status, invitation_id]);
        return result.rowCount > 0;
    } catch (error) {
        console.error("Database Error in updateInvitationStatus:", error);
        throw error;
    }
};

export const respondToInvitation = async ({
    workspaceId,
    email,
    token,
    userId,
    action,
}) => {
    const client = await con.connect();
    try {
        await client.query("BEGIN");
        const invitationResult = await client.query(
            `SELECT *
             FROM workspace_invitations
             WHERE workspace_id = $1
               AND LOWER(email) = LOWER($2)
               AND token = $3
               AND status = 'pending'
             FOR UPDATE`,
            [workspaceId, email, token],
        );
        const invitation = invitationResult.rows[0];

        if (!invitation) {
            await client.query("ROLLBACK");
            return null;
        }

        if (action === "accept") {
            await client.query(
                `INSERT INTO workspace_members (workspace_id, user_id, role_id)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (workspace_id, user_id)
                 DO UPDATE SET deleted_at = NULL, role_id = EXCLUDED.role_id`,
                [workspaceId, userId, invitation.role_id],
            );
        }

        await client.query(
            "UPDATE workspace_invitations SET status = $1 WHERE invitation_id = $2",
            [action === "accept" ? "accepted" : "rejected", invitation.invitation_id],
        );
        await client.query("COMMIT");
        return invitation;
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Database Error in respondToInvitation:", error);
        throw error;
    } finally {
        client.release();
    }
};
