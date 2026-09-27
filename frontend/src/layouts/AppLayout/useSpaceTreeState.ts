import { useState, useEffect, useRef, useCallback, type MouseEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { SpaceItem } from '@/types/spaces';
import type { SpaceTreeData } from '@/types/tree';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { fetchSpacesForWorkspace, fetchCreateSpace } from '@/store/modules/spaces';
import { deleteSpace } from '@/api/spaces';
import { createFolder, removeFolder, createList, removeList } from '@/store/modules/tree';
import { fetchCreateSprint, fetchDeleteSprint, fetchSprintsBySpace } from '@/store/modules/sprints';

export function useSpaceTreeState() {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();

    const listSpaces = useAppSelector((state) => state.spaces.listSpaces);
    const currentWorkspaceId = useAppSelector((state) => state.workspaces.currentWorkspaceId);

    const spaces: SpaceItem[] = listSpaces.map((s) => ({
        id: String(s.spaceId),
        name: s.name,
        color: s.color || '#0058be',
    }));

    const spaceTree: SpaceTreeData = listSpaces.reduce<SpaceTreeData>((acc, s) => {
        acc[String(s.spaceId)] = {
            folders: (s.folders ?? []).map((f) => ({
                id: String(f.folder_id),
                name: f.name,
                lists: (f.lists ?? []).map((l) => ({
                    id: String(l.list_id),
                    name: l.name,
                    count: 0,
                })),
            })),
            standaloneLists: (s.lists ?? []).map((l) => ({
                id: String(l.list_id),
                name: l.name,
                count: 0,
            })),
        };
        return acc;
    }, {});

    const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);

    const [actionMenu, setActionMenu] = useState<{
        spaceId: string;
        spaceName: string;
        x: number;
        y: number;
    } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const [isWorkspaceDialogOpen, setIsWorkspaceDialogOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    const [createFolderTarget, setCreateFolderTarget] = useState<{
        spaceId: string;
        spaceName: string;
    } | null>(null);

    const [createListTarget, setCreateListTarget] = useState<{
        spaceId: string;
        folderId: string | null;
        folderName: string;
    } | null>(null);

    const [createSprintTarget, setCreateSprintTarget] = useState<{
        spaceId: string;
        spaceName: string;
    } | null>(null);

    useEffect(() => {
        const handleClick = () => setActionMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);


    const handleCreateSpace = async (name: string, color: string, is_private?: boolean) => {
        if (!currentWorkspaceId) return;
        try {
            await dispatch(
                fetchCreateSpace({
                    workspace_id: currentWorkspaceId,
                    name,
                    description: '',
                    color: color || '#0058be',
                    is_private: is_private || false,
                }),
            ).unwrap();
            dispatch(fetchSpacesForWorkspace(currentWorkspaceId));
        } catch (error) {
            console.error('Failed to create space:', error);
        }
    };

    const handleSpaceAction = (e: MouseEvent, spaceId: string, spaceName: string) => {
        e.stopPropagation();
        setActionMenu({ spaceId, spaceName, x: e.clientX, y: e.clientY });
    };

    const handleDeleteSpace = useCallback(
        async (spaceId: string) => {
            if (!currentWorkspaceId) return;
            try {
                await deleteSpace(parseInt(spaceId, 10));
                dispatch(fetchSpacesForWorkspace(currentWorkspaceId));
                setActionMenu(null);
                if (location.pathname.startsWith(`/space/${spaceId}`)) {
                    navigate('/home');
                }
            } catch (error) {
                console.error('Failed to delete space:', error);
            }
        },
        [location.pathname, navigate, dispatch, currentWorkspaceId],
    );

    const handleCreateFolder = async (name: string) => {
        if (!createFolderTarget) return;
        const { spaceId } = createFolderTarget;
        try {
            await dispatch(createFolder({ spaceId: parseInt(spaceId, 10), name })).unwrap();
            if (currentWorkspaceId) dispatch(fetchSpacesForWorkspace(currentWorkspaceId));
        } catch (error) {
            console.error('Failed to create folder:', error);
        }
        setCreateFolderTarget(null);
    };

    const handleDeleteFolder = async (spaceId: string, folderId: string) => {
        try {
            await dispatch(removeFolder({ spaceId, folderId })).unwrap();
            if (currentWorkspaceId) dispatch(fetchSpacesForWorkspace(currentWorkspaceId));
        } catch (error) {
            console.error('Failed to delete folder:', error);
        }
    };

    const handleCreateList = async (name: string) => {
        if (!createListTarget) return;
        const { spaceId, folderId } = createListTarget;
        try {
            await dispatch(
                createList({
                    spaceId: parseInt(spaceId, 10),
                    folderId: folderId ? parseInt(folderId, 10) : null,
                    name,
                }),
            ).unwrap();
            if (currentWorkspaceId) dispatch(fetchSpacesForWorkspace(currentWorkspaceId));
        } catch (error) {
            console.error('Failed to create list:', error);
        }
        setCreateListTarget(null);
    };

    const handleDeleteList = async (spaceId: string, folderId: string | null, listId: string) => {
        try {
            await dispatch(removeList({ spaceId, folderId, listId })).unwrap();
            if (currentWorkspaceId) dispatch(fetchSpacesForWorkspace(currentWorkspaceId));
        } catch (error) {
            console.error('Failed to delete list:', error);
        }
    };

    const handleCreateSprint = async (data: { name: string; description?: string; goal?: string; startDate?: string; endDate?: string }) => {
        if (!createSprintTarget) return;
        const { spaceId } = createSprintTarget;
        try {
            await dispatch(fetchCreateSprint({ spaceId: parseInt(spaceId, 10), ...data })).unwrap();
        } catch (error) {
            console.error('Failed to create sprint:', error);
        }
        setCreateSprintTarget(null);
    };

    const handleDeleteSprint = async (sprintId: number) => {
        try {
            await dispatch(fetchDeleteSprint(sprintId)).unwrap();
        } catch (error) {
            console.error('Failed to delete sprint:', error);
        }
    };

    return {
        spaces,
        spaceTree,
        isCreateSpaceOpen,
        setIsCreateSpaceOpen,
        actionMenu,
        setActionMenu,
        menuRef,
        handleCreateSpace,
        handleSpaceAction,
        handleDeleteSpace,
        isWorkspaceDialogOpen,
        setIsWorkspaceDialogOpen,
        isInviteModalOpen,
        setIsInviteModalOpen,
        createFolderTarget,
        setCreateFolderTarget,
        createListTarget,
        setCreateListTarget,
        handleCreateFolder,
        handleCreateList,
        handleDeleteFolder,
        handleDeleteList,
        createSprintTarget,
        setCreateSprintTarget,
        handleCreateSprint,
        handleDeleteSprint,
        fetchSprintsBySpace,
    };
}
