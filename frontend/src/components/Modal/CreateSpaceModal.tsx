import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { CreateSpaceModalProps } from '@/types/modal';

const COLORS = [
    '#e84393', '#d63031', '#e17055', '#fdcb6e', '#00b894', '#00cec9', '#0984e3', '#6c5ce7',
    '#636e72', '#2d3436', '#fab1a0', '#74b9ff',
];

export default function CreateSpaceModal({ isOpen, onClose, onCreate }: CreateSpaceModalProps) {
    const [spaceName, setSpaceName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedColor, setSelectedColor] = useState(COLORS[6]); // Default blue
    const [isPrivate, setIsPrivate] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

     
    useEffect(() => {
        if (isOpen) {
            setSpaceName('');
            setDescription('');
            setSelectedColor(COLORS[6]);
            setIsPrivate(false);
            setShowColorPicker(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleCreate = () => {
        if (!spaceName.trim()) return;
        onCreate(spaceName.trim(), selectedColor, isPrivate);
        onClose();
    };

    const initial = spaceName.trim().charAt(0).toUpperCase() || 'S';

    return (
        <div
            className="fixed inset-0 z-9999 flex items-center justify-center bg-[rgba(0,0,0,0.35) backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                className="w-130 flex flex-col rounded-2xl bg-(--color-surface-container-lowest) font-['Plus_Jakarta_Sans',sans-serif] shadow-[0_24px_80px_rgba(0,0,0,0.18) overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div className="relative px-7 pt-7 pb-4">
                    <button
                        className="absolute right-5 top-5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-(--color-text-tertiary) transition-all hover:bg-(--color-surface-hover) hover:text-(--color-on-surface-variant)"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                    <h2 className="m-0 text-[20px] font-bold text-(--color-on-surface) tracking-[-0.01em]">
                        Create a Space
                    </h2>
                    <p className="m-0 mt-1.5 text-[13.5px] leading-normal text-(--color-text-secondary)">
                        A Space represents teams, departments, or groups, each with its own Lists, workflows, and settings.
                    </p>
                </div>

                {/* ── Body ── */}
                <div className="flex flex-col gap-5 px-7 pb-6">
                    {/* Icon & Name */}
                    <div>
                        <label className="mb-2 block text-[12px] font-semibold text-(--color-text-secondary)">Icon & name</label>
                        <div className="flex items-center gap-3">
                            {/* Avatar preview — click to show color picker */}
                            <div className="relative">
                                <button
                                    type="button"
                                    className="flex h-10.5 w-10.5 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 text-[17px] font-bold text-white transition-all hover:shadow-md"
                                    style={{ backgroundColor: selectedColor, borderColor: selectedColor }}
                                    onClick={() => setShowColorPicker(!showColorPicker)}
                                >
                                    {initial}
                                </button>

                                {/* Color palette dropdown */}
                                {showColorPicker && (
                                    <div className="absolute top-full left-0 z-10 mt-2 flex w-50 flex-wrap gap-2 rounded-xl bg-(--color-surface-container-lowest) p-3 shadow-[0_8px_32px_rgba(0,0,0,0.14) border border-(--color-border-light)">
                                        {COLORS.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                className={`h-7 w-7 cursor-pointer rounded-full border-2 transition-all hover:scale-110 ${selectedColor === c
                                                        ? 'scale-110 border-white shadow-[0_0_0_2px_var(--color-primary-alt)'
                                                        : 'border-transparent'
                                                    }`}
                                                style={{ backgroundColor: c }}
                                                onClick={() => {
                                                    setSelectedColor(c);
                                                    setShowColorPicker(false);
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <input
                                ref={inputRef}
                                type="text"
                                className="min-w-0 flex-1 h-10.5 rounded-lg border border-(--color-border) px-3.5 text-[14px] font-medium text-(--color-on-surface) outline-none transition-all placeholder:text-(--color-text-tertiary) focus:border-(--color-primary-alt) focus:shadow-[0_0_0_3px_rgba(26,115,232,0.08)"
                                placeholder="e.g. Marketing, Engineering, HR"
                                value={spaceName}
                                onChange={(e) => setSpaceName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="mb-2 block text-[12px] font-semibold text-(--color-text-secondary)">
                            Description <span className="font-normal text-(--color-text-tertiary)">(optional)</span>
                        </label>
                        <textarea
                            className="w-full min-h-15 resize-none rounded-lg border border-(--color-border) px-3.5 py-2.5 text-[13.5px] font-medium text-(--color-on-surface) outline-none transition-all placeholder:text-(--color-text-tertiary) focus:border-(--color-primary-alt) focus:shadow-[0_0_0_3px_rgba(26,115,232,0.08)"
                            placeholder="What's this space about?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    {/* Make Private toggle */}
                    <div className="flex items-center justify-between rounded-xl bg-(--color-surface-subtle) px-4 py-3.5">
                        <div>
                            <div className="text-[13.5px] font-semibold text-(--color-on-surface)">Make Private</div>
                            <div className="text-[12px] text-(--color-text-secondary) mt-0.5">Only you and invited members have access</div>
                        </div>
                        <button
                            type="button"
                            className={`relative h-5.5 w-10 cursor-pointer rounded-full border-none transition-colors duration-200 ${isPrivate ? 'bg-(--color-primary-alt)' : 'bg-(--color-border)'}`}
                            onClick={() => setIsPrivate(!isPrivate)}
                        >
                            <span
                                className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-[var(--color-surface-container-lowest)] shadow-sm transition-transform duration-200 ${isPrivate ? 'left-5' : 'left-0.5'}`}
                            />
                        </button>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between border-t border-(--color-border-light) bg-(--color-surface-subtle) px-7 py-4">
                    <button
                        type="button"
                        className="cursor-pointer rounded-lg border-none bg-transparent px-1 py-1.5 text-[13px] font-medium text-(--color-text-secondary) hover:text-(--color-on-surface) transition-colors"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="h-9.5 cursor-pointer rounded-lg border-none bg-(--color-primary-alt) px-6 text-[13.5px] font-bold text-white transition-all hover:bg-(--color-primary-hover) hover:shadow-md disabled:cursor-default disabled:opacity-40"
                        onClick={handleCreate}
                        disabled={!spaceName.trim()}
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
