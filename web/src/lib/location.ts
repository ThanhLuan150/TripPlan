import {api} from './apiClient';
import {storage, StorageKeys} from './storage';

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export type LocationPermission = 'granted' | 'prompt' | 'denied' | 'unsupported';

// Why we could not get a position
export type LocationErrorReason =
  | 'denied' // the user / browser blocked the permission
  | 'unavailable' // GPS / location services off, no signal
  | 'timeout'
  | 'insecure' // geolocation only works on https:// or localhost
  | 'unsupported';

export class LocationError extends Error {
  constructor(public reason: LocationErrorReason) {
    super(`location ${reason}`);
  }
}

export const isLocationError = (e: unknown): e is LocationError => e instanceof LocationError;

// Current permission state, without asking the user.
export const getLocationPermission = async (): Promise<LocationPermission> => {
  if (!('geolocation' in navigator)) {
    return 'unsupported';
  }
  try {
    const status = await navigator.permissions.query({name: 'geolocation'});
    return status.state;
  } catch {
    // Permissions API missing (older Safari): we only know by asking
    return 'prompt';
  }
};

// Calls back whenever the user changes the permission (e.g. re-allows it in
// the browser settings). Returns an unsubscribe function.
export const watchLocationPermission = (onChange: (state: LocationPermission) => void) => {
  let status: PermissionStatus | null = null;
  let active = true;
  const handler = () => status && onChange(status.state);
  navigator.permissions
    ?.query({name: 'geolocation'})
    .then(s => {
      if (!active) {
        return;
      }
      status = s;
      s.addEventListener('change', handler);
    })
    .catch(() => undefined);
  return () => {
    active = false;
    status?.removeEventListener('change', handler);
  };
};

// Asks the browser for the position (shows the permission prompt the first
// time). Throws a LocationError with the reason when it fails.
export const getCurrentPosition = (
  {timeout = 15000, maximumAge = 30000} = {},
): Promise<Coords> =>
  new Promise((resolve, reject) => {
    if (!window.isSecureContext) {
      reject(new LocationError('insecure'));
      return;
    }
    if (!('geolocation' in navigator)) {
      reject(new LocationError('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      err =>
        reject(
          new LocationError(
            // GeolocationPositionError codes: 1 denied, 2 unavailable, 3 timeout
            err.code === 1
              ? 'denied'
              : err.code === 3
                ? 'timeout'
                : 'unavailable',
          ),
        ),
      {enableHighAccuracy: true, timeout, maximumAge},
    );
  });

// Which "how to re-enable location" instructions to show
export type BrowserKind = 'ios' | 'android' | 'firefox' | 'safari' | 'desktop';

export const detectBrowser = (): BrowserKind => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/i.test(ua)) {
    return 'android';
  }
  if (/Firefox\//i.test(ua)) {
    return 'firefox';
  }
  if (/Safari\//i.test(ua) && !/Chrome|Chromium|Edg\//i.test(ua)) {
    return 'safari';
  }
  return 'desktop';
};

// "350 m" / "2,4 km"
export const formatDistance = (meters: number, locale = 'vi') =>
  meters < 1000
    ? `${Math.round(meters)} m`
    : `${(meters / 1000).toLocaleString(locale, {maximumFractionDigits: 1})} km`;

// Ask the backend which province the user's position is in (GET /geo/reverse:
// the place service and its key stay on the server) and keep it as
// 'userLocation' (sent when generating trips), like the mobile App.tsx did.
// Only runs when the user has already allowed location: we never prompt on
// page load, the prompt is shown when a feature needs it (challenge photos).
export const saveUserLocation = async (coords?: Coords) => {
  if (!coords && (await getLocationPermission()) !== 'granted') {
    return;
  }
  const {latitude, longitude} = coords ?? (await getCurrentPosition());
  const {data} = await api.get<{province: string | null}>('/geo/reverse', {
    params: {lat: latitude, lng: longitude},
  });
  if (data.province) {
    storage.setItem(StorageKeys.userLocation, data.province);
  }
};
