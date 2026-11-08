import {ReactNode, useEffect} from 'react';
import {useTranslation} from 'react-i18next';

// Replaces the RN <Modal transparent> + dark <Pressable> backdrop + white card
// with "Hủy" / "Xác nhận" buttons used by the trip screens.
interface Props {
  visible: boolean;
  title: ReactNode;
  children?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export default function ConfirmModal({
  visible,
  title,
  children,
  onCancel,
  onConfirm,
  confirmText,
  cancelText,
  danger = false,
}: Props) {
  const {t} = useTranslation();
  useEffect(() => {
    if (!visible) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onCancel]);

  if (!visible) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-[900] grid place-items-center p-4"
      role="dialog"
      aria-modal="true">
      <div
        className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm animate-pop-in rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-center text-lg font-semibold text-slate-900">
          {title}
        </h2>
        {children && <div className="mt-3">{children}</div>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            {cancelText ?? t('common.cancel')}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}>
            {confirmText ?? t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
