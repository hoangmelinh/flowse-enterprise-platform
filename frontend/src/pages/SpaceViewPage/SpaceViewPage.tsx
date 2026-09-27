import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSpaceTree } from '../../layouts/AppLayout/SpaceTreeContext';

import SpaceHeader from './components/SpaceHeader';
import OverviewView from '@/pages/SpaceViewPage/components/OverviewView/overviewView';

export default function SpaceViewPage() {
    const { spaceId } = useParams<{ spaceId: string }>();
    const navigate = useNavigate();
    const { spaces, spaceTree } = useSpaceTree();

    const currentSpace = spaceId ? spaces.find((s) => s.id === spaceId) : undefined;
    const currentSpaceTree = spaceId ? spaceTree[spaceId] : undefined;

    useEffect(() => {
        if (spaceId && !spaces.some((s) => s.id === spaceId)) {
            navigate('/home', { replace: true });
        }
    }, [spaceId, spaces, navigate]);

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[var(--color-surface-container-lowest)]" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
            <SpaceHeader currentSpace={currentSpace} />

            <main className="flex flex-1 flex-col overflow-hidden">
                <OverviewView spaceId={spaceId} currentSpaceTree={currentSpaceTree} />
            </main>
        </div>
    );
}
