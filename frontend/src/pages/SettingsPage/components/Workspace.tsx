import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Building2, Save, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { AppDispatch, RootState } from '../../../store/configureStore';
import {
    fetchWorkspaceById,
    editWorkspace,
} from '../../../store/modules/workspaces';

export default function Workspace() {
    const { t } = useTranslation('workspace');
    const { t: tc } = useTranslation('common');
    const dispatch = useDispatch<AppDispatch>();

    const {
        currentWorkspaceId,
        currentWorkspaceDetail,
        isLoadingWorkspaceDetail,
        isUpdatingWorkspace,
        updateWorkspaceError,
    } = useSelector((s: RootState) => s.workspaces);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        if (currentWorkspaceId) {
            dispatch(fetchWorkspaceById(currentWorkspaceId));
        }
    }, [currentWorkspaceId, dispatch]);

    useEffect(() => {
        if (currentWorkspaceDetail) {
            setName(currentWorkspaceDetail.name ?? '');
            setDescription(currentWorkspaceDetail.description ?? '');
            setSuccessMsg(null);
        }
    }, [currentWorkspaceDetail]);

    const isDirty =
        name !== (currentWorkspaceDetail?.name ?? '') ||
        description !== (currentWorkspaceDetail?.description ?? '');

    const handleSave = async () => {
        if (!currentWorkspaceId || !currentWorkspaceDetail) return;
        setSuccessMsg(null);

        const result = await dispatch(
            editWorkspace({
                workspace_id: currentWorkspaceId,
                name: name.trim(),
                slug: currentWorkspaceDetail.slug,
                description: description.trim(),
            }),
        );

        if (editWorkspace.fulfilled.match(result)) {
            setSuccessMsg(t('settings.updateSuccess'));
            setTimeout(() => setSuccessMsg(null), 4000);
        }
    };

    if (isLoadingWorkspaceDetail) {
        return (
            <div className="flex flex-col gap-6">
                <div>
                    <div className="mb-1 h-7 w-48 animate-pulse rounded-md bg-[var(--color-surface-container-high)]" />
                    <div className="h-4 w-64 animate-pulse rounded-md bg-[var(--color-surface-container-high)]" />
                </div>
                <div className="flex max-w-lg flex-col gap-5">
                    {[1, 2].map((i) => (
                        <div key={i} className="flex flex-col gap-1.5">
                            <div className="h-3.5 w-28 animate-pulse rounded bg-[var(--color-surface-container-high)]" />
                            <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--color-surface-container-high)]" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!currentWorkspaceId || !currentWorkspaceDetail) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Building2 className="h-12 w-12 text-[var(--color-border)]" />
                <p className="text-body font-medium text-[var(--color-text-tertiary)]">
                    {t('settings.noWorkspace')}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="mb-1 text-h2 font-extrabold text-[var(--color-on-surface)]">
                    {t('settings.title')}
                </h2>
                <p className="text-body-sm text-[var(--color-text-tertiary)]">
                    {t('settings.subtitle')}&nbsp;
                    <span className="font-semibold text-[var(--color-primary)]">
                        {currentWorkspaceDetail.name}
                    </span>
                </p>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-subtle)] px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-bg)]">
                    <Building2 className="h-5 w-5 text-[var(--color-primary)]" />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-body font-bold text-[var(--color-on-surface)]">
                        {currentWorkspaceDetail.name}
                    </p>
                    <p className="text-caption text-[var(--color-text-tertiary)]">
                        Slug:&nbsp;
                        <code className="rounded bg-[var(--color-surface-container-high)] px-1 py-0.5 text-overline font-mono text-[var(--color-text-secondary)]">
                            {currentWorkspaceDetail.slug}
                        </code>
                    </p>
                </div>
            </div>

            <div className="flex max-w-lg flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="ws-name"
                        className="text-caption font-bold text-[var(--color-text-secondary)]"
                    >
                        {t('settings.name')} <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="ws-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('settings.namePlaceholder')}
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] px-3 py-2.5 text-body text-[var(--color-on-surface)] outline-none transition-all duration-150 focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(0,88,190,0.08)]"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="ws-desc"
                        className="text-caption font-bold text-[var(--color-text-secondary)]"
                    >
                        {t('settings.description')}
                    </label>
                    <textarea
                        id="ws-desc"
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t('settings.descriptionPlaceholder')}
                        className="resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] px-3 py-2.5 text-body text-[var(--color-on-surface)] outline-none transition-all duration-150 focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(0,88,190,0.08)]"
                    />
                </div>

                {successMsg && (
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-body-sm text-green-700">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        {successMsg}
                    </div>
                )}
                {updateWorkspaceError && !isUpdatingWorkspace && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-body-sm text-red-600">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {updateWorkspaceError}
                    </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isUpdatingWorkspace || !isDirty || !name.trim()}
                        className="flex items-center gap-2 rounded-lg border-none bg-[var(--color-primary)] px-5 py-2.5 text-body-sm font-bold text-white transition-all duration-150 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isUpdatingWorkspace ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {isUpdatingWorkspace ? tc('buttons.saving') : tc('buttons.save')}
                    </button>

                    {isDirty && !isUpdatingWorkspace && (
                        <button
                            type="button"
                            onClick={() => {
                                setName(currentWorkspaceDetail.name ?? '');
                                setDescription(currentWorkspaceDetail.description ?? '');
                            }}
                            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5 text-body-sm font-medium text-[var(--color-text-secondary)] transition-colors duration-150 hover:bg-[var(--color-surface-subtle)]"
                        >
                            {tc('buttons.cancel')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
