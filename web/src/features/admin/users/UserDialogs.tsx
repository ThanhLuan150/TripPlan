import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import Toast from '@/components/ui/Toast';
import {apiMessage} from '@/lib/apiClient';
import type {AdminUser, AdminUserUpdate} from '../types';
import type {UserStatusChange} from './api';
import {useBulkUserStatus, useUpdateUser} from './hooks';
import UserEditDialog from './UserEditDialog';
import UserRoleDialog from './UserRoleDialog';
import {UserDeleteDialog, UserReactivateDialog, UserSuspendDialog} from './UserStatusDialogs';

export type UserDialogKind = 'edit' | 'role' | 'suspend' | 'reactivate' | 'delete';

export interface UserDialogState {
  kind: UserDialogKind;
  users: AdminUser[];
}

// The dialog of the open action (edit, role, suspend, reactivate, delete) with
// the call to the backend. It stays open with the error when the call fails and
// closes on success; `onDone` runs after a success (back to the list...).
export default function UserDialogs({
  dialog,
  onClose,
  onDone,
}: {
  dialog: UserDialogState | null;
  onClose: () => void;
  onDone?: (kind: UserDialogKind, ids: string[]) => void;
}) {
  const {t} = useTranslation();
  const update = useUpdateUser();
  const bulk = useBulkUserStatus();
  const [error, setError] = useState<string>();

  if (!dialog) {
    return null;
  }
  const {kind, users} = dialog;
  const busy = update.isPending || bulk.isPending;
  const close = () => {
    setError(undefined);
    update.reset();
    bulk.reset();
    onClose();
  };
  const failed = (e: unknown) => setError(apiMessage(e) ?? t('admin.users.errors.generic'));
  const done = (ids: string[], message: string) => {
    Toast.show({type: 'success', text1: message});
    close();
    onDone?.(kind, ids);
  };

  const change = (id: string, patch: AdminUserUpdate, message: string) =>
    update.mutate({id, update: patch}, {onSuccess: () => done([id], message), onError: failed});

  const changeStatus = (status: UserStatusChange, reason?: string) => {
    const messages = {
      active: 'admin.users.toasts.reactivated',
      suspended: 'admin.users.toasts.suspended',
      delete: 'admin.users.toasts.deleted',
    } as const;
    if (users.length === 1) {
      change(users[0].id, {status, suspendReason: reason}, t(messages[status], {count: 1}));
      return;
    }
    bulk.mutate(
      {ids: users.map(user => user.id), status, reason},
      {
        onSuccess: ({updated, skipped}) => {
          done(updated, t(messages[status], {count: updated.length}));
          if (skipped.length) {
            Toast.show({type: 'info', text1: t('admin.users.toasts.skipped', {count: skipped.length})});
          }
        },
        onError: failed,
      },
    );
  };

  const common = {busy, error, onClose: close};
  switch (kind) {
    case 'edit':
      return (
        <UserEditDialog
          {...common}
          user={users[0]}
          onSubmit={patch => change(users[0].id, patch, t('admin.users.toasts.updated'))}
        />
      );
    case 'role':
      return (
        <UserRoleDialog
          {...common}
          user={users[0]}
          onSubmit={role => change(users[0].id, {role}, t('admin.users.toasts.roleChanged'))}
        />
      );
    case 'suspend':
      return <UserSuspendDialog {...common} users={users} onSubmit={reason => changeStatus('suspended', reason)} />;
    case 'reactivate':
      return <UserReactivateDialog {...common} users={users} onSubmit={() => changeStatus('active')} />;
    case 'delete':
      return <UserDeleteDialog {...common} users={users} onSubmit={() => changeStatus('delete')} />;
  }
}
