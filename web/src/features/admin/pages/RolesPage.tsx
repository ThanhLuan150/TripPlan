import {useTranslation} from 'react-i18next';
import {IoCheckmarkCircle, IoInformationCircleOutline, IoPeopleOutline, IoRemoveCircleOutline, IoShieldCheckmarkOutline} from 'react-icons/io5';
import type {Role} from '@/features/auth/types';
import AdminCard from '../components/AdminCard';
import AdminDataTable, {type AdminColumn} from '../components/AdminDataTable';
import AdminPageHeader from '../components/AdminPageHeader';
import AdminStatusBadge from '../components/AdminStatusBadge';
import {useAdminRoles} from '../hooks/useAdminData';
import {useAdminFormat} from '../hooks/useAdminFormat';
import {permissionLabel, roleBadge} from '../status';
import type {Permission} from '../types';

type PermissionRow = {permission: Permission; roles: Role[]};

const roles: {role: Role; descriptionKey: string; icon: typeof IoPeopleOutline}[] = [
  {role: 'admin', descriptionKey: 'admin.rolesPage.adminDescription', icon: IoShieldCheckmarkOutline},
  {role: 'user', descriptionKey: 'admin.rolesPage.userDescription', icon: IoPeopleOutline},
];

// Roles are fixed on the backend (User.role: "user" | "admin"): read-only view.
export default function RolesPage() {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const {data: roleData, isLoading} = useAdminRoles();
  const data = roleData?.permissions;

  const allowed = (row: PermissionRow, role: Role) =>
    row.roles.includes(role) ? (
      <span className="inline-flex items-center gap-1.5 text-emerald-700">
        <IoCheckmarkCircle size={18} aria-hidden />
        <span className="sr-only">{t('admin.rolesPage.allowed')}</span>
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-slate-300">
        <IoRemoveCircleOutline size={18} aria-hidden />
        <span className="sr-only">{t('admin.rolesPage.notAllowed')}</span>
      </span>
    );

  const columns: AdminColumn<PermissionRow>[] = [
    {
      key: 'permission',
      header: t('admin.rolesPage.permission'),
      cell: row => <span className="text-slate-800">{t(permissionLabel[row.permission])}</span>,
    },
    ...roles.map(({role}) => ({
      key: role,
      header: t(roleBadge[role].labelKey),
      align: 'right' as const,
      cell: (row: PermissionRow) => allowed(row, role),
    })),
  ];

  return (
    <>
      <AdminPageHeader title={t('admin.rolesPage.title')} description={t('admin.rolesPage.description')} />

      <div className="mb-6 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <IoInformationCircleOutline size={18} aria-hidden className="mt-0.5 shrink-0" />
        <p>{t('admin.rolesPage.readOnly')}</p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {roles.map(({role, descriptionKey, icon: Icon}) => (
          <div key={role} className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <Icon size={20} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-slate-900">{t(roleBadge[role].labelKey)}</h2>
                  <AdminStatusBadge tone="neutral">
                    <code className="text-[11px]">{role}</code>
                  </AdminStatusBadge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{t(descriptionKey)}</p>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
              <div>
                <dt className="text-slate-500">{t('admin.rolesPage.members')}</dt>
                <dd className="font-semibold text-slate-900 tabular-nums">
                  {roleData ? format.number(roleData.members[role]) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{t('admin.rolesPage.permissionCount')}</dt>
                <dd className="font-semibold text-slate-900 tabular-nums">
                  {data ? data.filter(row => row.roles.includes(role)).length : '—'}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <AdminCard title={t('admin.rolesPage.matrix')} description={t('admin.rolesPage.matrixHint')}>
        <AdminDataTable
          caption={t('admin.rolesPage.matrix')}
          columns={columns}
          rows={data ?? []}
          rowKey={row => row.permission}
          loading={isLoading}
          empty={null}
        />
      </AdminCard>
    </>
  );
}
