// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UsersRolesPage from '@/pages/UsersRolesPage';
import InspectionsAdminPage from '@/pages/InspectionsAdminPage';
import WorkflowsSlaPage from '@/pages/WorkflowsSlaPage';
import WorkspaceSettingsPage from '@/pages/WorkspaceSettingsPage';

vi.setConfig({ testTimeout: 15000 });

const mockUseCmsAuth = vi.fn();
const mockGetWorkspaceMembers = vi.fn();
const mockGetDepartments = vi.fn();
const mockGetRolesMatrix = vi.fn();
const mockGetWorkspaceInvitations = vi.fn();
const mockGetInspectionTemplates = vi.fn();
const mockGetInspectionRuns = vi.fn();
const mockGetAssets = vi.fn();
const mockGetWorkflows = vi.fn();
const mockGetWorkflowDetail = vi.fn();
const mockGetSlaConfigs = vi.fn();
const mockGetWorkspaceById = vi.fn();

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}
Object.defineProperty(globalThis, 'ResizeObserver', {
    writable: true,
    value: MockResizeObserver,
});

vi.mock('@/context/CmsAuthContext', () => ({
    useCmsAuth: () => mockUseCmsAuth(),
}));

vi.mock('@/api/cmsApi', async () => {
    const actual = await vi.importActual<typeof import('@/api/cmsApi')>('@/api/cmsApi');
    return {
        ...actual,
        getWorkspaceMembers: (...args: unknown[]) => mockGetWorkspaceMembers(...args),
        getDepartments: (...args: unknown[]) => mockGetDepartments(...args),
        getRolesMatrix: (...args: unknown[]) => mockGetRolesMatrix(...args),
        getWorkspaceInvitations: (...args: unknown[]) => mockGetWorkspaceInvitations(...args),
        getInspectionTemplates: (...args: unknown[]) => mockGetInspectionTemplates(...args),
        getInspectionRuns: (...args: unknown[]) => mockGetInspectionRuns(...args),
        getAssets: (...args: unknown[]) => mockGetAssets(...args),
        getWorkflows: (...args: unknown[]) => mockGetWorkflows(...args),
        getWorkflowDetail: (...args: unknown[]) => mockGetWorkflowDetail(...args),
        getSlaConfigs: (...args: unknown[]) => mockGetSlaConfigs(...args),
        getWorkspaceById: (...args: unknown[]) => mockGetWorkspaceById(...args),
    };
});

const adminAuth = {
    currentWorkspaceId: 4,
    currentRole: 'admin',
    isAdmin: true,
    isManager: true,
    capabilities: {
        is_admin: true,
        is_manager: true,
        can_access_cms: true,
        can_manage_workspace: true,
        can_manage_members: true,
        can_manage_departments: true,
        can_manage_assets: true,
        can_manage_workflows: true,
        can_manage_inspections: true,
        can_view_audit: true,
        can_view_analytics: true,
        can_approve: true,
        can_triage_incident: true,
        can_assign_work: true,
    },
    context: { user: { user_id: 1, name: 'Admin', email: 'admin@anphat.vn' } },
    refreshContext: vi.fn(),
    logout: vi.fn(),
};

const managerAuth = {
    ...adminAuth,
    currentRole: 'manager',
    isAdmin: false,
    capabilities: {
        ...adminAuth.capabilities,
        is_admin: false,
        can_manage_workspace: false,
        can_manage_members: false,
        can_manage_departments: false,
        can_manage_assets: false,
        can_manage_workflows: false,
        can_manage_inspections: false,
    },
};

describe('CMS Full Rollout — Capability-Based UI & Tenant Boundaries', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        mockGetWorkspaceMembers.mockResolvedValue([
            { user_id: 1, name: 'Admin', email: 'admin@anphat.vn', username: 'admin', role_id: 1, role_name: 'admin', is_active: true },
            { user_id: 2, name: 'Kỹ thuật viên B', email: 'ktv@anphat.vn', username: 'ktv', role_id: 3, role_name: 'member', is_active: true },
        ]);
        mockGetDepartments.mockResolvedValue({ success: true, data: [] });
        mockGetRolesMatrix.mockResolvedValue({ success: true, data: { roles: [], permissions: [], mappings: [] } });
        mockGetWorkspaceInvitations.mockResolvedValue({ success: true, data: [] });
        mockGetInspectionTemplates.mockResolvedValue({
            success: true,
            data: [
                { checklist_id: 1, asset_id: null, title: 'Mẫu hệ thống chuẩn', is_active: true, item_count: 5 },
                { checklist_id: 2, asset_id: 10, asset_code: 'CNC-01', asset_name: 'Máy phay 1', title: 'Checklist CNC-01', is_active: true, item_count: 3 },
            ],
        });
        mockGetInspectionRuns.mockResolvedValue({ success: true, data: [] });
        mockGetAssets.mockResolvedValue({ success: true, data: [] });
        mockGetWorkflows.mockResolvedValue({
            success: true,
            data: [{ workflow_id: 1, code: 'INCIDENT_FLOW', name: 'Quy trình Sự cố', version: 2 }],
        });
        mockGetWorkflowDetail.mockResolvedValue({
            success: true,
            data: { workflow: { workflow_id: 1, code: 'INCIDENT_FLOW', name: 'Quy trình Sự cố' }, states: [], transitions: [] },
        });
        mockGetSlaConfigs.mockResolvedValue({ success: true, data: [] });
        mockGetWorkspaceById.mockResolvedValue({ workspace_id: 4, name: 'An Phát', slug: 'an-phat', description: '' });
    });

    it('renders UsersRolesPage in read-only mode for Manager and hides Admin invite/remove actions', async () => {
        mockUseCmsAuth.mockReturnValue(managerAuth);
        render(
            <MemoryRouter>
                <UsersRolesPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Chế độ chỉ đọc (Manager)')).toBeInTheDocument();
        });
        expect(screen.queryByRole('button', { name: /Mời nhân sự/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Gỡ$/i })).not.toBeInTheDocument();
    });

    it('renders UsersRolesPage management controls for Admin including workspace member removal', async () => {
        mockUseCmsAuth.mockReturnValue(adminAuth);
        render(
            <MemoryRouter>
                <UsersRolesPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Mời nhân sự/i })).toBeInTheDocument();
        });
        expect(screen.getAllByRole('button', { name: /Gỡ/i }).length).toBeGreaterThan(0);
    });

    it('marks system inspection templates as read-only and restricts edit to workspace asset templates', async () => {
        mockUseCmsAuth.mockReturnValue(adminAuth);
        render(
            <MemoryRouter>
                <InspectionsAdminPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Mẫu hệ thống chuẩn')).toBeInTheDocument();
        });
        expect(screen.getByText('Hệ thống (Chỉ đọc)')).toBeInTheDocument();
        expect(screen.getByText('Chỉ đọc')).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /Chỉnh sửa/i })).toHaveLength(1);
    });

    it('enforces read-only Workflow/SLA view for Manager without Admin mutation buttons', async () => {
        mockUseCmsAuth.mockReturnValue(managerAuth);
        render(
            <MemoryRouter initialEntries={['/workflows-sla?tab=sla']}>
                <WorkflowsSlaPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Chế độ chỉ đọc (Manager)')).toBeInTheDocument();
        });
        expect(screen.queryByRole('button', { name: /Thêm cấu hình SLA/i })).not.toBeInTheDocument();
    });

    it('denies WorkspaceSettingsPage form access when capability can_manage_workspace is false', async () => {
        mockUseCmsAuth.mockReturnValue(managerAuth);
        render(
            <MemoryRouter>
                <WorkspaceSettingsPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Chỉ Quản trị viên (Admin) mới được cấu hình Workspace')).toBeInTheDocument();
        });
        expect(screen.queryByRole('button', { name: /Xóa Workspace/i })).not.toBeInTheDocument();
    });
});
