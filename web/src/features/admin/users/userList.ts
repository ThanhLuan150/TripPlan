import {removeVietnameseTones} from '@/lib/text';
import type {AdminUser} from '../types';

export const ALL = 'all';

export type RegisteredFilter = 'all' | '7d' | '30d' | '90d' | 'year';
export type ActiveFilter = 'all' | '24h' | '7d' | '30d' | 'inactive' | 'never';
export type UserSort = 'newest' | 'oldest' | 'nameAsc' | 'nameDesc' | 'mostTrips' | 'recentlyActive' | 'points';

export interface UserFilters {
  query: string;
  role: string;
  status: string;
  registered: RegisteredFilter;
  lastActive: ActiveFilter;
  sort: UserSort;
}

export const defaultFilters: UserFilters = {
  query: '',
  role: ALL,
  status: ALL,
  registered: 'all',
  lastActive: 'all',
  sort: 'newest',
};

export const registeredOptions: RegisteredFilter[] = ['all', '7d', '30d', '90d', 'year'];
export const activeOptions: ActiveFilter[] = ['all', '24h', '7d', '30d', 'inactive', 'never'];
export const sortOptions: UserSort[] = ['newest', 'oldest', 'nameAsc', 'nameDesc', 'mostTrips', 'recentlyActive', 'points'];

const DAY_MS = 86_400_000;
const DAYS = {'7d': 7, '30d': 30, '90d': 90, year: 365} as const;

// accent-insensitive: "nguyen" finds "Nguyễn"
const normalize = (text: string) => removeVietnameseTones(text).toLowerCase();

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);

const matchesRegistered = (user: AdminUser, filter: RegisteredFilter, now: number) =>
  filter === 'all' || now - time(user.createdAt) <= DAYS[filter] * DAY_MS;

const matchesActive = (user: AdminUser, filter: ActiveFilter, now: number) => {
  if (filter === 'all') {
    return true;
  }
  if (filter === 'never') {
    return !user.lastActiveAt;
  }
  if (!user.lastActiveAt) {
    return false;
  }
  const age = now - time(user.lastActiveAt);
  if (filter === '24h') {
    return age <= DAY_MS;
  }
  if (filter === 'inactive') {
    return age > 30 * DAY_MS;
  }
  return age <= DAYS[filter] * DAY_MS;
};

const sorters: Record<UserSort, (a: AdminUser, b: AdminUser) => number> = {
  newest: (a, b) => time(b.createdAt) - time(a.createdAt),
  oldest: (a, b) => time(a.createdAt) - time(b.createdAt),
  nameAsc: (a, b) => a.fullname.localeCompare(b.fullname, 'vi'),
  nameDesc: (a, b) => b.fullname.localeCompare(a.fullname, 'vi'),
  mostTrips: (a, b) => b.totalTrips - a.totalTrips,
  recentlyActive: (a, b) => time(b.lastActiveAt) - time(a.lastActiveAt),
  points: (a, b) => b.experience - a.experience,
};

// Search (name, username, email), filters and sort of the user list.
export const applyUserFilters = (users: AdminUser[], filters: UserFilters, now = Date.now()) => {
  const q = normalize(filters.query.trim());
  return users
    .filter(
      user =>
        (!q || normalize(`${user.fullname} ${user.username} ${user.email}`).includes(q)) &&
        (filters.role === ALL || user.role === filters.role) &&
        (filters.status === ALL || user.status === filters.status) &&
        matchesRegistered(user, filters.registered, now) &&
        matchesActive(user, filters.lastActive, now),
    )
    .sort(sorters[filters.sort]);
};

export const isFiltered = (filters: UserFilters) =>
  (Object.keys(defaultFilters) as (keyof UserFilters)[]).some(key => filters[key] !== defaultFilters[key]);

// Counters of the stat cards: new accounts of the last 30 days against the 30 before.
export const userCounts = (users: AdminUser[], now = Date.now()) => {
  const live = users.filter(user => user.status !== 'delete');
  const within = (from: number, to: number) =>
    live.filter(user => {
      const age = now - time(user.createdAt);
      return age >= from * DAY_MS && age < to * DAY_MS;
    }).length;
  const created = within(0, 30);
  const before = within(30, 60);
  return {
    total: live.length,
    active: live.filter(user => user.status === 'active').length,
    created,
    createdDelta: before ? (created - before) / before : undefined,
    suspended: live.filter(user => user.status === 'suspended').length,
  };
};
