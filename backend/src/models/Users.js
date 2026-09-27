import con from "../config/connect.js";
export const getProfile = async (user_id) => {
    try {
        const query = 'SELECT user_id, username, name, email, avatar_url, sdt FROM users WHERE user_id = $1 AND deleted_at IS NULL';
        const values = [user_id];
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
}

export const updateProfile = async (user_id, updateData) => {
    try {
        const { name, avatar_url, sdt } = updateData;

        let query = 'UPDATE users SET ';
        const values = [user_id];
        const updates = ['updated_at = CURRENT_TIMESTAMP'];
        let count = 2;

        if (name !== undefined) {
            updates.push(`name = $${count++}`);
            values.push(name);
        }
        if (avatar_url !== undefined) {
            updates.push(`avatar_url = $${count++}`);
            values.push(avatar_url);
        }
        if (sdt !== undefined) {
            updates.push(`sdt = $${count++}`);
            values.push(sdt);
        }

        if (updates.length === 1) return;

        query += updates.join(', ') + ' WHERE user_id = $1 AND deleted_at IS NULL';
        await con.query(query, values);
    } catch (error) {
        throw error;
    }
}


export const findUserByUsername = async (username) => {
    const query = 'SELECT * FROM users WHERE username = $1 AND deleted_at IS NULL';
    const values = [username];
    try {
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
}

export const findUserByEmail = async (email) => {
    const query = 'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL';
    const values = [email];
    try {
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
}
export const findUserById = async (user_id) => {
    const query = 'SELECT * FROM users WHERE user_id = $1 AND deleted_at IS NULL';
    const values = [user_id];
    try {
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
}

export const createUser = async (username, hashedPassword, email, name = null, avatarUrl = null, sdt = null) => {
    const query = 'INSERT INTO users (username, name, email, password_hash, avatar_url, sdt) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
    const values = [username, name, email, hashedPassword, avatarUrl, sdt];
    try {
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
}

export const getPasswordHash = async (user_id) => {
    const query = 'SELECT password_hash FROM users WHERE user_id = $1 AND deleted_at IS NULL';
    const values = [user_id];
    try {
        const result = await con.query(query, values);
        return result.rows[0]?.password_hash || null;
    } catch (error) {
        throw error;
    }
}

export const updatePassword = async (user_id, newPasswordHash) => {
    const query = 'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND deleted_at IS NULL';
    const values = [newPasswordHash, user_id];
    try {
        await con.query(query, values);
    } catch (error) {
        throw error;
    }
}