import {PermissionsAndroid, Platform} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import {getCurrentPosition} from '../src/lib/location';

jest.mock('react-native-geolocation-service', () => ({
  __esModule: true,
  default: {requestAuthorization: jest.fn(), getCurrentPosition: jest.fn()},
}));

const geo = Geolocation as unknown as {
  requestAuthorization: jest.Mock;
  getCurrentPosition: jest.Mock;
};
const setOS = (os: 'android' | 'ios') => {
  Platform.OS = os;
};
const position = (ok: boolean) =>
  geo.getCurrentPosition.mockImplementation((success, fail) =>
    ok
      ? success({coords: {latitude: 16.05, longitude: 108.2, accuracy: 5}})
      : fail({code: 3}),
  );

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  setOS('ios');
});

describe('getCurrentPosition', () => {
  it('android: resolves once the permission is granted', async () => {
    setOS('android');
    jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
    position(true);
    await expect(getCurrentPosition()).resolves.toEqual({
      latitude: 16.05,
      longitude: 108.2,
    });
  });

  it('android: throws "denied" when refused', async () => {
    setOS('android');
    jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
    await expect(getCurrentPosition()).rejects.toThrow('denied');
  });

  it('ios: resolves once authorized', async () => {
    geo.requestAuthorization.mockResolvedValue('granted');
    position(true);
    await expect(getCurrentPosition()).resolves.toEqual({
      latitude: 16.05,
      longitude: 108.2,
    });
    expect(geo.requestAuthorization).toHaveBeenCalledWith('whenInUse');
  });

  it('ios: throws "denied" when not authorized', async () => {
    geo.requestAuthorization.mockResolvedValue('denied');
    await expect(getCurrentPosition()).rejects.toThrow('denied');
  });

  it('throws "unavailable" when the position cannot be read', async () => {
    geo.requestAuthorization.mockResolvedValue('granted');
    position(false);
    await expect(getCurrentPosition()).rejects.toThrow('unavailable');
  });
});
