import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ConfigProvider
            locale={viVN}
            theme={{
                token: {
                    colorPrimary: '#0058BE',
                    colorInfo: '#0058BE',
                    colorSuccess: '#059669',
                    colorWarning: '#D97706',
                    colorError: '#DC2626',
                    colorTextBase: '#111827',
                    colorTextSecondary: '#475569',
                    colorBorder: '#E2E8F0',
                    colorBorderSecondary: '#E2E8F0',
                    colorBgLayout: '#F4F6F9',
                    colorBgContainer: '#FFFFFF',
                    borderRadius: 6,
                    borderRadiusLG: 8,
                    fontSize: 13,
                    fontFamily: "'Plus Jakarta Sans', 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
                },
                components: {
                    Button: {
                        controlHeight: 32,
                        borderRadius: 6,
                    },
                    Select: {
                        controlHeight: 32,
                        borderRadius: 6,
                    },
                    Input: {
                        controlHeight: 32,
                        borderRadius: 6,
                    },
                    Table: {
                        headerBg: '#F8FAFC',
                        headerColor: '#475569',
                        borderColor: '#E2E8F0',
                        cellPaddingBlockSM: 9,
                    },
                },
            }}
        >
            <App />
        </ConfigProvider>
    </StrictMode>
);
