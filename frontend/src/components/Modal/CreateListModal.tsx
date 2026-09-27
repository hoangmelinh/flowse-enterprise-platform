import { useState } from 'react';
import { List, X } from 'lucide-react';
import type { CreateListModalProps } from '@/types/modal';

export default function CreateListModal({ isOpen, onClose, onCreate, folderName }: CreateListModalProps) {
    const [name, setName] = useState('');

    if (!isOpen) return null;

    const handleCreate = () => {
        if (name.trim()) {
            onCreate(name.trim());
            setName('');
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-1000 flex items-center justify-center bg-black/35 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                className="w-115 rounded-xl bg-(--color-surface-container-lowest) shadow-[0_16px_48px_rgba(0,0,0,0.18)"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-(--color-border-light) px-5 pb-3 pt-4">
                    <div className="flex items-center gap-2">
                        <List size={18} className="text-(--color-accent)" />
                        <h2 className="m-0 text-base font-extrabold text-(--color-on-surface)">Create a List</h2>
                    </div>
                    <button
                        className="cursor-pointer rounded-md border-none bg-transparent p-1 text-(--color-text-tertiary) hover:bg-(--color-surface-hover) hover:text-(--color-on-surface)"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </div>

                <p className="m-0 px-5 pb-0 pt-3 text-[13px] text-(--color-text-secondary)">
                    Add a List to <strong>{folderName || 'this Space'}</strong>
                </p>

                <div className="px-5 py-4">
                    <label className="mb-1.5 block text-xs font-bold text-(--color-text-secondary)">List name</label>
                    <input
                        className="box-border w-full rounded-lg border border-(--color-border) px-3 py-2.5 text-sm text-(--color-on-surface) outline-none transition-colors focus:border-(--color-accent) focus:shadow-[0_0_0_3px_rgba(124,92,252,0.1)"
                        placeholder="e.g. Frontend Tasks, Backend Tasks..."
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleCreate()}
                        autoFocus
                    />
                </div>

                <div className="flex justify-end gap-2 border-t border-(--color-border-light) px-5 pb-4 pt-3">
                    <button
                        className="cursor-pointer rounded-lg border border-(--color-border) bg-transparent px-4.5 py-2 text-[13px] font-semibold text-(--color-text-secondary) hover:bg-(--color-surface-subtle)"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="cursor-pointer rounded-lg border-none bg-(--color-accent) px-4.5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-(--color-accent-hover) disabled:cursor-default disabled:opacity-50"
                        onClick={handleCreate}
                        disabled={!name.trim()}
                    >
                        Create List
                    </button>
                </div>
            </div>
        </div>
    );
}
