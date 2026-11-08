import {storage} from './storage';

export interface Coords {
  latitude: number;
  longitude: number;
}

// Web replacement for @react-native-community/geolocation.
export const getCurrentPosition = (): Promise<Coords> =>
  new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      err => reject(err),
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 60000},
    );
  });

// Same as App.tsx on mobile: reverse-geocode the user's position with HERE and
// keep the county name in storage as 'userLocation' (used to generate trips).
export const saveUserLocation = async () => {
  const {latitude, longitude} = await getCurrentPosition();
  const response = await fetch(
    `https://revgeocode.search.hereapi.com/v1/revgeocode?apikey=TYWNfgg1aUErbBEMMhjeeiX4uDup2tkboazOS0PY4BQ&at=${latitude},${longitude}&lang=vi`,
  );
  const data = await response.json();
  const county = data?.items?.[0]?.address?.county;
  if (county) {
    storage.setItem('userLocation', county);
  }
};
