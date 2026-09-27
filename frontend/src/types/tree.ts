
export interface ListItem {
    id: string;
    name: string;
    count?: number;
}

export interface FolderItem {
    id: string;
    name: string;
    lists: ListItem[];
}

export interface SpaceTreeNode {
    folders: FolderItem[];
    standaloneLists: ListItem[];
}

export interface SpaceTreeData {
    [spaceId: string]: SpaceTreeNode;
}
