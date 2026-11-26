import { useSelector } from 'react-redux';
import type { RootState } from '@/store/configureStore';
import type { UserCapabilities } from '@/api/users';

const DEFAULT_CAPABILITIES: UserCapabilities = {
    can_scan_qr: false,
    can_report_incident: true,
    can_triage_incident: false,
    can_execute_repair: false,
    can_verify_incident: false,
    can_close_incident: false,
    can_run_inspection: false,
    can_approve: false,
    can_create_task: true,
    can_assign_work: false,
    is_admin: false,
    is_manager: false,
    can_access_cms: false,
    can_manage_workspace: false,
    can_manage_members: false,
    can_manage_departments: false,
    can_manage_assets: false,
    can_manage_workflows: false,
    can_manage_inspections: false,
    can_view_audit: false,
    can_view_analytics: false,
};

export function useCapabilities() {
    const context = useSelector((s: RootState) => s.users.context);
    const isLoadingContext = useSelector((s: RootState) => s.users.isLoadingContext);
    const workspaces = useSelector((s: RootState) => s.workspaces.listWorkspaces);
    const currentWorkspaceId = useSelector((s: RootState) => s.workspaces.currentWorkspaceId);

    const activeWorkspace = workspaces.find((w) => w.workspace_id === currentWorkspaceId);
    const fallbackRole = activeWorkspace?.role_name?.toLowerCase();

    const capabilities: UserCapabilities = context?.capabilities
        ? context.capabilities
        : {
              ...DEFAULT_CAPABILITIES,
              is_admin: fallbackRole === 'admin',
              is_manager: fallbackRole === 'admin' || fallbackRole === 'manager',
              can_access_cms: fallbackRole === 'admin' || fallbackRole === 'manager',
              can_approve: fallbackRole === 'admin' || fallbackRole === 'manager',
              can_triage_incident: fallbackRole === 'admin' || fallbackRole === 'manager',
              can_assign_work: fallbackRole === 'admin' || fallbackRole === 'manager',
          };

    const currentRole = context?.current_role || fallbackRole || 'member';

    return {
        context,
        isLoadingContext,
        currentRole,
        capabilities,
        isAdmin: Boolean(capabilities.is_admin || currentRole === 'admin'),
        isManager: Boolean(capabilities.is_manager || currentRole === 'admin' || currentRole === 'manager'),
        canAccessCms: Boolean(capabilities.can_access_cms),
    };
}
