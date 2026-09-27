/* ═══════════════════════════════════════════════
   TIME TRACKING PAGE — Real Data (PostgreSQL)
═══════════════════════════════════════════════ */
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Play, Square, Clock, Calendar, Search,
    Timer, Trash2, ChevronRight
} from 'lucide-react';
import { Avatar } from 'antd';
import { toast } from 'sonner';
import './time-tracking.css';
import { useAppSelector, useAppDispatch } from '../../hooks';
import {
    fetchMyTimeLogs,
    fetchRunningTimer,
    fetchStartTimer,
    fetchStopTimer,
    fetchDeleteTimeLog,
} from '../../store/modules/timelogs';
import { fetchTasksForUser } from '../../store/modules/tasks';
import type { TaskWithSpaceData } from '../../store/modules/tasks';

// ── helpers ──────────────────────────────────────────────────────

function fmtTimer(totalSecs: number): string {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function fmtDuration(secs: number): string {
    if (secs <= 0) return '0m';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}m`;
    return `${secs}s`;
}

function dateLabel(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Hôm nay';
    if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function elapsedSince(startedAt: string): number {
    return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}

function getEntryDurationSecs(entry: { duration_secs: number | null; started_at: string; stopped_at: string | null }): number {
    if (entry.duration_secs && entry.duration_secs > 0) return entry.duration_secs;
    if (!entry.stopped_at) return 0;
    return Math.max(0, Math.floor((new Date(entry.stopped_at).getTime() - new Date(entry.started_at).getTime()) / 1000));
}

// ── component ────────────────────────────────────────────────────

export default function TimeTrackingPage() {
    const dispatch = useAppDispatch();
    const { myTimeLogs, runningTimer, isLoadingTimeLogs } = useAppSelector(s => s.timelogs);
    const { listTaskByUserId } = useAppSelector(s => s.tasks);
    const spaces = useAppSelector(s => s.spaces.listSpaces);

    const [liveSeconds, setLiveSeconds] = useState(0);
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [activeTab, setActiveTab] = useState<'tasks' | 'entries'>('tasks');
    const [taskFilter, setTaskFilter] = useState('');
    const [collapsedSpaces, setCollapsedSpaces] = useState<Record<string, boolean>>({});

    // ── Load data on mount ──
    useEffect(() => {
        dispatch(fetchMyTimeLogs());
        dispatch(fetchRunningTimer());
        dispatch(fetchTasksForUser());
    }, [dispatch, spaces]);

    // ── Live timer tick ──
    useEffect(() => {
        if (tickRef.current) clearInterval(tickRef.current);
        if (runningTimer?.started_at) {
            setLiveSeconds(elapsedSince(runningTimer.started_at));
            tickRef.current = setInterval(() => {
                setLiveSeconds(elapsedSince(runningTimer.started_at));
            }, 1000);
        } else {
            setLiveSeconds(0);
        }
        return () => { if (tickRef.current) clearInterval(tickRef.current); };
    }, [runningTimer]);

    // ── Group tasks by space ──
    const tasksBySpace: Record<string, { spaceId: number; spaceName: string; spaceColor: string; tasks: TaskWithSpaceData[] }> = {};
    // Flatten StatusGroup[] → Task[]
    const allTasks: TaskWithSpaceData[] = (listTaskByUserId || []).flatMap(group => group.tasks || []) as unknown as TaskWithSpaceData[];
    allTasks.forEach(t => {
        const key = t.space_name || `Space #${t.space_id}`;
        if (!tasksBySpace[key]) {
            tasksBySpace[key] = {
                spaceId: t.space_id,
                spaceName: key,
                spaceColor: t.space_color || '#0058be',
                tasks: [],
            };
        }
        tasksBySpace[key].tasks.push(t);
    });

    // Filter tasks
    const filterLower = taskFilter.toLowerCase();
    const filteredSpaces = Object.values(tasksBySpace).map(sg => ({
        ...sg,
        tasks: filterLower
            ? sg.tasks.filter(t => t.name.toLowerCase().includes(filterLower))
            : sg.tasks,
    })).filter(sg => sg.tasks.length > 0);

    // ── Handlers ──
    const handleStartTimer = useCallback(async (taskId: number, taskName: string) => {
        if (runningTimer) {
            toast.warning('Hãy dừng timer đang chạy trước!');
            return;
        }
        try {
            await dispatch(fetchStartTimer({ taskId })).unwrap();
            dispatch(fetchMyTimeLogs());
            dispatch(fetchRunningTimer());
            toast.success(`⏱ Bắt đầu: ${taskName}`);
        } catch (err: unknown) {
            toast.error(typeof err === 'string' ? err : 'Không thể bắt đầu timer');
        }
    }, [dispatch, runningTimer]);

    const handleStopTimer = useCallback(async () => {
        if (!runningTimer) return;
        try {
            await dispatch(fetchStopTimer(runningTimer.time_log_id)).unwrap();
            dispatch(fetchMyTimeLogs());
            toast.success('⏹ Timer đã dừng & lưu!');
        } catch (err: unknown) {
            toast.error(typeof err === 'string' ? err : 'Không thể dừng timer');
        }
    }, [dispatch, runningTimer]);

    const handleDeleteEntry = useCallback(async (id: number) => {
        try {
            await dispatch(fetchDeleteTimeLog(id)).unwrap();
            dispatch(fetchMyTimeLogs());
            toast.success('Đã xóa');
        } catch (err: unknown) {
            toast.error(typeof err === 'string' ? err : 'Không thể xóa');
        }
    }, [dispatch]);

    const toggleSpace = (name: string) => {
        setCollapsedSpaces(prev => ({ ...prev, [name]: !prev[name] }));
    };

    // ── Entries grouped by date ──
    const completedEntries = myTimeLogs.filter(e => e.stopped_at != null);
    const grouped: Record<string, typeof completedEntries> = {};
    completedEntries.forEach(e => {
        const label = dateLabel(e.started_at || e.created_at);
        if (!grouped[label]) grouped[label] = [];
        grouped[label].push(e);
    });

    // ── Stats ──
    const todayEntries = grouped['Hôm nay'] || [];
    const todaySecs = todayEntries.reduce((sum, e) => sum + getEntryDurationSecs(e), 0);
    const weekSecs = completedEntries.reduce((sum, e) => sum + getEntryDurationSecs(e), 0);
    const todayHrs = (todaySecs / 3600).toFixed(1);
    const weekHrs = (weekSecs / 3600).toFixed(1);

    const isTimerRunning = !!runningTimer;
    const runningTaskName = runningTimer?.task_name || 'Task';

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[var(--color-surface-container-lowest)] font-['Plus_Jakarta_Sans','Inter',sans-serif]">
            {/* ═══ Header ═══ */}
            <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-light)] px-6 py-3.5">
                <div className="flex items-center gap-2.5">
                    <Clock size={20} className="text-[var(--color-primary)]" />
                    <h1 className="m-0 text-lg font-extrabold text-[var(--color-on-surface)]">Time Tracking</h1>
                </div>
                <div className="flex gap-1">
                    <button
                        className={`flex cursor-pointer items-center gap-1.25 border-x-0 border-b-2 border-t-0 border-solid bg-transparent px-3 py-1.5 text-[13px] font-semibold transition-all ${activeTab === 'tasks' ? 'border-b-[#0058be] text-[var(--color-primary)]' : 'border-b-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-on-surface)]'}`}
                        onClick={() => setActiveTab('tasks')}
                    >
                        <Play size={14} /> Chọn Task
                    </button>
                    <button
                        className={`flex cursor-pointer items-center gap-1.25 border-x-0 border-b-2 border-t-0 border-solid bg-transparent px-3 py-1.5 text-[13px] font-semibold transition-all ${activeTab === 'entries' ? 'border-b-[#0058be] text-[var(--color-primary)]' : 'border-b-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-on-surface)]'}`}
                        onClick={() => setActiveTab('entries')}
                    >
                        <Timer size={14} /> Lịch sử ({completedEntries.length})
                    </button>
                </div>
            </header>

            {/* ═══ Running Timer Banner ═══ */}
            {isTimerRunning && (
                <div className="flex shrink-0 items-center gap-4 border-b-2 border-[#4caf50] bg-gradient-to-r from-[#e8f5e9] to-[#fff] px-6 py-3.5 animate-[tt-slideDown_0.3s_ease-out]">
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#4caf50]">
                        <div className="h-3 w-3 rounded-full bg-[var(--color-surface-container-lowest)] animate-[tt-pulse_1s_infinite]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#388e3c]">⏱ Đang theo dõi</div>
                        <div className="truncate text-[15px] font-bold text-[#1b5e20]">{runningTaskName}</div>
                    </div>
                    <span className="min-w-32 text-center text-[28px] font-black tabular-nums text-[#2e7d32] animate-[tt-pulse_1.5s_infinite]">
                        {fmtTimer(liveSeconds)}
                    </span>
                    <button
                        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-none bg-[#e74c3c] text-white shadow-[0_2px_12px_rgba(231,76,60,0.35)] transition-all hover:scale-110 hover:bg-[#c0392b] active:scale-95"
                        onClick={handleStopTimer}
                        title="Dừng timer & lưu"
                    >
                        <Square size={14} fill="white" />
                    </button>
                </div>
            )}

            {/* ═══ Summary Cards ═══ */}
            <div className="flex shrink-0 gap-4 px-6 py-3">
                <div className="flex-1 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-container-low)] px-4 py-3">
                    <span className="block text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Hôm nay</span>
                    <span className="my-0.5 block text-[24px] font-black text-[var(--color-on-surface)]">{todayHrs}h</span>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
                        <div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-500" style={{ width: `${Math.min(100, (parseFloat(todayHrs) / 8) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-[var(--color-text-tertiary)]">/ 8h mục tiêu</span>
                </div>
                <div className="flex-1 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-container-low)] px-4 py-3">
                    <span className="block text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Tuần này</span>
                    <span className="my-0.5 block text-[24px] font-black text-[var(--color-on-surface)]">{weekHrs}h</span>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
                        <div className="h-full rounded-full bg-[#7c5cfc] transition-[width] duration-500" style={{ width: `${Math.min(100, (parseFloat(weekHrs) / 40) * 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-[var(--color-text-tertiary)]">/ 40h mục tiêu</span>
                </div>
                <div className="flex-1 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-container-low)] px-4 py-3">
                    <span className="block text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--color-text-tertiary)]">Entries</span>
                    <span className="my-0.5 block text-[24px] font-black text-[var(--color-on-surface)]">{completedEntries.length}</span>
                    <span className="text-[10px] font-medium text-[var(--color-text-tertiary)]">lượt đã ghi nhận</span>
                </div>
            </div>

            {/* ═══ Tab Content ═══ */}
            <div className="flex-1 overflow-y-auto">

                {/* ═══ TAB: TASKS — Hiện toàn bộ task, nhóm theo Space ═══ */}
                {activeTab === 'tasks' && (
                    <div className="px-6 pb-6">
                        {/* Filter bar */}
                        <div className="sticky top-0 z-10 bg-[var(--color-surface-container-lowest)] pb-2 pt-2">
                            <div className="relative">
                                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                                <input
                                    className="box-border w-full rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface-container-low)] py-2 pl-9 pr-3 text-[13px] text-[var(--color-on-surface)] outline-none transition-all focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-container-lowest)] focus:shadow-[0_0_0_3px_rgba(0,88,190,0.06)]"
                                    placeholder="Lọc task..."
                                    value={taskFilter}
                                    onChange={e => setTaskFilter(e.target.value)}
                                />
                            </div>
                        </div>

                        {filteredSpaces.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <Clock size={40} className="mb-3 text-[var(--color-border)]" />
                                <p className="text-[14px] font-bold text-[var(--color-text-secondary)]">Không có task nào</p>
                                <p className="mt-1 text-[13px] text-[var(--color-text-tertiary)]">Hãy tạo task trong Space trước</p>
                            </div>
                        )}

                        {filteredSpaces.map(sg => {
                            const isCollapsed = collapsedSpaces[sg.spaceName];
                            return (
                                <div key={sg.spaceName} className="mb-3">
                                    {/* Space header */}
                                    <button
                                        className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-1 py-2 text-left"
                                        onClick={() => toggleSpace(sg.spaceName)}
                                    >
                                        <span className="text-[var(--color-text-tertiary)] transition-transform" style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}>
                                            <ChevronRight size={14} />
                                        </span>
                                        <span
                                            className="h-2.5 w-2.5 rounded-full"
                                            style={{ backgroundColor: sg.spaceColor }}
                                        />
                                        <span className="text-[13px] font-bold text-[var(--color-on-surface)]">{sg.spaceName}</span>
                                        <span className="text-[11px] font-semibold text-[var(--color-text-tertiary)]">{sg.tasks.length} task</span>
                                    </button>

                                    {/* Task list */}
                                    {!isCollapsed && (
                                        <div className="ml-3 border-l-2 border-[var(--color-border-light)] pl-3">
                                            {sg.tasks.map(task => {
                                                const isRunningThis = runningTimer?.task_id === task.task_id;
                                                return (
                                                    <div
                                                        key={task.task_id}
                                                        className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors ${isRunningThis
                                                                ? 'bg-[#e8f5e9]'
                                                                : 'hover:bg-[var(--color-surface-container-low)]'
                                                            }`}
                                                    >
                                                        {/* Play / Running indicator */}
                                                        {isRunningThis ? (
                                                            <button
                                                                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-[#e74c3c] text-white transition-all hover:scale-110"
                                                                onClick={handleStopTimer}
                                                                title="Dừng timer"
                                                            >
                                                                <Square size={10} fill="white" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-[#e0e0e0] bg-transparent text-[#bdc3c7] transition-all hover:border-[#4caf50] hover:bg-[#e8f5e9] hover:text-[#4caf50] group-hover:border-[var(--color-text-tertiary)]"
                                                                onClick={() => handleStartTimer(task.task_id, task.name)}
                                                                title="Bắt đầu timer"
                                                            >
                                                                <Play size={11} fill="currentColor" />
                                                            </button>
                                                        )}

                                                        {/* Task info */}
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate text-[13px] font-semibold text-[var(--color-on-surface)]">
                                                                {task.name}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                {task.status_name && (
                                                                    <span
                                                                        className="rounded px-1.5 py-px text-[10px] font-bold"
                                                                        style={{
                                                                            backgroundColor: (task.status_color || '#9aa0a6') + '18',
                                                                            color: task.status_color || '#9aa0a6'
                                                                        }}
                                                                    >
                                                                        {task.status_name}
                                                                    </span>
                                                                )}
                                                                {task.priority_name && (
                                                                    <span className="text-[10px] font-semibold text-[var(--color-text-tertiary)]">
                                                                        {task.priority_name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Running indicator */}
                                                        {isRunningThis && (
                                                            <span className="text-[12px] font-bold text-[#4caf50] animate-[tt-pulse_1s_infinite]">
                                                                {fmtTimer(liveSeconds)}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ═══ TAB: ENTRIES — Lịch sử time log ═══ */}
                {activeTab === 'entries' && (
                    <div className="px-6 pb-6">
                        {isLoadingTimeLogs && completedEntries.length === 0 && (
                            <div className="flex items-center justify-center py-20 text-[var(--color-text-tertiary)]">
                                <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
                                Đang tải...
                            </div>
                        )}

                        {!isLoadingTimeLogs && completedEntries.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-primary-bg)]">
                                    <Clock size={36} className="text-[var(--color-primary)]" />
                                </div>
                                <p className="text-[15px] font-bold text-[var(--color-on-surface)]">Chưa có lịch sử</p>
                                <p className="mt-1.5 max-w-xs text-[13px] text-[var(--color-text-tertiary)]">
                                    Chuyển sang tab "Chọn Task" và bấm ▶ để bắt đầu theo dõi
                                </p>
                            </div>
                        )}

                        {Object.entries(grouped).map(([date, dateEntries]) => {
                            const daySecs = dateEntries.reduce((sum, e) => sum + getEntryDurationSecs(e), 0);
                            const dayHrs = (daySecs / 3600).toFixed(1);

                            return (
                                <div key={date} className="mb-5">
                                    <div className="flex items-center gap-2 pb-1.5 pt-2 text-[var(--color-text-tertiary)]">
                                        <Calendar size={13} />
                                        <span className="text-[13px] font-extrabold text-[var(--color-on-surface)]">{date}</span>
                                        <span className="text-xs font-semibold text-[var(--color-primary)]">{dayHrs}h tổng</span>
                                        <div className="ml-2 h-px flex-1 bg-[var(--color-surface-container-high)]" />
                                    </div>
                                    <div className="flex flex-col">
                                        {dateEntries.map(entry => {
                                            const taskName = entry.task_name || `Task #${entry.task_id}`;
                                            const dur = getEntryDurationSecs(entry);
                                            const note = entry.note || '';
                                            const userName = entry.user_name || entry.username || '';
                                            const initials = userName
                                                ? userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
                                                : '?';
                                            const startTime = new Date(entry.started_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                            const endTime = entry.stopped_at
                                                ? new Date(entry.stopped_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                                                : '';

                                            return (
                                                <div key={entry.time_log_id} className="group flex items-center gap-3 rounded-lg border-b border-[#f5f7fa] px-2 py-2.5 transition-colors hover:bg-[var(--color-surface-container-low)]">
                                                    {/* Re-start */}
                                                    <button
                                                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[var(--color-text-tertiary)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#e8f5e9] hover:text-[#4caf50]"
                                                        onClick={() => handleStartTimer(entry.task_id, taskName)}
                                                        title="Bắt đầu lại"
                                                    >
                                                        <Play size={10} fill="currentColor" />
                                                    </button>

                                                    {/* Task info */}
                                                    <div className="min-w-0 flex-1">
                                                        <span className="block text-[13px] font-semibold text-[var(--color-on-surface)]">{taskName}</span>
                                                        {note && <span className="mt-0.5 block truncate text-[11px] italic text-[var(--color-text-tertiary)]">{note}</span>}
                                                    </div>

                                                    {/* Time range */}
                                                    <div className="shrink-0 text-[11px] font-medium text-[var(--color-text-tertiary)]">
                                                        {startTime} – {endTime}
                                                    </div>

                                                    {/* User */}
                                                    <Avatar size={22} style={{ backgroundColor: '#4285F4', fontSize: '9px', fontWeight: 'bold' }}>
                                                        {initials}
                                                    </Avatar>

                                                    {/* Duration */}
                                                    <div className="min-w-16 text-right text-sm font-extrabold text-[var(--color-on-surface)]">
                                                        {fmtDuration(dur)}
                                                    </div>

                                                    {/* Delete */}
                                                    <button
                                                        className="cursor-pointer rounded border-none bg-transparent p-1 text-[var(--color-text-tertiary)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[#fff1f0] hover:text-[#e74c3c]"
                                                        onClick={() => handleDeleteEntry(entry.time_log_id)}
                                                        title="Xóa"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
