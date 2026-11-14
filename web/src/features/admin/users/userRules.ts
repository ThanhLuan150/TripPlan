import type {AdminUser} from '../types';

// What an admin may do with an account (the backend enforces the same rules).
// `self` is the signed-in admin: they cannot change their own account.

export const isSelf = (user: AdminUser, username: string | undefined) => !!username && user.username === username;

export const canEdit = (user: AdminUser, self: boolean) => !self && user.status !== 'delete';

// admins must be demoted first
export const canSuspend = (user: AdminUser, self: boolean) => !self && user.status === 'active' && user.role !== 'admin';

export const canReactivate = (user: AdminUser, self: boolean) =>
  !self && (user.status === 'suspended' || user.status === 'delete');

export const canDelete = (user: AdminUser, self: boolean) =>
  !self && user.status !== 'delete' && user.role !== 'admin';

// checkbox of the table: any account that can still change
export const canSelect = (user: AdminUser, self: boolean) => !self && user.status !== 'delete';
