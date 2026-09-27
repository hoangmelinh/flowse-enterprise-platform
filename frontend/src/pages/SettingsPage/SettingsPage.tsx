import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Settings, User, Bell, Shield, Palette, Globe,
    ChevronRight
} from 'lucide-react';
import type { SettingsTab } from '../../types/app';
import Notifications from './components/Notifications';
import Theme from './components/Theme';
import Profile from './components/Profile';
import Security from './components/Security';
import Workspace from './components/Workspace';

export default function SettingsPage() {
    const { t } = useTranslation('settings');
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    const tabs = [
        { id: 'profile' as SettingsTab, label: t('tabs.profile'), icon: <User size={16} /> },
        { id: 'notifications' as SettingsTab, label: t('tabs.notifications'), icon: <Bell size={16} /> },
        { id: 'theme' as SettingsTab, label: t('tabs.appearance'), icon: <Palette size={16} /> },
        { id: 'security' as SettingsTab, label: t('tabs.security'), icon: <Shield size={16} /> },
        { id: 'workspace' as SettingsTab, label: t('tabs.workspace'), icon: <Globe size={16} /> },
    ];

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[var(--color-surface-container-lowest)] font-['Plus_Jakarta_Sans','Inter',sans-serif] transition-colors duration-250">
            <header className="flex shrink-0 items-center gap-2.5 border-b border-[var(--color-border-light)] px-6 py-4">
                <Settings size={20} className="text-[var(--color-text-secondary)]" />
                <h1 className="m-0 text-h2 font-extrabold text-[var(--color-on-surface)]">{t('title')}</h1>
            </header>

            <div className="flex flex-1 overflow-hidden max-md:flex-col">
                {/* Sidebar — horizontal on mobile */}
                <nav className="flex w-55 shrink-0 flex-col gap-0.5 border-r border-[var(--color-border-light)] px-3 py-4 max-md:w-full max-md:flex-row max-md:overflow-x-auto max-md:border-r-0 max-md:border-b max-md:py-2 max-md:px-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`flex w-full items-center gap-2 rounded-lg border-none px-3 py-2.25 text-left text-body-sm font-semibold transition-all duration-150 max-md:w-auto max-md:shrink-0 max-md:whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]'
                                : 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-on-surface)]'
                                }`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            <ChevronRight size={14} className="ml-auto opacity-50 max-md:hidden" />
                        </button>
                    ))}
                </nav>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-8 py-6 max-md:px-4">
                    {/* Profile */}
                    {activeTab === 'profile' && (
                        <Profile />
                    )}

                    {/* Notifications */}
                    {activeTab === 'notifications' && (
                        <Notifications />
                    )}

                    {/* Theme */}
                    {activeTab === 'theme' && (
                        <Theme />
                    )}

                    {/* Security */}
                    {activeTab === 'security' && (
                        <Security />
                    )}

                    {/* Workspace */}
                    {activeTab === 'workspace' && (
                        <Workspace />
                    )}
                </div>
            </div>
        </div>
    );
}
