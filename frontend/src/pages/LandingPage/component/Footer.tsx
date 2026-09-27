import { Globe, Users, Share2 } from 'lucide-react';

const footerLinks = {
    'Sản phẩm': ['Tính năng', 'Kanban', 'Sprints', 'Dashboard'],
    'Tài nguyên': ['Hướng dẫn', 'Blog', 'Changelog'],
    'Về chúng tôi': ['Đội ngũ', 'Liên hệ', 'Bảo mật'],
};

export default function Footer() {
    return (
        <footer className="w-full pt-16 pb-10 bg-[#141b2b]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 px-10 max-w-7xl mx-auto">
                {/* Brand */}
                <div className="col-span-2 md:col-span-1">
                    <div className="text-xl font-extrabold text-white mb-4">Flowise</div>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Nền tảng quản lý dự án được thiết kế cho sự rõ ràng và hiệu quả tuyệt đối.
                    </p>
                </div>

                {/* Link sections */}
                {Object.entries(footerLinks).map(([title, links]) => (
                    <div key={title}>
                        <h5 className="text-white font-bold mb-5 text-sm">{title}</h5>
                        <ul className="space-y-3 list-none p-0 m-0">
                            {links.map((link) => (
                                <li key={link}>
                                    <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm no-underline">
                                        {link}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Bottom bar */}
            <div className="max-w-7xl mx-auto px-10 mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-slate-500 text-sm">© 2026 Flowise — Dự án bài tập quản lý dự án</div>
                <div className="flex gap-5">
                    <a href="#" className="text-slate-500 hover:text-white transition-colors">
                        <Globe size={18} strokeWidth={2} />
                    </a>
                    <a href="#" className="text-slate-500 hover:text-white transition-colors">
                        <Users size={18} strokeWidth={2} />
                    </a>
                    <a href="#" className="text-slate-500 hover:text-white transition-colors">
                        <Share2 size={18} strokeWidth={2} />
                    </a>
                </div>
            </div>
        </footer>
    );
}
