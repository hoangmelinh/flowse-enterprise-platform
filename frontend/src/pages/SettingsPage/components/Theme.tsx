import { useTranslation } from 'react-i18next'
import { RotateCcw } from 'lucide-react';
import LanguageSwitcher from '@/components/LanguageSwitcher/LanguageSwitcher';
import { useOnboardingTour } from '@/components/OnboardingTour';

export default function Theme() {
    const { t } = useTranslation('settings');
    const { restartTour } = useOnboardingTour();

    return (
        <div>
            <h2 className="mb-1 text-h2 font-extrabold text-[var(--color-on-surface)]">
                {t('appearance.title')}
            </h2>
            <p className="mb-6 text-body-sm text-[var(--color-text-tertiary)]">
                {t('appearance.subtitle')}
            </p>

            {/* Language selector */}
            <div className="max-w-130">
                <h3 className="mb-1 text-h4 font-bold text-[var(--color-on-surface)]">
                    {t('appearance.language')}
                </h3>
                <p className="mb-3 text-body-sm text-[var(--color-text-tertiary)]">
                    {t('appearance.languageDesc')}
                </p>
                <LanguageSwitcher />
            </div>

            {/* Restart onboarding tour */}
            <div className="mt-8 max-w-130 border-t border-[var(--color-border-light)] pt-6">
                <div className="flex items-start justify-between gap-4 rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-container-lowest)] px-4 py-3.5">
                    <div className="min-w-0">
                        <p className="text-body-sm font-semibold text-[var(--color-on-surface)]">
                            {t('restartTour')}
                        </p>
                        <p className="mt-0.5 text-caption text-[var(--color-text-secondary)]">
                            {t('restartTourDesc')}
                        </p>
                    </div>
                    <button
                        id="restart-tour-btn"
                        type="button"
                        className="flex shrink-0 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-transparent px-4 py-2 text-body-sm font-semibold text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] hover:text-[var(--color-primary)]"
                        onClick={restartTour}
                    >
                        <RotateCcw size={15} />
                        {t('restartTour')}
                    </button>
                </div>
            </div>
        </div>
    )
}

