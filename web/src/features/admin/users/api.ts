import {api} from '@/lib/apiClient';
import type {AdminTripDetail, AdminUser, AdminUserCreate, AdminUserDetail, AdminUserUpdate} from '../types';

// Admin API of the user accounts (backend: routes/adminRoutes.js, role "admin").

export const fetchUsers = async () => (await api.get<AdminUser[]>('/admin/users')).data;

export const fetchUser = async (id: string) => (await api.get<AdminUserDetail>(`/admin/users/${id}`)).data;

export const postUser = async (user: AdminUserCreate) => (await api.post<AdminUser>('/admin/users', user)).data;

export const fetchTrip = async (id: string) => (await api.get<AdminTripDetail>(`/admin/trips/${id}`)).data;

export const patchUser = async (id: string, update: AdminUserUpdate) =>
  (await api.patch<AdminUser>(`/admin/users/${id}`, update)).data;

export type UserStatusChange = 'active' | 'suspended' | 'delete';

export interface BulkResult {
  updated: string[];
  // not changed: yourself, administrators, accounts already in that state
  skipped: string[];
}

export const patchUsersStatus = async (ids: string[], status: UserStatusChange, suspendReason?: string) =>
  (await api.post<BulkResult>('/admin/users/bulk-status', {ids, status, suspendReason})).data;
