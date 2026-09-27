import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function Notifications() {
    const { t } = useTranslation('settings');
    const [notiEmail, setNotiEmail] = useState(true);
    const [notiMention, setNotiMention] = useState(true);
    const [notiTaskUpdate, setNotiTaskUpdate] = useState(false);

    const toggleItems = [
        {
            label: t('notifications.email'),
            desc: t('notifications.emailDesc'),
            value: notiEmail,
            onChange: () => setNotiEmail(!notiEmail),
        },
        {
            label: t('notifications.mention'),
            desc: t('notifications.mentionDesc'),
            value: notiMention,
            onChange: () => setNotiMention(!notiMention),
        },
        {
            label: t('notifications.taskUpdate'),
            desc: t('notifications.taskUpdateDesc'),
            value: notiTaskUpdate,
            onChange: () => setNotiTaskUpdate(!notiTaskUpdate),
        },
    ];

    return (
        <div>
            <h2 className="mb-1 text-h2 font-extrabold text-[var(--color-on-surface)]">
                {t('notifications.title')}
            </h2>
            <p className="mb-6 text-body-sm text-[var(--color-text-tertiary)]">
                {t('notifications.subtitle')}
            </p>

            <div className="flex max-w-130 flex-col gap-1">
                {toggleItems.map((item, idx) => (
                    <div
                        key={idx}
                        className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-light)] px-4 py-3.5 transition-colors duration-100 hover:bg-[var(--color-surface-subtle)]"
                    >
                        <div className="flex flex-col">
                            <span className="text-body font-bold text-[var(--color-on-surface)]">
                                {item.label}
                            </span>
                            <span className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">
                                {item.desc}
                            </span>
                        </div>
                        <button
                            className={`relative h-6 w-11 shrink-0 rounded-xl border-none transition-colors duration-200 ${item.value ? 'bg-[var(--color-primary)]' : 'bg-[#dcdfe4]'
                                }`}
                            onClick={item.onChange}
                        >
                            <span
                                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--color-surface-container-lowest)] shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-200 ${item.value ? 'translate-x-5' : ''
                                    }`}
                            />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
