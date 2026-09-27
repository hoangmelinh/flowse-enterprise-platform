import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchShareableUsers, fetchShareTask, clearShareTaskState } from '@/store/modules/tasks';
import type { AppDispatch, RootState } from '@/store/configureStore';
import { X, Search, Check, Loader2, Users, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ShareTaskModalProps {
    taskId: number;
    taskName: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function ShareTaskModal({ taskId, taskName, isOpen, onClose }: ShareTaskModalProps) {
    const dispatch = useDispatch<AppDispatch>();
    const { t } = useTranslation('tasks');
    const { t: tc } = useTranslation('common');
    
    const {
        shareableUsers,
        isLoadingShareableUsers,
        isSharingTask,
        shareTaskSuccess,
        errorShareTask,
    } = useSelector((state: RootState) => state.tasks);

    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen && taskId) {
            dispatch(fetchShareableUsers(taskId));
        }
        return () => {
            dispatch(clearShareTaskState());
            setSelectedUserIds([]);
            setSearchQuery('');
        };
    }, [isOpen, taskId, dispatch]);

    useEffect(() => {
        if (shareTaskSuccess) {
            setTimeout(() => {
                onClose();
            }, 1500);
        }
    }, [shareTaskSuccess, onClose]);

    const filteredUsers = shareableUsers.filter((user) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;
        return (
            user.name?.toLowerCase().includes(q) ||
            user.email?.toLowerCase().includes(q) ||
            user.username?.toLowerCase().includes(q)
        );
    });

    const toggleUser = (userId: number) => {
        setSelectedUserIds((prev) =>
            prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
        );
    };

    const handleShare = () => {
        if (selectedUserIds.length === 0) return;
        dispatch(fetchShareTask({ task_id: taskId, user_ids: selectedUserIds }));
    };

    if (!isOpen) return null;

    // Xác định trạng thái hiển thị danh sách
    const hasNoMembersLeft = !isLoadingShareableUsers && shareableUsers.length === 0;
    const hasNoSearchResult = !isLoadingShareableUsers && shareableUsers.length > 0 && filteredUsers.length === 0;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="mx-4 flex w-full max-w-md flex-col rounded-2xl bg-[var(--color-surface-container-lowest)] shadow-2xl font-['Plus_Jakarta_Sans',sans-serif]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--color-surface-container-highest)] px-6 py-4">
                    <div className="flex items-center gap-2.5">
                        <Share2 size={18} className="text-[var(--color-primary)]" />
                        <h2 className="m-0 text-body font-extrabold text-[var(--color-on-surface)]">
                            {t('share.title', { defaultValue: 'Share Task' })}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border-none bg-transparent text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-on-surface)] cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Task name */}
                <div className="border-b border-[var(--color-surface-container-highest)] px-6 py-3">
                    <p className="m-0 text-caption text-[var(--color-text-secondary)]">{t('share.subtitle', { defaultValue: 'Chia sẻ task' })}</p>
                    <p className="m-0 mt-0.5 text-body-sm font-semibold text-[var(--color-on-surface)] truncate">{taskName}</p>
                </div>

                {/* Search — chỉ hiển thị khi có dữ liệu */}
                {!hasNoMembersLeft && (
                    <div className="px-6 pt-4">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                            <input
                                type="text"
                                placeholder={tc('search.placeholder', { defaultValue: 'Tìm kiếm theo tên, email...' })}
                                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-low)] py-2.5 pl-10 pr-3 text-body-sm text-[var(--color-on-surface)] outline-none transition-all focus:border-[var(--color-primary)] focus:bg-[var(--color-surface-container-lowest)] focus:shadow-sm placeholder-[var(--color-text-tertiary)]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* User list */}
                <div className="max-h-72 min-h-[120px] overflow-y-auto px-6 py-3">
                    {isLoadingShareableUsers ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 size={24} className="animate-spin text-[var(--color-primary)]" />
                        </div>
                    ) : hasNoMembersLeft ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <Users size={32} className="text-[var(--color-text-tertiary)] opacity-50" />
                            <p className="m-0 text-body-sm text-[var(--color-text-secondary)]">
                                {t('share.allAssigned', { defaultValue: 'Tất cả thành viên đã được gán vào task này' })}
                            </p>
                        </div>
                    ) : hasNoSearchResult ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                            <Search size={28} className="text-[var(--color-text-tertiary)] opacity-50" />
                            <p className="m-0 text-body-sm text-[var(--color-text-secondary)]">
                                {t('share.noResult', { defaultValue: `Không tìm thấy thành viên phù hợp với "${searchQuery}"` })}
                            </p>
                            <button
                                onClick={() => setSearchQuery('')}
                                className="mt-1 text-caption font-semibold text-[var(--color-primary)] hover:underline cursor-pointer border-none bg-transparent"
                            >
                                {t('share.clearSearch', { defaultValue: 'Xoá tìm kiếm' })}
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {filteredUsers.map((user) => {
                                const isSelected = selectedUserIds.includes(user.user_id);
                                return (
                                    <button
                                        key={user.user_id}
                                        onClick={() => toggleUser(user.user_id)}
                                        className={`flex w-full items-center gap-3 rounded-lg border-none px-3 py-2.5 text-left transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-[var(--color-primary-bg)] ring-1 ring-[var(--color-primary-border)]'
                                                : 'bg-transparent hover:bg-[var(--color-surface-hover)]'
                                        }`}
                                    >
                                        {/* Avatar */}
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-variant)] text-caption font-bold text-[var(--color-on-surface)] overflow-hidden">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} alt={user.name} className="h-full w-full object-cover" />
                                            ) : (
                                                (user.name || user.username || 'U').charAt(0).toUpperCase()
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex flex-1 flex-col min-w-0">
                                            <span className="text-body-sm font-semibold text-[var(--color-on-surface)] truncate">
                                                {user.name || user.username}
                                            </span>
                                            <span className="text-caption text-[var(--color-text-tertiary)] truncate">{user.email}</span>
                                        </div>

                                        {/* Checkbox */}
                                        <div
                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all ${
                                                isSelected
                                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                                                    : 'border-[var(--color-border)] bg-transparent'
                                            }`}
                                        >
                                            {isSelected && <Check size={12} />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-[var(--color-surface-container-highest)] px-6 py-4 rounded-b-2xl bg-[var(--color-surface-container-low)]">
                    <div className="text-caption text-[var(--color-text-secondary)]">
                        {selectedUserIds.length > 0
                            ? t('share.selectedCount', { count: selectedUserIds.length, defaultValue: `Đã chọn ${selectedUserIds.length} thành viên` })
                            : t('share.selectPrompt', { defaultValue: 'Chọn thành viên để chia sẻ' })}
                    </div>

                    <div className="flex items-center gap-2">
                        {shareTaskSuccess && (
                            <span className="flex items-center gap-1 text-caption font-semibold text-[var(--color-success)]">
                                <Check size={14} />
                                {t('share.success', { defaultValue: 'Đã chia sẻ!' })}
                            </span>
                        )}
                        {errorShareTask && (
                            <span className="text-caption text-[var(--color-error)]">{errorShareTask}</span>
                        )}
                        <button
                            onClick={onClose}
                            className="rounded-lg border border-[var(--color-border)] bg-transparent px-4 py-2 text-[13px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] cursor-pointer"
                        >
                            {tc('buttons.cancel', { defaultValue: 'Hủy' })}
                        </button>
                        <button
                            onClick={handleShare}
                            disabled={selectedUserIds.length === 0 || isSharingTask || shareTaskSuccess}
                            className="flex items-center gap-1.5 rounded-lg border-none bg-[var(--color-primary)] px-4 py-2 text-[13px] font-bold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                        >
                            {isSharingTask ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    {t('share.sharing', { defaultValue: 'Đang chia sẻ...' })}
                                </>
                            ) : (
                                <>
                                    <Share2 size={14} />
                                    {t('share.submit', { defaultValue: 'Chia sẻ' })}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
