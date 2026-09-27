import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FolderOpen,
    Users,
    Activity,
    Zap,
    CheckCircle2,
    Clock,
    AlertTriangle,
    ListTodo,
    ChevronRight,
    TrendingUp,
    BarChart3,
} from 'lucide-react';
import type { SpaceTreeData } from '@/types/tree';
import type { SpaceMember } from '@/types/spaces';
import { getSpaceMembers } from '@/api/spaces';
import { useAppSelector, useAppDispatch } from '@/hooks';
import { fetchActivitiesBySpace, clearActivities } from '@/store/modules/activityLogs';

import './overviewView.css';

interface Props {
    spaceId?: string;
    currentSpaceTree?: SpaceTreeData[string];
}

/* ── Helpers ── */
function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    return `${d} ngày trước`;
}

function getInitials(name?: string | null): string {
    if (!name) return '?';
    return name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .filter(Boolean)
        .join('')
        .slice(0, 2)
        .toUpperCase() || '?';
}

const AVATAR_COLORS = [
    '#0058be', '#7c5cfc', '#e84393', '#27ae60',
    '#f0a220', '#e74c3c', '#00b894', '#6c5ce7',
];
function avatarColor(id: number): string {
    return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

/* ── Component ── */
export default function OverviewView({ spaceId, currentSpaceTree }: Props) {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    // Data from Redux
    const listSpaces = useAppSelector((s) => s.spaces.listSpaces);
    const currentSpaceDetail = useMemo(
        () => listSpaces.find((s) => String(s.spaceId) === spaceId),
        [listSpaces, spaceId],
    );

    // Activities from Redux
    const activities = useAppSelector((s) => s.activityLogs.listActivities);
    const loadingActivities = useAppSelector((s) => s.activityLogs.isLoadingActivities);

    // Members — local state (chưa có Redux module riêng)
    const [members, setMembers] = useState<SpaceMember[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    // Fetch activities via Redux
    useEffect(() => {
        if (!spaceId) return;
        void dispatch(fetchActivitiesBySpace({ spaceId: Number(spaceId), limit: 8 }));
        return () => {
            dispatch(clearActivities());
        };
    }, [spaceId, dispatch]);

    // Fetch members
    useEffect(() => {
        if (!spaceId) return;
        const fetchMembers = async () => {
            setLoadingMembers(true);
            try {
                const data = await getSpaceMembers(Number(spaceId));
                setMembers(data);
            } catch {
                setMembers([]);
            } finally {
                setLoadingMembers(false);
            }
        };
        void fetchMembers();
    }, [spaceId]);

    // Compute stats from tree
    const stats = useMemo(() => {
        const totalLists =
            (currentSpaceTree?.standaloneLists.length ?? 0) +
            (currentSpaceTree?.folders.reduce((a, f) => a + f.lists.length, 0) ?? 0);
        const totalFolders = currentSpaceTree?.folders.length ?? 0;
        return { totalLists, totalFolders };
    }, [currentSpaceTree]);

    // Compute sprint stats
    const sprintStats = useMemo(() => {
        if (!currentSpaceDetail?.sprints?.length) return null;
        const active = currentSpaceDetail.sprints.find((s) => s.status === 'active');
        if (!active) return null;
        const total = Number(active.total_tasks) || 0;
        const done = Number(active.done_tasks) || 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const totalSp = Number(active.total_story_points) || 0;
        const doneSp = Number(active.completed_story_points) || 0;
        return { ...active, total, done, pct, totalSp, doneSp };
    }, [currentSpaceDetail]);

    return (
        <div className="overview-root">
            {/* ── Stats Row ── */}
            <div className="overview-stats-row">
                <div className="overview-stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #0058be 0%, #1a73e8 100%)' }}>
                        <ListTodo size={20} color="#fff" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalLists}</span>
                        <span className="stat-label">Danh sách</span>
                    </div>
                </div>
                <div className="overview-stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f0a220 0%, #f7c948 100%)' }}>
                        <FolderOpen size={20} color="#fff" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalFolders}</span>
                        <span className="stat-label">Thư mục</span>
                    </div>
                </div>
                <div className="overview-stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #7c5cfc 0%, #a78bfa 100%)' }}>
                        <Users size={20} color="#fff" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{members.length}</span>
                        <span className="stat-label">Thành viên</span>
                    </div>
                </div>
                <div className="overview-stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #27ae60 0%, #6fcf97 100%)' }}>
                        <Zap size={20} color="#fff" />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{currentSpaceDetail?.sprints?.length ?? 0}</span>
                        <span className="stat-label">Sprint</span>
                    </div>
                </div>
            </div>

            <div className="overview-grid">
                {/* ── LEFT COLUMN ── */}
                <div className="overview-col-left">
                    {/* Sprint Progress */}
                    {sprintStats && (
                        <div className="overview-widget overview-widget-sprint">
                            <div className="widget-header">
                                <div className="widget-header-title">
                                    <TrendingUp size={16} className="widget-header-icon sprint-icon" />
                                    <span>Sprint hiện tại</span>
                                </div>
                                <button
                                    className="widget-header-action"
                                    onClick={() => navigate(`/space/${spaceId}/sprint/${sprintStats.sprint_id}`)}
                                >
                                    Xem chi tiết <ChevronRight size={14} />
                                </button>
                            </div>
                            <div className="widget-body">
                                <div className="sprint-info-row">
                                    <span className="sprint-name">{sprintStats.name}</span>
                                    <span className={`sprint-status sprint-status--${sprintStats.status}`}>
                                        {sprintStats.status === 'active' ? 'Đang chạy' : sprintStats.status}
                                    </span>
                                </div>
                                <div className="sprint-progress-section">
                                    <div className="sprint-progress-header">
                                        <span className="sprint-progress-label">
                                            <CheckCircle2 size={13} /> {sprintStats.done}/{sprintStats.total} tasks
                                        </span>
                                        <span className="sprint-progress-pct">{sprintStats.pct}%</span>
                                    </div>
                                    <div className="sprint-progress-bar-track">
                                        <div
                                            className="sprint-progress-bar-fill"
                                            style={{ width: `${sprintStats.pct}%` }}
                                        />
                                    </div>
                                </div>
                                {sprintStats.totalSp > 0 && (
                                    <div className="sprint-sp-row">
                                        <BarChart3 size={13} />
                                        <span>{sprintStats.doneSp}/{sprintStats.totalSp} story points</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Recent Activity */}
                    <div className="overview-widget">
                        <div className="widget-header">
                            <div className="widget-header-title">
                                <Activity size={16} className="widget-header-icon activity-icon" />
                                <span>Hoạt động gần đây</span>
                            </div>
                        </div>
                        <div className="widget-body widget-body--activity">
                            {loadingActivities ? (
                                <div className="widget-loading">
                                    <div className="widget-spinner" />
                                    <span>Đang tải...</span>
                                </div>
                            ) : activities.length === 0 ? (
                                <div className="widget-empty">
                                    <Clock size={32} className="widget-empty-icon" />
                                    <p>Chưa có hoạt động nào trong space này.</p>
                                </div>
                            ) : (
                                <ul className="activity-list">
                                    {activities.map((act) => (
                                        <li key={act.activity_id} className="activity-item">
                                            <div className="activity-avatar" style={{ background: avatarColor(act.user_id ?? 0) }}>
                                                {act.avatar_url ? (
                                                    <img src={act.avatar_url} alt="" />
                                                ) : (
                                                    <span>{getInitials(act.user_name || act.username || '?')}</span>
                                                )}
                                            </div>
                                            <div className="activity-content">
                                                <p>
                                                    <strong>{act.user_name || act.username || 'Ai đó'}</strong>{' '}
                                                    {act.action_label || act.action}
                                                </p>
                                                <span className="activity-time">{timeAgo(act.created_at)}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="overview-col-right">
                    {/* Members */}
                    <div className="overview-widget">
                        <div className="widget-header">
                            <div className="widget-header-title">
                                <Users size={16} className="widget-header-icon members-icon" />
                                <span>Thành viên ({members.length})</span>
                            </div>
                        </div>
                        <div className="widget-body widget-body--members">
                            {loadingMembers ? (
                                <div className="widget-loading">
                                    <div className="widget-spinner" />
                                    <span>Đang tải...</span>
                                </div>
                            ) : members.length === 0 ? (
                                <div className="widget-empty">
                                    <Users size={32} className="widget-empty-icon" />
                                    <p>Chưa có thành viên nào.</p>
                                </div>
                            ) : (
                                <ul className="members-list">
                                    {members.map((m) => (
                                        <li key={m.user_id} className="member-item">
                                            <div className="member-avatar" style={{ background: avatarColor(m.user_id) }}>
                                                {m.avatar_url ? (
                                                    <img src={m.avatar_url} alt="" />
                                                ) : (
                                                    <span>{getInitials(m.name)}</span>
                                                )}
                                            </div>
                                            <div className="member-info">
                                                <span className="member-name">{m.name}</span>
                                                <span className="member-role">{m.role_name}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Lists and Folders */}
                    <div className="overview-widget">
                        <div className="widget-header">
                            <div className="widget-header-title">
                                <FolderOpen size={16} className="widget-header-icon folder-icon" />
                                <span>Danh sách & Thư mục</span>
                            </div>
                        </div>
                        <div className="widget-body widget-body--tree">
                            {currentSpaceTree?.folders.map((folder) => (
                                <div key={folder.id} className="tree-folder">
                                    <div className="tree-folder-header">
                                        <FolderOpen size={15} className="tree-folder-icon" />
                                        <span className="tree-folder-name">{folder.name}</span>
                                        <span className="tree-folder-count">{folder.lists.length}</span>
                                    </div>
                                    {folder.lists.map((list) => (
                                        <div
                                            key={list.id}
                                            className="tree-list-item tree-list-item--nested"
                                            onClick={() => navigate(`/space/${spaceId}/list/${list.id}`)}
                                        >
                                            <span className="tree-list-bullet">≡</span>
                                            <span className="tree-list-name">{list.name}</span>
                                            <ChevronRight size={14} className="tree-list-arrow" />
                                        </div>
                                    ))}
                                </div>
                            ))}
                            {currentSpaceTree?.standaloneLists.map((list) => (
                                <div
                                    key={list.id}
                                    className="tree-list-item"
                                    onClick={() => navigate(`/space/${spaceId}/list/${list.id}`)}
                                >
                                    <span className="tree-list-bullet">≡</span>
                                    <span className="tree-list-name">{list.name}</span>
                                    <ChevronRight size={14} className="tree-list-arrow" />
                                </div>
                            ))}
                            {currentSpaceTree?.folders.length === 0 &&
                                currentSpaceTree?.standaloneLists.length === 0 && (
                                    <div className="widget-empty">
                                        <AlertTriangle size={28} className="widget-empty-icon" />
                                        <p>Chưa có danh sách hay thư mục nào.</p>
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
