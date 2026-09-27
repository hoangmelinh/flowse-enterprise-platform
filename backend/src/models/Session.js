import con from "../config/connect.js";
import crypto from "crypto";

const SESSION_TTL_SQL = "14 days";

const hashRefreshToken = (refreshToken) =>
    crypto.createHash("sha256").update(refreshToken).digest("hex");

export const createSession = async (user_id, refresh_token) => {
    const query = `INSERT INTO user_sessions (user_id, refresh_token, expires_at)
                   VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '${SESSION_TTL_SQL}')
                   RETURNING *`;
    const values = [user_id, hashRefreshToken(refresh_token)];
    try {
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
}
export const deleteSessionByRefreshToken = async (refresh_token) => {
    const query = 'DELETE FROM user_sessions WHERE refresh_token = $1';
    const values = [hashRefreshToken(refresh_token)];
    try {
        await con.query(query, values);
    } catch (error) {
        throw error;
    }
}

export const findSessionByRefreshToken = async (refresh_token) => {
    const query = 'SELECT * FROM user_sessions WHERE refresh_token = $1';
    const values = [hashRefreshToken(refresh_token)];
    try {
        const result = await con.query(query, values);
        return result.rows[0];
    } catch (error) {
        throw error;
    }
}
