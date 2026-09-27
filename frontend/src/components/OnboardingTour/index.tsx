/**
 * Onboarding Tour Hook
 * ─────────────────────────────────────────────────────────────
 * Sử dụng Driver.js v1.4 để tạo product tour hướng dẫn người dùng mới.
 *
 * Tính năng:
 *   - Auto-start sau 1500ms cho user lần đầu đăng nhập
 *   - i18n-aware: tự động cập nhật ngôn ngữ khi user đổi language mid-tour
 *   - Mobile-aware: tự động mở sidebar overlay trước khi highlight
 *   - localStorage: nhớ tour đã hoàn thành, không hiện lại
 *   - restartTour(): dùng trong Settings để xem lại hướng dẫn
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useCallback, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './onboarding.css';
import { useTranslation } from 'react-i18next';
import { getTourSteps } from './tourSteps';

const STORAGE_KEY = 'onboarding_completed';

/** lg breakpoint = 1024px — dưới ngưỡng này sidebar là overlay trên mobile */
const isCompactLayout = () => window.innerWidth < 1024;

/** Mở mobile sidebar nếu đang ở compact layout */
function openMobileSidebarIfNeeded() {
  if (!isCompactLayout()) return;
  const toggleBtn = document.getElementById('mobile-sidebar-toggle');
  if (toggleBtn) {
    toggleBtn.click();
  }
}

export function useOnboardingTour() {
  const { t, i18n } = useTranslation();
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  /** Factory: tạo driver instance với config mới nhất (i18n keys tươi) */
  const createDriver = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: 'rgba(0, 0, 0, 0.65)',
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: 'flowise-tour-popover',
      nextBtnText: t('onboarding.next'),
      prevBtnText: t('onboarding.prev'),
      doneBtnText: t('onboarding.done'),
      progressText: '{{current}} / {{total}}',
      steps: getTourSteps(t),
      onDestroyStarted: () => {
        localStorage.setItem(STORAGE_KEY, 'true');
        driverObj.destroy();
      },
      // Khi chuẩn bị highlight một element
      onHighlightStarted: (element) => {
        const el = element as HTMLElement | undefined;
        // Nếu highlight sidebar trên mobile → mở sidebar trước
        if (el?.id === 'app-sidebar') {
          openMobileSidebarIfNeeded();
        }
      },
    });
    return driverObj;
  }, [t]);

  // ── Auto-start tour cho user mới ────────────────────────────
  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed) return;

    // Delay 1.5s để page load xong, layout ổn định
    const timer = setTimeout(() => {
      const driverObj = createDriver();
      driverRef.current = driverObj;
      driverObj.drive();
    }, 1500);

    return () => {
      clearTimeout(timer);
      driverRef.current?.destroy();
    };
  }, [createDriver]);

  // ── Re-create driver khi user đổi ngôn ngữ mid-tour ─────────
  useEffect(() => {
    const handleLangChanged = () => {
      const activeDriver = driverRef.current;
      if (!activeDriver?.isActive()) return;

      // Lưu step hiện tại trước khi destroy
      const currentStep = activeDriver.getActiveIndex() ?? 0;
      activeDriver.destroy();

      // Tạo driver mới với i18n keys tươi và tiếp tục từ step đang dở
      const newDriver = createDriver();
      driverRef.current = newDriver;

      // Delay nhỏ để DOM cập nhật xong
      setTimeout(() => newDriver.drive(currentStep), 100);
    };

    i18n.on('languageChanged', handleLangChanged);
    return () => {
      i18n.off('languageChanged', handleLangChanged);
    };
  }, [createDriver, i18n]);

  // ── Restart tour (dùng trong Settings) ──────────────────────
  const restartTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    driverRef.current?.destroy();

    // Nếu ở mobile, mở sidebar trước khi bắt đầu tour
    openMobileSidebarIfNeeded();

    const driverObj = createDriver();
    driverRef.current = driverObj;

    // Delay nhỏ để sidebar animation hoàn tất
    setTimeout(() => driverObj.drive(), isCompactLayout() ? 400 : 0);
  }, [createDriver]);

  return { restartTour };
}
