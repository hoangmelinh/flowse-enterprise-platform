import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Input } from 'antd';
import { ArrowRight, ExternalLink, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useCmsAuth } from '@/context/CmsAuthContext';
import { getApiErrorMessage } from '@/utils/error';

const WORKSPACE_URL = import.meta.env.VITE_WORKSPACE_URL || 'http://localhost:5173';

export default function LoginPage() {
    const navigate = useNavigate();
    const { isAuthenticated, login } = useCmsAuth();
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (values: { email: string; password: string }) => {
        try {
            setLoading(true);
            setErrorMsg(null);
            await login(values.email.trim(), values.password);
            navigate('/', { replace: true });
        } catch (err: unknown) {
            setErrorMsg(
                getApiErrorMessage(err, 'Đăng nhập thất bại. Vui lòng kiểm tra tài khoản hoặc quyền truy cập.')
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4 font-['Plus_Jakarta_Sans','Inter',sans-serif]">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0058be] text-white shadow-xs">
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <h1 className="m-0 text-xl font-extrabold tracking-tight text-slate-900">
                            Flowse CMS Quản trị
                        </h1>
                        <p className="m-0 text-xs font-medium text-slate-500">
                            Cổng quản trị độc lập cho Admin & Trưởng bộ phận (:5174)
                        </p>
                    </div>
                </div>

                {errorMsg && (
                    <Alert
                        type="error"
                        showIcon
                        title={errorMsg}
                        className="mb-4"
                    />
                )}

                <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
                    <Form.Item
                        name="email"
                        label="Email hoặc tên đăng nhập"
                        rules={[{ required: true, message: 'Vui lòng nhập email' }]}
                    >
                        <Input
                            size="large"
                            prefix={<Mail size={15} className="text-slate-400" />}
                            placeholder="quantri@anphat.vn"
                            autoComplete="email"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label="Mật khẩu"
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                    >
                        <Input.Password
                            size="large"
                            prefix={<Lock size={15} className="text-slate-400" />}
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </Form.Item>

                    <Button
                        type="primary"
                        htmlType="submit"
                        size="large"
                        block
                        loading={loading}
                        icon={<ArrowRight size={15} />}
                        iconPlacement="end"
                        className="mt-2 font-semibold"
                    >
                        Đăng nhập vào CMS
                    </Button>
                </Form>

                <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
                    <div>Tài khoản thành viên (Member / Công nhân / Kỹ thuật viên)?</div>
                    <a
                        href={WORKSPACE_URL}
                        className="mt-1 inline-flex items-center gap-1 font-semibold text-[#0058be] no-underline hover:underline"
                    >
                        <span>Chuyển sang Không gian Tác nghiệp (:5173)</span>
                        <ExternalLink size={12} />
                    </a>
                </div>
            </div>
        </div>
    );
}
