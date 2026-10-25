export class AppError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NetworkError extends AppError {
  constructor(message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.', originalError?: unknown) {
    super(message, 'NETWORK_ERROR', 0, originalError);
    this.name = 'NetworkError';
  }
}

export class AuthError extends AppError {
  constructor(message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', statusCode = 401) {
    super(message, 'AUTH_ERROR', statusCode);
    this.name = 'AuthError';
  }
}

export class PermissionError extends AppError {
  constructor(message = 'Bạn không có quyền thực hiện hành động này.', statusCode = 403) {
    super(message, 'FORBIDDEN', statusCode);
    this.name = 'PermissionError';
  }
}

export class ConflictError extends AppError {
  constructor(
    message = 'Dữ liệu đã bị thay đổi bởi người khác. Vui lòng làm mới trang.',
    public baseVersion?: number,
    public serverVersion?: number
  ) {
    super(message, 'VERSION_CONFLICT', 409);
    this.name = 'ConflictError';
  }
}
