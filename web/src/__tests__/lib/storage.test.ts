import {afterEach, describe, expect, it, vi} from 'vitest';
import {storage, StorageKeys} from '@/lib/storage';

describe('storage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads, writes and removes localStorage values', () => {
    storage.setItem('k', 'v');
    expect(storage.getItem('k')).toBe('v');
    expect(window.localStorage.getItem('k')).toBe('v');

    storage.removeItem('k');
    expect(storage.getItem('k')).toBeNull();
  });

  it('removes several keys at once', () => {
    storage.setItem('a', '1');
    storage.setItem('b', '2');
    storage.setItem('c', '3');

    storage.multiRemove(['a', 'b']);

    expect([storage.getItem('a'), storage.getItem('b'), storage.getItem('c')]).toEqual([null, null, '3']);
  });

  it('never throws when storage is blocked (private mode, disabled site data)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });

    expect(storage.getItem('k')).toBeNull();
    expect(() => storage.setItem('k', 'v')).not.toThrow();
    expect(() => storage.multiRemove(['k'])).not.toThrow();
  });

  it('keeps the key names of the mobile app', () => {
    expect(StorageKeys).toMatchObject({user: 'user', accessToken: 'AccessToken'});
  });
});
