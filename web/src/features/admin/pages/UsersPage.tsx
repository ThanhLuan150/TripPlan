import {useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import {IoAdd, IoAlertCircleOutline, IoDownloadOutline} from 'react-icons/io5';
import {adminRoutes} from '@/app/routes';
import {useProfile} from '@/hooks/useProfile';
import AdminCard from '../components/AdminCard';
import AdminEmptyState from '../components/AdminEmptyState';
import AdminPagination from '../components/AdminPagination';
import AdminPageHeader from '../components/AdminPageHeader';
import NoResults from '../components/NoResults';
import {adminButton, adminInput} from '../components/styles';
import {useAdminUsers} from '../users/hooks';
import UserBulkBar from '../users/UserBulkBar';
import UserCreateDialog from '../users/UserCreateDialog';
import UserDialogs, {type UserDialogState} from '../users/UserDialogs';
import UserFilterBar from '../users/UserFilterBar';
import UserStats from '../users/UserStats';
import UserTable from '../users/UserTable';
import {downloadUsersCsv} from '../users/exportCsv';
import {canReactivate, canSelect, canSuspend, isSelf} from '../users/userRules';
import {applyUserFilters, defaultFilters, isFiltered, type UserFilters} from '../users/userList';
import Toast from '@/components/ui/Toast';

const PAGE_SIZES = [10, 20, 50];
const SEARCH_DELAY_MS = 250;

export default function UsersPage() {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const {user: me} = useProfile();
  const {data, isLoading, isError, refetch} = useAdminUsers();

  const [filters, setFilters] = useState<UserFilters>(defaultFilters);
  const [text, setText] = useState('');
  // the search text the list uses now
  const applied = useRef('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<UserDialogState | null>(null);
  const [creating, setCreating] = useState(false);

  // the search applies shortly after typing stops
  useEffect(() => {
    const timer = window.setTimeout(() => {
      // back to the first page only when the search really changed
      if (applied.current !== text) {
        applied.current = text;
        setFilters(current => ({...current, query: text}));
        setPage(1);
      }
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [text]);

  const users = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => applyUserFilters(users, filters), [users, filters]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  // selection keeps only accounts that still exist and can change
  const chosen = users.filter(user => selected.has(user.id) && canSelect(user, isSelf(user, me?.username)));
  const change = (patch: Partial<UserFilters>) => {
    setFilters(f => ({...f, ...patch}));
    setPage(1);
  };
  const reset = () => {
    applied.current = '';
    setText('');
    setFilters(defaultFilters);
    setPage(1);
  };
  const toggle = (id: string, on: boolean) =>
    setSelected(s => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const exportUsers = (list = filtered) => {
    downloadUsersCsv(list);
    Toast.show({type: 'success', text1: t('admin.users.toasts.exported', {count: list.length})});
  };

  return (
    <>
      <AdminPageHeader
        title={t('admin.users.title')}
        description={t('admin.users.description')}
        actions={
          <>
            <button type="button" className={adminButton.secondary} onClick={() => exportUsers()} disabled={!filtered.length}>
              <IoDownloadOutline size={16} aria-hidden />
              {t('admin.users.exportUsers')}
            </button>
            <button type="button" className={adminButton.primary} onClick={() => setCreating(true)}>
              <IoAdd size={16} aria-hidden />
              {t('admin.users.add')}
            </button>
          </>
        }
      />

      <UserStats users={users} />

      <AdminCard>
        <UserFilterBar
          text={text}
          onText={setText}
          filters={filters}
          onChange={change}
          canReset={isFiltered(filters) || !!text}
          onReset={reset}
        />
        {chosen.length > 0 && (
          <UserBulkBar
            count={chosen.length}
            canSuspend={chosen.some(user => canSuspend(user, false))}
            canReactivate={chosen.some(user => canReactivate(user, false))}
            onExport={() => exportUsers(chosen)}
            onSuspend={() => setDialog({kind: 'suspend', users: chosen.filter(user => canSuspend(user, false))})}
            onReactivate={() => setDialog({kind: 'reactivate', users: chosen.filter(user => canReactivate(user, false))})}
            onClear={() => setSelected(new Set())}
          />
        )}
        {isError ? (
          <AdminEmptyState
            icon={IoAlertCircleOutline}
            title={t('admin.users.errors.loadFailed')}
            description={t('admin.users.errors.loadFailedHint')}
            action={
              <button type="button" className={adminButton.secondary} onClick={() => refetch()}>
                {t('admin.common.refresh')}
              </button>
            }
          />
        ) : (
          <UserTable
            rows={rows}
            loading={isLoading}
            empty={<NoResults onReset={reset} />}
            username={me?.username}
            selected={selected}
            onToggle={user => toggle(user.id, !selected.has(user.id))}
            onTogglePage={checked =>
              setSelected(s => {
                const next = new Set(s);
                rows
                  .filter(user => canSelect(user, isSelf(user, me?.username)))
                  .forEach(user => (checked ? next.add(user.id) : next.delete(user.id)));
                return next;
              })
            }
            onNavigate={user => navigate(adminRoutes.user(user.id))}
            onAction={(kind, user) => setDialog({kind, users: [user]})}
          />
        )}
        <Footer
          page={current}
          pageCount={pageCount}
          pageSize={pageSize}
          total={filtered.length}
          onPage={setPage}
          onPageSize={size => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </AdminCard>

      {creating && <UserCreateDialog onClose={() => setCreating(false)} onCreated={user => navigate(adminRoutes.user(user.id))} />}
      <UserDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onDone={(_, ids) => setSelected(s => new Set([...s].filter(id => !ids.includes(id))))}
      />
    </>
  );
}

// Page size selector + "Showing 1–10 of 32" + page buttons.
function Footer({
  page,
  pageCount,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const {t} = useTranslation();
  if (!total) {
    return null;
  }
  return (
    <>
      <div className="flex items-center justify-end gap-2 px-4 pb-3 text-sm text-slate-500">
        <label htmlFor="users-page-size">{t('admin.users.pageSize')}</label>
        <select
          id="users-page-size"
          value={pageSize}
          onChange={e => onPageSize(Number(e.target.value))}
          className={`${adminInput} w-20 cursor-pointer`}>
          {PAGE_SIZES.map(size => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
      <AdminPagination page={page} pageCount={pageCount} pageSize={pageSize} total={total} onPageChange={onPage} />
    </>
  );
}
