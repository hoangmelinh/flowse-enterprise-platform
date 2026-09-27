 
import { createContext, useContext, type ReactNode } from 'react';
import type { SpaceTreeValue } from './spaceTreeTypes';

const SpaceTreeContext = createContext<SpaceTreeValue | null>(null);

export function SpaceTreeProvider({
    value,
    children,
}: {
    value: SpaceTreeValue;
    children: ReactNode;
}) {
    return <SpaceTreeContext.Provider value={value}>{children}</SpaceTreeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSpaceTree(): SpaceTreeValue {
    const ctx = useContext(SpaceTreeContext);
    if (!ctx) {
        throw new Error('useSpaceTree must be used under SpaceTreeProvider (inside App layout).');
    }
    return ctx;
}
