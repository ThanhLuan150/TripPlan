import {api} from '@/lib/apiClient';
import type {PreferenceCategory, TravelPreferences} from '../preferences';

export interface ProfileUpdate {
  fullname: string;
  email?: string;
  phone: string;
  address: string;
  image: string;
}

export interface NotificationItem {
  id: string | number;
  name: string;
  description: string;
  // when it was published (ISO)
  publishAt?: string;
}

export const profileApi = {
  update: async (data: ProfileUpdate) => (await api.post('/user/profile', data)).data,

  // AI travel preferences of the signed-in user (optional)
  preferences: async () => (await api.get<{preferences: TravelPreferences}>('/user/preferences')).data.preferences,

  savePreferences: async (data: {categories: PreferenceCategory[]; notes: string}) =>
    (await api.put<{message: string; preferences: TravelPreferences}>('/user/preferences', data)).data,

  deletePreferences: async () =>
    (await api.delete<{message: string; preferences: TravelPreferences}>('/user/preferences')).data,

  // Notifications the admin published (GET /announcements)
  notifications: async (): Promise<NotificationItem[]> =>
    (await api.get<{id: string; title: string; message: string; publishAt?: string}[]>('/announcements')).data.map(item => ({
      id: item.id,
      name: item.title,
      description: item.message,
      publishAt: item.publishAt,
    })),
};
