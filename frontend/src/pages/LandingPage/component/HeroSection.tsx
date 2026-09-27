import { Button } from 'antd';
import { ArrowRight, CheckCircle } from 'lucide-react';

const benefits = [
    'Quản lý dự án tập trung',
    'Phân công & theo dõi tiến độ',
    'Giao tiếp nhóm tức thì',
];

export default function HeroSection() {
    return (
        <section className="relative px-10 pt-24 pb-32 max-w-7xl mx-auto">
            <div className="text-center max-w-6xl mx-auto mb-16">

                <h1 className="text-5xl md:text-[68px] leading-[1.05] font-extrabold tracking-tight text-[var(--color-on-surface)] mb-6">
                    <span className="block md:whitespace-nowrap">Một không gian duy nhất.</span>
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#7c5cfc] via-[#e84393] to-[#ffaa4c] md:whitespace-nowrap">Cho mọi dự án của bạn.</span>
                </h1>

                <p className="text-[#424754] text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto font-medium">
                    Flowise giúp đội nhóm của bạn gom toàn bộ Công việc, Tự động hóa bằng AI và Theo dõi thời gian vào một nền tảng hợp nhất.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                    <Button
                        type="primary"
                        size="large"
                        href="/login"
                        className="!rounded-xl !font-bold !text-base !px-8 !h-14 !border-0 !flex !items-center !gap-2 !bg-[#7c5cfc] hover:!bg-[#6a4aca] !shadow-lg !shadow-[#7c5cfc]/30"
                    >
                        Đăng nhập <ArrowRight size={18} />
                    </Button>
                    <Button
                        size="large"
                        href="/register"
                        className="!bg-[var(--color-surface-container-lowest)] !text-[var(--color-on-surface)] !border-2 !border-[var(--color-surface-container)] !rounded-xl !font-bold !text-base !px-8 !h-14 hover:!border-[var(--color-accent)] hover:!text-[var(--color-accent)] transition-all"
                    >
                        Đăng ký ngay
                    </Button>
                </div>

            </div>

            {/* Benefit pills */}
            <div className="flex flex-wrap justify-center gap-6 mb-16">
                {benefits.map((b) => (
                    <div key={b} className="flex items-center gap-2 text-[var(--color-on-surface)] font-semibold text-sm">
                        <CheckCircle size={18} className="text-[#006c49]" />
                        {b}
                    </div>
                ))}
            </div>

            {/* Dashboard Mockup — represents the product */}
            <div className="relative max-w-4xl mx-auto">
                <div className="bg-[var(--color-surface-container-lowest)] p-3 rounded-2xl border-2 border-[var(--color-surface-container)]">
                    <div className="bg-[#f1f3ff] rounded-xl overflow-hidden">
                        {/* Window chrome */}
                        <div className="h-10 bg-[var(--color-surface-container-lowest)] border-b border-[var(--color-surface-container)] flex items-center px-4 gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#ba1a1a]" />
                            <div className="w-3 h-3 rounded-full bg-[#825100]" />
                            <div className="w-3 h-3 rounded-full bg-[#006c49]" />
                            <div className="flex-1 flex justify-center">
                                <div className="h-5 w-48 bg-[#f1f3ff] rounded-full" />
                            </div>
                        </div>

                        {/* App content */}
                        <div className="p-6">
                            {/* Top bar */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex gap-3">
                                    <div className="h-8 w-24 bg-[var(--color-primary)] rounded-lg" />
                                    <div className="h-8 w-20 bg-[#e9edff] rounded-lg" />
                                    <div className="h-8 w-20 bg-[#e9edff] rounded-lg" />
                                </div>
                                <div className="h-8 w-32 bg-[#e9edff] rounded-lg" />
                            </div>

                            {/* Kanban columns */}
                            <div className="grid grid-cols-4 gap-4">
                                {/* Todo */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-3 h-3 rounded bg-[#727785]" />
                                        <div className="h-3 w-16 bg-[#dce2f7] rounded" />
                                        <span className="text-xs text-[#727785] font-bold">3</span>
                                    </div>
                                    <div className="bg-[var(--color-surface-container-lowest)] p-3 rounded-lg border border-[var(--color-surface-container)]">
                                        <div className="h-2.5 w-full bg-[#e9edff] rounded mb-2" />
                                        <div className="h-2 w-3/4 bg-[#f1f3ff] rounded mb-3" />
                                        <div className="flex gap-1">
                                            <div className="h-5 w-14 bg-[#ffddb8] rounded text-[6px] flex items-center justify-center font-bold text-[#825100]">Urgent</div>
                                        </div>
                                    </div>
                                    <div className="bg-[var(--color-surface-container-lowest)] p-3 rounded-lg border border-[var(--color-surface-container)]">
                                        <div className="h-2.5 w-full bg-[#e9edff] rounded mb-2" />
                                        <div className="h-2 w-1/2 bg-[#f1f3ff] rounded" />
                                    </div>
                                </div>

                                {/* In Progress */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-3 h-3 rounded bg-[var(--color-primary)]" />
                                        <div className="h-3 w-20 bg-[#d8e2ff] rounded" />
                                        <span className="text-xs text-[#727785] font-bold">2</span>
                                    </div>
                                    <div className="bg-[var(--color-surface-container-lowest)] p-3 rounded-lg border-l-4 border-l-[#0058be] border border-[var(--color-surface-container)]">
                                        <div className="h-2.5 w-full bg-[#e9edff] rounded mb-2" />
                                        <div className="h-2 w-2/3 bg-[#f1f3ff] rounded mb-3" />
                                        <div className="w-full bg-[#f1f3ff] rounded-full h-1.5">
                                            <div className="bg-[var(--color-primary)] h-1.5 rounded-full w-3/5" />
                                        </div>
                                    </div>
                                    <div className="bg-[var(--color-surface-container-lowest)] p-3 rounded-lg border border-[var(--color-surface-container)]">
                                        <div className="h-2.5 w-3/4 bg-[#e9edff] rounded mb-2" />
                                        <div className="h-2 w-full bg-[#f1f3ff] rounded" />
                                    </div>
                                </div>

                                {/* Review */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-3 h-3 rounded bg-[#825100]" />
                                        <div className="h-3 w-16 bg-[#ffddb8] rounded" />
                                        <span className="text-xs text-[#727785] font-bold">1</span>
                                    </div>
                                    <div className="bg-[var(--color-surface-container-lowest)] p-3 rounded-lg border border-[var(--color-surface-container)]">
                                        <div className="h-2.5 w-full bg-[#e9edff] rounded mb-2" />
                                        <div className="h-2 w-1/2 bg-[#f1f3ff] rounded mb-3" />
                                        <div className="flex gap-1">
                                            <div className="h-5 w-14 bg-[#d8e2ff] rounded text-[6px] flex items-center justify-center font-bold text-[var(--color-primary)]">Design</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Done */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-3 h-3 rounded bg-[#006c49]" />
                                        <div className="h-3 w-14 bg-[#6ffbbe] rounded" />
                                        <span className="text-xs text-[#727785] font-bold">5</span>
                                    </div>
                                    <div className="bg-[var(--color-surface-container-lowest)] p-3 rounded-lg border border-[var(--color-surface-container)] opacity-60">
                                        <div className="h-2.5 w-full bg-[#e9edff] rounded mb-2" />
                                        <div className="h-2 w-2/3 bg-[#f1f3ff] rounded" />
                                    </div>
                                    <div className="bg-[var(--color-surface-container-lowest)] p-3 rounded-lg border border-[var(--color-surface-container)] opacity-60">
                                        <div className="h-2.5 w-3/4 bg-[#e9edff] rounded mb-2" />
                                        <div className="h-2 w-1/2 bg-[#f1f3ff] rounded" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
