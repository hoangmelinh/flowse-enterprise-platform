import { useState, useEffect } from 'react';
import { Button, Input, Checkbox } from 'antd';
import { toast } from 'sonner';
import { ArrowRight, Mail, Lock, User, CheckCircle, Users, BarChart3, Blocks, GitBranch, Code } from 'lucide-react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './auth.css';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store/configureStore';
import { fetchSignIn, fetchSignUp } from '@/store/modules/auth';
import { getWorkspaces, verifyInvitation } from '@/api/workspaces';

export default function AuthPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const { t } = useTranslation('auth');

    const location = useLocation();
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get('inviteToken');
    const googleLoginPath = inviteToken ? `/google-login?inviteToken=${encodeURIComponent(inviteToken)}` : '/google-login';

    const [isRegister, setIsRegister] = useState(location.pathname === '/register');

    /* ── Login state ── */
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [remember, setRemember] = useState(false);

    /* ── Register state ── */
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPass, setRegPass] = useState('');
    const [regConfirmPass, setRegConfirmPass] = useState('');
    const [agreed, setAgreed] = useState(false);

    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [urlEmail, setUrlEmail] = useState('');

    useEffect(() => {
        if (!inviteToken) return;

        let isActive = true;
        const loadInvitationEmail = async () => {
            try {
                const invitation = await verifyInvitation(inviteToken);
                if (isActive && invitation.email) {
                    setUrlEmail(invitation.email);
                    setLoginEmail(invitation.email);
                    setRegEmail(invitation.email);
                }
            } catch (error) {
                console.error("Failed to verify invite token", error);
            }
        };

        void loadInvitationEmail();
        return () => {
            isActive = false;
        };
    }, [inviteToken]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoggingIn) return;
        setIsLoggingIn(true);
        try {
            await dispatch(fetchSignIn({ email: loginEmail, password: loginPass })).unwrap();

            if (inviteToken) {
                navigate(`/join-workspace?token=${inviteToken}`);
                return;
            }

            const workspaces = await getWorkspaces();
            if (Array.isArray(workspaces) && workspaces.length > 0) {
                navigate('/home');
            } else {
                navigate('/workspace-setup');
            }
        } catch (error: unknown) {
            console.error('Login failed:', error);
            toast.error(typeof error === 'string' ? error : t('login.loginFailed'));
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isRegistering) return;
        if (regPass !== regConfirmPass) {
            toast.error(t('security.mismatch', { ns: 'settings', defaultValue: 'Mật khẩu xác nhận không khớp!' }));
            return;
        }
        setIsRegistering(true);
        try {
            await dispatch(fetchSignUp({
                email: regEmail,
                password: regPass,
                username: regName,
                name: regName,
                inviteToken: inviteToken || undefined
            })).unwrap();

            toast.success(t('register.success'));

            await dispatch(fetchSignIn({ email: regEmail, password: regPass })).unwrap();

            if (inviteToken) {
                navigate(`/join-workspace?token=${encodeURIComponent(inviteToken)}`);
            } else {
                navigate('/workspace-setup');
            }
        } catch (error: unknown) {
            console.error('Registration failed:', error);
            toast.error(typeof error === 'string' ? error : t('register.failed'));
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <div className="auth-page flex flex-col md:flex-row overflow-hidden bg-[var(--color-surface-container-lowest)] font-['Plus_Jakarta_Sans',sans-serif]">
            {/* ═══════ LEFT PANEL: Brand Visual (55%) ═══════ */}
            <section className="auth-brand-panel relative flex w-full flex-col justify-between overflow-hidden bg-[var(--color-primary)] p-10 md:w-[55%] md:p-14">
                {/* Decorative Geometric Shapes */}
                <div className="pointer-events-none absolute -left-20 -top-20 h-100 w-100 rounded-full bg-[var(--color-surface-container-lowest)] opacity-5" />
                <div className="pointer-events-none absolute -right-20 top-1/2 h-62.5 w-62.5 rotate-15 bg-[var(--color-surface-container-lowest)] opacity-[0.08]" />
                <div className="pointer-events-none absolute bottom-20 left-1/4 h-30 w-30 rounded-full bg-[var(--color-surface-container-lowest)] opacity-10" />

                {/* Logo */}
                <div className="relative z-10">
                    <div className="flex items-center gap-1 mb-8">
                        <Link to="/" className="inline-flex items-end gap-1 no-underline">
                            <span className="text-3xl font-extrabold tracking-tighter text-white">Flowise</span>
                            <span className="mb-1.5 h-2.5 w-2.5 rounded-full bg-[#825100]" aria-hidden />
                        </Link>
                    </div>
                </div>

                {/* Sliding content area */}
                <div className="auth-brand-content relative z-10 flex-1 flex items-center">
                    <div className="slide-panel-wrapper">
                        {/* ── LOGIN panel content ── */}
                        <div
                            className={`slide-panel-content ${!isRegister ? 'slide-active' : 'slide-exit-up'}`}
                        >
                            <div className="max-w-md">
                                <h1 className="text-display font-bold text-[var(--color-on-primary)] leading-[1.1] tracking-tight mb-4">
                                    {t('marketing.login.title')}
                                </h1>
                                <p className="text-h4 text-[var(--color-on-primary)] opacity-80 mb-8">
                                    {t('marketing.login.subtitle')}
                                </p>
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-[var(--color-surface-container-lowest)]/15 rounded-lg flex items-center justify-center">
                                            <CheckCircle size={20} className="text-[var(--color-on-primary)]" strokeWidth={2.5} />
                                        </div>
                                        <span className="text-[var(--color-on-primary)] font-semibold text-body">{t('marketing.login.feature1')}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-[var(--color-surface-container-lowest)]/15 rounded-lg flex items-center justify-center">
                                            <Users size={20} className="text-[var(--color-on-primary)]" strokeWidth={2.5} />
                                        </div>
                                        <span className="text-[var(--color-on-primary)] font-semibold text-body">{t('marketing.login.feature2')}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-[var(--color-surface-container-lowest)]/15 rounded-lg flex items-center justify-center">
                                            <BarChart3 size={20} className="text-[var(--color-on-primary)]" strokeWidth={2.5} />
                                        </div>
                                        <span className="text-[var(--color-on-primary)] font-semibold text-body">{t('marketing.login.feature3')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── REGISTER panel content ── */}
                        <div
                            className={`slide-panel-content ${isRegister ? 'slide-active' : 'slide-exit-down'}`}
                        >
                            <div className="max-w-md">
                                <h1 className="text-display font-bold text-[var(--color-on-primary)] leading-[1.1] tracking-tight mb-5">
                                    {t('marketing.register.title')}
                                </h1>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-[var(--color-primary-container)] p-3 rounded-lg flex items-center justify-center">
                                            <Blocks size={22} className="text-[var(--color-on-primary)]" strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-h2 font-bold text-[var(--color-on-primary)] mb-2">{t('marketing.register.f1Title')}</h3>
                                            <p className="text-[var(--color-on-primary)] opacity-80 leading-relaxed text-body">{t('marketing.register.f1Desc')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="bg-[var(--color-primary-container)] p-3 rounded-lg flex items-center justify-center">
                                            <GitBranch size={22} className="text-[var(--color-on-primary)]" strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-h2 font-bold text-[var(--color-on-primary)] mb-2">{t('marketing.register.f2Title')}</h3>
                                            <p className="text-[var(--color-on-primary)] opacity-80 leading-relaxed text-body">{t('marketing.register.f2Desc')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="bg-[var(--color-primary-container)] p-3 rounded-lg flex items-center justify-center">
                                            <Code size={22} className="text-[var(--color-on-primary)]" strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <h3 className="text-h2 font-bold text-[var(--color-on-primary)] mb-2">{t('marketing.register.f3Title')}</h3>
                                            <p className="text-[var(--color-on-primary)] opacity-80 leading-relaxed text-body">{t('marketing.register.f3Desc')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer copyright */}
                <div className="auth-brand-footer relative z-10">
                    <p className="text-[var(--color-on-primary)] opacity-50 text-body-sm font-medium uppercase tracking-widest">© 2026 Flowise</p>
                </div>
            </section>

            {/* ═══════ RIGHT PANEL: Form (45%) ═══════ */}
            <main className="auth-form-panel w-full md:w-[45%] bg-[var(--color-surface-container-lowest)] flex flex-col p-6 md:p-10 overflow-hidden">
                {/* Header Actions */}
                <div className="flex justify-end mb-4">
                    {!isRegister ? (
                        <p className="text-[var(--color-text-secondary)] text-body-sm font-medium">
                            {t('login.newHere')}{' '}
                            <button
                                onClick={() => setIsRegister(true)}
                                className="text-[var(--color-primary)] font-bold hover:underline bg-transparent border-0 cursor-pointer text-body-sm"
                            >
                                {t('login.createAccount')}
                            </button>
                        </p>
                    ) : (
                        <p className="text-[var(--color-text-secondary)] text-body-sm font-medium">
                            {t('register.hasAccount')}{' '}
                            <button
                                onClick={() => setIsRegister(false)}
                                className="text-[var(--color-primary)] font-bold hover:underline bg-transparent border-0 cursor-pointer text-body-sm"
                            >
                                {t('register.signIn')}
                            </button>
                        </p>
                    )}
                </div>

                {/* Form Container */}
                <div className="auth-form-shell mx-auto flex w-full max-w-md grow flex-col justify-center">
                    <div className={`slide-form-wrapper ${isRegister ? 'slide-form-wrapper-register' : ''}`}>
                        {/* ── LOGIN FORM ── */}
                        <div
                            className={`slide-form-content ${!isRegister ? 'slide-active' : 'slide-exit-left'}`}
                        >
                            <header className="mb-6">
                                <h2 className="text-h1 font-extrabold text-[var(--color-on-surface)] tracking-tighter mb-1">
                                    {t('login.title')}
                                </h2>
                                <p className="text-[var(--color-text-secondary)] opacity-50 text-body">
                                    {t('login.welcomeBack')}
                                </p>
                            </header>

                            <form className="space-y-4" onSubmit={handleLogin}>
                                <div className="space-y-2">
                                    <label className="block text-caption font-bold text-[var(--color-on-surface)] uppercase tracking-wider">
                                        {t('login.email')}
                                    </label>
                                    <Input
                                        size="large"
                                        prefix={<Mail size={18} className="text-[var(--color-text-secondary)] opacity-40" />}
                                        placeholder="name@company.com"
                                        type="email"
                                        value={loginEmail}
                                        onChange={(e) => setLoginEmail(e.target.value)}
                                        disabled={!!urlEmail} // KHÓA Ô NẾU ĐẾN TỪ LỜI MỜI
                                        className="h-11! bg-[var(--color-surface-container-low)]! rounded-lg! border-0! text-[var(--color-on-surface)]! font-medium! disabled:bg-[var(--color-surface-variant)]! disabled:text-[var(--color-text-tertiary)]!"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-caption font-bold text-[var(--color-on-surface)] uppercase tracking-wider">
                                            {t('login.password')}
                                        </label>
                                        <a href="#" className="text-caption font-bold text-[var(--color-primary)] hover:underline no-underline">
                                            {t('login.forgotPassword')}
                                        </a>
                                    </div>
                                    <Input.Password
                                        size="large"
                                        prefix={<Lock size={18} className="text-[var(--color-text-secondary)] opacity-40" />}
                                        placeholder="••••••••"
                                        value={loginPass}
                                        onChange={(e) => setLoginPass(e.target.value)}
                                        className="h-11! bg-[var(--color-surface-container-low)]! rounded-lg! border-0! text-[var(--color-on-surface)]! font-medium!"
                                    />
                                </div>

                                <div className="py-1">
                                    <Checkbox
                                        checked={remember}
                                        onChange={(e) => setRemember(e.target.checked)}
                                        className="text-body-sm! font-semibold! text-[var(--color-text-secondary)]!"
                                    >
                                        {t('login.rememberDevice')}
                                    </Checkbox>
                                </div>

                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    block
                                    loading={isLoggingIn}
                                    className="group h-12! rounded-lg! font-bold! text-body! border-0! flex! items-center! justify-center! gap-2! bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
                                >
                                    <span>{t('login.signIntoDashboard')}</span>
                                    {!isLoggingIn && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
                                </Button>

                                <div className="relative py-2 flex items-center">
                                    <div className="grow border-t border-[var(--color-border)]" />
                                    <span className="mx-4 shrink text-caption font-black uppercase tracking-widest text-[var(--color-text-secondary)] opacity-40">{t('login.or')}</span>
                                    <div className="grow border-t border-[var(--color-border)]" />
                                </div>

                                <Button
                                    size="large"
                                    block
                                    onClick={() => navigate(googleLoginPath)}
                                    className="h-12! bg-[var(--color-surface-container-low)]! text-[var(--color-on-surface)]! rounded-lg! font-bold! text-body! border-0! flex! items-center! justify-center! gap-3! hover:bg-[var(--color-surface-hover)]!"
                                >
                                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    <span>{t('login.loginWithGoogle')}</span>
                                </Button>
                            </form>
                        </div>

                        {/* ── REGISTER FORM ── */}
                        <div
                            className={`auth-register-form slide-form-content ${isRegister ? 'slide-active' : 'slide-exit-right'}`}
                        >
                            <header className="auth-register-header mb-3">
                                <h2 className="text-h1 font-extrabold text-[var(--color-on-surface)] tracking-tight mb-1">
                                    {t('register.title')}
                                </h2>
                                <p className="text-[var(--color-text-secondary)] text-body-sm">
                                    {t('register.subtitle')}
                                </p>
                            </header>

                            <form className="auth-register-fields space-y-3" onSubmit={handleRegister}>
                                <div className="space-y-1">
                                    <label className="block text-caption font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
                                        {t('register.name')}
                                    </label>
                                    <Input
                                        size="large"
                                        prefix={<User size={16} className="text-[var(--color-outline)]" />}
                                        placeholder="John Doe"
                                        value={regName}
                                        onChange={(e) => setRegName(e.target.value)}
                                        className="h-10! bg-[var(--color-surface-container-lowest)]! rounded-lg! border-2! border-[var(--color-border)]! focus-within:border-[var(--color-primary)]! transition-colors!"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-caption font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
                                        {t('register.email')}
                                    </label>
                                    <Input
                                        size="large"
                                        prefix={<Mail size={16} className="text-[var(--color-outline)]" />}
                                        placeholder="name@company.com"
                                        type="email"
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        disabled={!!urlEmail} // KHÓA Ô NẾU ĐẾN TỪ LỜI MỜI
                                        className="h-12! bg-[var(--color-surface-container-lowest)]! rounded-lg! border-2! border-[var(--color-border)]! focus-within:border-[var(--color-primary)]! transition-colors! disabled:bg-[var(--color-surface-subtle)]! disabled:text-[var(--color-text-tertiary)]!"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-caption font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
                                        {t('register.password')}
                                    </label>
                                    <Input.Password
                                        size="large"
                                        prefix={<Lock size={16} className="text-[var(--color-outline)]" />}
                                        placeholder="••••••••"
                                        value={regPass}
                                        onChange={(e) => setRegPass(e.target.value)}
                                        className="h-12! bg-[var(--color-surface-container-lowest)]! rounded-lg! border-2! border-[var(--color-border)]! focus-within:border-[var(--color-primary)]! transition-colors!"
                                    />
                                    <p className="text-caption text-[var(--color-text-secondary)]">{t('register.passwordHint')}</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-caption font-bold text-[var(--color-text-secondary)] uppercase tracking-widest">
                                        {t('register.confirmPassword')}
                                    </label>
                                    <Input.Password
                                        size="large"
                                        prefix={<Lock size={16} className="text-[var(--color-outline)]" />}
                                        placeholder="••••••••"
                                        value={regConfirmPass}
                                        onChange={(e) => setRegConfirmPass(e.target.value)}
                                        className="h-12! bg-[var(--color-surface-container-lowest)]! rounded-lg! border-2! border-[var(--color-border)]! focus-within:border-[var(--color-primary)]! transition-colors!"
                                    />
                                    <p className="text-caption text-[var(--color-text-secondary)]">{t('register.passwordHint')}</p>
                                </div>

                                <div className="py-1">
                                    <Checkbox
                                        checked={agreed}
                                        onChange={(e) => setAgreed(e.target.checked)}
                                        className="text-body-sm! text-[var(--color-text-secondary)]!"
                                    >
                                        {t('register.agreeTerms')} <a href="#" className="text-[var(--color-primary)] hover:underline">{t('register.termsOfService')}</a> {t('register.and')} <a href="#" className="text-[var(--color-primary)] hover:underline">{t('register.privacyPolicy')}</a>.
                                    </Checkbox>
                                </div>

                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    size="large"
                                    block
                                    loading={isRegistering}
                                    className="h-11! rounded-lg! font-bold! text-body-sm! border-0! bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white"
                                >
                                    {t('register.createAccount')}
                                </Button>
                            </form>

                            {/* Social register */}
                            <div className="auth-register-social mt-4 pt-3 border-t border-[var(--color-surface-container-highest)] text-center">
                                <p className="text-caption font-medium text-[var(--color-text-secondary)] mb-2">{t('register.orRegisterWith')}</p>
                                <Button
                                    size="middle"
                                    block
                                    onClick={() => navigate(googleLoginPath)}
                                    className="h-10! bg-[var(--color-surface-container-low)]! rounded-lg! font-bold! border-0! flex! items-center! justify-center! gap-2! hover:bg-[var(--color-surface-hover)]! text-[var(--color-on-surface)]"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    {t('login.loginWithGoogle')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
