// ================================================================
// FLOWISE — Centralized Error Handling Middleware
// ================================================================

/**
 * Lớp lỗi có cấu trúc để throw từ bất kỳ controller hay model nào.
 *
 * @example
 *   throw new AppError('Không tìm thấy task', 404, 'TASK_NOT_FOUND');
 */
export class AppError extends Error {
    constructor(
        message,
        statusCode = 500,
        errorCode = 'INTERNAL_ERROR',
        details = null,
    ) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details; // Thông tin bổ sung (VD: field nào bị lỗi)
        Error.captureStackTrace(this, this.constructor);
    }
}

// ─────────────────────────────────────────────────────────────
// Các lỗi chuẩn hóa sẵn — dùng thay vì tạo AppError thủ công
// ─────────────────────────────────────────────────────────────

/** 400 — Dữ liệu đầu vào không hợp lệ */
export const BadRequestError = (message = 'Dữ liệu không hợp lệ', details = null) =>
    new AppError(message, 400, 'BAD_REQUEST', details);

/** 401 — Chưa xác thực */
export const UnauthorizedError = (message = 'Bạn chưa đăng nhập hoặc phiên đã hết hạn') =>
    new AppError(message, 401, 'UNAUTHORIZED');

/** 403 — Không có quyền */
export const ForbiddenError = (message = 'Bạn không có quyền thực hiện hành động này') =>
    new AppError(message, 403, 'FORBIDDEN');

/** 404 — Không tìm thấy */
export const NotFoundError = (resource = 'Tài nguyên') =>
    new AppError(`${resource} không tồn tại hoặc đã bị xóa`, 404, 'NOT_FOUND');

/** 409 — Xung đột dữ liệu (trùng lặp) */
export const ConflictError = (message = 'Dữ liệu đã tồn tại, không thể tạo trùng') =>
    new AppError(message, 409, 'CONFLICT');

/** 422 — Dữ liệu hợp lệ về cú pháp nhưng không thể xử lý */
export const UnprocessableError = (message = 'Không thể xử lý dữ liệu này', details = null) =>
    new AppError(message, 422, 'UNPROCESSABLE', details);

/** 429 — Quá nhiều request */
export const TooManyRequestsError = (message = 'Quá nhiều yêu cầu. Vui lòng thử lại sau') =>
    new AppError(message, 429, 'TOO_MANY_REQUESTS');

/** 500 — Lỗi server nội bộ */
export const InternalError = (message = 'Lỗi máy chủ nội bộ') =>
    new AppError(message, 500, 'INTERNAL_ERROR');

// ─────────────────────────────────────────────────────────────
// Global Error Handler Middleware (dùng cuối cùng trong server.js)
// ─────────────────────────────────────────────────────────────

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Middleware bắt lỗi toàn cục.
 * Phải có 4 tham số để Express nhận diện là error handler.
 */
export const globalErrorHandler = (err, req, res, _next) => {
    // ── Xác định status code ──────────────────────────────────
    const statusCode = err.statusCode || err.status || 500;
    const errorCode = err.errorCode || 'INTERNAL_ERROR';

    // ── Log chi tiết ở server (không trả về client) ───────────
    if (statusCode >= 500) {
        console.error(`[ERROR ${statusCode}] ${req.method} ${req.originalUrl}`, {
            errorCode,
            message: err.message,
            userId: req.user?.user_id ?? 'unauthenticated',
            stack: err.stack,
        });
    } else {
        console.warn(`[WARN ${statusCode}] ${req.method} ${req.originalUrl}`, {
            errorCode,
            message: err.message,
            userId: req.user?.user_id ?? 'unauthenticated',
        });
    }

    // ── Xử lý lỗi đặc biệt từ PostgreSQL ────────────────────
    if (err.code) {
        const pgError = handlePostgresError(err);
        if (pgError) {
            return res.status(pgError.statusCode).json({
                status: 'error',
                errorCode: pgError.errorCode,
                message: pgError.message,
            });
        }
    }

    // ── Xử lý lỗi JWT ────────────────────────────────────────
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'error',
            errorCode: 'INVALID_TOKEN',
            message: 'Token không hợp lệ hoặc đã hết hạn',
        });
    }

    // ── Xử lý lỗi Multer (upload file) ───────────────────────
    if (err.name === 'MulterError') {
        return res.status(400).json({
            status: 'error',
            errorCode: 'UPLOAD_ERROR',
            message: err.code === 'LIMIT_FILE_SIZE'
                ? 'File quá lớn. Kích thước tối đa cho phép là 10MB'
                : `Lỗi upload file: ${err.message}`,
        });
    }

    // ── Payload response chuẩn ───────────────────────────────
    const responsePayload = {
        status: statusCode < 500 ? 'fail' : 'error',
        errorCode,
        message: err.message || 'Đã có lỗi xảy ra',
    };

    // Chỉ trả về details và stack khi ở môi trường development
    if (!IS_PRODUCTION) {
        if (err.details) responsePayload.details = err.details;
        if (statusCode >= 500) responsePayload.stack = err.stack;
    } else {
        // Production: ẩn message lỗi 500 để tránh lộ thông tin nội bộ
        if (statusCode >= 500) {
            responsePayload.message = 'Đã có lỗi xảy ra phía máy chủ. Vui lòng thử lại sau.';
        }
        if (err.details) responsePayload.details = err.details;
    }

    return res.status(statusCode).json(responsePayload);
};

// ─────────────────────────────────────────────────────────────
// Xử lý lỗi PostgreSQL
// ─────────────────────────────────────────────────────────────

/**
 * Map PostgreSQL error codes sang AppError tương ứng.
 * Tham khảo: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
function handlePostgresError(err) {
    switch (err.code) {
        case '23505': // unique_violation
            return new AppError(
                'Dữ liệu đã tồn tại, không thể tạo trùng lặp',
                409,
                'DUPLICATE_ENTRY',
                { constraint: err.constraint },
            );
        case '23503': // foreign_key_violation
            return new AppError(
                'Không thể thực hiện vì dữ liệu liên quan vẫn còn tồn tại',
                409,
                'FOREIGN_KEY_VIOLATION',
                { constraint: err.constraint },
            );
        case '23502': // not_null_violation
            return new AppError(
                `Trường "${err.column}" là bắt buộc, không được để trống`,
                400,
                'NOT_NULL_VIOLATION',
                { column: err.column },
            );
        case '22P02': // invalid_text_representation (VD: truyền text vào trường integer)
            return new AppError(
                'Kiểu dữ liệu không hợp lệ',
                400,
                'INVALID_TYPE',
            );
        case '08006': // connection_failure
        case '08001': // unable_to_connect
            return new AppError(
                'Không thể kết nối cơ sở dữ liệu',
                503,
                'DB_CONNECTION_ERROR',
            );
        default:
            return null; // Để globalErrorHandler xử lý tiếp
    }
}

// ─────────────────────────────────────────────────────────────
// 404 Not Found Handler (đặt trước globalErrorHandler)
// ─────────────────────────────────────────────────────────────

export const notFoundHandler = (req, res, next) => {
    next(new AppError(`Không tìm thấy route: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
};
