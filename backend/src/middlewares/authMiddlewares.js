import jwt from 'jsonwebtoken';
import { findUserById } from '../models/Users.js';
// xác minh user
export const protectedRoute = async (req, res, next) => {
    try {
        // lấy access token từ header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>
        if (!token) {
            return res.status(401).json({ message: 'Khong tim thay token' });
        }
        // xác nhận token (synchronous - throws on failure)
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        } catch (err) {
            console.error('Loi xac thuc token:', err.message);
            return res.status(401).json({ message: 'Access Token khong hop le' });
        }
        // tìm user 
        const user = await findUserById(decoded.user_id);
        if (!user) {
            return res.status(404).json({ message: 'Nguoi dung khong ton tai' });
        }
        // trả user về trong req
        req.user = user;
        next();
    } catch (error) {
        return res.status(500).json({ message: 'Loi server khi xac thuc', error: error.message });
    }
}
