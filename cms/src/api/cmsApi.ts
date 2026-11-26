import { cmsHttp } from '@/api/client';

export interface CmsUserCapabilities {
    is_admin: boolean;
    is_manager: boolean;
    can_access_cms: boolean;
    can_manage_workspace: boolean;
    can_manage_members: boolean;
    can_manage_departments: boolean;
    can_manage_assets: boolean;
    can_manage_workflows: boolean;
    can_manage_inspections: boolean;
    can_view_audit: boolean;
    can_view_analytics: boolean;
    can_approve: boolean;
    can_triage_incident: boolean;
    can_assign_work: boolean;
}

export interface CmsWorkspaceSummary {
    workspace_id: number;
    name: string;
    slug: string;
    description?: string | null;
    role_name: string;
    owner_id?: number;
}

export interface CmsDepartment {
    id: number;
    department_id?: number;
    workspace_id?: number | null;
    name: string;
    code: string;
    manager_id?: number | null;
    manager_name?: string | null;
    parent_id?: number | null;
    member_count?: number | string;
    children?: CmsDepartment[];
}

export interface CmsUserContext {
    user: {
        user_id: number;
        name: string;
        email: string;
        username?: string;
        employee_code?: string | null;
        department_id?: number | null;
        department_name?: string | null;
        is_active?: boolean;
    };
    workspaces: CmsWorkspaceSummary[];
    current_workspace_id: number | null;
    current_role: string;
    departments: CmsDepartment[];
    accessible_department_ids: number[] | null;
    managed_department_ids: number[];
    capabilities: CmsUserCapabilities;
}

export interface CmsMember {
    user_id: number;
    name: string;
    email: string;
    username: string;
    avatar_url?: string | null;
    employee_code?: string | null;
    department_id?: number | null;
    department_name?: string | null;
    is_active?: boolean;
    role_id: number;
    role_name: string;
    joined_at?: string;
}

export interface RolePermissionMatrix {
    roles: Array<{ role_id: number; role_name: string }>;
    permissions: Array<{
        permission_id: number;
        permission_name: string;
        description?: string;
        group_name?: string;
    }>;
    mappings: Array<{ role_id: number; permission_id: number }>;
}

export interface CmsInvitation {
    invitation_id: number;
    email: string;
    role_id: number;
    status: string;
    invited_by_name?: string;
    created_at: string;
}

export type AssetStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'FAULTY' | 'DECOMMISSIONED';

export interface CmsAsset {
    asset_id: number;
    workspace_id?: number | null;
    asset_code: string;
    name: string;
    location?: string | null;
    department_id?: number | null;
    department_name?: string | null;
    status: AssetStatus;
    qr_token: string;
    health_score?: number;
    incident_count?: number | string;
    specs?: {
        manufacturer?: string;
        model?: string;
        serial_number?: string;
        notes?: string;
        [key: string]: unknown;
    };
}

export interface CmsInspectionItem {
    item_id?: number;
    question: string;
    require_evidence: boolean;
    fail_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    position?: number;
}

export interface CmsInspectionTemplate {
    checklist_id: number;
    asset_id?: number | null;
    asset_name?: string | null;
    asset_code?: string | null;
    title: string;
    description?: string | null;
    is_active: boolean;
    items?: CmsInspectionItem[];
    item_count?: number | string;
}

export interface CmsInspectionRun {
    run_id: number;
    checklist_id: number;
    checklist_title?: string;
    asset_id?: number;
    asset_code?: string;
    asset_name?: string;
    overall_status: 'PASS' | 'FAIL' | 'IN_PROGRESS';
    inspector_name?: string;
    inspector_email?: string;
    failed_count?: number | string;
    total_count?: number | string;
    started_at?: string;
    completed_at?: string;
}

export interface WorkflowDefinition {
    workflow_id: number;
    code: string;
    name: string;
    description?: string;
    version?: number;
    is_active?: boolean;
    created_at?: string;
}

export interface WorkflowState {
    state_id: number;
    workflow_id: number;
    code: string;
    name: string;
    color?: string;
    is_initial: boolean;
    is_terminal: boolean;
    position: number;
}

export interface WorkflowTransition {
    transition_id: number;
    workflow_id: number;
    from_state_id: number;
    to_state_id: number;
    transition_name: string;
    allowed_roles: string[];
    required_fields: string[];
    requires_approval: boolean;
    trigger_action?: string | null;
}

export interface SlaConfig {
    sla_config_id: number;
    workflow_id?: number | null;
    workflow_name?: string;
    workflow_code?: string;
    severity: string;
    target_response_minutes: number;
    target_resolve_minutes: number;
    warning_threshold_percent: number;
}

export interface AuditActivityItem {
    activity_id: number;
    task_id: number;
    action: string;
    action_label?: string;
    task_name?: string;
    work_item_type?: string;
    user_name?: string;
    username?: string;
    created_at: string;
    old_value?: unknown;
    new_value?: unknown;
}

export interface SyncLogItem {
    sync_id: number;
    user_id: number;
    user_name?: string;
    user_email?: string;
    idempotency_key: string;
    action_type: string;
    base_version?: number;
    server_version?: number;
    status: string;
    conflict_detail?: string | null;
    applied_at: string;
}

export interface OperationsSlaSummary {
    metCount: number;
    breachedCount: number;
    atRiskCount: number;
    inSlaCount: number;
    complianceRate: number | null;
}

export interface OperationsDepartmentRow {
    department_id: number;
    code: string;
    name: string;
    parent_id: number | null;
    manager_name?: string | null;
    active_members: number;
    open_tasks: number;
    open_requests: number;
    open_incidents: number;
    asset_count: number;
}

export interface OperationsOverviewData {
    meta: {
        workspaceId: number;
        period: 'today' | 'week' | 'month' | 'all';
        scope: 'all' | 'office' | 'industrial';
        departmentId: number | null;
        userScope: 'WORKSPACE' | 'DEPARTMENT';
        generatedAt: string;
    };
    enterprise: {
        openByType: {
            TASK: number;
            REQUEST: number;
            INCIDENT: number;
            INSPECTION: number;
        };
        overdueTotal: number;
        pendingApprovalsTotal: number;
        sla: OperationsSlaSummary;
    } | null;
    office: {
        openTasks: number;
        overdueTasks: number;
        openRequests: number;
        overdueRequests: number;
        createdInPeriod: number;
        completedInPeriod: number;
        completedOnTimeInPeriod: number;
        completedWithDueDateInPeriod: number;
        onTimeRate: number | null;
        pendingApprovals: number;
        sla: OperationsSlaSummary;
    } | null;
    industrial: {
        assetsByStatus: {
            total: number;
            OPERATIONAL: number;
            MAINTENANCE: number;
            FAULTY: number;
            DECOMMISSIONED: number;
        };
        incidents: {
            openTotal: number;
            openCritical: number;
            openHigh: number;
            totalInPeriod: number;
            resolvedInPeriod: number;
        };
        pendingMaintenanceApprovals: number;
        downtime: {
            totalElapsedMinutes: number;
            avgElapsedResolutionMinutes: number | null;
            repairDurationAvailable: boolean;
            repairDurationReason: string;
        };
        inspections: {
            totalRunsInPeriod: number;
            passCount: number;
            failCount: number;
            passRate: number | null;
        };
        sla: OperationsSlaSummary;
        topDowntimeAssets: Array<{
            asset_id: number;
            asset_code: string;
            asset_name: string;
            location?: string;
            status: AssetStatus;
            incident_count: number;
            total_elapsed_minutes: number;
        }>;
    } | null;
    departments: OperationsDepartmentRow[];
}

export interface AnalyticsSummaryData {
    healthScore: number;
    healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    executiveSummary: string;
    observedFacts?: string[];
    possibleCauses?: string[];
    recommendations?: string[];
    analysisSource?: 'llm' | 'factual_fallback';
    llmConfigured?: boolean;
    keyFindings: string[];
    rootCauses: string[];
    prescriptiveRecommendations: string[];
    metrics: {
        totalIncidents?: number;
        openIncidents?: number;
        resolvedIncidents?: number;
        totalDowntimeMinutes?: number;
        formattedTotalDowntime?: string;
        mttrMinutes?: number;
        slaMetCount?: number;
        slaBreachedCount?: number;
        topDowntimeAssets?: Array<{
            asset_id: number;
            asset_name: string;
            asset_code: string;
            location?: string;
            incident_count: number;
            total_downtime_minutes: number;
        }>;
    };
    openIncidentsCount: number;
    criticalIncidentsCount: number;
    period: string;
    generatedAt: string;
}

export interface AssetHealthRecordData {
    asset?: CmsAsset;
    timeline?: Array<{
        title?: string;
        event_type?: string;
        description?: string;
        created_at?: string;
    }>;
}

export interface CmsSignInResponse {
    message?: string;
    accessToken?: string;
    user: CmsUserContext['user'] & {
        access_token?: string;
    };
}

// Auth & Context
export const signInCms = (
    email: string,
    password: string
): Promise<CmsSignInResponse> =>
    cmsHttp.post('/auth/signin', { email, password });

export const signOutCms = (): Promise<void> => cmsHttp.post('/auth/signout');

export const getUserContexts = (workspaceId?: number): Promise<{ success: boolean; data: CmsUserContext }> =>
    cmsHttp.get('/users/contexts', { params: workspaceId ? { workspaceId } : undefined });

// Workspaces, Members & RBAC Matrix
export const getWorkspaceById = (workspaceId: number): Promise<CmsWorkspaceSummary> =>
    cmsHttp.get(`/workspaces/${workspaceId}`);

export const updateWorkspace = (
    workspaceId: number,
    payload: { name: string; slug: string; description?: string }
): Promise<CmsWorkspaceSummary> => cmsHttp.put(`/workspaces/${workspaceId}`, payload);

export const deleteWorkspace = (workspaceId: number, owner_id: number): Promise<void> =>
    cmsHttp.delete(`/workspaces/${workspaceId}`, { data: { owner_id } });

export const getWorkspaceMembers = (workspaceId: number): Promise<CmsMember[]> =>
    cmsHttp.get(`/workspaces/${workspaceId}/members`);

export const updateWorkspaceMember = (
    workspaceId: number,
    userId: number,
    payload: { role_name?: string; department_id?: number | null; is_active?: boolean }
): Promise<{ success: boolean; data: CmsMember }> =>
    cmsHttp.patch(`/workspaces/${workspaceId}/members/${userId}`, payload);

export const inviteMemberToWorkspace = (workspaceId: number, email: string, role: string) =>
    cmsHttp.post('/members/invitations', { workspace_id: workspaceId, email, role });

export const removeMemberFromWorkspace = (workspaceId: number, userId: number) =>
    cmsHttp.post('/members/remove-member', { workspace_id: workspaceId, user_id: userId });

export const getWorkspaceInvitations = (workspaceId: number): Promise<{ success: boolean; data: CmsInvitation[] }> =>
    cmsHttp.get(`/workspaces/${workspaceId}/invitations`);

export const getRolesMatrix = (): Promise<{ success: boolean; data: RolePermissionMatrix }> =>
    cmsHttp.get('/workspaces/roles/matrix');

// Departments
export const getDepartments = (workspaceId?: number | null): Promise<{ success: boolean; data: CmsDepartment[] }> =>
    cmsHttp.get('/departments', { params: workspaceId ? { workspaceId } : undefined });

export const getDepartmentTree = (workspaceId?: number | null): Promise<{ success: boolean; data: CmsDepartment[] }> =>
    cmsHttp.get('/departments/tree', { params: workspaceId ? { workspaceId } : undefined });

export const createDepartment = (payload: {
    name: string;
    code: string;
    parent_id?: number | null;
    manager_id?: number | null;
}): Promise<{ success: boolean; data: CmsDepartment }> => cmsHttp.post('/departments', payload);

export const updateDepartment = (
    id: number,
    payload: { name?: string; code?: string; parent_id?: number | null; manager_id?: number | null }
): Promise<{ success: boolean; data: CmsDepartment }> => cmsHttp.put(`/departments/${id}`, payload);

// Assets
export const getAssets = (workspaceId?: number | null): Promise<{ success: boolean; data: CmsAsset[] }> =>
    cmsHttp.get('/assets', { params: workspaceId ? { workspaceId } : undefined });

export const createAsset = (payload: Partial<CmsAsset>): Promise<{ success: boolean; data: CmsAsset }> =>
    cmsHttp.post('/assets', payload);

export const updateAsset = (id: number, payload: Partial<CmsAsset>): Promise<{ success: boolean; data: CmsAsset }> =>
    cmsHttp.put(`/assets/${id}`, payload);

export const rotateAssetQr = (id: number): Promise<{ success: boolean; data: CmsAsset }> =>
    cmsHttp.post(`/assets/${id}/rotate-qr`);

export const getAssetHealthRecord = (id: number): Promise<{ success: boolean; data: AssetHealthRecordData }> =>
    cmsHttp.get(`/assets/${id}/health-record`);

// Inspections
export const getInspectionTemplates = (): Promise<{ success: boolean; data: CmsInspectionTemplate[] }> =>
    cmsHttp.get('/inspections/templates');

export const getInspectionDetail = (id: number): Promise<{ success: boolean; data: CmsInspectionTemplate }> =>
    cmsHttp.get(`/inspections/${id}`);

export const createInspectionTemplate = (payload: {
    asset_id?: number | null;
    title: string;
    description?: string;
    items: CmsInspectionItem[];
}): Promise<{ success: boolean; data: CmsInspectionTemplate }> => cmsHttp.post('/inspections/templates', payload);

export const updateInspectionTemplate = (
    id: number,
    payload: {
        asset_id?: number | null;
        title?: string;
        description?: string;
        is_active?: boolean;
        items?: CmsInspectionItem[];
    }
): Promise<{ success: boolean; data: CmsInspectionTemplate }> => cmsHttp.put(`/inspections/templates/${id}`, payload);

export const getInspectionRuns = (workspaceId?: number | null): Promise<{ success: boolean; data: CmsInspectionRun[] }> =>
    cmsHttp.get('/inspections/runs', { params: workspaceId ? { workspaceId, limit: 80 } : { limit: 80 } });

// Workflows & SLA
export const getWorkflows = (): Promise<{ success: boolean; data: WorkflowDefinition[] }> =>
    cmsHttp.get('/workflows');

export const getWorkflowDetail = (
    id: number
): Promise<{
    success: boolean;
    data: { workflow: WorkflowDefinition; states: WorkflowState[]; transitions: WorkflowTransition[] };
}> => cmsHttp.get(`/workflows/${id}`);

export const createWorkflow = (payload: {
    code: string;
    name: string;
    description?: string;
    entity_type?: string;
}): Promise<{ success: boolean; data: WorkflowDefinition }> => cmsHttp.post('/workflows', payload);

export const createWorkflowState = (
    workflowId: number,
    payload: Partial<WorkflowState>
): Promise<{ success: boolean; data: WorkflowState }> => cmsHttp.post(`/workflows/${workflowId}/states`, payload);

export const updateWorkflowState = (
    stateId: number,
    payload: Partial<WorkflowState>
): Promise<{ success: boolean; data: WorkflowState }> => cmsHttp.put(`/workflows/states/${stateId}`, payload);

export const createWorkflowTransition = (
    workflowId: number,
    payload: Partial<WorkflowTransition>
): Promise<{ success: boolean; data: WorkflowTransition }> =>
    cmsHttp.post(`/workflows/${workflowId}/transitions`, payload);

export const updateWorkflowTransition = (
    transitionId: number,
    payload: Partial<WorkflowTransition>
): Promise<{ success: boolean; data: WorkflowTransition }> =>
    cmsHttp.put(`/workflows/transitions/${transitionId}`, payload);

export const deleteWorkflowTransition = (transitionId: number): Promise<{ success: boolean }> =>
    cmsHttp.delete(`/workflows/transitions/${transitionId}`);

export const getSlaConfigs = (): Promise<{ success: boolean; data: SlaConfig[] }> =>
    cmsHttp.get('/workflows/sla-configs');

export const createSlaConfig = (payload: Partial<SlaConfig>): Promise<{ success: boolean; data: SlaConfig }> =>
    cmsHttp.post('/workflows/sla-configs', payload);

export const updateSlaConfig = (
    id: number,
    payload: Partial<SlaConfig>
): Promise<{ success: boolean; data: SlaConfig }> => cmsHttp.put(`/workflows/sla-configs/${id}`, payload);

// Audit, Sync & Analytics
export const getWorkspaceActivities = (
    workspaceId: number,
    params?: { action?: string; work_item_type?: string; search?: string }
): Promise<{ success: boolean; data: AuditActivityItem[] }> =>
    cmsHttp.get(`/activities/workspace/${workspaceId}`, { params });

export const getSyncLogs = (workspaceId?: number | null): Promise<{ success: boolean; data: SyncLogItem[] }> =>
    cmsHttp.get('/sync/logs', { params: workspaceId ? { workspaceId, limit: 80 } : { limit: 80 } });

export const getOperationsOverview = (
    workspaceId: number,
    params: { period?: string; scope?: string; departmentId?: number | null },
    signal?: AbortSignal
): Promise<{ success: boolean; data: OperationsOverviewData }> =>
    cmsHttp.get(`/workspaces/${workspaceId}/operations-overview`, {
        params: {
            period: params.period || 'month',
            scope: params.scope || 'all',
            ...(params.departmentId ? { departmentId: params.departmentId } : {}),
        },
        signal,
    });

export const getAnalyticsSummary = (
    period: string = 'month',
    workspaceId?: number | null,
    signal?: AbortSignal
): Promise<{ success: boolean; data: AnalyticsSummaryData }> =>
    cmsHttp.post('/ai/analytics-summary', { period, ...(workspaceId ? { workspaceId } : {}) }, { signal });
