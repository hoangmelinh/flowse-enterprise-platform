import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRightIcon } from 'lucide-react';
import type { ContextMenuProps } from '../types';

export const ContextMenu = ({ items, position, onClose, footer }: ContextMenuProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [hoveredSubmenu, setHoveredSubmenu] = useState<number | null>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    if (typeof document === 'undefined') return null;

    const menuWidth = 240;
    const menuMaxHeight = 520;
    const viewportPadding = 8;
    const top = Math.max(viewportPadding, Math.min(position.y, window.innerHeight - menuMaxHeight - viewportPadding));
    const left = Math.max(viewportPadding, Math.min(position.x, window.innerWidth - menuWidth - viewportPadding));

    return createPortal(
        <div
            ref={ref}
            className="fixed z-[9999] w-60 rounded-lg bg-[var(--color-surface-container-lowest)] py-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.15)] border border-[var(--color-border)]"
            style={{ top, left }}
            onClick={(e) => e.stopPropagation()}
        >
            {items.map((entry, i) => {
                if (entry === 'divider') {
                    return <div key={`d-${i}`} className="my-1 mx-2.5 h-px bg-[#eef0f3]" />;
                }

                const item = entry;
                return (
                    <div key={i} className="relative">
                        <button
                            type="button"
                            className={`flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3.5 py-1.5 text-left text-[13px] transition-all ${
                                item.danger
                                    ? 'text-[#dc3545] hover:bg-[#fef2f2]'
                                    : 'text-[var(--color-inverse-surface)] hover:bg-[#f3f4f8]'
                            }`}
                            onClick={() => {
                                if (!item.hasSubmenu) {
                                    item.onClick?.();
                                    onClose();
                                }
                            }}
                            onMouseEnter={() => item.hasSubmenu && setHoveredSubmenu(i)}
                            onMouseLeave={() => item.hasSubmenu && setHoveredSubmenu(null)}
                        >
                            <span className={`shrink-0 ${item.danger ? 'text-[#dc3545]' : 'text-[#6b6f76]'}`}>
                                {item.icon}
                            </span>
                            <div className="flex flex-1 flex-col min-w-0">
                                <span className="font-medium">{item.label}</span>
                                {item.sublabel && (
                                    <span className="text-[11px] leading-tight text-[#6b6f76] font-normal mt-0.5">
                                        {item.sublabel}
                                    </span>
                                )}
                            </div>
                            {item.hasSubmenu && (
                                <ChevronRightIcon size={13} className="shrink-0 text-[#9b9ea4]" />
                            )}
                        </button>

                        {/* Submenu flyout */}
                        {item.hasSubmenu && hoveredSubmenu === i && item.submenuItems && (
                            <div
                                className="absolute left-full top-0 z-10 ml-0.5 w-56 rounded-lg bg-[var(--color-surface-container-lowest)] py-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.15)] border border-[var(--color-border)]"
                                onMouseEnter={() => setHoveredSubmenu(i)}
                                onMouseLeave={() => setHoveredSubmenu(null)}
                            >
                                {item.submenuItems.map((sub, si) => (
                                    <button
                                        key={si}
                                        type="button"
                                        className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3.5 py-1.5 text-left text-[13px] text-[var(--color-inverse-surface)] transition-all hover:bg-[#f3f4f8]"
                                        onClick={() => {
                                            sub.onClick?.();
                                            onClose();
                                        }}
                                    >
                                        <span className="shrink-0 text-[#6b6f76]">{sub.icon}</span>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-medium">{sub.label}</span>
                                            {sub.sublabel && (
                                                <span className="text-[11px] leading-tight text-[#6b6f76] font-normal mt-0.5">
                                                    {sub.sublabel}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Footer button (e.g., Sharing & Permissions) */}
            {footer && (
                <div className="mx-2.5 mt-1.5 mb-1">
                    {footer}
                </div>
            )}
        </div>,
        document.body,
    );
};
