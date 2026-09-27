import { Outlet } from 'react-router-dom';
import AppSidebar from './sidebar/AppSidebar';
import { SpaceTreeProvider } from './SpaceTreeContext';
import { useSpaceTreeState } from './useSpaceTreeState';
import ModalsContainer from './ModalsContainer';
import { useOnboardingTour } from '@/components/OnboardingTour';

export default function AppLayoutMain() {
    const tree = useSpaceTreeState();
    useOnboardingTour();

    return (
        <SpaceTreeProvider value={tree}>
            <div className="flex h-screen overflow-hidden bg-[var(--color-background)] font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-250">
                <AppSidebar />

                <main
                    id="main-content"
                    className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-[var(--color-background)] transition-colors duration-250"
                >
                    <Outlet />
                </main>

                <ModalsContainer />
            </div>
        </SpaceTreeProvider>
    );
}
