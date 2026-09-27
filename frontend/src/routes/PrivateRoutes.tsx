import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { JSX } from "react/jsx-runtime";
import type { AppDispatch, RootState } from "@/store/configureStore";
import { Navigate } from "react-router";
import { fetchRefreshToken, fetchSignOut } from "@/store/modules/auth";
import { isTokenExpired } from "@/api/auth";
import { getAccessToken } from "@/utils/localStorage";

export default function PrivateRoute({ children }: { children: JSX.Element }) {
    const access_token = useSelector((state: RootState) => state.auth.access_token);
    const isRefreshing = useSelector((state: RootState) => state.auth.isLoadingSignIn);
    const dispatch = useDispatch<AppDispatch>();
    const [hasCheckedRefresh, setHasCheckedRefresh] = useState(false);
    const effectiveToken = access_token ?? getAccessToken();

    useEffect(() => {
        let isUnmounted = false;

        const ensureValidAuth = async () => {
            if (!effectiveToken) {
                try {
                    await dispatch(fetchRefreshToken()).unwrap();
                } catch {
                    await dispatch(fetchSignOut());
                } finally {
                    if (!isUnmounted) setHasCheckedRefresh(true);
                }
                return;
            }

            const expired = isTokenExpired();

            if (!expired) {
                if (!isUnmounted) setHasCheckedRefresh(true);
                return;
            }

            try {
                await dispatch(fetchRefreshToken()).unwrap();
            } catch {
                await dispatch(fetchSignOut());
            } finally {
                if (!isUnmounted) setHasCheckedRefresh(true);
            }
        };

        void ensureValidAuth();

        return () => {
            isUnmounted = true;
        };
    }, [dispatch, effectiveToken]);

    if (!hasCheckedRefresh || isRefreshing) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center', color: '#5f6368' }}>
                    <div style={{
                        width: 32, height: 32, border: '3px solid #eef0f5',
                        borderTop: '3px solid #0058be', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite', margin: '0 auto 12px'
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <p>Đang kiểm tra phiên đăng nhập...</p>
                </div>
            </div>
        );
    }

    if (!effectiveToken || isTokenExpired()) {
        return <Navigate to="/login" replace />;
    }

    return children;
}
