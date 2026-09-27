import { useState } from 'react';
import { Button, Drawer } from 'antd';
import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';

const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How it Works', href: '#how-it-works' },
];

export default function TopNav() {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="w-full sticky top-0 z-50 bg-[#f9f9ff]/90 backdrop-blur-md border-b border-[var(--color-surface-container)]">
            <nav className="flex justify-between items-center px-10 py-4 max-w-7xl mx-auto">
                {/* Logo */}
                <Link to="/" className="text-2xl font-extrabold text-[var(--color-on-surface)] tracking-tight no-underline">
                    Flowise
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="text-[#424754] font-semibold text-sm no-underline hover:text-[var(--color-primary)] transition-colors"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-4">
                    <Link
                        to="/register"
                        className="text-[#424754] font-semibold text-sm hover:text-[var(--color-accent)] transition-colors no-underline"
                    >
                        Đăng ký
                    </Link>
                    <Link to="/login">
                        <Button
                            type="primary"
                            size="large"
                            className="!rounded-xl !font-bold !text-sm !px-6 !h-11 !border-0 !bg-[#7c5cfc] hover:!bg-[#6a4aca]"
                        >
                            Đăng nhập
                        </Button>
                    </Link>
                </div>

                {/* Mobile Hamburger */}
                <button
                    className="md:hidden p-2 text-[var(--color-on-surface)] bg-transparent border-0 cursor-pointer"
                    onClick={() => setMobileOpen(true)}
                >
                    <Menu size={24} strokeWidth={2.5} />
                </button>

                {/* Mobile Drawer */}
                <Drawer
                    title="Flowise"
                    placement="right"
                    onClose={() => setMobileOpen(false)}
                    open={mobileOpen}
                >
                    <div className="flex flex-col gap-4">
                        {navLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="text-[var(--color-on-surface)] font-semibold text-base py-2 no-underline hover:text-[var(--color-primary)] transition-colors"
                                onClick={() => setMobileOpen(false)}
                            >
                                {link.label}
                            </a>
                        ))}
                        <hr className="border-[var(--color-surface-container)] my-4" />
                        <Link to="/register" className="text-[var(--color-on-surface)] font-semibold text-base no-underline hover:text-[var(--color-accent)]">Đăng ký</Link>
                        <Link to="/login" className="w-full">
                            <Button type="primary" size="large" className="!rounded-xl !font-bold !border-0 !h-11 w-full mt-2 !bg-[#7c5cfc]">
                                Đăng nhập
                            </Button>
                        </Link>
                    </div>
                </Drawer>
            </nav>
        </header>
    );
}
