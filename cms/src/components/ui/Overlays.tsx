import React from 'react';
import { Drawer, type DrawerProps } from 'antd';

export const SideDrawer: React.FC<DrawerProps> = ({ children, ...props }) => (
    <Drawer size="large" destroyOnHidden {...props}>
        {children}
    </Drawer>
);
