import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    ChevronDown,
    ChevronRight,
    FolderClosed,
    MoreHorizontal,
    Plus,
    ListTodo,
    Trash2,
} from 'lucide-react';
import { useSpaceTree } from '../../../SpaceTreeContext';
import { ContextMenu } from '../ContextMenu';
import { ListNode } from './ListNode';
import type { MenuEntry } from '../../types';
import type { FolderItem } from '@/types/tree';

export const FolderNode = ({ folder, spaceId, spaceName }: { folder: FolderItem; spaceId: string; spaceName: string }) => {
    const location = useLocation();
    const [expanded, setExpanded] = useState(true);
    const tree = useSpaceTree();
    const [folderMenu, setFolderMenu] = useState<{ x: number; y: number } | null>(null);
    const [folderCreateMenu, setFolderCreateMenu] = useState<{ x: number; y: number } | null>(null);

    const isFolderActive = location.pathname === `/folder/${folder.id}`;

     
    useEffect(() => {
        if (isFolderActive) setExpanded(true);
    }, [isFolderActive]);

    const folderMenuItems: MenuEntry[] = [
        {
            icon: <ListTodo size={14} />,
            label: 'Add List',
            onClick: () => {
                tree.setCreateListTarget({ spaceId, folderId: folder.id, folderName: folder.name });
            },
        },
        {
            icon: <FolderClosed size={14} />,
            label: 'Add Folder',
            onClick: () => {
                tree.setCreateFolderTarget({ spaceId, spaceName });
            },
        },
        'divider',
        {
            icon: <Trash2 size={14} />,
            label: 'Delete',
            danger: true,
            onClick: () => tree.handleDeleteFolder(spaceId, folder.id),
        },
    ];

    const folderCreateItems: MenuEntry[] = [
        {
            icon: <ListTodo size={15} />,
            label: 'List',
            sublabel: 'Track tasks, projects & more',
            onClick: () => {
                tree.setCreateListTarget({ spaceId, folderId: folder.id, folderName: folder.name });
            },
        },
        {
            icon: <FolderClosed size={15} />,
            label: 'Folder',
            sublabel: 'Group Lists, Docs & more',
            onClick: () => {
                tree.setCreateFolderTarget({ spaceId, spaceName });
            },
        },
    ];

    return (
        <div className="mb-0.5">
            <div
                className={`group flex items-center gap-0.5 rounded-md px-2 py-1.25 text-[12.5px] font-medium transition-all ${
                    isFolderActive
                        ? 'bg-[#e8f0fe] text-[#1a73e8]'
                        : 'text-[var(--color-inverse-surface)] hover:bg-[#f3f4f8]'
                }`}
            >
                <span
                    role="button"
                    tabIndex={0}
                    className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-[#6b6f76] hover:bg-[#e2e4e9]"
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded((v) => !v);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpanded((v) => !v);
                        }
                    }}
                >
                    {expanded ? (
                        <ChevronDown size={13} />
                    ) : (
                        <ChevronRight size={13} />
                    )}
                </span>
                <div
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5"
                >
                    <FolderClosed size={14} className={`shrink-0 ${isFolderActive ? 'text-[#1a73e8]' : 'text-[#6b6f76]'}`} />
                    <span className={`truncate ${isFolderActive ? 'font-semibold' : 'font-medium'}`}>{folder.name}</span>
                </div>

                {/* Hover actions */}
                <div className="ml-auto hidden shrink-0 items-center gap-0.5 group-hover:flex">
                    <span
                        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-[#6b6f76] hover:bg-[#e2e4e9] hover:text-[var(--color-inverse-surface)] transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            setFolderCreateMenu(null);
                            setFolderMenu(folderMenu ? null : { x: e.clientX, y: e.clientY });
                        }}
                    >
                        <MoreHorizontal size={14} />
                    </span>
                    <span
                        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-[#6b6f76] hover:bg-[#e2e4e9] hover:text-[#1a73e8] transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            setFolderMenu(null);
                            setFolderCreateMenu(folderCreateMenu ? null : { x: e.clientX, y: e.clientY });
                        }}
                    >
                        <Plus size={14} />
                    </span>
                </div>
            </div>

            {expanded && folder.lists.length > 0 && (
                <div className="ml-4.5 border-l border-[var(--color-border)] pl-2">
                    {folder.lists.map((list) => (
                        <ListNode
                            key={list.id}
                            list={list}
                            spaceId={spaceId}
                            spaceName={spaceName}
                            folderId={folder.id}
                            folderNameForList={folder.name}
                        />
                    ))}
                </div>
            )}

            {/* Folder "..." context menu */}
            {folderMenu && (
                <ContextMenu
                    items={folderMenuItems}
                    position={folderMenu}
                    onClose={() => setFolderMenu(null)}
                />
            )}

            {/* Folder "+" create menu */}
            {folderCreateMenu && (
                <ContextMenu
                    items={folderCreateItems}
                    position={folderCreateMenu}
                    onClose={() => setFolderCreateMenu(null)}
                />
            )}
        </div>
    );
};
