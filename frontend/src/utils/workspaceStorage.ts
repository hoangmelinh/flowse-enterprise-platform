export function readStoredWorkspaceId(): number | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('currentWorkspaceId');
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

export function persistCurrentWorkspaceId(id: number | null) {
    if (id == null) localStorage.removeItem('currentWorkspaceId');
    else localStorage.setItem('currentWorkspaceId', String(id));
}
