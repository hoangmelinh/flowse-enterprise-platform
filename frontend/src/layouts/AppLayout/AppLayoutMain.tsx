import { useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AppSidebar from './sidebar/AppSidebar';
import { SpaceTreeProvider } from './SpaceTreeContext';
import { useSpaceTreeState } from './useSpaceTreeState';
import ModalsContainer from './ModalsContainer';
import { useOnboardingTour } from '@/components/OnboardingTour';
import type { AppDispatch, RootState } from '@/store/configureStore';
import { setCurrentWorkspaceId } from '@/store/modules/workspaces';

export default function AppLayoutMain() {
    const tree = useSpaceTreeState();
    const [searchParams, setSearchParams] = useSearchParams();
    const dispatch = useDispatch<AppDispatch>();
    const { listWorkspaces, currentWorkspaceId } = useSelector((s: RootState) => s.workspaces);
    useOnboardingTour();

    useEffect(() => {
        const wsParam = searchParams.get('workspaceId');
        if (!wsParam || listWorkspaces.length === 0) return;
        const parsed = Number(wsParam);
        if (Number.isInteger(parsed) && listWorkspaces.some((w) => w.workspace_id === parsed)) {
            if (currentWorkspaceId !== parsed) {
                dispatch(setCurrentWorkspaceId(parsed));
            }
            const next = new URLSearchParams(searchParams);
            next.delete('workspaceId');
            setSearchParams(next, { replace: true });
        }
    }, [searchParams, listWorkspaces, currentWorkspaceId, dispatch, setSearchParams]);

    return (
        <SpaceTreeProvider value={tree}>
            <div className="flex h-screen overflow-hidden bg-[var(--color-background)] font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-250 print:h-auto print:overflow-visible print:block print:bg-white">
                <AppSidebar />

                <main
                    id="main-content"
                    className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-[var(--color-background)] transition-colors duration-250 print:h-auto print:overflow-visible print:block print:w-full print:bg-white print:p-0"
                >
                    <Outlet />
                </main>

                <div className="print:hidden">
                    <ModalsContainer />
                </div>
            </div>
        </SpaceTreeProvider>
    );
}
