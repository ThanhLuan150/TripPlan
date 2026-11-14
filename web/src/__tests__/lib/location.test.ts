import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  detectBrowser,
  formatDistance,
  getCurrentPosition,
  getLocationPermission,
  isLocationError,
  LocationError,
  saveUserLocation,
  watchLocationPermission,
} from '@/lib/location';
import {storage, StorageKeys} from '@/lib/storage';

// jsdom has no navigator.maxTouchPoints: replace the whole navigator
const setUserAgent = (userAgent: string, maxTouchPoints = 0) => {
  vi.stubGlobal('navigator', {userAgent, maxTouchPoints});
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('formatDistance', () => {
  it('shows metres under 1 km and km above', () => {
    expect(formatDistance(349.6)).toBe('350 m');
    expect(formatDistance(2400, 'en')).toBe('2.4 km');
    expect(formatDistance(2400, 'vi')).toMatch(/^2,4 km$/);
  });
});

describe('detectBrowser', () => {
  it.each([
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1', 0, 'ios'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 5, 'ios'], // iPadOS
    ['Mozilla/5.0 (Linux; Android 14) Chrome/120.0 Mobile Safari/537.36', 5, 'android'],
    ['Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0', 0, 'firefox'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.0 Safari/605.1.15', 0, 'safari'],
    ['Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36 Edg/120.0', 0, 'desktop'],
  ])('%s (touch points: %i) -> %s', (ua, touch, expected) => {
    setUserAgent(ua, touch);
    expect(detectBrowser()).toBe(expected);
  });
});

describe('getLocationPermission', () => {
  it('returns the Permissions API state', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {},
      permissions: {query: vi.fn(async () => ({state: 'denied'}))},
    });
    await expect(getLocationPermission()).resolves.toBe('denied');
  });

  it("returns 'prompt' when the Permissions API is missing", async () => {
    vi.stubGlobal('navigator', {geolocation: {}});
    await expect(getLocationPermission()).resolves.toBe('prompt');
  });

  it("returns 'unsupported' without geolocation", async () => {
    vi.stubGlobal('navigator', {});
    await expect(getLocationPermission()).resolves.toBe('unsupported');
  });
});

describe('getCurrentPosition', () => {
  const getPosition = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('navigator', {geolocation: {getCurrentPosition: getPosition}});
  });

  it('resolves with the coordinates', async () => {
    getPosition.mockImplementation(success =>
      success({coords: {latitude: 11.94, longitude: 108.44, accuracy: 12}}),
    );

    await expect(getCurrentPosition({timeout: 1000})).resolves.toEqual({
      latitude: 11.94,
      longitude: 108.44,
      accuracy: 12,
    });
    expect(getPosition.mock.calls[0][2]).toEqual({enableHighAccuracy: true, timeout: 1000, maximumAge: 30000});
  });

  it.each([
    [1, 'denied'],
    [2, 'unavailable'],
    [3, 'timeout'],
  ])('maps error code %i to %s', async (code, reason) => {
    getPosition.mockImplementation((_success, failure) => failure({code}));

    const error = await getCurrentPosition().catch(e => e);

    expect(isLocationError(error)).toBe(true);
    expect(error.reason).toBe(reason);
  });

  it("fails with 'insecure' on plain http", async () => {
    vi.stubGlobal('isSecureContext', false);

    await expect(getCurrentPosition()).rejects.toEqual(new LocationError('insecure'));
    expect(getPosition).not.toHaveBeenCalled();
  });

  it("fails with 'unsupported' without geolocation", async () => {
    vi.stubGlobal('navigator', {});

    const error = await getCurrentPosition().catch(e => e);
    expect(error.reason).toBe('unsupported');
  });

  it('isLocationError is false for other errors', () => {
    expect(isLocationError(new Error('x'))).toBe(false);
  });
});

describe('watchLocationPermission', () => {
  const permissionStatus = () => {
    const status = {
      state: 'prompt' as PermissionState,
      handler: undefined as undefined | (() => void),
      addEventListener: vi.fn((_type: string, h: () => void) => {
        status.handler = h;
      }),
      removeEventListener: vi.fn(),
    };
    return status;
  };

  it('reports permission changes until unsubscribed', async () => {
    const status = permissionStatus();
    vi.stubGlobal('navigator', {permissions: {query: vi.fn(async () => status)}});
    const onChange = vi.fn();

    const stop = watchLocationPermission(onChange);
    await vi.waitFor(() => expect(status.addEventListener).toHaveBeenCalled());
    status.state = 'granted';
    status.handler!();

    expect(onChange).toHaveBeenCalledWith('granted');
    stop();
    expect(status.removeEventListener).toHaveBeenCalledWith('change', status.handler);
  });

  it('does not subscribe when stopped before the browser answers', async () => {
    const status = permissionStatus();
    vi.stubGlobal('navigator', {permissions: {query: vi.fn(async () => status)}});

    watchLocationPermission(vi.fn())();
    await Promise.resolve();
    await Promise.resolve();

    expect(status.addEventListener).not.toHaveBeenCalled();
  });

  it('is a no-op without the Permissions API or when the query fails', async () => {
    vi.stubGlobal('navigator', {});
    expect(() => watchLocationPermission(vi.fn())()).not.toThrow();

    vi.stubGlobal('navigator', {permissions: {query: vi.fn(async () => Promise.reject(new TypeError('x')))}});
    const stop = watchLocationPermission(vi.fn());
    await Promise.resolve();
    expect(() => stop()).not.toThrow();
  });
});

describe('saveUserLocation', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue({json: async () => ({items: [{address: {county: 'Quận 1'}}]})});
  });

  it('does nothing until location has been allowed', async () => {
    vi.stubGlobal('navigator', {geolocation: {}, permissions: {query: vi.fn(async () => ({state: 'prompt'}))}});

    await saveUserLocation();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('stores the county of the given position', async () => {
    await saveUserLocation({latitude: 10.77, longitude: 106.7});

    expect(fetchMock.mock.calls[0][0]).toContain('at=10.77,106.7');
    expect(storage.getItem(StorageKeys.userLocation)).toBe('Quận 1');
  });

  it('uses the current position when allowed, and keeps the old value without county', async () => {
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('navigator', {
      permissions: {query: vi.fn(async () => ({state: 'granted'}))},
      geolocation: {getCurrentPosition: (ok: PositionCallback) => ok({coords: {latitude: 1, longitude: 2}} as GeolocationPosition)},
    });
    storage.setItem(StorageKeys.userLocation, 'Hoàn Kiếm');
    fetchMock.mockResolvedValue({json: async () => ({items: []})});

    await saveUserLocation();

    expect(fetchMock.mock.calls[0][0]).toContain('at=1,2');
    expect(storage.getItem(StorageKeys.userLocation)).toBe('Hoàn Kiếm');
  });
});
