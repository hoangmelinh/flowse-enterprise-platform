import type { DriveStep } from 'driver.js';
import type { TFunction } from 'i18next';

export const getTourSteps = (t: TFunction): DriveStep[] => [
    {
        element: '#app-sidebar',
        popover: {
            title: t('onboarding.step1.title'),
            description: t('onboarding.step1.desc'),
            side: 'right' as const,
            align: 'start' as const,
        }
    },
    {
        element: '#sidebar-spaces',
        popover: {
            title: t('onboarding.step2.title'),
            description: t('onboarding.step2.desc'),
            side: 'right' as const,
            align: 'center' as const,
        }
    },
    {
        element: '#main-content',
        popover: {
            title: t('onboarding.step3.title'),
            description: t('onboarding.step3.desc'),
            side: 'left' as const,
            align: 'center' as const,
        }
    },
    {
        element: '#sidebar-ai',
        popover: {
            title: t('onboarding.step4.title'),
            description: t('onboarding.step4.desc'),
            side: 'right' as const,
            align: 'center' as const,
        }
    },
    {
        element: '#sidebar-settings',
        popover: {
            title: t('onboarding.step5.title'),
            description: t('onboarding.step5.desc'),
            side: 'right' as const,
            align: 'center' as const,
        }
    },
];
