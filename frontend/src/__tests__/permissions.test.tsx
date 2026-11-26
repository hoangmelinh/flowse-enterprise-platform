// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { useCapabilities } from '@/hooks/useCapabilities';
import { GovernanceRedirectPage } from '@/pages/GovernanceRedirectPage';

function CapabilityProbe() {
    const { currentRole, isAdmin, isManager, canAccessCms, capabilities } = useCapabilities();
    return (
        <div>
            <span data-testid="role">{currentRole}</span>
            <span data-testid="admin">{String(isAdmin)}</span>
            <span data-testid="manager">{String(isManager)}</span>
            <span data-testid="cms">{String(canAccessCms)}</span>
            <span data-testid="approve">{String(capabilities.can_approve)}</span>
        </div>
    );
}

const makeStore = (roleName: string, capabilitiesOverride?: Record<string, boolean>) =>
    configureStore({
        reducer: {
            users: () => ({
                context: capabilitiesOverride
                    ? { current_role: roleName, capabilities: capabilitiesOverride }
                    : null,
                isLoadingContext: false,
                contextError: null,
            }),
            workspaces: () => ({
                currentWorkspaceId: 1,
                listWorkspaces: [{ workspace_id: 1, name: 'An Phát', role_name: roleName }],
            }),
        },
    });

describe('Workspace capabilities & CMS boundary separation', () => {
    beforeEach(() => {
        cleanup();
    });

    it('derives member restrictions cleanly from fallback workspace role', () => {
        const store = makeStore('member');
        render(
            <Provider store={store}>
                <CapabilityProbe />
            </Provider>
        );

        expect(screen.getByTestId('role')).toHaveTextContent('member');
        expect(screen.getByTestId('admin')).toHaveTextContent('false');
        expect(screen.getByTestId('manager')).toHaveTextContent('false');
        expect(screen.getByTestId('cms')).toHaveTextContent('false');
        expect(screen.getByTestId('approve')).toHaveTextContent('false');
    });

    it('shows GovernanceRedirectPage without CMS launch button for member and with launch button for admin', () => {
        const memberStore = makeStore('member');
        render(
            <Provider store={memberStore}>
                <MemoryRouter>
                    <GovernanceRedirectPage section="Quản lý Tài sản" />
                </MemoryRouter>
            </Provider>
        );

        expect(screen.getByText(/Quản lý Tài sản đã được chuyển sang Cổng Quản trị CMS/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Mở CMS Quản trị/i })).not.toBeInTheDocument();

        cleanup();
        const adminStore = makeStore('admin', {
            can_access_cms: true,
            is_admin: true,
            is_manager: true,
        });
        render(
            <Provider store={adminStore}>
                <MemoryRouter>
                    <GovernanceRedirectPage section="Quản lý Tài sản" />
                </MemoryRouter>
            </Provider>
        );

        expect(screen.getByRole('button', { name: /Mở CMS Quản trị/i })).toBeInTheDocument();
    });
});
