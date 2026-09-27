import React from 'react';
import { Select } from 'antd';
import { useTranslation } from 'react-i18next';

// ── Supported languages ──────────────────────────────────────
type SupportedLang = 'vi' | 'en';

const LANGUAGE_OPTIONS: {
  value: SupportedLang;
  label: string;
  flag: string;
}[] = [
  { value: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { value: 'en', label: 'English',    flag: '🇺🇸' },
];

// ── Component ────────────────────────────────────────────────
const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const handleChange = (lang: SupportedLang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('app_language', lang);
  };

  // Normalize language code (i18n.language có thể là 'vi-VN', 'en-US'...)
  const currentLang = (i18n.language?.split('-')[0] as SupportedLang) ?? 'vi';

  return (
    <Select<SupportedLang>
      id="language-switcher"
      value={currentLang}
      onChange={handleChange}
      size="small"
      className="min-w-[148px]"
      popupMatchSelectWidth={false}
      options={LANGUAGE_OPTIONS.map(({ value, label, flag }) => ({
        value,
        label: (
          <span className="flex items-center gap-2">
            <span role="img" aria-label={label}>{flag}</span>
            <span>{label}</span>
          </span>
        ),
      }))}
    />
  );
};

export default LanguageSwitcher;
