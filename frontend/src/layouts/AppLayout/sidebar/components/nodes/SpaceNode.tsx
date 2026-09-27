import { useState, useEffect } from 'react'; // Bổ sung import useEffect
import { useNavigate, useLocation } from 'react-router-dom';
import {
    ChevronDown,
    ChevronRight,
    Plus,
    ListTodo,
    FolderClosed,
    FileText,
    Zap,
    Trash2,
    MoreHorizontal,
} from 'lucide-react';
import { useSpaceTree } from '../../../SpaceTreeContext';
import { ContextMenu } from '../ContextMenu';
import { CreateMenu } from '../CreateMenu';
import { FolderNode } from './FolderNode';
import { ListNode } from './ListNode';
import { SprintNode } from './SprintNode';
import type { SpaceItem } from '@/types/spaces';
import type { MenuEntry } from '../../types';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { fetchSprintsBySpace } from '@/store/modules/sprints';

export const SpaceNode = ({ space }: { space: SpaceItem }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const tree = useSpaceTree();
    const dispatch = useAppDispatch();

    // Lọc lấy danh sách Sprint thuộc Space hiện tại (Ép kiểu đồng nhất để tránh lỗi)
    const sprints = useAppSelector(s => s.sprints.listSprints).filter(
        sp => Number(sp.space_id) === Number(space.id)
    );

    const isSpaceActive = location.pathname.startsWith(`/space/${space.id}`);
    const [expanded, setExpanded] = useState(isSpaceActive);

    const treeNode = tree.spaceTree[space.id] || { folders: [], standaloneLists: [] };
    const { folders, standaloneLists } = treeNode;
    const initial = space?.name ? space.name.charAt(0).toUpperCase() : '?';

    const [settingsMenu, setSettingsMenu] = useState<{ x: number; y: number } | null>(null);
    const [createMenuPos, setCreateMenuPos] = useState<{ x: number; y: number } | null>(null);

    // XỬ LÝ SỰ KIỆN: Tự động tải danh sách Sprints khi Space được mở rộng (expanded)
    useEffect(() => {
        if (expanded) {
            dispatch(fetchSprintsBySpace(Number(space.id)));
        }
    }, [expanded, space.id, dispatch]);

    const settingsItems: MenuEntry[] = [
        {
            icon: <Plus size={15} />,
            label: 'Create new',
            hasSubmenu: true,
            submenuItems: [
                {
                    icon: <ListTodo size={15} />,
                    label: 'List',
                    sublabel: 'Track tasks, projects & more',
                    onClick: () => {
                        tree.setCreateListTarget({ spaceId: space.id, folderId: null, folderName: space.name });
                    },
                },
                {
                    icon: <FolderClosed size={15} />,
                    label: 'Folder',
                    sublabel: 'Group Lists, Docs & more',
                    onClick: () => {
                        tree.setCreateFolderTarget({ spaceId: space.id, spaceName: space.name });
                    },
                },
                {
                    icon: <Zap size={15} />, label: 'Sprint', sublabel: 'Scrum sprint planning',
                    onClick: () => {
                        tree.setCreateSprintTarget({ spaceId: space.id, spaceName: space.name });
                    },
                },
            ],
        },
        'divider',
        {
            icon: <Trash2 size={15} />,
            label: 'Delete',
            danger: true,
            onClick: () => tree.handleDeleteSpace(space.id),
        },
    ];

    return (
        <div className="mb-0.5">
            <div
                className={`group flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-semibold transition-all ${isSpaceActive
                        ? 'bg-[#e8f0fe] text-[#1a73e8]'
                        : 'text-[var(--color-inverse-surface)] hover:bg-[#f3f4f8]'
                    }`}
                onClick={() => {
                    navigate(`/space/${space.id}`);
                    if (!expanded) {
                        setExpanded(true); // Đã chuyển logic gọi API vào useEffect
                    }
                }}
            >
                <span
                    className="flex shrink-0 cursor-pointer items-center justify-center"
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpanded(!expanded); // Effect sẽ bắt sự kiện này để gọi API
                    }}
                >
                    {expanded ? (
                        <ChevronDown size={14} className="text-[#6b6f76]" />
                    ) : (
                        <ChevronRight size={14} className="text-[#6b6f76]" />
                    )}
                </span>
                <span
                    className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
                    style={{ backgroundColor: space.color }}
                >
                    {initial ? initial : <FileText size={12} color="#fff" />}
                </span>

                <span className="flex-1 truncate">{space.name}</span>

                <div className="ml-auto hidden items-center gap-0.5 group-hover:flex">
                    <span
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[#6b6f76] hover:bg-[#e2e4e9] hover:text-[var(--color-inverse-surface)] transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            setCreateMenuPos(null);
                            setSettingsMenu(settingsMenu ? null : { x: e.clientX, y: e.clientY });
                        }}
                    >
                        <MoreHorizontal size={15} />
                    </span>
                    <span
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-[#6b6f76] hover:bg-[#e2e4e9] hover:text-[#1a73e8] transition-all"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSettingsMenu(null);
                            setCreateMenuPos(createMenuPos ? null : { x: e.clientX, y: e.clientY });
                        }}
                    >
                        <Plus size={15} />
                    </span>
                </div>
            </div>

            {expanded && (
                <div className="ml-3.5 border-l border-[var(--color-border)] pl-1.5 mt-0.5">
                    {folders.map((folder) => (
                        <FolderNode key={folder.id} folder={folder} spaceId={space.id} spaceName={space.name} />
                    ))}
                    {standaloneLists.map((list) => (
                        <ListNode
                            key={list.id}
                            list={list}
                            spaceId={space.id}
                            spaceName={space.name}
                            folderId={null}
                            folderNameForList={space.name}
                        />
                    ))}

                    {/* Sprints Section */}
                    {sprints.length > 0 && (
                        <>
                            <div className="mt-1.5 mb-0.5 px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                                Sprints
                            </div>
                            {sprints.map((sprint) => (
                                <SprintNode
                                    key={sprint.sprint_id}
                                    sprint={sprint}
                                    spaceId={space.id}
                                    onDelete={tree.handleDeleteSprint}
                                />
                            ))}
                        </>
                    )}
                </div>
            )}

            {settingsMenu && (
                <ContextMenu
                    items={settingsItems}
                    position={settingsMenu}
                    onClose={() => setSettingsMenu(null)}
                />
            )}

            {createMenuPos && (
                <CreateMenu
                    position={createMenuPos}
                    onClose={() => setCreateMenuPos(null)}
                    spaceId={space.id}
                    spaceName={space.name}
                />
            )}
        </div>
    );
};
