// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardAnalyticsPage from '@/pages/DashboardAnalyticsPage';

vi.setConfig({ testTimeout: 15000 });

const mockUseCmsAuth = vi.fn();
const mockGetOperationsOverview = vi.fn();
const mockGetAnalyticsSummary = vi.fn();

// JSDOM does not provide matchMedia or ResizeObserver for Antd Table/Segmented
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
        getOperationsOverview: (...args: unknown[]) => mockGetOperationsOverview(...args),
        getAnalyticsSummary: (...args: unknown[]) => mockGetAnalyticsSummary(...args),
    };
});

const makeOverview = (scope: 'all' | 'office' | 'industrial' = 'all') => ({
    success: true,
    data: {
        meta: {
            workspaceId: 4,
            period: 'month',
            scope,
            departmentId: null,
            userScope: 'WORKSPACE',
            generatedAt: '2026-11-26T10:00:00.000Z',
        },
        enterprise:
            scope === 'all'
                ? {
                      openByType: { TASK: 5, REQUEST: 3, INCIDENT: 2, INSPECTION: 0 },
                      overdueTotal: 1,
                      pendingApprovalsTotal: 4,
                      sla: { metCount: 4, breachedCount: 1, atRiskCount: 1, inSlaCount: 2, complianceRate: 80 },
                  }
                : null,
        office:
            scope !== 'industrial'
                ? {
                      openTasks: 5,
                      overdueTasks: 1,
                      openRequests: 3,
                      overdueRequests: 0,
                      createdInPeriod: 6,
                      completedInPeriod: 4,
                      completedOnTimeInPeriod: 3,
                      completedWithDueDateInPeriod: 4,
                      onTimeRate: 75,
                      pendingApprovals: 2,
                      sla: { metCount: 3, breachedCount: 0, atRiskCount: 1, inSlaCount: 2, complianceRate: 100 },
                  }
                : null,
        industrial:
            scope !== 'office'
                ? {
                      assetsByStatus: { total: 4, OPERATIONAL: 3, MAINTENANCE: 1, FAULTY: 0, DECOMMISSIONED: 0 },
                      incidents: { openTotal: 2, openCritical: 1, openHigh: 1, totalInPeriod: 3, resolvedInPeriod: 0 },
                      pendingMaintenanceApprovals: 2,
                      downtime: {
                          totalElapsedMinutes: 0,
                          avgElapsedResolutionMinutes: null,
                          repairDurationAvailable: false,
                          repairDurationReason: 'Chưa tách riêng thời gian sửa chữa thực tế.',
                      },
                      inspections: { totalRunsInPeriod: 2, passCount: 2, failCount: 0, passRate: 100 },
                      sla: { metCount: 1, breachedCount: 1, atRiskCount: 0, inSlaCount: 0, complianceRate: 50 },
                      topDowntimeAssets: [],
                  }
                : null,
        departments: [
            {
                department_id: 5,
                code: 'AP_PLAN',
                name: 'Phòng Kế hoạch',
                parent_id: null,
                manager_name: 'Trần Quốc Dũng',
                active_members: 4,
                open_tasks: 5,
                open_requests: 3,
                open_incidents: 0,
                asset_count: 0,
            },
        ],
    },
});

const makeAiSummary = () => ({
    success: true,
    data: {
        healthScore: 80,
        healthStatus: 'WARNING',
        executiveSummary: '### Báo cáo thực tế **Workspace An Phát**: Có 2 sự cố đang mở.',
        observedFacts: ['Ghi nhận 2 sự cố đang mở.', 'Tổng 4 thiết bị trong phạm vi.'],
        possibleCauses: [],
        recommendations: ['Ưu tiên xử lý sự cố CRITICAL.'],
        analysisSource: 'factual_fallback',
        llmConfigured: false,
        keyFindings: ['Ghi nhận 2 sự cố đang mở.'],
        rootCauses: [],
        prescriptiveRecommendations: ['Ưu tiên xử lý sự cố CRITICAL.'],
        metrics: {},
        openIncidentsCount: 2,
        criticalIncidentsCount: 1,
        period: 'month',
        generatedAt: '2026-11-26T10:00:00.000Z',
    },
});

describe('DashboardAnalyticsPage — 3-Scope Pilot & Evidence Rules', () => {
    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
        mockUseCmsAuth.mockReturnValue({
            currentWorkspaceId: 4,
            currentRole: 'admin',
            isAdmin: true,
        });
        mockGetOperationsOverview.mockImplementation((_wsId: number, params: { scope?: 'all' | 'office' | 'industrial' }) =>
            Promise.resolve(makeOverview(params?.scope || 'all'))
        );
        mockGetAnalyticsSummary.mockResolvedValue(makeAiSummary());
    });

    it('renders 4-area enterprise dashboard, valid action links (no /audit-sync for incidents), and collapsible insights', async () => {
        render(
            <MemoryRouter>
                <DashboardAnalyticsPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Cần chú ý ngay')).toBeInTheDocument();
        });

        expect(screen.getByText('Sự cố khẩn cấp chưa xử lý')).toBeInTheDocument();
        const incidentLink = screen.getByRole('link', { name: /Mở Hub Sự cố/i });
        expect(incidentLink).toHaveAttribute('href', expect.stringContaining('/incidents?workspaceId=4&severity=CRITICAL'));
        expect(incidentLink.getAttribute('href')).not.toContain('/audit-sync');

        const slaLink = screen.getByRole('link', { name: /Điều chỉnh định mức SLA/i });
        expect(slaLink).toHaveAttribute('href', '/workflows-sla?tab=sla');

        expect(screen.getByText('Đầu việc đang mở')).toBeInTheDocument();
        expect(screen.getByText('80')).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Công việc đang mở' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Sự cố chưa xử lý' })).toBeInTheDocument();
        expect(screen.queryByText(/###/)).not.toBeInTheDocument();
        expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();

        // Insights panel starts collapsed and expands on click with factual details
        expect(screen.queryByText('Dữ kiện đã xác minh')).not.toBeInTheDocument();
        fireEvent.click(screen.getByText('Tổng hợp Dữ kiện & Khuyến nghị'));
        await waitFor(() => {
            expect(screen.getByText('Dữ kiện đã xác minh')).toBeInTheDocument();
        });
        expect(screen.getByText('Ghi nhận 2 sự cố đang mở.')).toBeInTheDocument();
        expect(screen.getByText('Giả thuyết có thể (Tham khảo)')).toBeInTheDocument();
        expect(screen.getByText('Khuyến nghị hành động')).toBeInTheDocument();
    });

    it('switches to office scope and hides industrial metrics & insights panel', async () => {
        render(
            <MemoryRouter>
                <DashboardAnalyticsPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Đầu việc đang mở')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('tab', { name: /Công việc & Đề xuất/i }));

        await waitFor(() => {
            expect(screen.getByText('Phiếu chờ phê duyệt')).toBeInTheDocument();
        });

        expect(screen.getByText('Công việc & đề xuất quá hạn')).toBeInTheDocument();
        expect(screen.queryByText(/Thiết bị sẵn sàng/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Thời gian xử lý TB sự cố/i)).not.toBeInTheDocument();
        expect(screen.queryByText('Tổng hợp Dữ kiện & Khuyến nghị')).not.toBeInTheDocument();
    });

    it('switches to industrial scope and builds filter-preserving action URLs & explicit N/A', async () => {
        const industrialWithAlerts = makeOverview('industrial');
        industrialWithAlerts.data.industrial!.assetsByStatus.FAULTY = 1;
        industrialWithAlerts.data.industrial!.inspections.failCount = 2;
        mockGetOperationsOverview.mockResolvedValueOnce(makeOverview('all')).mockResolvedValueOnce(industrialWithAlerts);

        render(
            <MemoryRouter>
                <DashboardAnalyticsPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Đầu việc đang mở')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('tab', { name: /Thiết bị & Sự cố/i }));

        await waitFor(() => {
            expect(screen.getByText('Thiết bị sẵn sàng')).toBeInTheDocument();
        });

        expect(screen.getByRole('link', { name: /Lọc thiết bị hỏng/i })).toHaveAttribute('href', '/assets?status=FAULTY');
        expect(screen.getByRole('link', { name: /Xem lượt FAIL/i })).toHaveAttribute('href', '/inspections?tab=runs&status=FAIL');
        expect(screen.getByRole('link', { name: /Xem sự cố vi phạm SLA/i })).toHaveAttribute(
            'href',
            expect.stringContaining('/incidents?workspaceId=4&sla=BREACHED')
        );
        expect(screen.getByText('N/A')).toBeInTheDocument();
        expect(screen.getByText(/Chưa có sự cố đã đóng trong kỳ/i)).toBeInTheDocument();
        expect(screen.getByText(/Chưa ghi nhận thời gian dừng máy trong kỳ/i)).toBeInTheDocument();
    });

    it('expands department row and triggers in-context department drilldown filter', async () => {
        render(
            <MemoryRouter>
                <DashboardAnalyticsPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Phòng Kế hoạch')).toBeInTheDocument();
        });

        const expandButtons = screen.getAllByRole('button', { name: /Expand row/i });
        fireEvent.click(expandButtons[0]);

        await waitFor(() => {
            expect(screen.getByText('Trần Quốc Dũng')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /Lọc Dashboard theo phòng ban này/i }));
        await waitFor(() => {
            expect(mockGetOperationsOverview).toHaveBeenCalledWith(
                4,
                expect.objectContaining({ departmentId: 5 }),
                expect.anything()
            );
        });
    });

    it('surfaces partial AI error visibly while still rendering overview metrics, and never shows healthy alert state on overview error', async () => {
        mockGetAnalyticsSummary.mockRejectedValueOnce(new Error('AI timeout'));

        render(
            <MemoryRouter>
                <DashboardAnalyticsPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Lỗi tải dữ kiện')).toBeInTheDocument();
        });
        expect(screen.getByText(/AI timeout/i)).toBeInTheDocument();
        expect(screen.getByText('Đầu việc đang mở')).toBeInTheDocument();
    });

    it('shows ErrorState and never claims zero alerts when overview fails on initial load or refetch', async () => {
        mockGetOperationsOverview.mockRejectedValueOnce(new Error('Network down'));

        render(
            <MemoryRouter>
                <DashboardAnalyticsPage />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
        });

        expect(screen.getByText('Network down')).toBeInTheDocument();
        expect(screen.queryByText(/Không ghi nhận mục khẩn cấp/i)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
    });
});
