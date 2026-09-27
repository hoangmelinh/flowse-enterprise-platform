import { Button } from 'antd';
import { ArrowRight } from 'lucide-react';

export default function CTABanner() {
    return (
        <section className="py-24 bg-[#f9f9ff] px-10">
            <div className="max-w-7xl mx-auto bg-[#141b2b] rounded-3xl p-16 md:p-20 relative overflow-hidden text-center">
                <div className="relative z-10">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                        Sẵn sàng tăng tốc dự án?
                    </h2>
                    <p className="text-slate-400 text-lg mb-10 max-w-lg mx-auto">
                        Tham gia cùng các đội nhóm đã chuyển đổi cách làm việc. Bắt đầu miễn phí ngay hôm nay.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 mb-6">
                        <Button
                            type="primary"
                            size="large"
                            className="!rounded-xl !font-bold !text-base !px-10 !h-14 !border-0 !flex !items-center !gap-2"
                        >
                            Bắt đầu miễn phí <ArrowRight size={18} />
                        </Button>
                        <Button
                            size="large"
                            className="!bg-[var(--color-surface-container-lowest)]/10 !text-white !border-0 !rounded-xl !font-bold !text-base !px-10 !h-14 hover:!bg-[var(--color-surface-container-lowest)]/20 transition-all"
                        >
                            Xem Demo
                        </Button>
                    </div>
                    
                </div>

                {/* Geometric decorations */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-[var(--color-primary)]/15 -translate-y-1/3 translate-x-1/3 rounded-full" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#006c49]/10 translate-y-1/2 -translate-x-1/3 rounded-full" />
                <div className="absolute top-1/2 right-8 w-20 h-20 bg-[#ffddb8]/10 rounded-xl rotate-45" />
            </div>
        </section>
    );
}
