export interface SpaceMember {
    user_id: number;
    name: string;
    email: string;
    avatar_url: string | null;
    role_name: string;
}

export interface SpaceItem {
    id: string;
    name: string;
    color: string;
}

export interface SpaceHeaderProps {
    currentSpace: SpaceItem | undefined;
}