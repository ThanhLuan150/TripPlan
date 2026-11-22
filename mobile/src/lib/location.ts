import {PermissionsAndroid, Platform} from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export interface Coords {
  latitude: number;
  longitude: number;
}

// Asks for the location permission and returns the current position,
// or throws 'denied' / 'unavailable'.
export async function getCurrentPosition(): Promise<Coords> {
  if (Platform.OS === 'android') {
    const r = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    if (r !== PermissionsAndroid.RESULTS.GRANTED) {throw new Error('denied');}
  } else {
    const r = await Geolocation.requestAuthorization('whenInUse');
    if (r !== 'granted') {throw new Error('denied');}
  }
  return new Promise((resolve, reject) =>
    Geolocation.getCurrentPosition(
      p =>
        resolve({latitude: p.coords.latitude, longitude: p.coords.longitude}),
      () => reject(new Error('unavailable')),
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    ),
  );
}
