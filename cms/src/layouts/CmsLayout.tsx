import { useMemo, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button, Select, Tooltip } from 'antd';
import {
    Activity,
    BarChart3,
    Building2,
    ChevronRight,
    ClipboardCheck,
    ExternalLink,
    GitBranch,
    LogOut,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    Settings,
    ShieldCheck,
    Users,
    Wrench,
    X,
} from 'lucide-react';
import { useCmsAuth } from '@/context/CmsAuthContext';
import { StatusBadge } from '@/components/ui';

const WORKSPACE_URL = import.meta.env.VITE_WORKSPACE_URL || 'http://localhost:5173';

interface NavItem {
    path: string;
    label: string;
    group: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
    { path: '/', group: 'Điều hành & Phân tích', label: 'Tổng quan Điều hành', icon: <BarChart3 size={16} aria-hidden="true" /> },
    { path: '/users-roles', group: 'Tổ chức & Quyền hạn', label: 'Nhân sự & Phân quyền', icon: <Users size={16} aria-hidden="true" /> },
    { path: '/departments', group: 'Tổ chức & Quyền hạn', label: 'Cơ cấu Phòng ban', icon: <Building2 size={16} aria-hidden="true" /> },
    { path: '/assets', group: 'Tài sản & Chất lượng', label: 'Thiết bị & Tem QR', icon: <Wrench size={16} aria-hidden="true" /> },
    { path: '/inspections', group: 'Tài sản & Chất lượng', label: 'Mẫu Kiểm tra & Lịch sử', icon: <ClipboardCheck size={16} aria-hidden="true" /> },
    { path: '/workflows-sla', group: 'Quy trình & Giám sát', label: 'Workflow & Chính sách SLA', icon: <GitBranch size={16} aria-hidden="true" /> },
    { path: '/audit-sync', group: 'Quy trình & Giám sát', label: 'Nhật ký & Đồng bộ Mobile', icon: <Activity size={16} aria-hidden="true" /> },
    { path: '/workspace-settings', group: 'Quy trình & Giám sát', label: 'Cài đặt Workspace', icon: <Settings size={16} aria-hidden="true" />, adminOnly: true },
];

export const CmsLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const {
        context,
        workspaces,
        currentWorkspaceId,
        currentRole,
        isAdmin,
        switchWorkspace,
        logout,
    } = useCmsAuth();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const visibleItems = useMemo(
        () => NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin),
        [isAdmin]
    );

    const groupedNav = useMemo(() => {
        const groups = new Map<string, NavItem[]>();
        for (const item of visibleItems) {
            if (!groups.has(item.group)) groups.set(item.group, []);
            groups.get(item.group)!.push(item);
        }
        return Array.from(groups.entries());
    }, [visibleItems]);

    const currentRouteItem = useMemo(
        () => NAV_ITEMS.find((i) => i.path === location.pathname) || NAV_ITEMS[0],
        [location.pathname]
    );

    const activeWorkspace = workspaces.find((w) => w.workspace_id === currentWorkspaceId);
    const workspaceHomeUrl = currentWorkspaceId
        ? `${WORKSPACE_URL}/home?workspaceId=${currentWorkspaceId}`
        : WORKSPACE_URL;

    const renderSidebarBody = (isCompact: boolean) => (
        <div className="flex h-full flex-col justify-between bg-[var(--surface-primary)]">
            <div className="overflow-y-auto">
                {/* Brand Header */}
                <div className={`flex h-13 items-center border-b border-[var(--border-subtle)] px-3.5 ${isCompact ? 'justify-center' : 'justify-between'}`}>
                    <Link to="/" className="flex items-center gap-2.5 no-underline">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-primary)] text-white">
                            <ShieldCheck size={17} aria-hidden="true" />
                        </div>
                        {!isCompact && (
                            <div className="min-w-0">
                                <div className="truncate text-sm font-bold tracking-tight text-[var(--text-primary)]">
                                    Flowse CMS
                                </div>
                                <div className="truncate text-[11px] font-medium text-[var(--text-muted)]">
                                    Quản trị Doanh nghiệp
                                </div>
                            </div>
                        )}
                    </Link>
                </div>

                {/* Navigation Groups */}
                <nav aria-label="Điều hướng CMS" className="flex flex-col gap-4 px-2.5 py-3.5">
                    {groupedNav.map(([groupLabel, items]) => (
                        <div key={groupLabel}>
                            {!isCompact && (
                                <div className="mb-1 px-2.5 text-[11px] font-semibold text-[var(--text-muted)]">
                                    {groupLabel}
                                </div>
                            )}
                            <div className="flex flex-col gap-0.5">
                                {items.map((item) => {
                                    const active = location.pathname === item.path;
                                    const linkEl = (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            onClick={() => setMobileMenuOpen(false)}
                                            aria-current={active ? 'page' : undefined}
                                            className={`flex items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-1.75 text-[13px] font-medium no-underline transition-colors ${
                                                isCompact ? 'justify-center' : ''
                                            } ${
                                                active
                                                    ? 'bg-[var(--brand-primary-soft)] font-semibold text-[var(--brand-primary)]'
                                                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'
                                            }`}
                                        >
                                            {item.icon}
                                            {!isCompact && <span className="truncate">{item.label}</span>}
                                        </Link>
                                    );
                                    return isCompact ? (
                                        <Tooltip key={item.path} title={item.label} placement="right">
                                            {linkEl}
                                        </Tooltip>
                                    ) : (
                                        linkEl
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>

            {/* Bottom Utility */}
            <div className="border-t border-[var(--border-subtle)] p-2.5">
                {!isCompact ? (
                    <a
                        href={workspaceHomeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-2.5 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-2.5 py-1.75 text-xs font-semibold text-[var(--text-primary)] no-underline transition-colors hover:border-[var(--brand-primary-border)] hover:bg-[var(--brand-primary-soft)] hover:text-[var(--brand-primary)]"
                    >
                        <span>Mở Workspace Tác nghiệp</span>
                        <ExternalLink size={13} aria-hidden="true" />
                    </a>
                ) : (
                    <Tooltip title="Mở Workspace (:5173)" placement="right">
                        <a
                            href={workspaceHomeUrl}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Mở Workspace Tác nghiệp"
                            className="mb-2 flex h-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] text-[var(--text-secondary)] no-underline hover:bg-[var(--surface-hover)]"
                        >
                            <ExternalLink size={14} aria-hidden="true" />
                        </a>
                    </Tooltip>
                )}

                <div className={`flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--surface-subtle)] p-2 ${isCompact ? 'justify-center' : 'justify-between'}`}>
                    {!isCompact && (
                        <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-[var(--text-primary)]">
                                {context?.user?.name || 'Quản trị viên'}
                            </div>
                            <div className="truncate text-[11px] text-[var(--text-muted)]">
                                {context?.user?.email || ''}
                            </div>
                        </div>
                    )}
                    <Tooltip title="Đăng xuất CMS">
                        <Button
                            type="text"
                            size="small"
                            aria-label="Đăng xuất CMS"
                            icon={<LogOut size={14} />}
                            onClick={async () => {
                                await logout();
                                navigate('/login', { replace: true });
                            }}
                        />
                    </Tooltip>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[var(--surface-canvas)]">
            <a
                href="#cms-main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-[var(--radius-md)] focus:bg-[var(--brand-primary)] focus:px-3 focus:py-1.5 focus:text-xs focus:font-semibold focus:text-white"
            >
                Bỏ qua điều hướng đến nội dung chính
            </a>

            {/* Desktop Sidebar */}
            <aside
                className={`no-print hidden shrink-0 border-r border-[var(--border-subtle)] transition-[width] duration-150 lg:block ${
                    collapsed ? 'w-[68px]' : 'w-[248px]'
                }`}
            >
                {renderSidebarBody(collapsed)}
            </aside>

            {/* Mobile Drawer */}
            {mobileMenuOpen && (
                <div className="no-print fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu điều hướng CMS">
                    <div className="w-[260px] border-r border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-lg">
                        {renderSidebarBody(false)}
                    </div>
                    <button
                        type="button"
                        aria-label="Đóng menu"
                        className="flex flex-1 items-start justify-end border-none bg-slate-900/40 p-3"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <X className="text-white" size={20} />
                    </button>
                </div>
            )}

            {/* Main Column */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                {/* Single Unified Top Utility Header + Breadcrumb */}
                <header className="no-print flex h-13 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 lg:px-6">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            aria-label="Mở menu điều hướng"
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] lg:hidden"
                        >
                            <Menu size={16} />
                        </button>

                        <button
                            type="button"
                            onClick={() => setCollapsed((c) => !c)}
                            aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
                            className="hidden h-8 w-8 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] lg:inline-flex"
                        >
                            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
                        </button>

                        {/* Single Breadcrumb */}
                        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs">
                            <Link
                                to="/"
                                className="hidden font-medium text-[var(--text-muted)] no-underline hover:text-[var(--text-primary)] sm:inline"
                            >
                                Flowse CMS
                            </Link>
                            <ChevronRight size={13} className="hidden shrink-0 text-[var(--text-muted)] sm:inline" aria-hidden="true" />
                            <span className="hidden max-w-[180px] truncate font-medium text-[var(--text-muted)] md:inline">
                                {currentRouteItem.group}
                            </span>
                            <ChevronRight size={13} className="hidden shrink-0 text-[var(--text-muted)] md:inline" aria-hidden="true" />
                            <span className="truncate font-semibold text-[var(--text-primary)]">
                                {currentRouteItem.label}
                            </span>
                        </nav>
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                        <Select
                            aria-label="Chọn Workspace đang quản trị"
                            size="small"
                            className="w-44 sm:w-64"
                            value={currentWorkspaceId ?? undefined}
                            onChange={(val) => switchWorkspace(Number(val))}
                            placeholder="Chọn Workspace"
                            options={workspaces.map((ws) => ({
                                label: ws.name,
                                value: ws.workspace_id,
                            }))}
                        />
                        <div className="hidden sm:block" title={activeWorkspace?.name || ''}>
                            <StatusBadge value={currentRole} />
                        </div>
                    </div>
                </header>

                <main id="cms-main-content" className="flex-1 overflow-y-auto p-4 lg:p-6">
                    <div className="mx-auto max-w-[1360px]">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
