import type { NewTaskData } from "../tasks";
export interface ContextMenuProps {
    x: number;
    y: number;
    isOpen: boolean;
    onClose: () => void;
    onAction: (action: string) => void;
    taskTitle?: string;
}

export interface CreateFolderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
    spaceName: string;
}

export interface CreateListModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
    folderName: string;
}

export interface CreateSpaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, color: string, is_private?: boolean) => void;
}

export interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (task: NewTaskData) => void;
    defaultStatus?: string;
    lists?: { id: number; name: string }[];
    defaultListId?: number;
}

