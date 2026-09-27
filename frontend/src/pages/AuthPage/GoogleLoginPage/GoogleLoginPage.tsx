import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { ArrowLeft } from 'lucide-react';
import { signInWithGoogle } from '../../../api/auth';
import { getWorkspaces } from '@/api/workspaces';
import { setAccessToken } from '@/store/modules/auth';
import type { AppDispatch } from '@/store/configureStore';

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();

function GoogleBrandPanel() {
    return (
        <section className="relative flex min-h-[40vh] w-full flex-col justify-between overflow-hidden bg-[var(--color-primary)] p-8 md:min-h-screen md:w-[52%] md:p-14">
            <div className="pointer-events-none absolute -left-20 -top-20 h-100 w-100 rounded-full bg-[var(--color-surface-container-lowest)] opacity-5" />
            <div className="pointer-events-none absolute -right-16 top-1/3 h-48 w-48 rotate-12 bg-[var(--color-surface-container-lowest)] opacity-[0.08]" />
            <div className="relative z-10">
                <Link to="/" className="inline-flex items-end gap-1 no-underline">
                    <span className="text-3xl font-extrabold tracking-tighter text-white">Flowise</span>
                    <span className="mb-1.5 h-2.5 w-2.5 rounded-full bg-[#825100]" aria-hidden />
                </Link>
                <h1 className="mt-10 max-w-md text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
                    Sign in with Google
                </h1>
                <p className="mt-4 max-w-sm text-base leading-relaxed text-white/85">
                    One secure sign-in. No extra password to remember for your Flowise workspace.
                </p>
            </div>
            <p className="relative z-10 text-sm font-medium uppercase tracking-widest text-white/50">© 2026 Flowise</p>
        </section>
    );
}

function GoogleLoginContent() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const dispatch = useDispatch<AppDispatch>();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const inviteToken = searchParams.get('inviteToken');
    const loginPath = inviteToken ? `/login?inviteToken=${encodeURIComponent(inviteToken)}` : '/login';

    const handleCredential = async (credential: string) => {
        setError(null);
        setIsLoading(true);
        try {
            const result = await signInWithGoogle(credential, inviteToken || undefined);
            const accessToken = result?.user?.access_token;
            if (!accessToken) throw new Error('Could not receive access token');
            // Dispatch vào Redux store để trigger useEffect trong AppSidebar (fetchWorkspaces)
            dispatch(setAccessToken(accessToken));
            if (inviteToken) {
                navigate(`/join-workspace?token=${encodeURIComponent(inviteToken)}`);
                return;
            }

            const workspaces = await getWorkspaces();
            if (Array.isArray(workspaces) && workspaces.length > 0) {
                navigate('/home');
            } else {
                navigate('/workspace-setup');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Google sign-in failed';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-[#eceff3] md:flex-row">
            <GoogleBrandPanel />
            <main className="flex w-full flex-1 flex-col justify-center px-5 py-10 md:w-[48%] md:px-12 md:py-8">
                <div className="mx-auto w-full max-w-105">
                    <button
                        type="button"
                        onClick={() => navigate(loginPath)}
                        className="mb-6 inline-flex cursor-pointer items-center gap-2 border-0 bg-transparent text-sm font-bold text-[var(--color-primary)] hover:underline"
                    >
                        <ArrowLeft size={18} strokeWidth={2.5} aria-hidden />
                        Back to sign in
                    </button>

                    <div className="rounded-2xl border border-[#dadce0] bg-[var(--color-surface-container-lowest)] px-8 py-9 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                        <div className="mb-6 flex justify-center">
                            <Link to="/" className="inline-flex items-end gap-1 no-underline">
                                <span className="text-2xl font-extrabold tracking-tight text-[var(--color-on-surface)]">Flowise</span>
                                <span className="mb-1 h-2 w-2 rounded-full bg-[#825100]" aria-hidden />
                            </Link>
                        </div>

                        <h1 className="text-center text-2xl font-normal text-[#202124]">Choose an account</h1>
                        <p className="mt-1 text-center text-[15px] text-[var(--color-text-secondary)]">
                            to continue to <span className="font-medium text-[#202124]">Flowise</span>
                        </p>

                        <div className="mt-8 flex flex-col items-center border-t border-[#e8eaed] pt-8">
                            <p className="mb-4 max-w-[320px] text-center text-sm leading-snug text-[var(--color-text-secondary)]">
                                Use the button below. Google will open a secure window where you pick your account.
                            </p>
                            <div className="flex w-full max-w-[320px] justify-center [&_iframe]:!w-full">
                                <GoogleLogin
                                    onSuccess={(credentialResponse) => {
                                        if (!credentialResponse.credential) {
                                            setError('Google did not return a credential');
                                            return;
                                        }
                                        void handleCredential(credentialResponse.credential);
                                    }}
                                    onError={() => setError('Google sign-in was cancelled or failed')}
                                    useOneTap={false}
                                    size="large"
                                    width="320"
                                    text="continue_with"
                                    shape="rectangular"
                                    theme="outline"
                                />
                            </div>
                            {isLoading ? (
                                <p className="mt-4 text-center text-sm text-[var(--color-text-secondary)]">Signing you in…</p>
                            ) : null}
                            {error ? (
                                <p className="mt-4 text-center text-sm font-medium text-[#d93025]">{error}</p>
                            ) : null}
                        </div>

                        <p className="mt-8 border-t border-[#e8eaed] pt-6 text-center text-xs leading-relaxed text-[var(--color-text-secondary)]">
                            To continue, Google will share your name, email address, language preference, and profile
                            picture with{' '}
                            <span className="font-medium text-[#202124]">Flowise</span>. See our{' '}
                            <a href="#" className="font-medium text-[var(--color-primary)] no-underline hover:underline">
                                Privacy Policy
                            </a>{' '}
                            and{' '}
                            <a href="#" className="font-medium text-[var(--color-primary)] no-underline hover:underline">
                                Terms of Service
                            </a>
                            .
                        </p>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                        <span>English (US)</span>
                        <span className="text-[#dadce0]">·</span>
                        <a href="#" className="text-[var(--color-text-secondary)] no-underline hover:text-[#202124]">
                            Help
                        </a>
                        <a href="#" className="text-[var(--color-text-secondary)] no-underline hover:text-[#202124]">
                            Privacy
                        </a>
                        <a href="#" className="text-[var(--color-text-secondary)] no-underline hover:text-[#202124]">
                            Terms
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
}

function UnconfiguredPanel() {
    return (
        <div className="flex min-h-screen flex-col bg-[#eceff3] md:flex-row">
            <GoogleBrandPanel />
            <main className="flex w-full flex-1 items-center justify-center px-5 py-10 md:w-[48%] md:px-12">
                <div className="w-full max-w-md rounded-2xl border border-[#dadce0] bg-[var(--color-surface-container-lowest)] p-8 shadow-sm">
                    <h2 className="mb-2 text-lg font-bold text-[var(--color-on-surface)]">Google sign-in is not configured</h2>
                    <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
                        Add your OAuth 2.0 Web Client ID to <code className="text-[var(--color-on-surface)]">frontend/.env</code>:
                    </p>
                    <pre className="mb-3 rounded-lg bg-[#f5f7fa] p-3 text-left text-xs text-[var(--color-on-surface)]">
                        VITE_GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
                    </pre>
                    <p className="mb-2 text-sm text-[var(--color-text-secondary)]">
                        And the same value in <code className="text-[var(--color-on-surface)]">backend/.env</code>:
                    </p>
                    <pre className="mb-4 rounded-lg bg-[#f5f7fa] p-3 text-left text-xs text-[var(--color-on-surface)]">
                        GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
                    </pre>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        Create credentials in{' '}
                        <a
                            href="https://console.cloud.google.com/apis/credentials"
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-[var(--color-primary)] hover:underline"
                        >
                            Google Cloud Console
                        </a>
                        . Add <code className="text-[var(--color-on-surface)]">http://localhost:5173</code> under Authorized JavaScript
                        origins. Restart <code className="text-[var(--color-on-surface)]">npm run dev</code> after editing{' '}
                        <code className="text-[var(--color-on-surface)]">.env</code>.
                    </p>
                    <Link
                        to="/login"
                        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)] no-underline hover:underline"
                    >
                        <ArrowLeft size={16} strokeWidth={2.5} aria-hidden />
                        Back to sign in
                    </Link>
                </div>
            </main>
        </div>
    );
}

export default function GoogleLoginPage() {
    if (!GOOGLE_CLIENT_ID) {
        return <UnconfiguredPanel />;
    }

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <GoogleLoginContent />
        </GoogleOAuthProvider>
    );
}
