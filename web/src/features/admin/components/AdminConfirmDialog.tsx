import {type ReactNode, useEffect, useId, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {IoCheckmarkCircleOutline, IoWarningOutline} from 'react-icons/io5';
import {adminButton} from './styles';

// Confirmation before an action. Escape / backdrop / Cancel close it; the
// focus starts on Cancel, stays inside the dialog (Tab cycles its two buttons)
// and goes back to the button that opened it afterwards.
export default function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const {t} = useTranslation();
  const id = useId();
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
  });
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    // read before moving the focus (an `autoFocus` would already have moved it)
    const opener = document.activeElement as HTMLElement | null;
    cancelButton.current!.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelRef.current();
      } else if (e.key === 'Tab') {
        const buttons = dialogRef.current!.querySelectorAll('button');
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, [open]);

  if (!open) {
    return null;
  }
  const danger = tone === 'danger';
  const Icon = danger ? IoWarningOutline : IoCheckmarkCircleOutline;

  return (
    <div className="fixed inset-0 z-[900] grid place-items-center p-4">
      <div aria-hidden className="absolute inset-0 animate-fade-in bg-slate-900/40" onClick={onCancel} />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-text`}
        className="relative w-full max-w-md animate-pop-in rounded-xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <div className="flex gap-4">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-full ${
              danger ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-700'
            }`}>
            <Icon size={20} aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            <p id={`${id}-text`} className="mt-1.5 text-sm text-slate-500">
              {description}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {/* the safe choice gets the focus */}
          <button type="button" ref={cancelButton} className={adminButton.secondary} onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button type="button" className={danger ? adminButton.danger : adminButton.primary} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
