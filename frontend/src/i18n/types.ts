/**
 * i18n Type Augmentation
 * ─────────────────────────────────────────────────────────────
 * Khai báo module để TypeScript + react-i18next hiểu đúng
 * tất cả các translation keys trong dự án.
 *
 * Lợi ích:
 *   - Autocomplete keys khi dùng t('...')
 *   - Compile-time error nếu gõ sai key (thay vì lỗi runtime)
 *   - IDE tự nhắc namespace khi dùng useTranslation('namespace')
 *
 * Cách dùng:
 *   const { t } = useTranslation('settings');
 *   t('tabs.profile')       // ✅ TypeScript biết key này tồn tại
 *   t('tabs.notExist')      // ❌ TypeScript báo lỗi ngay!
 *   t('security.otpSentDesc', { email: 'abc@xyz.com' }) // ✅ interpolation
 * ─────────────────────────────────────────────────────────────
 */

// Import JSON để TypeScript infer được cấu trúc keys
import type commonVi    from './locales/vi/common.json';
import type authVi      from './locales/vi/auth.json';
import type settingsVi  from './locales/vi/settings.json';
import type tasksVi     from './locales/vi/tasks.json';
import type workspaceVi from './locales/vi/workspace.json';
import type landingVi   from './locales/vi/landing.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    /** Namespace mặc định khi không chỉ định */
    defaultNS: 'common';

    /** Map toàn bộ namespaces → TypeScript types */
    resources: {
      common:    typeof commonVi;
      auth:      typeof authVi;
      settings:  typeof settingsVi;
      tasks:     typeof tasksVi;
      workspace: typeof workspaceVi;
      landing:   typeof landingVi;
    };
  }
}
