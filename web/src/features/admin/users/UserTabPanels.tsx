import {useState, type ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import {IoCheckmarkCircle, IoCompassOutline, IoLocationOutline, IoTimeOutline, IoTrophyOutline} from 'react-icons/io5';
import AdminDataTable, {type AdminColumn} from '../components/AdminDataTable';
import AdminEmptyState from '../components/AdminEmptyState';
import AdminMeter from '../components/AdminMeter';
import AdminStatusBadge from '../components/AdminStatusBadge';
import {adminLink} from '../components/styles';
import {useAdminFormat} from '../hooks/useAdminFormat';
import {logActionLabel, roleBadge, tripPhaseBadge, tripStatusBadge, userStatusBadge} from '../status';
import TripDetailDialog from './TripDetailDialog';
import type {AdminTrip, AdminUserActivity, AdminUserChallenge, AdminUserDetail, LogAction} from '../types';

const levelDot = {info: 'bg-sky-500', warning: 'bg-amber-500', error: 'bg-rose-500'};

const Row = ({label, children}: {label: string; children: ReactNode}) => (
  <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-center sm:gap-4">
    <dt className="w-40 shrink-0 text-sm text-slate-500">{label}</dt>
    <dd className="min-w-0 text-sm text-slate-900">{children}</dd>
  </div>
);

// Events of the timeline: what the user did, plus the sign-up (createdAt).
const buildTimeline = (detail: AdminUserDetail): AdminUserActivity[] => {
  const signup: AdminUserActivity = {
    id: 'signup',
    at: detail.user.createdAt,
    action: 'signup',
    target: '',
    level: 'info',
  };
  return [...detail.activity, signup].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
};

export function ActivityTimeline({events, limit}: {events: AdminUserActivity[]; limit?: number}) {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const shown = limit ? events.slice(0, limit) : events;
  const label = (action: string) =>
    action === 'signup'
      ? t('admin.users.activity.signup')
      : t(logActionLabel[action as LogAction] ?? `admin.activityLogs.actions.${action}`, {defaultValue: action});

  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {shown.map(event => (
        <li key={event.id} className="relative">
          <span aria-hidden className={`absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-white ${levelDot[event.level]}`} />
          <p className="text-sm font-medium text-slate-900">
            {label(event.action)}
            {event.target && <span className="font-normal text-slate-500"> · {event.target}</span>}
          </p>
          <p className="text-xs text-slate-500" title={format.dateTime(event.at)}>
            {format.dateTime(event.at)} · {format.relative(event.at)}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function OverviewPanel({detail}: {detail: AdminUserDetail}) {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const {user} = detail;
  const timeline = buildTimeline(detail);
  const none = <span className="text-slate-400">{t('admin.users.notProvided')}</span>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-900">{t('admin.users.basicInfo')}</h2>
        <dl className="mt-2 divide-y divide-slate-100">
          <Row label={t('admin.users.fields.fullname')}>{user.fullname}</Row>
          <Row label={t('admin.users.fields.username')}>@{user.username}</Row>
          <Row label={t('admin.users.fields.email')}>{user.email}</Row>
          <Row label={t('admin.users.fields.phone')}>{user.phone || none}</Row>
          <Row label={t('admin.users.fields.city')}>{user.city || none}</Row>
          <Row label={t('admin.users.columns.role')}>
            <AdminStatusBadge tone={roleBadge[user.role].tone}>{t(roleBadge[user.role].labelKey)}</AdminStatusBadge>
          </Row>
          <Row label={t('admin.users.columns.status')}>
            <AdminStatusBadge tone={userStatusBadge[user.status].tone}>{t(userStatusBadge[user.status].labelKey)}</AdminStatusBadge>
          </Row>
          <Row label={t('admin.users.registrationDate')}>{format.dateTime(user.createdAt)}</Row>
          <Row label={t('admin.users.columns.lastActive')}>
            {user.lastActiveAt ? format.dateTime(user.lastActiveAt) : <span className="text-slate-400">{t('admin.users.never')}</span>}
          </Row>
        </dl>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">{t('admin.users.recentActivity')}</h2>
        <ActivityTimeline events={timeline} limit={5} />
      </section>
    </div>
  );
}

export function TripsPanel({trips}: {trips: AdminTrip[]}) {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const [open, setOpen] = useState<string | null>(null);

  const columns: AdminColumn<AdminTrip>[] = [
    {
      key: 'trip',
      header: t('admin.users.trips.name'),
      cell: trip => (
        <div className="flex max-w-60 items-center gap-3 sm:max-w-80">
          {trip.imageUrl ? (
            <img src={trip.imageUrl} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg bg-slate-100 object-cover" />
          ) : (
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
              <IoCompassOutline size={18} />
            </span>
          )}
          <span className="truncate font-medium text-slate-900">{trip.nameTrip}</span>
        </div>
      ),
    },
    {
      key: 'destination',
      header: t('admin.users.trips.destination'),
      hideBelow: 'md',
      cell: trip => (
        <span className="inline-flex items-center gap-1.5">
          <IoLocationOutline size={14} aria-hidden className="text-slate-400" />
          {trip.location}
        </span>
      ),
    },
    {key: 'days', header: t('admin.users.trips.days'), hideBelow: 'md', cell: trip => t('admin.trips.days', {count: trip.days})},
    {key: 'dates', header: t('admin.users.trips.start'), hideBelow: 'lg', cell: trip => (trip.startDate ? format.date(trip.startDate) : '—')},
    {
      key: 'status',
      header: t('admin.users.columns.status'),
      cell: trip => {
        const badge = trip.phase ? tripPhaseBadge[trip.phase] : tripStatusBadge[trip.status];
        return <AdminStatusBadge tone={badge.tone}>{t(badge.labelKey)}</AdminStatusBadge>;
      },
    },
    {
      key: 'view',
      header: <span className="sr-only">{t('admin.common.actions')}</span>,
      align: 'right',
      pinned: true,
      cell: trip => (
        <button type="button" className={adminLink} onClick={() => setOpen(trip.id)} aria-label={t('admin.common.viewItem', {name: trip.nameTrip})}>
          {t('admin.users.trips.view')}
        </button>
      ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      {open && <TripDetailDialog tripId={open} onClose={() => setOpen(null)} />}
      <AdminDataTable
        caption={t('admin.users.tabs.trips')}
        columns={columns}
        rows={trips}
        rowKey={trip => trip.id}
        empty={<AdminEmptyState icon={IoCompassOutline} title={t('admin.users.trips.empty')} description={t('admin.users.trips.emptyHint')} />}
      />
    </div>
  );
}

export function ChallengesPanel({challenges}: {challenges: AdminUserChallenge[]}) {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const completed = challenges.filter(item => item.completed);
  const points = completed.reduce((sum, item) => sum + item.points, 0);

  if (!challenges.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <AdminEmptyState icon={IoTrophyOutline} title={t('admin.users.challenges.empty')} description={t('admin.users.challenges.emptyHint')} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [t('admin.users.challenges.joined'), challenges.length],
          [t('admin.users.challenges.completed'), completed.length],
          [t('admin.users.challenges.points'), points],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{format.number(Number(value))}</p>
          </div>
        ))}
      </div>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {challenges.map(item => (
          <li key={item.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{item.name || t('admin.users.challenges.unknown')}</p>
              <p className="truncate text-xs text-slate-500">
                {item.location}
                {item.location && ' · '}
                {t('admin.users.points', {count: item.points, value: format.number(item.points)})}
              </p>
            </div>
            <div className="w-full sm:w-44">
              <AdminMeter ratio={item.completed ? 1 : 0} />
              <p className="mt-1 text-xs text-slate-500">
                {item.completed && item.completedAt
                  ? t('admin.users.challenges.completedOn', {date: format.date(item.completedAt)})
                  : t('admin.users.challenges.inProgress')}
              </p>
            </div>
            <AdminStatusBadge tone={item.completed ? 'success' : 'info'}>
              {item.completed ? <IoCheckmarkCircle aria-hidden /> : <IoTimeOutline aria-hidden />}
              {item.completed ? t('admin.users.challenges.statusDone') : t('admin.users.challenges.statusActive')}
            </AdminStatusBadge>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ActivityPanel({detail}: {detail: AdminUserDetail}) {
  const {t} = useTranslation();
  const timeline = buildTimeline(detail);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
      <h2 className="text-sm font-semibold text-slate-900">{t('admin.users.tabs.activity')}</h2>
      <p className="mt-0.5 mb-5 text-xs text-slate-500">{t('admin.users.activity.hint')}</p>
      <ActivityTimeline events={timeline} />
    </div>
  );
}
