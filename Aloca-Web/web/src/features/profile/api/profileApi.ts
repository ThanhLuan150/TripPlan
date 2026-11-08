import axios from 'axios';
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
}

export const profileApi = {
  update: async (data: ProfileUpdate) => (await api.post('/user/profile', data)).data,

  // Same demo data source as the mobile app (not the Aloca backend).
  notifications: async () =>
    (await axios.get<NotificationItem[]>('https://645e542e8d08100293fcd90e.mockapi.io/sinhvien'))
      .data,
};
