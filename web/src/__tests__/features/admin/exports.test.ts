import {describe, expect, it} from 'vitest';
import i18n from '@/lib/i18n';
import {logsTable, pdfLang, reportTable, usersTable} from '@/features/admin/exports';
import {mockActivityLogs, mockReports, mockUsers} from '@/__tests__/fixtures/admin/data';

// the same formatters the admin pages use
const format = {
  number: (n: number) => `n${n}`,
  compact: (n: number) => `c${n}`,
  percent: (n: number) => `p${n}`,
  currency: (n: number) => `d${n}`,
  date: (iso: string) => `date ${iso.slice(0, 10)}`,
  dateTime: (iso: string) => `datetime ${iso.slice(0, 16)}`,
  day: (iso: string) => `day ${iso.slice(5, 10)}`,
  month: (iso: string) => iso,
  relative: (iso: string) => iso,
};
const t = i18n.t.bind(i18n);

describe('pdfLang', () => {
  it('is English for English and Vietnamese for everything else', () => {
    expect(pdfLang('en')).toBe('en');
    expect(pdfLang('en-US')).toBe('en');
    expect(pdfLang('vi')).toBe('vi');
    expect(pdfLang('fr')).toBe('vi');
  });
});

describe('usersTable', () => {
  it('has a translated heading per column and one formatted row per user', () => {
    const table = usersTable(mockUsers.slice(0, 2), t, format as never, 'vi');

    expect(table.title).toBe(t('admin.export.users.title'));
    expect(table.subtitle).toBe(t('admin.export.count', {count: 2}));
    expect(table.lang).toBe('vi');
    expect(table.columns).toHaveLength(12);
    expect(table.columns[0]).toBe(t('admin.export.users.columns.fullname'));
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0]).toHaveLength(12);
    expect(table.rows[0][0]).toBe(mockUsers[0].fullname);
    expect(table.rows[0][4]).toBe(t(mockUsers[0].role === 'admin' ? 'admin.roles.admin' : 'admin.roles.user'));
    expect(table.rows[0][6]).toMatch(/^date /);
  });

  it('leaves the last activity empty when there is none', () => {
    const table = usersTable([{...mockUsers[0], lastActiveAt: null}], t, format as never, 'vi');

    expect(table.rows[0][7]).toBe('');
  });
});

describe('logsTable', () => {
  it('translates the action and the level', () => {
    const logs = mockActivityLogs.slice(0, 3);
    const table = logsTable(logs, t, format as never, 'en');

    expect(table.lang).toBe('en');
    expect(table.columns).toHaveLength(6);
    expect(table.rows).toHaveLength(3);
    expect(table.rows[0][0]).toMatch(/^datetime /);
    expect(table.rows[0][2]).toBe(t(`admin.activityLogs.actions.${logs[0].action}`));
    expect(table.rows[0][3]).toBe(logs[0].target);
  });
});

describe('reportTable', () => {
  it('lists the key figures, the plans per day and the destinations', () => {
    const report = mockReports['30d'];
    const table = reportTable(report, '30d', t, format as never, 'vi');

    expect(table.title).toBe(t('admin.export.report.title'));
    expect(table.subtitle).toBe(t('admin.reports.periods.30d'));
    expect(table.columns).toHaveLength(4);
    expect(table.rows).toHaveLength(6 + report.tripsCreated.length + report.provinces.length);
    expect(table.rows[0]).toEqual([t('admin.export.report.sections.stats'), t('admin.reports.stats.newUsers'), `n${report.stats.newUsers.value}`, '']);
    expect(table.rows[2][2]).toBe(`p${report.stats.completionRate.value}`);
    const province = table.rows[table.rows.length - 1];
    expect(province[0]).toBe(t('admin.export.report.sections.provinces'));
    expect(province[1]).toBe(report.provinces.at(-1)!.name);
  });
});
