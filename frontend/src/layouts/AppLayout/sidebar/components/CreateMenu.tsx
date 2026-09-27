import { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    ListTodo,
    FolderClosed,
    LayoutDashboard,
} from 'lucide-react';
import { useSpaceTree } from '../../SpaceTreeContext';
import type { CreateMenuProps } from '../types';

export const CreateMenu = ({ position, onClose, spaceId, spaceName }: CreateMenuProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const tree = useSpaceTree();

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    const items = [
        {
            icon: <ListTodo size={16} />,
            label: 'List',
            sublabel: 'Track tasks, projects, people & more',
            onClick: () => {
                tree.setCreateListTarget({ spaceId, folderId: null, folderName: spaceName });
                onClose();
            },
        },
        {
            icon: <FolderClosed size={16} />,
            label: 'Folder',
            sublabel: 'Group Lists, Docs & more',
            onClick: () => {
                tree.setCreateFolderTarget({ spaceId, spaceName });
                onClose();
            },
        },
    ];

    const sprintItem = {
        icon: <LayoutDashboard size={16} />,
        label: 'Sprint',
        onClick: () => {
            tree.setCreateSprintTarget({ spaceId, spaceName });
            onClose();
        },
    };

    if (typeof document === 'undefined') return null;

    const menuWidth = 240;
    const menuMaxHeight = 350;
    const viewportPadding = 8;
    const top = Math.max(viewportPadding, Math.min(position.y, window.innerHeight - menuMaxHeight - viewportPadding));
    const left = Math.max(viewportPadding, Math.min(position.x, window.innerWidth - menuWidth - viewportPadding));

    return createPortal(
        <div
            ref={ref}
            className="fixed z-[9999] w-60 rounded-lg bg-[var(--color-surface-container-lowest)] py-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.15)] border border-[var(--color-border)]"
            style={{ top, left }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="px-3.5 py-1.5 text-[11px] font-semibold text-[#6b6f76] uppercase tracking-wide">
                Create
            </div>

            {items.map((item, i) => (
                <button
                    key={i}
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3.5 py-1.75 text-left text-[13px] text-[var(--color-inverse-surface)] transition-all hover:bg-[#f3f4f8]"
                    onClick={item.onClick}
                >
                    <span className="shrink-0 text-[#6b6f76]">{item.icon}</span>
                    <div className="flex flex-col min-w-0">
                        <span className="font-medium">{item.label}</span>
                        {item.sublabel && (
                            <span className="text-[11px] leading-tight text-[#6b6f76] font-normal mt-0.5">
                                {item.sublabel}
                            </span>
                        )}
                    </div>
                </button>
            ))}

            <div className="my-1 mx-2.5 h-px bg-[#eef0f3]" />

            <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3.5 py-1.5 text-left text-[13px] text-[var(--color-inverse-surface)] transition-all hover:bg-[#f3f4f8]"
                onClick={sprintItem.onClick}
            >
                <span className="shrink-0 text-[#6b6f76]">{sprintItem.icon}</span>
                <span className="font-medium">{sprintItem.label}</span>
            </button>
        </div>,
        document.body,
    );
};
