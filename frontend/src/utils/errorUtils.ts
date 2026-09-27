// ================================================================
// FLOWISE — Frontend Error Types & Utilities
// ================================================================

/**
 * Cấu trúc lỗi chuẩn được backend trả về sau khi tích hợp errorMiddleware.
 */
export interface ApiErrorPayload {
    status: 'fail' | 'error';
    errorCode: string;
    message: string;
    details?: Record<string, unknown>;
}

/**
 * Lớp lỗi FE dùng để phân biệt lỗi API với lỗi runtime thông thường.
 */
export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly errorCode: string;
    public readonly details?: Record<string, unknown>;

    constructor(payload: ApiErrorPayload, statusCode: number) {
        super(payload.message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.errorCode = payload.errorCode ?? 'UNKNOWN';
        this.details = payload.details;
    }
}

// ─────────────────────────────────────────────────────────────
// Map error code → thông báo tiếng Việt thân thiện với người dùng
// ─────────────────────────────────────────────────────────────

const ERROR_CODE_MESSAGES: Record<string, string> = {
    // Auth
    UNAUTHORIZED:         'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    INVALID_TOKEN:        'Phiên không hợp lệ. Vui lòng đăng nhập lại.',
    FORBIDDEN:            'Bạn không có quyền thực hiện thao tác này.',

    // Resource
    NOT_FOUND:            'Không tìm thấy dữ liệu yêu cầu.',
    ROUTE_NOT_FOUND:      'API không tồn tại.',

    // Data conflicts
    DUPLICATE_ENTRY:      'Dữ liệu đã tồn tại. Vui lòng kiểm tra lại.',
    CONFLICT:             'Dữ liệu bị xung đột. Vui lòng thử lại.',
    FOREIGN_KEY_VIOLATION:'Không thể xóa vì dữ liệu đang được sử dụng ở nơi khác.',

    // Input
    BAD_REQUEST:          'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.',
    NOT_NULL_VIOLATION:   'Có trường bắt buộc bị bỏ trống.',
    UNPROCESSABLE:        'Không thể xử lý yêu cầu này.',
    INVALID_TYPE:         'Kiểu dữ liệu không đúng định dạng.',

    // Rate limit
    TOO_MANY_REQUESTS:    'Quá nhiều yêu cầu. Vui lòng đợi một lúc rồi thử lại.',

    // Upload
    UPLOAD_ERROR:         'Lỗi khi tải file lên. Vui lòng thử lại.',

    // Server
    INTERNAL_ERROR:       'Máy chủ gặp sự cố. Vui lòng thử lại sau.',
    DB_CONNECTION_ERROR:  'Không thể kết nối cơ sở dữ liệu. Vui lòng thử lại sau.',
};

/**
 * Lấy message thân thiện từ errorCode.
 * Fallback về message gốc từ server nếu không tìm thấy trong map.
 */
export function getFriendlyMessage(error: ApiError | Error): string {
    if (error instanceof ApiError) {
        return ERROR_CODE_MESSAGES[error.errorCode] ?? error.message;
    }
    // Network error (không có response)
    if (error.message === 'Network Error') {
        return 'Không có kết nối mạng. Vui lòng kiểm tra lại.';
    }
    if (error.message.includes('timeout')) {
        return 'Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.';
    }
    return error.message || 'Đã có lỗi không xác định xảy ra.';
}

/**
 * Trích xuất message lỗi từ kết quả rejectWithValue trong Redux thunk.
 * Dùng trong component: `const msg = extractErrorMessage(errorUpdateTask);`
 */
export function extractErrorMessage(error: unknown, fallback = 'Đã có lỗi xảy ra'): string {
    if (typeof error === 'string') return error;
    if (error instanceof ApiError) return getFriendlyMessage(error);
    if (error instanceof Error) return error.message;
    return fallback;
}

/**
 * Kiểm tra xem lỗi có phải là một status cụ thể không.
 * @example isHttpError(error, 404) → true nếu là lỗi 404
 */
export function isHttpError(error: unknown, statusCode: number): boolean {
    return error instanceof ApiError && error.statusCode === statusCode;
}

/**
 * Kiểm tra xem lỗi có phải do mất kết nối không.
 */
export function isNetworkError(error: unknown): boolean {
    return error instanceof Error && error.message === 'Network Error';
}
