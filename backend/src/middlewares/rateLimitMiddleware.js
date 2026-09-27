import rateLimit from 'express-rate-limit';

// ================================================================
// RATE LIMITING MIDDLEWARE
// Giới hạn số lượng request để chống brute-force & abuse.
// ================================================================

/**
 * Giới hạn login: 5 lần / 15 phút (per IP)
 * Chống brute-force password.
 */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 phút
    max: 10,                     // tối đa 10 request
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'fail',
        errorCode: 'TOO_MANY_REQUESTS',
        message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.',
    },
});

/**
 * Giới hạn signup: 5 lần / 1 giờ (per IP)
 * Chống đăng ký hàng loạt.
 */
export const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,   // 1 giờ
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'fail',
        errorCode: 'TOO_MANY_REQUESTS',
        message: 'Quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau.',
    },
});

/**
 * Giới hạn OTP: 3 lần request OTP / 15 phút (per IP)
 * Chống lạm dụng gửi email.
 */
export const otpRequestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'fail',
        errorCode: 'TOO_MANY_REQUESTS',
        message: 'Đã gửi quá nhiều mã OTP. Vui lòng thử lại sau 15 phút.',
    },
});

/**
 * Giới hạn verify OTP: 5 lần / 15 phút (per IP)
 * Chống brute-force OTP 6 chữ số.
 */
export const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'fail',
        errorCode: 'TOO_MANY_REQUESTS',
        message: 'Quá nhiều lần nhập OTP sai. Vui lòng yêu cầu mã mới.',
    },
});

/**
 * Giới hạn AI chat: 30 lần / phút (per IP)
 * Chống lạm dụng API AI (chi phí cao).
 */
export const aiChatLimiter = rateLimit({
    windowMs: 60 * 1000,        // 1 phút
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'fail',
        errorCode: 'TOO_MANY_REQUESTS',
        message: 'Quá nhiều yêu cầu AI. Vui lòng đợi một lúc.',
    },
});

/**
 * Giới hạn invite member: 10 lần / 15 phút (per IP)
 * Chống email bombing.
 */
export const inviteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'fail',
        errorCode: 'TOO_MANY_REQUESTS',
        message: 'Quá nhiều lời mời. Vui lòng thử lại sau.',
    },
});

/**
 * Giới hạn chung cho tất cả API: 200 request / phút (per IP)
 * Chống DoS cơ bản.
 */
export const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'fail',
        errorCode: 'TOO_MANY_REQUESTS',
        message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
    },
});
