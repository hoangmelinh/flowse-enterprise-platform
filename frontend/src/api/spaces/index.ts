import type { SpaceData, SpaceDetail } from "@/store/modules/spaces";
import type { SpaceMember } from "@/types/spaces";
import { beApi } from "../callApi";
export interface FolderData {
    folder_id: number;
    space_id: number;
    name: string;
    position: number;
    created_by: number | null;
    created_at: string;
    updated_at: string;
    lists: ListData[];
}

export interface ListData {
    list_id: number;
    folder_id: number | null;
    space_id: number;
    name: string;
    position: number;
    created_by: number | null;
    created_at: string;
    updated_at: string;
}
export const getSpacesForWorkspace = async (workspace_id: number) : Promise<SpaceDetail[]> => {
    return beApi.get(`/spaces/workspaces/${workspace_id}`);
}

export const createSpace = async (workspace_id: number, name: string, description: string, color: string, is_private?: boolean) : Promise<SpaceData> => {
    return beApi.post(`/spaces/workspaces/${workspace_id}`, { name, description, color, isPrivate: is_private });
}

export const updateSpace = async (space_id: number, name: string, description: string, color: string) : Promise<SpaceData> => {
    return beApi.put(`/spaces/${space_id}`, { name, description, color });
}
    
export const deleteSpace = async (space_id: number) => {
    return beApi.delete(`/spaces/${space_id}`);
}

export const getSpaceMembers = async (space_id: number): Promise<SpaceMember[]> => {
    return beApi.get(`/spaces/${space_id}/members`);
}

export const getSpaceDetails = async (space_id: number) : Promise<SpaceDetail> => {
    return beApi.get(`/spaces/spacesDetails/${space_id}`);
}

export const createFolder = async (space_id: number, name: string): Promise<FolderData> => {
    return beApi.post(`/folders/spaces/${space_id}`, { name });
};

export const updateFolder = async (folder_id: number, name: string): Promise<FolderData> => {
    return beApi.put(`/folders/${folder_id}`, { name });
};

export const deleteFolder = async (folder_id: number): Promise<void> => {
    return beApi.delete(`/folders/${folder_id}`);
};

export const createList = async (space_id: number, folder_id: number | null, name: string): Promise<ListData> => {
    return beApi.post(`/lists`, { space_id, folder_id, name });
};

export const updateList = async (list_id: number, name: string): Promise<ListData> => {
    return beApi.put(`/lists/${list_id}`, { name });
};

export const deleteList = async (list_id: number): Promise<void> => {
    return beApi.delete(`/lists/${list_id}`);
};
