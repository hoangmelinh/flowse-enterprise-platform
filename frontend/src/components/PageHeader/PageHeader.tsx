 
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ChevronDown, Star, FolderClosed, Bot, Share2,
    LayoutList, Trello,
} from 'lucide-react';


export interface PageTab {
    icon?: React.ReactNode;
    label: string;
    active?: boolean;
    onClick?: () => void;
}

export interface PageHeaderProps {
    parentSpace: { id: string; name: string; color: string };
    parentFolder?: { id: string; name: string } | null;
    entityIcon: React.ReactNode;
    entityName: string;
    tabs?: PageTab[];
}


// eslint-disable-next-line react-refresh/only-export-components
export const LIST_TABS: PageTab[] = [
    { icon: <LayoutList size={14} />, label: 'list', active: true },
    { icon: <Trello size={14} />, label: 'board' },
];


export default function PageHeader({
    parentSpace,
    parentFolder,
    entityIcon,
    entityName,
    tabs = [],
}: PageHeaderProps) {
    const navigate = useNavigate();
    const { t } = useTranslation('common');

    return (
        <header className="shrink-0 border-b border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)]">
            <div className="flex items-center justify-between px-5 pb-2 pt-2.5">
                <div className="flex items-center gap-2">
                    <div
                        className="flex h-5 w-5 items-center justify-center rounded"
                        style={{ backgroundColor: parentSpace.color }}
                    >
                        <span className="text-[9px] font-bold text-white">
                            {parentSpace.name.charAt(0).toUpperCase()}
                        </span>
                    </div>

                    <span
                        className="cursor-pointer text-body-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                        onClick={() => navigate(`/space/${parentSpace.id}`)}
                    >
                        {parentSpace.name}
                    </span>

                    {parentFolder && (
                        <>
                            <span className="text-body-sm text-[var(--color-text-tertiary)]">/</span>
                            <FolderClosed size={14} className="text-[var(--color-text-secondary)]" />
                            <span className="cursor-pointer text-body-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]">
                                {parentFolder.name}
                            </span>
                        </>
                    )}

                    <span className="text-body-sm text-[var(--color-text-tertiary)]">/</span>
                    <span className="text-[var(--color-text-secondary)]">{entityIcon}</span>
                    <h1 className="m-0 text-base font-bold text-[var(--color-on-surface)]">{entityName}</h1>

                    <button className="flex items-center rounded px-1 py-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)] border-none bg-transparent cursor-pointer transition-colors">
                        <ChevronDown size={16} />
                    </button>
                    <button className="flex items-center rounded px-1 py-0.5 text-[var(--color-text-tertiary)] hover:bg-[var(--color-primary-bg)] hover:text-[#f0a220] border-none bg-transparent cursor-pointer transition-colors">
                        <Star size={15} />
                    </button>
                </div>

                <div className="flex items-center gap-1.5">
                    <button className="flex cursor-pointer items-center gap-1.25 rounded-md border border-[var(--color-border-light)] bg-transparent px-2.5 py-1 text-caption font-semibold text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                        <Bot size={14} /> {t('pageHeader.askAI')}
                    </button>
                    <button className="flex cursor-pointer items-center gap-1.25 rounded-md border border-[var(--color-primary)] bg-[var(--color-primary)] px-2.5 py-1 text-caption font-semibold text-white transition-all hover:bg-[var(--color-primary-hover)]">
                        <Share2 size={14} /> {t('pageHeader.share')}
                    </button>
                </div>
            </div>

            {tabs.length > 0 && (
                <div className="flex items-center gap-0.5 px-5">
                    {tabs.map((tab, idx) => (
                        <button
                            key={idx}
                            onClick={tab.onClick}
                            className={[
                                'flex items-center gap-1.25 whitespace-nowrap rounded-t-md border-b-2 px-3 py-2 text-body-sm border-none cursor-pointer transition-colors',
                                tab.active
                                    ? 'border-b-[var(--color-primary)] font-semibold text-[var(--color-primary)] bg-transparent'
                                    : 'border-b-transparent font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] bg-transparent',
                            ].join(' ')}
                        >
                            {tab.icon}
                            {t(`pageHeader.${tab.label}`, { defaultValue: tab.label })}
                        </button>
                    ))}
                </div>
            )}
        </header>
    );
}
