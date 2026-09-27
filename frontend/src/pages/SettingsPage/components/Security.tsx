import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  fetchRequestPasswordOtp,
  fetchVerifyChangePassword,
  clearChangePasswordState,
} from '@/store/modules/users';
import type { AppDispatch, RootState } from '@/store/configureStore';
import { Eye, EyeOff, Check, AlertCircle, Loader2, Mail, ArrowLeft, RotateCcw } from 'lucide-react';

function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, ' ').split('').slice(0, 6);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[i].trim()) {
        next[i] = ' ';
        onChange(next.join('').trimEnd());
      } else if (i > 0) {
        next[i - 1] = ' ';
        onChange(next.join('').trimEnd());
        refs.current[i - 1]?.focus();
      }
    }
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.replace(/\D/g, '').slice(-1);
    if (!char) return;
    const next = [...digits];
    next[i] = char;
    onChange(next.join('').replace(/ /g, ''));
    if (i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          className="h-12 w-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] text-center text-h2 font-bold text-[var(--color-on-surface)] outline-none transition-all focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(0,88,190,0.08)] disabled:bg-[var(--color-surface-subtle)] disabled:opacity-60"
        />
      ))}
    </div>
  );
}

export default function Security() {
  const { t } = useTranslation('settings');
  const { t: tc } = useTranslation('common');
  const dispatch = useDispatch<AppDispatch>();
  const {
    changePasswordSuccess,
    isRequestingOtp,
    otpRequested,
    maskedEmail,
    errorRequestOtp,
    isVerifyingOtp,
    errorVerifyOtp,
  } = useSelector((state: RootState) => state.users);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [clientError, setClientError] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (otpRequested) {
      setCountdown((c) => (c === 0 ? 60 : c));
    }
  }, [otpRequested]);

  useEffect(() => {
    if (countdown <= 0) return;
    const tTimer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(tTimer);
  }, [countdown]);

  useEffect(() => {
    if (changePasswordSuccess) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      setTimeout(() => dispatch(clearChangePasswordState()), 3000);
    }
  }, [changePasswordSuccess, dispatch]);

  useEffect(() => {
    return () => { dispatch(clearChangePasswordState()); };
  }, [dispatch]);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setClientError(t('security.fillAllFields'));
      return;
    }
    if (newPassword.length < 6) {
      setClientError(t('security.minLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setClientError(t('security.mismatch'));
      return;
    }
    dispatch(fetchRequestPasswordOtp({ currentPassword, newPassword, confirmPassword }));
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setClientError('Vui lòng nhập đủ 6 số OTP'); // Using generic text
      return;
    }
    setClientError('');
    dispatch(fetchVerifyChangePassword(otp));
  };

  const handleResendOtp = () => {
    setOtp('');
    setCountdown(60);
    dispatch(fetchRequestPasswordOtp({ currentPassword, newPassword, confirmPassword }));
  };

  const handleBack = () => {
    dispatch(clearChangePasswordState());
    setOtp('');
    setClientError('');
  };

  const inputClass =
    'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] px-3 py-2.5 pr-10 text-body text-[var(--color-on-surface)] outline-none transition-all duration-150 focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(0,88,190,0.08)] disabled:bg-[var(--color-surface-subtle)] disabled:opacity-60';
  const eyeBtnClass =
    'absolute right-3 top-1/2 -translate-y-1/2 border-none bg-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] cursor-pointer';

  return (
    <div>
      <h2 className="mb-1 text-h2 font-extrabold text-[var(--color-on-surface)]">{t('security.title')}</h2>
      <p className="mb-6 text-body-sm text-[var(--color-text-tertiary)]">{t('security.subtitle')}</p>

      {changePasswordSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-body-sm text-green-700">
          <Check size={16} className="shrink-0" />
          <span>{t('security.changeSuccess')}</span>
        </div>
      )}

      {!changePasswordSuccess && (
        <>
          {!otpRequested ? (
            <form onSubmit={handleSendOtp} className="flex max-w-120 flex-col gap-4">
              {(clientError || errorRequestOtp) && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-700">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{clientError || errorRequestOtp}</span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-caption font-bold text-[var(--color-text-secondary)]">{t('security.currentPassword')}</label>
                <div className="relative">
                  <input
                    className={inputClass}
                    type={showCurrent ? 'text' : 'password'}
                    placeholder={t('security.currentPasswordPlaceholder')}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isRequestingOtp}
                  />
                  <button type="button" className={eyeBtnClass} onClick={() => setShowCurrent(!showCurrent)}>
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-caption font-bold text-[var(--color-text-secondary)]">{t('security.newPassword')}</label>
                <div className="relative">
                  <input
                    className={inputClass}
                    type={showNew ? 'text' : 'password'}
                    placeholder={t('security.newPasswordPlaceholder')}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isRequestingOtp}
                  />
                  <button type="button" className={eyeBtnClass} onClick={() => setShowNew(!showNew)}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-caption font-bold text-[var(--color-text-secondary)]">{t('security.confirmPassword')}</label>
                <div className="relative">
                  <input
                    className={inputClass}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder={t('security.confirmPasswordPlaceholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isRequestingOtp}
                  />
                  <button type="button" className={eyeBtnClass} onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isRequestingOtp}
                className="mt-2 flex items-center justify-center gap-2 self-start rounded-lg border-none bg-[var(--color-primary)] px-6 py-2.5 text-body-sm font-bold text-white transition-colors duration-150 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRequestingOtp ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {t('security.sendingOtp')}
                  </>
                ) : (
                  <>
                    <Mail size={14} />
                    {t('security.sendOtp')}
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex max-w-120 flex-col gap-5">
              <div className="rounded-xl border border-[var(--color-border-light)] bg-[var(--color-surface-subtle)] px-5 py-4">
                <div className="mb-1 flex items-center gap-2">
                  <Mail size={16} className="text-[var(--color-primary)]" />
                  <span className="text-body font-bold text-[var(--color-on-surface)]">{t('security.otpSent')}</span>
                </div>
                <p className="text-body-sm text-[var(--color-text-secondary)]">
                  {t('security.otpSentDesc', { email: maskedEmail })}
                </p>
              </div>

              {(clientError || errorVerifyOtp) && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-700">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{clientError || errorVerifyOtp}</span>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-caption font-bold text-[var(--color-text-secondary)]">{t('security.enterOtp')}</label>
                <OtpInput value={otp} onChange={setOtp} disabled={isVerifyingOtp} />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isVerifyingOtp || otp.length < 6}
                  className="flex items-center justify-center gap-2 rounded-lg border-none bg-[var(--color-primary)] px-6 py-2.5 text-body-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isVerifyingOtp ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {t('security.verifying')}
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      {t('security.confirmChange')}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || isVerifyingOtp}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5 text-body-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw size={13} />
                  {countdown > 0 ? `${t('security.resendOtp')} (${countdown}s)` : t('security.resendOtp')}
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isVerifyingOtp}
                  className="flex items-center gap-1.5 rounded-lg border-none bg-transparent px-4 py-2.5 text-body-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-on-surface)] disabled:opacity-50"
                >
                  <ArrowLeft size={13} />
                  {tc('buttons.back')}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
