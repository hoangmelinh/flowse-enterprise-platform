import React from 'react';

export interface MenuItem {
    icon: React.ReactNode;
    label: string;
    sublabel?: string;
    onClick?: () => void;
    danger?: boolean;
    hasSubmenu?: boolean;
    submenuItems?: MenuItem[];
}

export type MenuEntry = MenuItem | 'divider';

export interface ContextMenuProps {
    items: MenuEntry[];
    position: { x: number; y: number };
    onClose: () => void;
    footer?: React.ReactNode;
}

export interface CreateMenuProps {
    position: { x: number; y: number };
    onClose: () => void;
    spaceId: string;
    spaceName: string;
}
