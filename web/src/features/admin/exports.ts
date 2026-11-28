import type {TFunction} from 'i18next';
import type {AdminFormat} from './hooks/useAdminFormat';
import {logActionLabel, roleBadge, userStatusBadge} from './status';
import type {AdminActivityLog, AdminReport, AdminUser, ReportPeriod} from './types';

// The tables the admin pages export as PDF (the backend lays them out: POST /admin/export/pdf). Every
// builder returns what is on screen: translated headings and formatted values, so the PDF reads like the page.

export type PdfCell = string | number | null | undefined;

export interface PdfTable {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: PdfCell[][];
  lang: 'vi' | 'en';
}

export const pdfLang = (language: string): 'vi' | 'en' => (language.startsWith('en') ? 'en' : 'vi');

export const usersTable = (users: AdminUser[], t: TFunction, format: AdminFormat, language: string): PdfTable => ({
  title: t('admin.export.users.title'),
  subtitle: t('admin.export.count', {count: users.length}),
  lang: pdfLang(language),
  columns: [
    'fullname',
    'username',
    'email',
    'phone',
    'role',
    'status',
    'createdAt',
    'lastActiveAt',
    'totalTrips',
    'completedTrips',
    'challengesJoined',
    'points',
  ].map(key => t(`admin.export.users.columns.${key}`)),
  rows: users.map(user => [
    user.fullname,
    user.username,
    user.email,
    user.phone,
    t(roleBadge[user.role].labelKey),
    t(userStatusBadge[user.status].labelKey),
    format.date(user.createdAt),
    user.lastActiveAt ? format.dateTime(user.lastActiveAt) : '',
    user.totalTrips,
    user.completedTrips,
    user.challengesJoined,
    user.experience,
  ]),
});

export const logsTable = (logs: AdminActivityLog[], t: TFunction, format: AdminFormat, language: string): PdfTable => ({
  title: t('admin.export.logs.title'),
  subtitle: t('admin.export.count', {count: logs.length}),
  lang: pdfLang(language),
  columns: ['time', 'actor', 'action', 'target', 'ip', 'level'].map(key => t(`admin.export.logs.columns.${key}`)),
  rows: logs.map(log => [
    format.dateTime(log.at),
    log.actor,
    t(logActionLabel[log.action] ?? log.action),
    log.target,
    log.ip,
    t(`admin.status.${log.level}`, {defaultValue: log.level}),
  ]),
});

export const reportTable = (
  report: AdminReport,
  period: ReportPeriod,
  t: TFunction,
  format: AdminFormat,
  language: string,
): PdfTable => {
  const stats = report.stats;
  const stat = (key: keyof AdminReport['stats'], value: string): PdfCell[] => [
    t('admin.export.report.sections.stats'),
    t(`admin.reports.stats.${key}`),
    value,
    '',
  ];
  return {
    title: t('admin.export.report.title'),
    subtitle: t(`admin.reports.periods.${period}`),
    lang: pdfLang(language),
    columns: ['section', 'name', 'value', 'extra'].map(key => t(`admin.export.report.columns.${key}`)),
    rows: [
      stat('newUsers', format.number(stats.newUsers.value)),
      stat('tripsCreated', format.number(stats.tripsCreated.value)),
      stat('completionRate', format.percent(stats.completionRate.value)),
      stat('avgTripCost', format.currency(stats.avgTripCost.value)),
      stat('postsShared', format.number(stats.postsShared.value)),
      stat('newReviews', format.number(stats.newReviews.value)),
      ...report.tripsCreated.map(point => [
        t('admin.export.report.sections.trips'),
        format.day(point.date),
        format.number(point.value),
        '',
      ]),
      ...report.provinces.map(row => [
        t('admin.export.report.sections.provinces'),
        row.name,
        format.number(row.trips),
        format.currency(row.avgCost),
      ]),
    ],
  };
};
