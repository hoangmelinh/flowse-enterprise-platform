import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    MoreHorizontal,
    Plus,
    ListTodo,
    FolderClosed,
    Trash2,
} from 'lucide-react';
import { useSpaceTree } from '../../../SpaceTreeContext';
import { ContextMenu } from '../ContextMenu';
import type { MenuEntry } from '../../types';

export const ListNode = ({
    list,
    spaceId,
    spaceName,
    folderId,
    folderNameForList,
}: {
    list: { id: string; name: string; count?: number };
    spaceId: string;
    spaceName: string;
    folderId: string | null;
    folderNameForList: string;
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const tree = useSpaceTree();
    const [listMenu, setListMenu] = useState<{ x: number; y: number } | null>(null);
    const [listCreateMenu, setListCreateMenu] = useState<{ x: number; y: number } | null>(null);
    const isActive = location.pathname === `/space/${spaceId}/list/${list.id}`;

    const listMenuItems: MenuEntry[] = [
        {
            icon: <Trash2 size={14} />,
            label: 'Delete',
            danger: true,
            onClick: async () => {
                await tree.handleDeleteList(spaceId, folderId, list.id);
                if (location.pathname === `/list/${list.id}`) {
                    navigate('/home');
                }
            },
        },
    ];

    const listCreateItems: MenuEntry[] = [
        {
            icon: <ListTodo size={15} />,
            label: 'List',
            sublabel: 'Track tasks, projects & more',
            onClick: () => {
                tree.setCreateListTarget({
                    spaceId,
                    folderId,
                    folderName: folderNameForList,
                });
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
        <div
            className={`group relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.25 text-[12.5px] transition-all ${
                isActive ? 'bg-[#e8f0fe] text-[#1a73e8] font-semibold' : 'text-[var(--color-inverse-surface)] hover:bg-[#f3f4f8]'
            }`}
            onClick={() => navigate(`/space/${spaceId}/list/${list.id}`)}
        >
            <ListTodo size={14} className="shrink-0 text-[#6b6f76]" />
            <span className="min-w-0 flex-1 truncate">{list.name}</span>
            {list.count !== undefined && list.count > 0 && (
                <span className="shrink-0 text-[11px] text-[#9b9ea4] font-medium">{list.count}</span>
            )}
            <div className="ml-auto hidden shrink-0 items-center gap-0.5 group-hover:flex">
                <span
                    className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-[#6b6f76] hover:bg-[#e2e4e9] hover:text-[var(--color-inverse-surface)] transition-all"
                    onClick={(e) => {
                        e.stopPropagation();
                        setListCreateMenu(null);
                        setListMenu(listMenu ? null : { x: e.clientX, y: e.clientY });
                    }}
                >
                    <MoreHorizontal size={14} />
                </span>
                <span
                    className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-[#6b6f76] hover:bg-[#e2e4e9] hover:text-[#1a73e8] transition-all"
                    onClick={(e) => {
                        e.stopPropagation();
                        setListMenu(null);
                        setListCreateMenu(listCreateMenu ? null : { x: e.clientX, y: e.clientY });
                    }}
                >
                    <Plus size={14} />
                </span>
            </div>

            {listMenu && (
                <ContextMenu items={listMenuItems} position={listMenu} onClose={() => setListMenu(null)} />
            )}
            {listCreateMenu && (
                <ContextMenu items={listCreateItems} position={listCreateMenu} onClose={() => setListCreateMenu(null)} />
            )}
        </div>
    );
};
