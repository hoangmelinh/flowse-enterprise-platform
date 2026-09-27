import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes';
import { Suspense } from 'react';
import { App as AntdApp } from 'antd';
import { Toaster } from 'sonner';
const router = createBrowserRouter(routes);
const App = () => {
    return (
        <AntdApp
            notification={{ placement: 'topRight', top: 24, maxCount: 4 }}
        >
            <Toaster
                position="top-right"
                richColors
                expand={false}
                duration={4000}
                closeButton
            />
            <Suspense fallback={
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <div style={{
                        width: 32, height: 32, border: '3px solid #eef0f5',
                        borderTop: '3px solid #0058be', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            }>
                <RouterProvider router={router} />
            </Suspense>
        </AntdApp>
    );
};

export default App;
