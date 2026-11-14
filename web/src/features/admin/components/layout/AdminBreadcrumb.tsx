import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoChevronForward} from 'react-icons/io5';
import {adminRoutes} from '@/app/routes';
import type {AdminNavItem} from '../../navigation';

// Admin › <current page>. On phones only the current page is shown.
export default function AdminBreadcrumb({current}: {current?: AdminNavItem}) {
  const {t} = useTranslation();
  return (
    <nav aria-label={t('admin.layout.breadcrumb')} className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        <li className="hidden shrink-0 items-center gap-1.5 sm:flex">
          <Link to={adminRoutes.dashboard} className="text-slate-500 transition hover:text-slate-900">
            {t('admin.layout.home')}
          </Link>
          <IoChevronForward size={14} aria-hidden className="text-slate-300" />
        </li>
        {current && (
          <li aria-current="page" className="truncate font-semibold text-slate-900">
            {t(current.labelKey)}
          </li>
        )}
      </ol>
    </nav>
  );
}
