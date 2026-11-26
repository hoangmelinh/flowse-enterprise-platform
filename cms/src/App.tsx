import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CmsAuthProvider } from '@/context/CmsAuthContext';
import { CmsGuard } from '@/components/CmsGuard';
import { CmsLayout } from '@/layouts/CmsLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardAnalyticsPage from '@/pages/DashboardAnalyticsPage';
import UsersRolesPage from '@/pages/UsersRolesPage';
import DepartmentsPage from '@/pages/DepartmentsPage';
import AssetsRegistryPage from '@/pages/AssetsRegistryPage';
import InspectionsAdminPage from '@/pages/InspectionsAdminPage';
import WorkflowsSlaPage from '@/pages/WorkflowsSlaPage';
import AuditSyncPage from '@/pages/AuditSyncPage';
import WorkspaceSettingsPage from '@/pages/WorkspaceSettingsPage';

export default function App() {
    return (
        <CmsAuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route
                        path="/"
                        element={
                            <CmsGuard>
                                <CmsLayout />
                            </CmsGuard>
                        }
                    >
                        <Route index element={<DashboardAnalyticsPage />} />
                        <Route path="users-roles" element={<UsersRolesPage />} />
                        <Route path="departments" element={<DepartmentsPage />} />
                        <Route path="assets" element={<AssetsRegistryPage />} />
                        <Route path="inspections" element={<InspectionsAdminPage />} />
                        <Route path="workflows-sla" element={<WorkflowsSlaPage />} />
                        <Route path="audit-sync" element={<AuditSyncPage />} />
                        <Route
                            path="workspace-settings"
                            element={
                                <CmsGuard requireAdmin>
                                    <WorkspaceSettingsPage />
                                </CmsGuard>
                            }
                        />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </CmsAuthProvider>
    );
}
