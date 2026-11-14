import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import type {AdminUserCreate, AdminUserUpdate} from '../types';
import {fetchTrip, fetchUser, fetchUsers, patchUser, postUser, patchUsersStatus, type UserStatusChange} from './api';

export const usersKey = ['admin', 'users'] as const;

export const useAdminUsers = () => useQuery({queryKey: usersKey, queryFn: fetchUsers});

export const useAdminUser = (id: string | undefined) =>
  useQuery({queryKey: [...usersKey, id], queryFn: () => fetchUser(id!), enabled: !!id});

// Every change refetches the list and the open detail page.
const useRefresh = () => {
  const client = useQueryClient();
  return () => client.invalidateQueries({queryKey: usersKey});
};

export const useUpdateUser = () => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({id, update}: {id: string; update: AdminUserUpdate}) => patchUser(id, update),
    onSuccess: refresh,
  });
};

export const useCreateUser = () => {
  const refresh = useRefresh();
  return useMutation({mutationFn: (user: AdminUserCreate) => postUser(user), onSuccess: refresh});
};

export const useAdminTrip = (id: string | null) =>
  useQuery({queryKey: ['admin', 'trip', id], queryFn: () => fetchTrip(id!), enabled: !!id});

export const useBulkUserStatus = () => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ids, status, reason}: {ids: string[]; status: UserStatusChange; reason?: string}) =>
      patchUsersStatus(ids, status, reason),
    onSuccess: refresh,
  });
};
