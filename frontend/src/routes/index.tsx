import { lazy } from "react";
import type { RouteConfig } from "../types/app";
import PrivateRoute from "./PrivateRoutes";


const LandingPage = lazy(() => import("../pages/LandingPage"));
const LoginPage = lazy(() => import("../pages/AuthPage/LoginPage/LoginPage"));
const GoogleLoginPage = lazy(() => import("../pages/AuthPage/GoogleLoginPage/GoogleLoginPage"));
const WorkspaceSetupPage = lazy(() => import("../pages/WorkspaceSetupPage"));
const InboxPage = lazy(() => import("../pages/InboxPage"));
const MyWorkPage = lazy(() => import("../pages/MyWorkPage"));
const SpaceViewPage = lazy(() => import('../pages/SpaceViewPage'));
const ListViewPage = lazy(() => import('../pages/ListViewPage'));
const TimeTrackingPage = lazy(() => import('../pages/TimeTrackingPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const AIPage = lazy(() => import('../pages/AIPage'));
const SprintViewPage = lazy(() => import('../pages/SprintViewPage'));
const ApprovalCenterPage = lazy(() => import('../pages/ApprovalCenterPage'));
const IncidentHubPage = lazy(() => import('../pages/IncidentHubPage'));
const GovernanceRedirectPage = lazy(() => import('../pages/GovernanceRedirectPage'));
const AppLayout = lazy(() => import("../layouts/AppLayout"));
const InvitationPage = lazy(() => import("../pages/InvitationPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

export const routes: RouteConfig[] = [
    {
        path: '/',
        element: <LandingPage />
    },
    {
        path: '/login',
        element: <LoginPage />
    },
    {
        path: '/register',
        element: <LoginPage />
    },
    {
        path: '/google-login',
        element: <GoogleLoginPage />
    },
    {
        path: '/workspace-setup',
        element: <WorkspaceSetupPage />
    },
    {
        element: <PrivateRoute><AppLayout /></PrivateRoute>,
        children: [
            {
                path: '/home',
                element: <MyWorkPage />
            },
            {
                path: '/inbox',
                element: <InboxPage />
            },
            {
                path: '/approvals',
                element: <ApprovalCenterPage />
            },
            {
                path: '/incidents',
                element: <IncidentHubPage />
            },
            {
                path: '/assets',
                element: <GovernanceRedirectPage section="Quản lý Thiết bị & Tem QR" />
            },
            {
                path: '/analytics',
                element: <GovernanceRedirectPage section="Trung tâm Điều hành CMMS" />
            },
            {
                path: '/ai',
                element: <AIPage />
            },
            {
                path: 'space/:spaceId',
                element: <SpaceViewPage />
            },
            {
                path: 'space/:spaceId/list/:listId',
                element: <ListViewPage />
            },
            {
                path: 'space/:spaceId/sprint/:sprintId',
                element: <SprintViewPage />
            },
            {
                path: '/time-tracking',
                element: <TimeTrackingPage />
            },
            {
                path: '/settings',
                element: <SettingsPage />
            }
        ]
    },
    {
        path: '/join-workspace',
        element: <InvitationPage />
    },
    {
        path: '*',
        element: <NotFoundPage />
    }
];
