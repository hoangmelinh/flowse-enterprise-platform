import { FolderKanban, Users, BarChart3 } from 'lucide-react';

const steps = [
    {
        icon: FolderKanban,
        number: '01',
        numberColor: 'text-[#adc6ff]',
        iconBg: 'bg-[var(--color-primary)]',
        title: 'Tạo dự án',
        description: 'Tập trung toàn bộ công việc vào một nơi. Tạo dự án, chia nhỏ thành các công việc cụ thể và thiết lập deadline rõ ràng.',
    },
    {
        icon: Users,
        number: '02',
        numberColor: 'text-[#4edea3]',
        iconBg: 'bg-[#006c49]',
        title: 'Phân công & cộng tác',
        description: 'Giao việc cho đúng người, đúng hạn. Theo dõi ai đang làm gì và giao tiếp trực tiếp trong từng nhiệm vụ.',
    },
    {
        icon: BarChart3,
        number: '03',
        numberColor: 'text-[#ffb95f]',
        iconBg: 'bg-[#825100]',
        title: 'Theo dõi & hoàn thành',
        description: 'Dashboard trực quan giúp bạn nắm bắt tiến độ dự án theo thời gian thực. Không bỏ sót bất kỳ deadline nào.',
    },
];

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="py-24 bg-[#f1f3ff]">
            <div className="max-w-7xl mx-auto px-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--color-on-surface)] mb-4">
                        Đơn giản để bắt đầu. Mạnh mẽ để mở rộng.
                    </h2>
                    <p className="text-[#424754] text-lg max-w-xl mx-auto">
                        Chỉ 3 bước để đưa đội nhóm của bạn vào guồng làm việc hiệu quả.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((step) => {
                        const Icon = step.icon;
                        return (
                            <div
                                key={step.number}
                                className="bg-[var(--color-surface-container-lowest)] p-10 rounded-2xl border-2 border-transparent hover:border-[var(--color-primary)] transition-all group cursor-pointer"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div className={`w-12 h-12 ${step.iconBg} flex items-center justify-center rounded-xl group-hover:rotate-6 transition-transform`}>
                                        <Icon size={22} strokeWidth={2.5} className="text-white" />
                                    </div>
                                    <span className={`text-5xl font-extrabold ${step.numberColor} opacity-40`}>
                                        {step.number}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-[var(--color-on-surface)]">{step.title}</h3>
                                <p className="text-[#424754] leading-relaxed text-sm">{step.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
