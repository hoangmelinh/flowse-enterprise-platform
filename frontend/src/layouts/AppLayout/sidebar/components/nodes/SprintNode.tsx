import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Zap, MoreHorizontal, Trash2,
    Play, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import type { SprintData } from '@/store/modules/sprints';

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    planning: { color: '#9aa0a6', icon: <Clock size={10} />, label: 'Planning' },
    active: { color: '#4caf50', icon: <Play size={10} />, label: 'Active' },
    completed: { color: '#0058be', icon: <CheckCircle2 size={10} />, label: 'Done' },
    cancelled: { color: '#e74c3c', icon: <XCircle size={10} />, label: 'Cancelled' },
};

interface SprintNodeProps {
    sprint: SprintData;
    spaceId: string;
    onDelete: (sprintId: number) => void;
}

export const SprintNode = ({ sprint, spaceId, onDelete }: SprintNodeProps) => {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);

    const cfg = STATUS_CONFIG[sprint.status] || STATUS_CONFIG.planning;
    const progress = sprint.total_tasks > 0
        ? Math.round((sprint.done_tasks / sprint.total_tasks) * 100)
        : 0;

    return (
        <div className="group relative mb-0.5">
            <div
                className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-all hover:bg-[#f3f4f8]"
                onClick={() => navigate(`/space/${spaceId}/sprint/${sprint.sprint_id}`)}
            >
                <span
                    className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded"
                    style={{ backgroundColor: cfg.color + '18', color: cfg.color }}
                >
                    <Zap size={11} />
                </span>

                <span className="flex-1 truncate font-medium text-[var(--color-inverse-surface)]">
                    {sprint.name}
                </span>

                {sprint.total_tasks > 0 && (
                    <span
                        className="rounded-full px-1.5 py-px text-[10px] font-bold"
                        style={{
                            backgroundColor: cfg.color + '15',
                            color: cfg.color,
                        }}
                    >
                        {progress}%
                    </span>
                )}

                <span
                    className="hidden h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-[#6b6f76] hover:bg-[#e2e4e9] hover:text-[var(--color-inverse-surface)] group-hover:flex"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                >
                    <MoreHorizontal size={13} />
                </span>
            </div>

            {showMenu && (
                <div
                    className="absolute right-0 top-full z-50 w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] py-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="flex w-full items-center gap-2 border-none bg-transparent px-3 py-1.5 text-left text-[13px] text-[#e74c3c] hover:bg-[#fff5f5]"
                        onClick={() => {
                            setShowMenu(false);
                            onDelete(sprint.sprint_id);
                        }}
                    >
                        <Trash2 size={13} /> Xoa Sprint
                    </button>
                </div>
            )}
        </div>
    );
};
