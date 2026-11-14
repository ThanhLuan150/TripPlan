// Admin panel: mock data, status maps, navigation and the shared hooks.
import {act, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {useAdminFormat} from '@/features/admin/hooks/useAdminFormat';
import {ALL, useTableState} from '@/features/admin/hooks/useTableState';
import {
  mockActivityLogs,
  mockAiOverview,
  mockAlerts,
  mockAnnouncements,
  mockChallenges,
  mockDashboard,
  mockModeration,
  mockRoles,
  mockReports,
  mockSettingsData,
  mockTrips,
  mockUsers,
  mockVideos,
} from '@/__tests__/fixtures/admin/data';
import {announcementState} from '@/features/admin/notifications/state';
import {ago, between, DAY_MS, mockId, seeded, series} from '@/__tests__/fixtures/admin/seed';
import {adminNav, findAdminNavItem} from '@/features/admin/navigation';
import {
  alertLabel,
  campaignStatusBadge,
  logActionLabel,
  logLevelBadge,
  moderationReasonLabel,
  moderationStatusBadge,
  moderationTypeLabel,
  optionsOf,
  permissionLabel,
  roleBadge,
  tripPhaseBadge,
  tripStatusBadge,
  userStatusBadge,
  videoStatusBadge,
} from '@/features/admin/status';
import i18n from '@/lib/i18n';
import {t} from '../../utils/render';

afterEach(async () => {
  await act(() => i18n.changeLanguage('vi'));
});

describe('seed helpers', () => {
  it('seeded() is deterministic and within [0, 1)', () => {
    expect(seeded(7)).toBe(seeded(7));
    expect(seeded(7)).not.toBe(seeded(8));
    for (let i = 0; i < 200; i++) {
      expect(seeded(i)).toBeGreaterThanOrEqual(0);
      expect(seeded(i)).toBeLessThan(1);
    }
  });

  it('between() stays within its bounds', () => {
    for (let i = 0; i < 200; i++) {
      const n = between(i, 5, 9);
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(9);
      expect(Number.isInteger(n)).toBe(true);
    }
  });

  it('ago() is relative to now (fractional and negative days too)', () => {
    const now = Date.now();
    expect(now - new Date(ago(2)).getTime()).toBeGreaterThan(2 * DAY_MS - 1000);
    expect(new Date(ago(-1)).getTime()).toBeGreaterThan(now);
  });

  it('mockId() pads the number', () => {
    expect(mockId('u', 0)).toBe('u001');
    expect(mockId('chat', 11)).toBe('chat012');
  });

  it('series() gives `count` ascending days with positive values', () => {
    const points = series(1, 6, 2, 100, 10);

    expect(points).toHaveLength(6);
    const times = points.map(p => new Date(p.date).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(points.every(p => p.value > 0)).toBe(true);
  });
});

describe('mock data', () => {
  const unique = (ids: string[]) => new Set(ids).size === ids.length;

  it('every list has unique ids', () => {
    for (const list of [
      mockUsers,
      mockTrips,
      mockChallenges,
      mockAiOverview.chats,
      mockVideos,
      mockAnnouncements,
      mockActivityLogs,
      mockModeration,
      mockAlerts,
    ]) {
      expect(list.length).toBeGreaterThan(0);
      expect(unique(list.map(item => item.id))).toBe(true);
    }
  });

  it('has two admins and mixed user statuses', () => {
    expect(mockUsers.filter(u => u.role === 'admin')).toHaveLength(2);
    expect(new Set(mockUsers.map(u => u.status))).toEqual(new Set(['active', 'notActive', 'suspended', 'delete']));
    expect(unique(mockUsers.map(u => u.username))).toBe(true);
    expect(mockUsers.every(u => /^[a-z0-9]+$/.test(u.username))).toBe(true);
  });

  it('trips end after they start and have both statuses', () => {
    expect(mockTrips.every(trip => new Date(trip.endDate) >= new Date(trip.startDate))).toBe(true);
    expect(new Set(mockTrips.map(trip => trip.status))).toEqual(new Set(['active', 'delete']));
  });

  it('challenges never complete more than they started', () => {
    expect(mockChallenges.every(c => c.completed <= c.participants && c.completed > 0)).toBe(true);
  });

  it('every enum value of the data has a label in the status maps', () => {
    const keys = <T extends object>(map: T) => Object.keys(map);
    expect(mockUsers.every(u => keys(userStatusBadge).includes(u.status) && keys(roleBadge).includes(u.role))).toBe(true);
    expect(mockTrips.every(trip => keys(tripStatusBadge).includes(trip.status))).toBe(true);
    expect(mockVideos.every(v => keys(videoStatusBadge).includes(v.status))).toBe(true);
    expect(mockAnnouncements.every(item => ['draft', 'published'].includes(item.status))).toBe(true);
    expect(mockAnnouncements.every(item => keys(campaignStatusBadge).includes(announcementState(item)))).toBe(true);
    expect(
      mockActivityLogs.every(l => keys(logActionLabel).includes(l.action) && keys(logLevelBadge).includes(l.level)),
    ).toBe(true);
    expect(
      mockModeration.every(
        m =>
          keys(moderationStatusBadge).includes(m.status) &&
          keys(moderationTypeLabel).includes(m.type) &&
          keys(moderationReasonLabel).includes(m.reason),
      ),
    ).toBe(true);
    expect(mockAlerts.every(a => keys(alertLabel).includes(a.type))).toBe(true);
    expect(mockRoles.permissions.every(p => keys(permissionLabel).includes(p.permission))).toBe(true);
  });

  it('has pending, approved and rejected moderation items', () => {
    expect(new Set(mockModeration.map(m => m.status))).toEqual(new Set(['pending', 'approved', 'rejected']));
  });

  it('logs are newest first and use a non-empty target', () => {
    const times = mockActivityLogs.map(l => new Date(l.at).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(mockActivityLogs.every(l => l.target && l.ip.split('.').length === 4)).toBe(true);
  });

  it('announcements: scheduled ones are published for a later date, drafts stay drafts', () => {
    const states = mockAnnouncements.map(item => announcementState(item));
    expect(new Set(states)).toEqual(new Set(['draft', 'scheduled', 'sent']));
    expect(mockAnnouncements.filter(item => announcementState(item) === 'scheduled').every(item => new Date(item.publishAt) > new Date())).toBe(true);
  });

  it('dashboard and reports are complete', () => {
    expect(mockDashboard.newUsers).toHaveLength(12);
    expect(mockDashboard.topDestinations.map(d => d.trips)).toEqual(
      [...mockDashboard.topDestinations.map(d => d.trips)].sort((a, b) => b - a),
    );
    expect(mockReports['7d'].tripsCreated).toHaveLength(7);
    expect(mockReports['30d'].tripsCreated).toHaveLength(30);
    expect(mockReports['90d'].tripsCreated).toHaveLength(13);
    for (const report of Object.values(mockReports)) {
      expect(report.provinces).toHaveLength(7);
    }
    expect(mockSettingsData.appName).toBe('Aloca');
    expect(mockRoles.members.admin + mockRoles.members.user).toBeGreaterThan(0);
  });
});

describe('status maps', () => {
  it('optionsOf() builds select options from badge maps and from label maps', () => {
    expect(optionsOf(roleBadge, t)).toEqual([
      {value: 'admin', label: t('admin.roles.admin')},
      {value: 'user', label: t('admin.roles.user')},
    ]);
    expect(optionsOf(moderationTypeLabel, t).map(o => o.value)).toEqual(['challengePhoto', 'chatMessage', 'profile', 'video']);
    expect(optionsOf(moderationTypeLabel, t)[0].label).toBe(t('admin.moderation.types.challengePhoto'));
  });

  it('every label resolves to a translation in both languages', async () => {
    const keys = [
      ...[roleBadge, userStatusBadge, tripStatusBadge, tripPhaseBadge, videoStatusBadge, campaignStatusBadge, logLevelBadge, moderationStatusBadge].flatMap(
        map => Object.values(map).map(badge => badge.labelKey),
      ),
      ...[logActionLabel, moderationTypeLabel, moderationReasonLabel, permissionLabel, alertLabel].flatMap(
        map => Object.values(map),
      ),
    ];
    for (const lng of ['vi', 'en']) {
      await act(() => i18n.changeLanguage(lng));
      expect(keys.filter(key => !i18n.exists(key))).toEqual([]);
    }
  });
});

describe('navigation', () => {
  it('lists the 13 admin pages once each', () => {
    const items = adminNav.flatMap(group => group.items);
    expect(items).toHaveLength(13);
    expect(new Set(items.map(item => item.to)).size).toBe(13);
    expect(items.every(item => item.to.startsWith('/admin/'))).toBe(true);
  });

  it('findAdminNavItem() matches pages and their sub-pages only', () => {
    expect(findAdminNavItem('/admin/users')?.to).toBe('/admin/users');
    expect(findAdminNavItem('/admin/users/42')?.to).toBe('/admin/users');
    expect(findAdminNavItem('/admin/activity-logs')?.to).toBe('/admin/activity-logs');
    expect(findAdminNavItem('/admin/usersx')).toBeUndefined();
    expect(findAdminNavItem('/admin')).toBeUndefined();
  });
});

describe('useAdminFormat', () => {
  const format = () => renderHook(() => useAdminFormat()).result.current;

  it('formats numbers, percentages, durations and money (Vietnamese)', () => {
    const f = format();

    expect(f.number(12846)).toBe(new Intl.NumberFormat('vi').format(12846));
    expect(f.percent(0.124)).toBe(new Intl.NumberFormat('vi', {style: 'percent', maximumFractionDigits: 1}).format(0.124));
    expect(f.compact(80900)).toBe(new Intl.NumberFormat('vi', {notation: 'compact', maximumFractionDigits: 1}).format(80900));
    expect(f.currency(1500000)).toContain('₫');
    expect(f.duration(75)).toBe('1:15');
    expect(f.duration(9)).toBe('0:09');
  });

  it('formats dates', () => {
    const f = format();
    const iso = new Date(2026, 10, 5, 14, 7).toISOString();

    expect(f.date(iso)).toContain('2026');
    expect(f.dateTime(iso)).toMatch(/14:07/);
    expect(f.day(iso)).toMatch(/05/);
  });

  it('writes the month as T11 in Vietnamese and Nov in English', async () => {
    const iso = new Date(2026, 10, 1).toISOString();
    expect(format().month(iso)).toBe('T11');

    await act(() => i18n.changeLanguage('en'));
    expect(format().month(iso)).toBe('Nov');
  });

  it('formats a time relative to now, picking the unit', () => {
    const f = format();
    const rel = new Intl.RelativeTimeFormat('vi', {numeric: 'auto'});
    const at = (ms: number) => new Date(Date.now() + ms).toISOString();

    expect(f.relative(at(-3 * DAY_MS))).toBe(rel.format(-3, 'day'));
    expect(f.relative(at(-5 * 3_600_000))).toBe(rel.format(-5, 'hour'));
    expect(f.relative(at(-12 * 60_000))).toBe(rel.format(-12, 'minute'));
    expect(f.relative(at(2 * DAY_MS + 60_000))).toBe(rel.format(2, 'day'));
    // under a minute: "now" in minutes
    expect(f.relative(at(-10_000))).toBe(rel.format(0, 'minute'));
  });

  it('follows the language (English separators)', async () => {
    await act(() => i18n.changeLanguage('en'));
    const f = format();

    expect(f.number(12846)).toBe('12,846');
    expect(f.percent(0.5)).toBe('50%');
  });
});

describe('useTableState', () => {
  type Row = {name: string; role: string};
  const rows: Row[] = [
    {name: 'Đà Lạt', role: 'a'},
    {name: 'Hà Giang', role: 'b'},
    {name: 'Hội An', role: 'a'},
    {name: 'Huế', role: 'b'},
    {name: 'Sa Pa', role: 'a'},
  ];
  const options = {
    searchText: (row: Row) => row.name,
    filters: {role: (row: Row, value: string) => row.role === value},
    pageSize: 2,
  };
  const setup = () => renderHook(() => useTableState(rows, options));

  it('starts on page 1 with everything', () => {
    const {result} = setup();

    expect(result.current.total).toBe(5);
    expect(result.current.pageCount).toBe(3);
    expect(result.current.rows.map(r => r.name)).toEqual(['Đà Lạt', 'Hà Giang']);
    expect(result.current.filter('role')).toBe(ALL);
    expect(result.current.query).toBe('');
  });

  it('has no rows while the data is loading', () => {
    const {result} = renderHook(() => useTableState<Row>(undefined, options));

    expect(result.current.rows).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.pageCount).toBe(1);
  });

  it('searches without caring about accents or case', () => {
    const {result} = setup();

    act(() => result.current.setQuery('DA LAT'));
    expect(result.current.rows.map(r => r.name)).toEqual(['Đà Lạt']);
    act(() => result.current.setQuery('h'));
    expect(result.current.total).toBe(3);
  });

  it('filters, and goes back to the first page when the list changes', () => {
    const {result} = setup();
    act(() => result.current.setPage(2));
    expect(result.current.page).toBe(2);

    act(() => result.current.setFilter('role', 'b'));
    expect(result.current.page).toBe(1);
    expect(result.current.rows.map(r => r.name)).toEqual(['Hà Giang', 'Huế']);
    expect(result.current.filter('role')).toBe('b');

    act(() => result.current.setFilter('role', ALL));
    expect(result.current.total).toBe(5);
  });

  it('pages through the list and clamps the page', () => {
    const {result, rerender} = renderHook(({data}: {data: Row[]}) => useTableState(data, options), {
      initialProps: {data: rows},
    });

    act(() => result.current.setPage(3));
    expect(result.current.rows.map(r => r.name)).toEqual(['Sa Pa']);

    // the list shrinks under the current page
    rerender({data: rows.slice(0, 2)});
    expect(result.current.page).toBe(1);
    expect(result.current.pageCount).toBe(1);
  });

  it('reset() clears search, filters and page', () => {
    const {result} = setup();
    act(() => {
      result.current.setQuery('xyz');
      result.current.setFilter('role', 'a');
    });
    expect(result.current.total).toBe(0);

    act(() => result.current.reset());
    expect(result.current.total).toBe(5);
    expect(result.current.query).toBe('');
    expect(result.current.filter('role')).toBe(ALL);
    expect(result.current.page).toBe(1);
  });

  it('uses a page size of 8 by default', () => {
    const many = Array.from({length: 20}, (_, i) => ({name: `n${i}`, role: 'a'}));
    const {result} = renderHook(() => useTableState(many, {searchText: row => row.name}));

    expect(result.current.pageSize).toBe(8);
    expect(result.current.rows).toHaveLength(8);
    expect(result.current.pageCount).toBe(3);
  });
});
