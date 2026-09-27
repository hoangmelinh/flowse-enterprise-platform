export interface WorkspaceMemberData {
    user_id: number;
    username: string;
    name : string; 
    email: string;
    avatar_url: string;
    role_name: string;
}

/** Mirrors PostgreSQL `workspaces` columns (snake_case). */
export interface WorkspacesData {
    workspace_id: number;
    name: string;
    slug: string;
    description: string | null;
    plan?: string;
    created_by: number | null;
    created_at?: string;
    updated_at?: string;
}
export interface invationVerificationData {
    email : string;
    inviterName : string;
    inviterEmail : string;
    isUserExists : boolean;
    workspaceId : string;
    workspaceName : string;
}
export interface WorkspacesState {
    listWorkspaces: WorkspacesData[];
    currentWorkspaceId: number | null;
    isLoadingWorkspaces: boolean;
    isSendingInvitations: boolean;
    isRespondingInvitation: boolean;
    error: string | null;
    listWorkspaceMembers: WorkspaceMemberData[];    
    isLoadingWorkspaceMembers: boolean;
    workspaceMembersError: string | null;
    isVerifyingInvitation: boolean;
    verifyInvitationError: string | null;
    verifyInvitationData: invationVerificationData | null;
    isUpdatingWorkspace: boolean;
    updateWorkspaceError: string | null;
    currentWorkspaceDetail: WorkspacesData | null;
    isLoadingWorkspaceDetail: boolean;
}