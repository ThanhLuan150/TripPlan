import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoChevronDown, IoHomeOutline, IoLogOutOutline} from 'react-icons/io5';
import {routes} from '@/app/routes';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import {useLogout} from '@/hooks/useLogout';
import {useProfile} from '@/hooks/useProfile';
import {useDropdown} from '../../hooks/useDropdown';
import {roleBadge} from '../../status';
import AdminAvatar from '../AdminAvatar';
import AdminStatusBadge from '../AdminStatusBadge';

const itemClass =
  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition';

// Signed-in admin: name / email / role, link back to the user app, language
// (phones; the header shows it on larger screens) and sign out.
export default function AdminUserMenu() {
  const {t} = useTranslation();
  const {user, name} = useProfile();
  const logout = useLogout();
  const {open, toggle, ref} = useDropdown();
  // only admins get past the route guard
  const role = roleBadge.admin;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={t('admin.layout.account')}
        className="flex items-center gap-2.5 rounded-lg p-1 transition hover:bg-slate-100 md:pr-2">
        <AdminAvatar name={name} src={user?.image} />
        <span className="hidden max-w-40 text-left leading-tight md:block">
          <span className="block truncate text-sm font-medium text-slate-900">{name}</span>
          <span className="block text-xs text-slate-500">{t(role.labelKey)}</span>
        </span>
        <IoChevronDown size={14} aria-hidden className="hidden text-slate-400 md:block" />
      </button>

      {open && (
        <div
          role="region"
          aria-label={t('admin.layout.account')}
          className="absolute top-full right-0 z-50 mt-2 w-64 animate-pop-in rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          <div className="mb-1 border-b border-slate-100 px-3 pt-2 pb-3">
            <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
            {user?.email && <p className="truncate text-xs text-slate-500">{user.email}</p>}
            <div className="mt-2">
              <AdminStatusBadge tone={role.tone}>{t(role.labelKey)}</AdminStatusBadge>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 px-3 py-2 sm:hidden">
            <span className="text-sm font-medium text-slate-700">{t('common.language')}</span>
            <LanguageSwitcher />
          </div>
          <Link to={routes.Home} className={`${itemClass} text-slate-700 hover:bg-slate-50`}>
            <IoHomeOutline size={16} aria-hidden />
            {t('admin.layout.userApp')}
          </Link>
          <button type="button" onClick={logout} className={`${itemClass} text-rose-600 hover:bg-rose-50`}>
            <IoLogOutOutline size={16} aria-hidden />
            {t('admin.layout.logout')}
          </button>
        </div>
      )}
    </div>
  );
}
