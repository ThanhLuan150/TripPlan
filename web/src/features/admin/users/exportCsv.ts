import {downloadCsv, toCsv} from '../csv';
import type {AdminUser} from '../types';

const COLUMNS: [string, (user: AdminUser) => string | number][] = [
  ['id', user => user.id],
  ['fullname', user => user.fullname],
  ['username', user => user.username],
  ['email', user => user.email],
  ['phone', user => user.phone],
  ['role', user => user.role],
  ['status', user => user.status],
  ['createdAt', user => user.createdAt],
  ['lastActiveAt', user => user.lastActiveAt ?? ''],
  ['totalTrips', user => user.totalTrips],
  ['completedTrips', user => user.completedTrips],
  ['challengesJoined', user => user.challengesJoined],
  ['points', user => user.experience],
];

const header = COLUMNS.map(([name]) => name);
const lines = (users: AdminUser[]) => users.map(user => COLUMNS.map(([, get]) => get(user)));

export const usersToCsv = (users: AdminUser[]) => toCsv(header, lines(users));

export const downloadUsersCsv = (users: AdminUser[], filename = 'aloca-users.csv') =>
  downloadCsv(header, lines(users), filename);
