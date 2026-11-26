interface ApiErrorShape {
    response?: {
        data?: {
            message?: string;
            error?: string;
        };
    };
    message?: string;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === 'object') {
        const e = err as ApiErrorShape;
        return e.response?.data?.message || e.response?.data?.error || e.message || fallback;
    }
    return fallback;
}
