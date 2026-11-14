import {useQuery, useQueryClient} from '@tanstack/react-query';
import {storage, StorageKeys} from '@/lib/storage';
import {profileApi} from './api/profileApi';

const readSeen = (): string[] => {
  try {
    const ids = JSON.parse(storage.getItem(StorageKeys.seenNotifications) ?? '[]');
    return Array.isArray(ids) ? ids.map(String) : [];
  } catch {
    return [];
  }
};

// Notifications the admin published (GET /announcements) and how many the user
// has not opened yet. "Seen" is kept on this device.
export const useNotifications = () => {
  const client = useQueryClient();
  const query = useQuery({queryKey: ['notifications'], queryFn: profileApi.notifications});
  const seen = useQuery({queryKey: ['notifications', 'seen'], queryFn: readSeen, staleTime: Infinity});

  const items = query.data ?? [];
  const seenIds = seen.data ?? [];
  const unread = items.filter(item => !seenIds.includes(String(item.id))).length;

  const markAllSeen = () => {
    const ids = [...new Set([...seenIds, ...items.map(item => String(item.id))])];
    storage.setItem(StorageKeys.seenNotifications, JSON.stringify(ids));
    client.setQueryData(['notifications', 'seen'], ids);
  };

  return {...query, items, unread, markAllSeen};
};
