import AsyncStorage from '@react-native-async-storage/async-storage';

// Unfinished forms kept on the phone so closing the app, a lost connection or leaving the screen does not
// lose what the user typed. One draft per form and per account (another user of the phone never sees it).
export interface Draft<T> {
  value: T;
  savedAt: number;
}

export const DraftNames = {
  createTrip: 'createTrip',
  recommend: 'recommend',
} as const;

const keyOf = async (name: string) => {
  let owner = 'anonymous';
  try {
    owner =
      (JSON.parse((await AsyncStorage.getItem('user')) ?? 'null') as {username?: string} | null)
        ?.username ?? owner;
  } catch {
    // not signed in / unreadable: the shared "anonymous" slot
  }
  return `draft:${name}:${owner}`;
};

export const drafts = {
  load: async <T>(name: string): Promise<Draft<T> | null> => {
    try {
      const draft = JSON.parse(
        (await AsyncStorage.getItem(await keyOf(name))) ?? 'null',
      ) as Draft<T> | null;
      return draft && typeof draft.savedAt === 'number' && draft.value !== undefined
        ? draft
        : null;
    } catch {
      return null;
    }
  },
  save: async <T>(name: string, value: T) => {
    try {
      await AsyncStorage.setItem(
        await keyOf(name),
        JSON.stringify({value, savedAt: Date.now()}),
      );
    } catch {
      // storage full / unavailable: the form still works, it is just not kept
    }
  },
  clear: async (name: string) => {
    try {
      await AsyncStorage.removeItem(await keyOf(name));
    } catch {
      // nothing to clear
    }
  },
};
