import { LayoutDashboard, Zap, Clock, Bell, Flag, ShieldCheck, Users, BarChart3 } from 'lucide-react';

const features = [
    {
        icon: LayoutDashboard,
        title: 'Bảng Kanban',
        description: 'Kéo thả công việc giữa các trạng thái. Trực quan hóa quy trình làm việc của cả đội.',
        iconBg: 'bg-[var(--color-primary)]',
    },
    {
        icon: Zap,
        title: 'Sprints',
        description: 'Quản lý chu kỳ phát triển với tự động chuyển công việc và tổng kết sprint.',
        iconBg: 'bg-[#006c49]',
    },
    {
        icon: Clock,
        title: 'Theo dõi thời gian',
        description: 'Ghi nhận thời gian làm việc ngay tại nơi công việc diễn ra. Không cần công cụ bên thứ ba.',
        iconBg: 'bg-[#825100]',
    },
    {
        icon: Users,
        title: 'Quản lý thành viên',
        description: 'Phân quyền theo vai trò, theo dự án. Mỗi người chỉ thấy những gì cần thiết.',
        iconBg: 'bg-[#2170e4]',
    },
    {
        icon: Flag,
        title: 'Cột mốc (Milestones)',
        description: 'Đặt mục tiêu lớn và tự động theo dõi tiến độ. Biết ngay dự án đang ở đâu.',
        iconBg: 'bg-[#006c49]',
    },
    {
        icon: Bell,
        title: 'Thông báo thông minh',
        description: 'Chỉ nhận thông báo quan trọng. Tự động nhóm và lọc nhiễu để giữ tập trung.',
        iconBg: 'bg-[var(--color-primary)]',
    },
    {
        icon: BarChart3,
        title: 'Báo cáo & Dashboard',
        description: 'Biểu đồ tiến độ, burndown chart, và tổng quan dự án theo thời gian thực.',
        iconBg: 'bg-[#825100]',
    },
    {
        icon: ShieldCheck,
        title: 'Bảo mật',
        description: 'Kiểm soát truy cập chi tiết theo không gian, vai trò và cấp bậc trong tổ chức.',
        iconBg: 'bg-[#424754]',
    },
];

export default function FeaturesSection() {
    return (
        <section id="features" className="py-24 bg-[#f9f9ff]">
            <div className="max-w-7xl mx-auto px-10">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 bg-[#6ffbbe] text-[#006c49] font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-full mb-6">
                        Tính năng
                    </div>
                    <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--color-on-surface)] mb-4">
                        Tất cả công cụ bạn cần. Một nền tảng.
                    </h2>
                    <p className="text-[#424754] max-w-2xl mx-auto text-lg">
                        Thay thế hàng loạt công cụ rời rạc bằng một giải pháp thống nhất — giúp đội nhóm tập trung vào việc hoàn thành mục tiêu.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {features.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={feature.title}
                                className="poster-card p-6 rounded-2xl transition-all group cursor-pointer"
                            >
                                <div
                                    className={`w-11 h-11 ${feature.iconBg} flex items-center justify-center rounded-xl mb-5 group-hover:scale-110 transition-transform`}
                                >
                                    <Icon size={20} strokeWidth={2.5} className="text-white" />
                                </div>
                                <h4 className="text-base font-bold mb-2 text-[var(--color-on-surface)]">{feature.title}</h4>
                                <p className="text-[#424754] text-sm leading-relaxed">{feature.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
