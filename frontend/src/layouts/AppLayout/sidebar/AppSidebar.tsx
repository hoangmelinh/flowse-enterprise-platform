import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Home, MessageSquare, Clock, Plus, Settings, Users, LogOut,
    Sparkles, Grid3X3, ChevronDown, ChevronRight, RefreshCcw,
    PanelLeftOpen, X, ShieldCheck, AlertTriangle, Cpu
} from 'lucide-react';
import WorkspaceSwitcher from '../workspace/WorkspaceSwitcher';
import { fetchSignOut } from '@/store/modules/auth';
import type { AppDispatch, RootState } from '@/store/configureStore';
import { useSpaceTree } from '../SpaceTreeContext';
import { SpaceNode } from './components/nodes/SpaceNode';
import { fetchSpacesForWorkspace } from '@/store/modules/spaces';
import { fetchWorkspaces } from '@/store/modules/workspaces';
import { fetchWorkspaceMembers } from '@/store/modules/workspaces';

export default function AppSidebar() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch<AppDispatch>();
    const tree = useSpaceTree();
    const [spacesCollapsed, setSpacesCollapsed] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const currentWorkspaceId = useSelector((s: RootState) => s.workspaces.currentWorkspaceId);
    const access_token = useSelector((s: RootState) => s.auth.access_token);

    const handleRefreshSpaces = async () => {
        if (currentWorkspaceId != null) {
            setIsRefreshing(true);
            await dispatch(fetchSpacesForWorkspace(currentWorkspaceId));
            setTimeout(() => setIsRefreshing(false), 600);
        }
    };

    const handleLogout = () => {
        try {
            dispatch(fetchSignOut());
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const navItem = (
        path: string,
        icon: React.ReactNode,
        label: string,
        badge?: React.ReactNode,
        id?: string,
    ) => {
        const isActive = location.pathname === path;
        return (
            <div
                id={id}
                className={`flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-1.75 text-body-sm font-medium transition-all ${isActive
                    ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary-alt)] font-semibold'
                    : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                onClick={() => navigate(path)}
            >
                {icon}
                <span className="flex-1">{label}</span>
                {badge}
            </div>
        );
    };

    useEffect(() => {
        if (access_token) {
            dispatch(fetchWorkspaces());
        }
    }, [access_token, dispatch]);

    useEffect(() => {
        if (currentWorkspaceId != null) {
            dispatch(fetchSpacesForWorkspace(currentWorkspaceId));
            dispatch(fetchWorkspaceMembers(currentWorkspaceId));
        }
    }, [currentWorkspaceId, dispatch]);

    const sidebarContent = (
        <aside
            id="app-sidebar"
            className={`flex w-65 shrink-0 flex-col overflow-y-auto border-r border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] px-2.5 py-3 transition-all duration-300
                lg:relative lg:translate-x-0
                max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:shadow-2xl
                max-lg:transition-transform max-lg:duration-300 max-lg:ease-in-out
                ${isMobileOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full'}
            `}
        >
            {/* Mobile close button */}
            <button
                type="button"
                className="absolute right-3 top-3 hidden max-lg:flex items-center justify-center w-7 h-7 rounded-md text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-on-surface)] transition-colors"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close sidebar"
            >
                <X size={16} />
            </button>

            <div className="item-center gap-2.5 rounded-lg px-2 pb-3 pt-1 text-body font-bold text-[var(--color-on-surface)]">
                {t('sidebar.brand')}
            </div>
            <div
                className="mb-2 flex cursor-pointer items-center gap-2.5 rounded-lg px-2 pb-3 pt-1 border-b border-[var(--color-border-light)]"
                onClick={() => navigate('/home')}
            >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary-alt)]">
                    <Grid3X3 size={18} color="#fff" />
                </div>
                <div className="min-w-0 flex-1">
                    <WorkspaceSwitcher onOpenCreate={() => tree.setIsWorkspaceDialogOpen(true)} />
                </div>
            </div>

            <nav className="mb-1 flex flex-col gap-0.5">
                {navItem('/home', <Home size={18} strokeWidth={1.8} />, t('sidebar.home'))}
                {navItem(
                    '/inbox',
                    <MessageSquare size={18} strokeWidth={1.8} />,
                    t('sidebar.inbox')
                )}
                {navItem('/approvals', <ShieldCheck size={18} strokeWidth={1.8} />, 'Phê duyệt')}
                {navItem('/incidents', <AlertTriangle size={18} strokeWidth={1.8} />, 'Sự cố (Field)')}
                {navItem('/assets', <Cpu size={18} strokeWidth={1.8} />, 'Thiết bị & QR')}
                {navItem('/time-tracking', <Clock size={18} strokeWidth={1.8} />, t('sidebar.timeTracking'))}

                <div
                    id="sidebar-ai"
                    className={`flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-1.75 text-body-sm font-medium transition-all ${location.pathname === '/ai'
                        ? 'bg-linear-to-r from-[#7c5cfc] to-[#e84393] text-white shadow-sm'
                        : 'text-[var(--color-on-surface)] hover:bg-[var(--color-surface-hover)]'
                        }`}
                    onClick={() => navigate('/ai')}
                >
                    <Sparkles size={18} strokeWidth={1.8} />
                    <span>{t('sidebar.ai')}</span>
                </div>
            </nav>

            <div id="sidebar-spaces" className="mb-1 mt-2 flex flex-1 flex-col overflow-y-auto">
                <div className="flex items-center justify-between px-2.5 py-1.5">
                    <button
                        type="button"
                        className="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-overline font-extrabold tracking-[0.06em] uppercase text-[var(--color-text-secondary)] hover:text-[var(--color-on-surface)] transition-colors"
                        onClick={() => setSpacesCollapsed(!spacesCollapsed)}
                    >
                        {spacesCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                        {t('sidebar.spaces')}
                    </button>
                    <div className="flex items-center gap-2">
                        <RefreshCcw
                            size={14}
                            className={`cursor-pointer text-[var(--color-text-secondary)] transition-all hover:text-[var(--color-primary-alt)] ${isRefreshing ? 'animate-spin' : ''}`}
                            onClick={handleRefreshSpaces}
                        />
                        <Plus
                            size={15}
                            className="cursor-pointer text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-primary-alt)]"
                            onClick={() => tree.setIsCreateSpaceOpen(true)}
                        />
                    </div>
                </div>

                {!spacesCollapsed && (
                    <div className="mt-0.5 flex flex-col gap-0.5">
                        {tree.spaces.map((space) => (
                            <SpaceNode key={space.id} space={space} />
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-auto flex flex-col gap-0.5 border-t border-[var(--color-border-light)] pt-2">
                <div
                    className="flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-1.75 text-body-sm font-medium text-[var(--color-on-surface)] transition-all hover:bg-[var(--color-surface-hover)]"
                    onClick={() => tree.setIsInviteModalOpen(true)}
                >
                    <Users size={18} strokeWidth={1.8} />
                    <span>{t('sidebar.invitePeople')}</span>
                </div>
                <div
                    id="sidebar-settings"
                    className="flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-1.75 text-body-sm font-medium text-[var(--color-on-surface)] transition-all hover:bg-[var(--color-surface-hover)]"
                    onClick={() => navigate('/settings')}
                >
                    <Settings size={18} strokeWidth={1.8} />
                    <span>{t('sidebar.settings')}</span>
                </div>
                <div
                    className="flex cursor-pointer select-none items-center gap-2.5 rounded-md px-2.5 py-1.75 text-body-sm font-medium text-[var(--color-error)] transition-all hover:bg-[#fef2f2]"
                    onClick={handleLogout}
                >
                    <LogOut size={18} strokeWidth={1.8} />
                    <span>{t('sidebar.logout')}</span>
                </div>
            </div>
        </aside>
    );

    return (
        <>
            {sidebarContent}

            {/* Mobile backdrop overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] hidden max-lg:block"
                    onClick={() => setIsMobileOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Mobile toggle button — only visible when sidebar is closed */}
            {!isMobileOpen && (
                <button
                    type="button"
                    id="mobile-sidebar-toggle"
                    aria-label="Open sidebar"
                    className="hidden max-lg:flex fixed bottom-5 left-4 z-50 items-center justify-center gap-2 rounded-full bg-[var(--color-primary-alt)] px-4 py-3 text-white shadow-lg shadow-[var(--color-primary-alt)]/40 transition-all hover:opacity-90 active:scale-95"
                    onClick={() => setIsMobileOpen(true)}
                >
                    <PanelLeftOpen size={18} />
                    <span className="text-body-sm font-semibold">{t('sidebar.menu')}</span>
                </button>
            )}
        </>
    );
}
