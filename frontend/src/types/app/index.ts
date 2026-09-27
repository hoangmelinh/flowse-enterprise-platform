import type { RouteObject } from "react-router-dom";


export type RouteConfig = RouteObject & {
    name?: string;
    icon?: React.ReactElement<{ active?: boolean }>;
    sidebar?: boolean;
    subsidebar?: boolean;
    children?: RouteConfig[];
};

export type SettingsTab = 'profile' | 'notifications' | 'theme' | 'security' | 'workspace';