import {useCallback, useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  IoCheckmarkCircleOutline,
  IoCreateOutline,
  IoEllipsisVertical,
  IoEyeOutline,
  IoPauseCircleOutline,
  IoShieldCheckmarkOutline,
  IoTrashOutline,
} from 'react-icons/io5';
import {useClickOutside} from '@/hooks/useClickOutside';
import {adminIconButton} from '../components/styles';
import type {AdminUser} from '../types';
import type {UserDialogKind} from './UserDialogs';
import {canDelete, canEdit, canReactivate, canSuspend} from './userRules';

const item =
  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition disabled:pointer-events-none disabled:opacity-40';

interface Position {
  top: number;
  right: number;
}

// "More actions" menu of a user (table row or profile header). The menu is
// fixed to the viewport so the table's horizontal scroll cannot clip it.
export default function UserActionsMenu({
  user,
  self,
  onView,
  onAction,
  align = 'row',
}: {
  user: AdminUser;
  self: boolean;
  // omitted on the profile page (already there)
  onView?: () => void;
  onAction: (kind: UserDialogKind) => void;
  align?: 'row' | 'header';
}) {
  const {t} = useTranslation();
  const [position, setPosition] = useState<Position | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setPosition(null), []);
  const ref = useClickOutside(close);

  useEffect(() => {
    if (!position) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        button.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [position, close]);

  const toggle = () => {
    if (position) {
      close();
      return;
    }
    const rect = button.current!.getBoundingClientRect();
    setPosition({top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right)});
  };

  const choose = (action: () => void) => () => {
    close();
    action();
  };
  const name = user.fullname;

  return (
    <div ref={ref} className="inline-block">
      <button
        ref={button}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={!!position}
        aria-label={t('admin.users.moreActions', {name})}
        title={t('admin.users.moreActions', {name})}
        className={`${adminIconButton} ${align === 'header' ? 'border border-slate-200 bg-white' : ''}`}>
        <IoEllipsisVertical size={16} aria-hidden />
      </button>
      {position && (
        <div
          role="menu"
          aria-label={t('admin.users.moreActions', {name})}
          style={{top: position.top, right: position.right}}
          className="fixed z-[800] w-56 animate-pop-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {onView && (
            <button type="button" role="menuitem" className={`${item} text-slate-700 hover:bg-slate-50`} onClick={choose(onView)}>
              <IoEyeOutline size={16} aria-hidden />
              {t('admin.users.viewDetails')}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            disabled={!canEdit(user, self)}
            className={`${item} text-slate-700 hover:bg-slate-50`}
            onClick={choose(() => onAction('edit'))}>
            <IoCreateOutline size={16} aria-hidden />
            {t('admin.users.editUser')}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!canEdit(user, self)}
            className={`${item} text-slate-700 hover:bg-slate-50`}
            onClick={choose(() => onAction('role'))}>
            <IoShieldCheckmarkOutline size={16} aria-hidden />
            {t('admin.users.changeRole')}
          </button>
          <div role="separator" className="my-1 border-t border-slate-100" />
          {canReactivate(user, self) ? (
            <button
              type="button"
              role="menuitem"
              className={`${item} text-emerald-700 hover:bg-emerald-50`}
              onClick={choose(() => onAction('reactivate'))}>
              <IoCheckmarkCircleOutline size={16} aria-hidden />
              {t('admin.users.reactivateAccount')}
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              disabled={!canSuspend(user, self)}
              className={`${item} text-amber-700 hover:bg-amber-50`}
              onClick={choose(() => onAction('suspend'))}>
              <IoPauseCircleOutline size={16} aria-hidden />
              {t('admin.users.suspendAccount')}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            disabled={!canDelete(user, self)}
            className={`${item} text-rose-600 hover:bg-rose-50`}
            onClick={choose(() => onAction('delete'))}>
            <IoTrashOutline size={16} aria-hidden />
            {t('admin.users.deleteAccount')}
          </button>
        </div>
      )}
    </div>
  );
}
