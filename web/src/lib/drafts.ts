import {storage, StorageKeys} from './storage';

// Unfinished forms kept in the browser so a reload, a lost connection or leaving the page does not lose
// what the user typed. One draft per form and per account (another user of the same browser never sees it).
export interface Draft<T> {
  value: T;
  savedAt: number;
}

const owner = () => {
  try {
    // the session is stored as {accessToken, data: user}
    return (JSON.parse(storage.getItem(StorageKeys.user) ?? 'null') as {data?: {username?: string}} | null)?.data?.username ?? 'anonymous';
  } catch {
    return 'anonymous';
  }
};
const keyOf = (name: string) => `draft:${name}:${owner()}`;

export const drafts = {
  load: <T>(name: string): Draft<T> | null => {
    try {
      const draft = JSON.parse(storage.getItem(keyOf(name)) ?? 'null') as Draft<T> | null;
      return draft && typeof draft.savedAt === 'number' && draft.value !== undefined ? draft : null;
    } catch {
      return null;
    }
  },
  save: <T>(name: string, value: T) => storage.setItem(keyOf(name), JSON.stringify({value, savedAt: Date.now()})),
  clear: (name: string) => storage.removeItem(keyOf(name)),
};

export const DraftNames = {
  createTrip: 'createTrip',
  recommend: 'recommend',
} as const;
