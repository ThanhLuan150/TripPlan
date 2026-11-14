import {api} from '@/lib/apiClient';

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

  // Notifications the admin published (GET /announcements)
  notifications: async (): Promise<NotificationItem[]> =>
    (await api.get<{id: string; title: string; message: string; publishAt?: string}[]>('/announcements')).data.map(item => ({
      id: item.id,
      name: item.title,
      description: item.message,
      publishAt: item.publishAt,
    })),
};
