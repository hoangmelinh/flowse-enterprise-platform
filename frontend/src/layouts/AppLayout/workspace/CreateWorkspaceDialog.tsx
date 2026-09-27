import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Modal, Input, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import type { AppDispatch, RootState } from '../../../store/configureStore';
import { addWorkspace } from '../../../store/modules/workspaces';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function CreateWorkspaceDialog({ open, onOpenChange }: Props) {
    const { t } = useTranslation('workspace');
    const { t: tc } = useTranslation('common');
    const dispatch = useDispatch<AppDispatch>();
    const error = useSelector((s: RootState) => s.workspaces.error);
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [slugTouched, setSlugTouched] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const workspaceSlugFromName = (name: string): string => {
        const base = name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return base.length > 0 ? base : 'workspace';
    };
    const syncSlug = (n: string) => {
        if (!slugTouched) setSlug(workspaceSlugFromName(n));
    };

    const reset = () => {
        setName('');
        setSlug('');
        setDescription('');
        setSlugTouched(false);
        setSubmitting(false);
    };

    const handleSubmit = async () => {
        const trimmedName = name.trim();
        const trimmedSlug = slug.trim() || workspaceSlugFromName(trimmedName);
        if (!trimmedName) return;
        setSubmitting(true);
        try {
            dispatch(addWorkspace({ name: trimmedName, slug: trimmedSlug, description: description.trim() }));
            onOpenChange(false);
            reset();
        } catch (error) {
            console.error('Failed to create workspace:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        onOpenChange(false);
        reset();
    };

    return (
        <Modal
            open={open}
            onCancel={handleCancel}
            title={
                <span className="text-h3 font-bold text-[var(--color-on-surface)]">
                    {t('create.title')}
                </span>
            }
            footer={
                <div className="flex justify-end gap-2">
                    <Button onClick={handleCancel}>{tc('buttons.cancel')}</Button>
                    <Button
                        type="primary"
                        disabled={!name.trim() || submitting}
                        onClick={handleSubmit}
                    >
                        {submitting ? t('create.creating') : t('create.submit')}
                    </Button>
                </div>
            }
            width={448}
            destroyOnHidden
        >
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="ws-name"
                        className="text-caption font-bold uppercase tracking-wide text-[var(--color-text-secondary)]"
                    >
                        {t('settings.name')}
                    </label>
                    <Input
                        id="ws-name"
                        value={name}
                        placeholder={t('settings.namePlaceholder')}
                        onChange={(e) => {
                            setName(e.target.value);
                            syncSlug(e.target.value);
                        }}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="ws-slug"
                        className="text-caption font-bold uppercase tracking-wide text-[var(--color-text-secondary)]"
                    >
                        Slug
                    </label>
                    <Input
                        id="ws-slug"
                        value={slug}
                        placeholder="my-workspace"
                        onChange={(e) => {
                            setSlugTouched(true);
                            setSlug(e.target.value);
                        }}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label
                        htmlFor="ws-desc"
                        className="text-caption font-bold uppercase tracking-wide text-[var(--color-text-secondary)]"
                    >
                        {t('settings.description')}
                    </label>
                    <Input
                        id="ws-desc"
                        value={description}
                        placeholder={t('settings.descriptionPlaceholder')}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
                {error ? (
                    <p className="text-caption font-medium text-[var(--color-error)]">{error}</p>
                ) : null}
            </div>
        </Modal>
    );
}
