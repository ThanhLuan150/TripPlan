import {useEffect, useState} from 'react';
import {useMutation} from '@tanstack/react-query';
import {Link, useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoCheckmarkCircle, IoClose, IoFlagOutline} from 'react-icons/io5';
import {routes} from '@/app/routes';
import FieldError from '@/components/ui/FieldError';
import {getUser} from '@/features/auth/store/session';
import {apiMessage, apiStatus, connectionErrorKey} from '@/lib/apiClient';
import {tripsApi} from '../api/tripsApi';
import {MAX_REPORT_LENGTH, REPORT_REASONS, type ReportReason} from '../types';

interface Props {
  // the post (public trip) being reported
  tripId: string;
  className?: string;
}

// "Report" of a post. A visitor who is not signed in gets a link to sign in instead. The report is
// private: the author is never told who sent it.
export default function ReportPostButton({tripId, className = ''}: Props) {
  const {t} = useTranslation();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const base = `inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${className}`;

  if (!getUser()) {
    return (
      <Link to={routes.Login} state={{from: location}} aria-label={t('trips.report.signIn')} className={base}>
        <IoFlagOutline size={18} />
        {t('trips.report.open')}
      </Link>
    );
  }

  return (
    <>
      <button type="button" className={base} onClick={() => setOpen(true)}>
        <IoFlagOutline size={18} />
        {t('trips.report.open')}
      </button>
      {open && <ReportPostDialog tripId={tripId} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReportPostDialog({tripId, onClose}: {tripId: string; onClose: () => void}) {
  const {t} = useTranslation();
  const [reason, setReason] = useState<ReportReason>('spam');
  const [description, setDescription] = useState('');
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const trimmed = description.trim();
  const tooLong = trimmed.length > MAX_REPORT_LENGTH;
  // "other" has nothing to tell what the problem is without the description
  const missing = reason === 'other' && trimmed.length === 0;
  const [showMissing, setShowMissing] = useState(false);

  const send = useMutation({
    mutationFn: () => tripsApi.reportPost(tripId, reason, trimmed || undefined),
    onSuccess: () => setSent(true),
    onError: error => {
      const status = apiStatus(error);
      setServerError(
        connectionErrorKey(error) ??
          (status === 409
            ? 'trips.report.duplicate'
            : status === 404
              ? 'trips.report.unavailable'
              : status === 400 && /own post/i.test(apiMessage(error) ?? '')
                ? 'trips.report.own'
                : 'trips.report.failed'),
      );
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[900] grid place-items-center p-4 text-left" role="dialog" aria-modal="true" aria-label={t('trips.report.title')}>
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-pop-in rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
          <IoClose size={20} />
        </button>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <IoFlagOutline size={20} className="text-rose-500" />
          {t('trips.report.title')}
        </h2>

        {sent ? (
          <div className="mt-4 space-y-4 text-center">
            <IoCheckmarkCircle size={44} className="mx-auto text-brand-600" />
            <p className="font-semibold">{t('trips.report.success')}</p>
            <p className="text-sm text-slate-600">{t('trips.report.successText')}</p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              {t('common.close')}
            </button>
          </div>
        ) : (
          <form
            className="mt-2 space-y-4"
            onSubmit={event => {
              event.preventDefault();
              setServerError(null);
              if (missing) {
                setShowMissing(true);
                return;
              }
              if (!tooLong) {
                send.mutate();
              }
            }}>
            <p className="text-sm text-slate-500">{t('trips.report.subtitle')}</p>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">{t('trips.report.reasonLabel')}</legend>
              <div role="radiogroup" className="space-y-1.5">
                {REPORT_REASONS.map(value => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                      reason === value ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'
                    }`}>
                    <input
                      type="radio"
                      name="report-reason"
                      value={value}
                      checked={reason === value}
                      onChange={() => {
                        setReason(value);
                        setShowMissing(false);
                      }}
                      className="accent-brand-600"
                    />
                    {t(`trips.report.reasons.${value}`)}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="report-description" className="mb-1 block text-sm font-medium text-slate-700">
                {t(reason === 'other' ? 'trips.report.descriptionLabel' : 'trips.report.descriptionOptional')}
              </label>
              <textarea
                id="report-description"
                rows={3}
                value={description}
                placeholder={t('trips.report.descriptionPlaceholder')}
                aria-invalid={tooLong || (showMissing && missing) ? true : undefined}
                onChange={event => setDescription(event.target.value)}
                className="field w-full resize-y"
              />
              <FieldError role="alert">
                {tooLong
                  ? t('trips.report.tooLong', {max: MAX_REPORT_LENGTH})
                  : showMissing && missing
                    ? t('trips.report.descriptionRequired')
                    : undefined}
              </FieldError>
            </div>

            <FieldError role="alert">{serverError ? t(serverError) : undefined}</FieldError>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="btn btn-outline" onClick={onClose}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={send.isPending || tooLong}>
                {t(send.isPending ? 'trips.report.sending' : 'trips.report.submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
