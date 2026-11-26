import React from 'react';
import { Navigate } from 'react-router-dom';
import { Button, Spin } from 'antd';
import { ExternalLink, LogOut, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useCmsAuth } from '@/context/CmsAuthContext';

interface CmsGuardProps {
    children: React.ReactNode;
    requireAdmin?: boolean;
}

const WORKSPACE_URL = import.meta.env.VITE_WORKSPACE_URL || 'http://localhost:5173';

export const CmsGuard: React.FC<CmsGuardProps> = ({ children, requireAdmin = false }) => {
    const { isAuthenticated, isLoading, canAccessCms, isAdmin, currentRole, context, logout } = useCmsAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
                <Spin size="large" description="Đang xác thực quyền quản trị CMS..." />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!canAccessCms) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
                <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                        <ShieldAlert size={28} />
                    </div>
                    <h1 className="m-0 text-xl font-extrabold text-slate-900">
                        403 — Không có quyền truy cập CMS Quản trị
                    </h1>
                    <p className="mt-2.5 text-sm text-slate-600">
                        Tài khoản <span className="font-semibold text-slate-800">{context?.user?.email}</span> đang giữ vai trò{' '}
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono-code text-xs font-bold uppercase text-slate-700">
                            {currentRole}
                        </span>
                        . Cổng CMS chỉ dành cho Quản trị viên (<span className="font-semibold">admin</span>) hoặc Trưởng bộ phận (<span className="font-semibold">manager</span>).
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <a
                            href={WORKSPACE_URL}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#0058be] px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-[#00469b]"
                        >
                            <span>Về Không gian làm việc (:5173)</span>
                            <ExternalLink size={14} />
                        </a>
                        <Button icon={<LogOut size={14} />} onClick={logout}>
                            Đăng xuất
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (requireAdmin && !isAdmin) {
        return (
            <div className="mx-auto my-12 max-w-xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-xs">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <ShieldCheck size={24} />
                </div>
                <h2 className="m-0 text-lg font-extrabold text-slate-900">
                    Phân hệ chỉ dành cho Quản trị viên (Admin)
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                    Vai trò hiện tại của bạn là <span className="font-semibold uppercase">{currentRole}</span>. Bạn có thể xem báo cáo điều hành, lịch sử kiểm tra và nhật ký, nhưng không thể chỉnh sửa cấu hình lõi hoặc phân quyền thành viên.
                </p>
            </div>
        );
    }

    return <>{children}</>;
};
