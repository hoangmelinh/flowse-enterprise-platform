import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from 'antd';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store/configureStore';
import { addWorkspace } from '@/store/modules/workspaces';


export default function WorkspaceSetupPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const handleNameChange = (val: string) => {
        setName(val);
        const autoSlug = val
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 40);
        setSlug(autoSlug);
    };

    const handleNext = async () => {
        if (!name.trim()) {
            toast.warning('Vui lòng nhập tên workspace');
            return;
        }
        if (isCreating) return;
        setIsCreating(true);
        try {
            await dispatch(
                addWorkspace({
                    name: name.trim(),
                    slug: slug || name.trim().toLowerCase().replace(/\s+/g, '-'),
                    description: '',
                }),
            ).unwrap();
            toast.success('Workspace đã được tạo thành công!');
            navigate('/home');
        } catch (error: unknown) {
            console.error('Failed to create workspace:', error);
            toast.error(typeof error === 'string' ? error : 'Không thể tạo workspace. Vui lòng thử lại.');
        } finally {
            setIsCreating(false);
        }
    };

    /* first letter for the preview avatar */
    const initial = name.trim().charAt(0).toUpperCase() || 'W';

    return (
        <div className="flex min-h-screen flex-col bg-[#f5f7ff] lg:flex-row">
            {/* ═══════ LEFT — Form ═══════ */}
            <section className="flex flex-1 items-center justify-center bg-[var(--color-surface-container-lowest)] px-6 py-8 lg:px-14 lg:py-12">
                <div className="w-full max-w-115">
                    <h1 className="mb-2.5 text-[34px] leading-[1.15] font-black tracking-[-0.03em] text-[var(--color-on-surface)]">
                        What's the name of<br />your workspace?
                    </h1>
                    <p className="mb-8 text-[15px] font-medium text-[var(--color-text-secondary)]">
                        This is where your team works and collaborates.
                    </p>

                    {/* Workspace Name */}
                    <div className="mb-5">
                        <label className="mb-2 block text-[11px] font-extrabold tracking-[0.08em] text-[var(--color-on-surface)] uppercase">WORKSPACE NAME</label>
                        <Input
                            size="large"
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="Acme Corp"
                            className="!h-11.5 !rounded-[10px] !border-2 !border-[#e2e6f0] !text-[15px] !font-medium !text-[var(--color-on-surface)] hover:!border-[var(--color-primary)] focus:!border-[var(--color-primary)]"
                        />
                    </div>

                    {/* Workspace URL */}
                    <div className="mb-5">
                        <label className="mb-2 block text-[11px] font-extrabold tracking-[0.08em] text-[var(--color-on-surface)] uppercase">WORKSPACE URL</label>
                        <div className="flex items-stretch overflow-hidden rounded-[10px] border-2 border-[#e2e6f0] transition-colors focus-within:border-[var(--color-primary)]">
                            <span className="flex select-none items-center whitespace-nowrap border-r-2 border-[#e2e6f0] bg-[#f5f7ff] px-3.5 text-[14px] font-bold text-[var(--color-text-secondary)]">flowise.app/</span>
                            <Input
                                size="large"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="acme-hq"
                                className="!h-11.5 !rounded-none !border-none !text-[15px] !font-medium !text-[var(--color-on-surface)] hover:!border-none focus:!border-none"
                            />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="my-6 h-px bg-[#e8eaed]" />

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent px-1 py-2 text-[15px] font-bold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-on-surface)]"
                            onClick={() => navigate('/login')}
                        >
                            <ArrowLeft size={16} />
                            <span>Back</span>
                        </button>
                        <Button
                            type="primary"
                            size="large"
                            onClick={handleNext}
                            loading={isCreating}
                            className="!flex !h-12 !min-w-[140px] !items-center !justify-center !gap-2 !rounded-xl !text-[16px] !font-extrabold"
                        >
                            <span>Next</span>
                            <ArrowRight size={18} />
                        </Button>
                    </div>
                </div>
            </section>

            {/* ═══════ RIGHT — Sidebar Preview ═══════ */}
            <section className="hidden flex-1 items-center justify-center overflow-hidden bg-[var(--color-primary-bg)] px-12 py-8 lg:flex">
                <div className="relative flex flex-col items-center gap-4">
                    {/* Preview Label */}
                    <div className="flex items-center gap-3">
                        <span className="h-0.5 w-8 rounded-sm bg-[var(--color-primary)]" />
                        <span className="text-[11px] font-extrabold tracking-[0.16em] text-[var(--color-primary)] uppercase">SIDEBAR PREVIEW</span>
                    </div>

                    {/* Mock Sidebar */}
                    <div className="relative z-2 flex min-h-90 w-50 flex-col gap-2.5 rounded-l-2xl bg-[var(--color-surface-container-lowest)] px-3 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_32px_rgba(0,88,190,0.08)]">
                        {/* Sidebar Header */}
                        <div className="flex items-center gap-2.5 border-b border-[#f0f2f5] px-1 pt-1 pb-3">
                            <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg text-[16px] font-extrabold tracking-[-0.02em] text-white transition-colors duration-300" style={{ backgroundColor: '#0058be' }}>
                                {initial}
                            </div>
                            <div className="flex min-w-0 flex-col">
                                <span className="truncate text-[13px] font-extrabold text-[var(--color-on-surface)] transition-all duration-300">{name || 'Workspace'}</span>
                                <span className="text-[9px] font-bold tracking-[0.08em] text-[var(--color-text-tertiary)] uppercase">ENTERPRISE PLAN</span>
                            </div>
                        </div>

                        {/* Search bar mock */}
                        <div className="flex items-center gap-2 rounded-lg bg-[#f5f7ff] px-2.5 py-2">
                            <div className="flex shrink-0 items-center">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <circle cx="10.5" cy="10.5" r="7.5" stroke="#9aa0a6" strokeWidth="2.5" />
                                    <line x1="16" y1="16" x2="21" y2="21" stroke="#9aa0a6" strokeWidth="2.5" strokeLinecap="round" />
                                </svg>
                            </div>
                            <div className="h-2 w-[70%] rounded bg-[var(--color-text-tertiary)]" />
                        </div>

                        {/* Nav Items */}
                        <div className="flex flex-1 flex-col gap-1">
                            <div className="flex items-center gap-2.5 rounded-lg bg-[#eef2ff] px-2 py-2">
                                <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]">
                                    <svg width="14" height="14" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" fill="#fff" /><rect x="14" y="3" width="7" height="7" rx="1.5" fill="#fff" /><rect x="3" y="14" width="7" height="7" rx="1.5" fill="#fff" /><rect x="14" y="14" width="7" height="7" rx="1.5" fill="#fff" /></svg>
                                </div>
                                <div className="h-2 w-[60%] rounded bg-[var(--color-primary)]" />
                            </div>
                            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
                                <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-md">
                                    <svg width="12" height="12" viewBox="0 0 24 24"><path d="M3 7h18v2H3zm0 4h18v2H3zm0 4h18v2H3z" fill="#5f6368" /></svg>
                                </div>
                                <div className="h-2 w-[40%] rounded bg-[#d2d6e8]" />
                            </div>
                            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
                                <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-md">
                                    <svg width="12" height="12" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="#5f6368" /></svg>
                                </div>
                                <div className="h-2 w-[50%] rounded bg-[#d2d6e8]" />
                            </div>
                            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
                                <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-md">
                                    <svg width="12" height="12" viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z" fill="#5f6368" /></svg>
                                </div>
                                <div className="h-2 w-[35%] rounded bg-[#d2d6e8]" />
                            </div>
                        </div>

                        {/* Bottom user */}
                        <div className="mt-auto flex items-center gap-2.5 border-t border-[#f0f2f5] pt-2.5">
                            <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full">
                                <img src="https://ui-avatars.com/api/?name=U&background=4285F4&color=fff&size=32&bold=true" alt="" className="h-full w-full object-cover" />
                            </div>
                            <div className="h-2 w-[55%] rounded bg-[#202124]" />
                        </div>
                    </div>

                    {/* Content area mock (right side of sidebar) */}
                    <div className="absolute top-2 left-48 flex min-h-85 w-45 flex-col gap-3.5 rounded-r-2xl bg-[#f9faff] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                        <div className="mb-1">
                            <div className="h-2.5 w-[70%] rounded-[5px] bg-[#e2e6f0]" />
                        </div>
                        <div className="flex gap-2.5">
                            <div className="h-20 flex-1 rounded-[10px] bg-[var(--color-surface-container-lowest)] shadow-[0_1px_4px_rgba(0,0,0,0.04)]" />
                            <div className="h-20 flex-1 rounded-[10px] bg-[var(--color-surface-container-lowest)] shadow-[0_1px_4px_rgba(0,0,0,0.04)]" />
                        </div>
                        <div className="flex gap-2.5">
                            <div className="h-30 flex-1 rounded-[10px] bg-[var(--color-surface-container-lowest)] shadow-[0_1px_4px_rgba(0,0,0,0.04)]" />
                        </div>
                    </div>

                    {/* Caption */}
                    <p className="mt-10 max-w-85 text-center text-[13px] leading-normal font-medium italic text-[var(--color-text-secondary)]">
                        "Changes to your workspace name and logo will update across
                        the entire application interface in real-time."
                    </p>
                </div>
            </section>
        </div>
    );
}
