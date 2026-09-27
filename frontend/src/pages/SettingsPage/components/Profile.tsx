import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Camera, Save, AlertCircle, CheckCircle2, Loader2, User } from 'lucide-react';
import { Avatar } from 'antd';
import type { AppDispatch, RootState } from '../../../store/configureStore';
import {
    fetchGetProfile,
    fetchUpdateProfile,
    clearUpdateProfileState,
} from '../../../store/modules/users';

export default function Profile() {
    const { t } = useTranslation('settings');
    const { t: tc } = useTranslation('common');
    const dispatch = useDispatch<AppDispatch>();

    const {
        profile,
        isLoadingProfile,
        profileError,
        isUpdatingProfile,
        updateProfileError,
        updateProfileSuccess,
    } = useSelector((s: RootState) => s.users);

    const [name, setName] = useState('');
    const [sdt, setSdt] = useState('');

    useEffect(() => {
        dispatch(fetchGetProfile());
        return () => {
            dispatch(clearUpdateProfileState());
        };
    }, [dispatch]);

    useEffect(() => {
        if (profile) {
            setName(profile.name ?? '');
            setSdt(profile.sdt ?? '');
        }
    }, [profile]);

    const isDirty =
        name !== (profile?.name ?? '') ||
        sdt !== (profile?.sdt ?? '');

    const initials = (profile?.name || profile?.username || 'U')
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const handleSave = async () => {
        if (!isDirty) return;
        dispatch(clearUpdateProfileState());

        const payload: { name?: string; sdt?: string } = {};
        if (name.trim() !== (profile?.name ?? '')) payload.name = name.trim();
        if (sdt.trim() !== (profile?.sdt ?? '')) payload.sdt = sdt.trim();

        await dispatch(fetchUpdateProfile(payload));
    };

    if (isLoadingProfile && !profile) {
        return (
            <div className="flex flex-col gap-6">
                <div>
                    <div className="mb-1 h-7 w-40 animate-pulse rounded-md bg-[var(--color-surface-container-high)]" />
                    <div className="h-4 w-56 animate-pulse rounded-md bg-[var(--color-surface-container-high)]" />
                </div>
                <div className="mb-6 flex items-center gap-5 rounded-xl bg-[var(--color-surface-subtle)] p-5">
                    <div className="h-18 w-18 animate-pulse rounded-full bg-[var(--color-surface-container-high)]" />
                    <div className="flex flex-col gap-2">
                        <div className="h-4 w-32 animate-pulse rounded bg-[var(--color-surface-container-high)]" />
                        <div className="h-3 w-24 animate-pulse rounded bg-[var(--color-surface-container-high)]" />
                    </div>
                </div>
                <div className="flex max-w-lg flex-col gap-5">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col gap-1.5">
                            <div className="h-3.5 w-24 animate-pulse rounded bg-[var(--color-surface-container-high)]" />
                            <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--color-surface-container-high)]" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (profileError && !profile) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <AlertCircle className="h-12 w-12 text-red-300" />
                <p className="text-body font-medium text-red-500">{profileError}</p>
                <button
                    onClick={() => dispatch(fetchGetProfile())}
                    className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-body font-semibold text-white hover:bg-[var(--color-primary-hover)]"
                >
                    {tc('buttons.retry')}
                </button>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <User className="h-12 w-12 text-[var(--color-border)]" />
                <p className="text-body font-medium text-[var(--color-text-tertiary)]">{t('profile.notFound')}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="mb-1 text-h2 font-extrabold text-[var(--color-on-surface)]">{t('profile.title')}</h2>
                <p className="text-body-sm text-[var(--color-text-tertiary)]">{t('profile.subtitle')}</p>
            </div>

            <div className="flex items-center gap-5 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-subtle)] p-5">
                <div className="relative shrink-0">
                    {profile.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt={profile.name}
                            className="h-[72px] w-[72px] rounded-full object-cover"
                        />
                    ) : (
                        <Avatar
                            size={72}
                            style={{
                                backgroundColor: 'var(--color-primary-alt)',
                                fontSize: '24px',
                                fontWeight: 'bold',
                            }}
                        >
                            {initials}
                        </Avatar>
                    )}
                    <button
                        type="button"
                        title={t('profile.changeAvatar')}
                        disabled
                        className="absolute bottom-0 right-0 flex h-[26px] w-[26px] cursor-not-allowed items-center justify-center rounded-full border-2 border-white bg-[var(--color-primary)] text-white opacity-60"
                    >
                        <Camera size={14} />
                    </button>
                </div>
                <div>
                    <p className="m-0 text-body font-extrabold text-[var(--color-on-surface)]">{profile.name}</p>
                    <p className="mt-0.5 text-body-sm text-[var(--color-text-tertiary)]">@{profile.username}</p>
                </div>
            </div>

            <div className="flex max-w-lg flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-name" className="text-caption font-bold text-[var(--color-text-secondary)]">
                        {t('profile.fullName')} <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="profile-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('profile.fullNamePlaceholder')}
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] px-3 py-2.5 text-body text-[var(--color-on-surface)] outline-none transition-all duration-150 focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(0,88,190,0.08)]"
                    />
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-email" className="text-caption font-bold text-[var(--color-text-secondary)]">
                        {t('profile.email')}
                    </label>
                    <div className="relative">
                        <input
                            id="profile-email"
                            type="email"
                            value={profile.email}
                            readOnly
                            className="w-full cursor-not-allowed rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-2.5 text-body text-[var(--color-text-tertiary)] outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[var(--color-surface-container-high)] px-1.5 py-0.5 text-micro font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                            read-only
                        </span>
                    </div>
                    <p className="text-overline text-[var(--color-text-tertiary)]">{t('profile.emailReadonly')}</p>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-role" className="text-caption font-bold text-[var(--color-text-secondary)]">
                        {t('profile.role')}
                    </label>
                    <div className="relative">
                        <input
                            id="profile-role"
                            type="text"
                            value="—"
                            readOnly
                            className="w-full cursor-not-allowed rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-2.5 text-body text-[var(--color-text-tertiary)] outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-[var(--color-surface-container-high)] px-1.5 py-0.5 text-micro font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">
                            read-only
                        </span>
                    </div>
                    <p className="text-overline text-[var(--color-text-tertiary)]">Vai trò được quản lý bởi Admin của workspace.</p>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-sdt" className="text-caption font-bold text-[var(--color-text-secondary)]">
                        {t('profile.phone')}
                    </label>
                    <input
                        id="profile-sdt"
                        type="tel"
                        value={sdt}
                        onChange={(e) => setSdt(e.target.value)}
                        placeholder={t('profile.phonePlaceholder')}
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] px-3 py-2.5 text-body text-[var(--color-on-surface)] outline-none transition-all duration-150 focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(0,88,190,0.08)]"
                    />
                </div>

                {updateProfileSuccess && (
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-body-sm text-green-700">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        {t('profile.updateSuccess')}
                    </div>
                )}
                {updateProfileError && !isUpdatingProfile && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-body-sm text-red-600">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {updateProfileError}
                    </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isUpdatingProfile || !isDirty || !name.trim()}
                        className="flex items-center gap-2 rounded-lg border-none bg-[var(--color-primary)] px-5 py-2.5 text-body-sm font-bold text-white transition-all duration-150 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isUpdatingProfile ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {isUpdatingProfile ? tc('buttons.saving') : tc('buttons.save')}
                    </button>

                    {isDirty && !isUpdatingProfile && (
                        <button
                            type="button"
                            onClick={() => {
                                setName(profile.name ?? '');
                                setSdt(profile.sdt ?? '');
                                dispatch(clearUpdateProfileState());
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
