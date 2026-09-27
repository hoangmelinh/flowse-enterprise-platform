import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import enUS from 'antd/locale/en_US'
import { Provider } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { store } from './store/configureStore'
import GlobalStyles from './components/GlobalStyles'
import App from './App.tsx'
import './i18n'
import './index.css'

const antdLocaleMap: Record<string, typeof viVN> = {
    vi: viVN,
    en: enUS,
};

/* ─── Design tokens (Light only) ─── */
const baseTokens = {
    borderRadius: 8,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxShadow: 'none',
    boxShadowSecondary: 'none',
    boxShadowTertiary: 'none',
    // ── Typography Scale — mirror của CSS vars trong GlobalStyles.css ──
    fontSize: 14,
    fontSizeSM: 13,
    fontSizeLG: 15,
    fontSizeXL: 17,
    fontSizeHeading1: 24,
    fontSizeHeading2: 20,
    fontSizeHeading3: 17,
    fontSizeHeading4: 15,
    fontSizeHeading5: 14,
    lineHeight: 1.571,
    lineHeightLG: 1.6,
    lineHeightSM: 1.538,
    lineHeightHeading1: 1.333,
    lineHeightHeading2: 1.4,
    lineHeightHeading3: 1.412,
};

const lightTokens = {
    ...baseTokens,
    colorPrimary: '#0058be',
    colorError: '#ba1a1a',
    colorText: '#141b2b',
    colorTextSecondary: '#5f6368',
    colorTextTertiary: '#9aa0a6',
    colorBorder: '#c2c6d6',
    colorBorderSecondary: '#eef0f5',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f9f9ff',
};

function ThemedApp() {
    const { i18n } = useTranslation();
    const currentLocale = antdLocaleMap[i18n.language] || viVN;

    return (
        <ConfigProvider
            locale={currentLocale}
            theme={{
                token: lightTokens,
                components: {
                    Button: {
                        boxShadow: 'none',
                        primaryShadow: 'none',
                        dangerShadow: 'none',
                        defaultShadow: 'none',
                    },
                    Modal: {
                        borderRadiusLG: 12,
                        paddingContentHorizontalLG: 24,
                    },
                    Input: {
                        borderRadius: 8,
                    },
                    Dropdown: {
                        borderRadiusLG: 8,
                    },
                },
            }}
        >
            <Provider store={store}>
                <App />
            </Provider>
        </ConfigProvider>
    );
}

const container = document.getElementById('root');

if (!container) {
    throw new Error(
        "Root element with ID 'root' was not found in the document.",
    );
}

const root = createRoot(container);
root.render(
    <StrictMode>
        <GlobalStyles>
            <ThemedApp />
        </GlobalStyles>
    </StrictMode>
);