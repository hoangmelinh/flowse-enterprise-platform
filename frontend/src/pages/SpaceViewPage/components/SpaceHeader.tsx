import {
    ChevronDown, Star, Hash, Bot, Share2,
} from 'lucide-react';
import type { SpaceHeaderProps } from '@/types/spaces';

export default function SpaceHeader({ currentSpace }: SpaceHeaderProps) {
    return (
        <header className="shrink-0 border-b border-(--color-border-light) bg-[var(--color-surface-container-lowest)]">
            <div className="flex items-center justify-between px-5 pb-2 pt-2.5">
                <div className="flex items-center gap-2">
                    <div
                        className="flex h-6 w-6 items-center justify-center rounded-md"
                        style={{ backgroundColor: currentSpace?.color ?? 'var(--color-primary)' }}
                    >
                        <Hash size={16} color="#fff" />
                    </div>
                    <h1 className="m-0 text-base font-bold text-(--color-on-surface)">
                        {currentSpace?.name ?? 'Space'}
                    </h1>
                    <button className="flex items-center rounded px-1 py-0.5 text-(--color-text-tertiary) hover:bg-(--color-primary-bg) hover:text-(--color-primary)">
                        <ChevronDown size={16} />
                    </button>
                    <button className="flex items-center rounded px-1 py-0.5 text-(--color-text-tertiary) hover:bg-(--color-primary-bg) hover:text-(--color-primary)">
                        <Star size={15} />
                    </button>
                </div>
                <div className="flex items-center gap-1.5">
                    <button className="flex cursor-pointer items-center gap-1.25 rounded-md border border-(--color-border-light) bg-transparent px-2.5 py-1 text-xs font-semibold text-(--color-text-secondary) transition-all duration-150 hover:border-(--color-border) hover:bg-(--color-surface-subtle)">
                        <Bot size={14} /> Ask AI
                    </button>
                    <button className="flex cursor-pointer items-center gap-1.25 rounded-md border border-(--color-primary) bg-(--color-primary) px-2.5 py-1 text-xs font-semibold text-white transition-all duration-150 hover:bg-(--color-primary-hover)">
                        <Share2 size={14} /> Share
                    </button>
                </div>
            </div>
        </header>
    );
}
