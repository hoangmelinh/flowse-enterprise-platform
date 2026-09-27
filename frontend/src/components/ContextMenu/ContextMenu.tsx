import { useEffect, useRef } from 'react';
import {
    Copy, Trash2, Move, Archive, Link2, Edit3,
    ArrowRight, CheckCircle2, Flag
} from 'lucide-react';
import type { ContextMenuProps } from '@/types/modal';


const MENU_ITEMS = [
    { id: 'rename', icon: Edit3, label: 'Rename', divider: false },
    { id: 'duplicate', icon: Copy, label: 'Duplicate', divider: false },
    { id: 'copy-link', icon: Link2, label: 'Copy Link', divider: true },
    { id: 'change-status', icon: CheckCircle2, label: 'Change Status', hasSubmenu: true, divider: false },
    { id: 'change-priority', icon: Flag, label: 'Change Priority', hasSubmenu: true, divider: true },
    { id: 'move', icon: Move, label: 'Move to...', divider: false },
    { id: 'archive', icon: Archive, label: 'Archive', divider: true },
    { id: 'delete', icon: Trash2, label: 'Delete', danger: true, divider: false },
];

export default function ContextMenu({ x, y, isOpen, onClose, onAction, taskTitle }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen || !menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        const el = menuRef.current;
        if (rect.right > window.innerWidth) {
            el.style.left = `${x - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            el.style.top = `${y - rect.height}px`;
        }
    }, [isOpen, x, y]);

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            className="fixed z-3000 min-w-50 rounded-[10px] border border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] p-1 shadow-[0_8px_28px_rgba(0,0,0,0.15)]"
            style={{ top: y, left: x }}
        >
            {taskTitle && (
                <div className="mb-0.5 border-b border-[#f0f2f5] px-3 py-1.5 pb-1 text-[11px] font-bold uppercase tracking-[0.04em] text-[var(--color-text-tertiary)]">
                    {taskTitle.length > 30 ? taskTitle.slice(0, 30) + '...' : taskTitle}
                </div>
            )}
            {MENU_ITEMS.map(item => (
                <div key={item.id}>
                    <button
                        className={`flex w-full cursor-pointer items-center gap-2 rounded-md border-none bg-transparent px-3 py-1.75 text-left text-[13px] font-medium transition-colors ${item.danger
                                ? 'text-[#e74c3c] hover:bg-[#fff5f5] hover:text-[#c0392b]'
                                : 'text-[var(--color-on-surface)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)]'
                            }`}
                        onClick={() => { onAction(item.id); onClose(); }}
                    >
                        <item.icon size={14} />
                        <span>{item.label}</span>
                        {item.hasSubmenu && <ArrowRight size={12} className="ml-auto text-[var(--color-text-tertiary)]" />}
                    </button>
                    {item.divider && <div className="mx-2 my-0.75 h-px bg-[#f0f2f5]" />}
                </div>
            ))}
        </div>
    );
}
