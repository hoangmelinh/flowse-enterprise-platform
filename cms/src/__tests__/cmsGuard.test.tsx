// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CmsGuard } from '@/components/CmsGuard';

const mockUseCmsAuth = vi.fn();

vi.mock('@/context/CmsAuthContext', () => ({
    useCmsAuth: () => mockUseCmsAuth(),
}));

describe('CmsGuard RBAC isolation', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it('blocks standard member role with 403 and link back to Workspace (:5173)', () => {
        mockUseCmsAuth.mockReturnValue({
            isAuthenticated: true,
            isLoading: false,
            canAccessCms: false,
            isAdmin: false,
            currentRole: 'member',
            context: { user: { email: 'minhanh@anphat.vn' } },
            logout: vi.fn(),
        });

        render(
            <MemoryRouter>
                <CmsGuard>
                    <div>Secret CMS Dashboard</div>
                </CmsGuard>
            </MemoryRouter>
        );

        expect(screen.queryByText('Secret CMS Dashboard')).not.toBeInTheDocument();
        expect(screen.getByText(/403 — Không có quyền truy cập CMS Quản trị/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Về Không gian làm việc/i })).toHaveAttribute(
            'href',
            'http://localhost:5173'
        );
    });

    it('allows manager access to non-admin CMS routes', () => {
        mockUseCmsAuth.mockReturnValue({
            isAuthenticated: true,
            isLoading: false,
            canAccessCms: true,
            isAdmin: false,
            currentRole: 'manager',
            context: { user: { email: 'dungtq@anphat.vn' } },
            logout: vi.fn(),
        });

        render(
            <MemoryRouter>
                <CmsGuard>
                    <div>Manager Dashboard Content</div>
                </CmsGuard>
            </MemoryRouter>
        );

        expect(screen.getByText('Manager Dashboard Content')).toBeInTheDocument();
    });

    it('blocks manager from admin-only routes while allowing admin', () => {
        mockUseCmsAuth.mockReturnValue({
            isAuthenticated: true,
            isLoading: false,
            canAccessCms: true,
            isAdmin: false,
            currentRole: 'manager',
            context: { user: { email: 'dungtq@anphat.vn' } },
            logout: vi.fn(),
        });

        render(
            <MemoryRouter>
                <CmsGuard requireAdmin>
                    <div>Danger Workspace Settings</div>
                </CmsGuard>
            </MemoryRouter>
        );

        expect(screen.queryByText('Danger Workspace Settings')).not.toBeInTheDocument();
        expect(screen.getByText(/Phân hệ chỉ dành cho Quản trị viên \(Admin\)/i)).toBeInTheDocument();

        cleanup();
        mockUseCmsAuth.mockReturnValue({
            isAuthenticated: true,
            isLoading: false,
            canAccessCms: true,
            isAdmin: true,
            currentRole: 'admin',
            context: { user: { email: 'quantri@anphat.vn' } },
            logout: vi.fn(),
        });

        render(
            <MemoryRouter>
                <CmsGuard requireAdmin>
                    <div>Danger Workspace Settings</div>
                </CmsGuard>
            </MemoryRouter>
        );

        expect(screen.getByText('Danger Workspace Settings')).toBeInTheDocument();
    });
});
