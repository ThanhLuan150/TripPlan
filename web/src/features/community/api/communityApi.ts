import {api} from '@/lib/apiClient';
import type {CommunityUser, FollowState} from '../types';

export const communityApi = {
  profile: async (id: string) => (await api.get<{user: CommunityUser}>(`/user/${id}/profile`)).data.user,

  follow: async (id: string) => (await api.post<FollowState>(`/user/${id}/follow`)).data,

  unfollow: async (id: string) => (await api.delete<FollowState>(`/user/${id}/follow`)).data,
};
