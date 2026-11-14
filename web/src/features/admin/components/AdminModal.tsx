import {type ReactNode, useEffect, useId, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {IoClose} from 'react-icons/io5';
import {adminIconButton} from './styles';

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]';

// Dialog with a body (forms, details) and a footer of buttons. Escape / backdrop /
// the close button call `onClose` (ignored while `busy`); the focus starts on the
// first field, stays inside the dialog and returns to the opener afterwards.
export default function AdminModal({
  title,
  description,
  children,
  footer,
  onClose,
  busy = false,
  size = 'md',
  role = 'dialog',
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  busy?: boolean;
  size?: 'md' | 'lg';
  role?: 'dialog' | 'alertdialog';
}) {
  const {t} = useTranslation();
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const guard = useRef({busy, onClose});
  useEffect(() => {
    guard.current = {busy, onClose};
  });

  useEffect(() => {
    // read before moving the focus
    const opener = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current!;
    const body = dialog.querySelector<HTMLElement>('[data-modal-body]');
    (body?.querySelector<HTMLElement>(FOCUSABLE) ?? dialog.querySelector<HTMLElement>(FOCUSABLE))?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guard.current.busy) {
        guard.current.onClose();
      } else if (e.key === 'Tab') {
        const items = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (!items.length) {
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
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
  }, []);

  return (
    <div className="fixed inset-0 z-[900] grid place-items-center p-4">
      <div
        aria-hidden
        className="absolute inset-0 animate-fade-in bg-slate-900/40"
        onClick={() => !busy && onClose()}
      />
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-text` : undefined}
        className={`relative flex max-h-[calc(100dvh-2rem)] w-full animate-pop-in flex-col rounded-xl bg-white shadow-xl ring-1 ring-slate-200 ${
          size === 'lg' ? 'max-w-xl' : 'max-w-md'
        }`}>
        <header className="flex items-start justify-between gap-3 px-6 pt-5">
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {description && (
              <p id={`${id}-text`} className="mt-1 text-sm text-slate-500">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            className={`${adminIconButton} -mt-1 -mr-2`}
            onClick={onClose}
            disabled={busy}
            aria-label={t('common.close')}>
            <IoClose size={18} aria-hidden />
          </button>
        </header>
        <div data-modal-body className="overflow-y-auto px-6 py-4">
          {children}
        </div>
        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
          {footer}
        </footer>
      </div>
    </div>
  );
}
