import {Alert} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {challengeApi} from '../src/api';
import {CheckInError, MAX_DISTANCE_METERS, checkIn} from '../src/lib/checkIn';
import {getCurrentPosition} from '../src/lib/location';
import {uploadImage} from '../src/lib/upload';

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));
jest.mock('../src/lib/location', () => ({getCurrentPosition: jest.fn()}));
jest.mock('../src/lib/upload', () => ({uploadImage: jest.fn()}));
jest.mock('../src/api', () => ({
  challengeApi: {checkProgress: jest.fn(), complete: jest.fn()},
}));

const camera = launchCamera as jest.Mock;
const gallery = launchImageLibrary as jest.Mock;
const check = challengeApi.checkProgress as jest.Mock;
const complete = challengeApi.complete as jest.Mock;
const upload = uploadImage as jest.Mock;
const photo = {uri: 'file:///p.jpg', fileName: 'p.jpg', type: 'image/jpeg'};

// Presses the n-th button of the "camera / gallery / cancel" dialog (0, 1, 2) or dismisses it (-1).
const choose = (n: number) =>
  jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons, options) => {
    if (n === -1) {
      options?.onDismiss?.();
    } else {
      buttons?.[n].onPress?.();
    }
  });

beforeEach(() => {
  (getCurrentPosition as jest.Mock).mockResolvedValue({
    latitude: 1,
    longitude: 2,
  });
  check.mockResolvedValue({distance: 10, message: 'ok'});
  upload.mockResolvedValue('https://api/files/1');
  complete.mockResolvedValue({});
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.resetAllMocks();
});

describe('checkIn', () => {
  it('checks the position, takes a camera photo, uploads it and completes', async () => {
    choose(0);
    camera.mockResolvedValue({assets: [photo]});
    await expect(checkIn('c1')).resolves.toBe(true);
    expect(check).toHaveBeenCalledWith('c1', 1, 2);
    expect(upload).toHaveBeenCalledWith(photo);
    expect(complete).toHaveBeenCalledWith('c1', 'https://api/files/1');
    expect(gallery).not.toHaveBeenCalled();
  });

  it('lets the user upload a photo from the gallery', async () => {
    choose(1);
    gallery.mockResolvedValue({assets: [photo]});
    await expect(checkIn('c1')).resolves.toBe(true);
    expect(camera).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalled();
  });

  it('falls back to the gallery when there is no camera', async () => {
    choose(0);
    camera.mockResolvedValue({errorCode: 'camera_unavailable'});
    gallery.mockResolvedValue({assets: [photo]});
    await expect(checkIn('c1')).resolves.toBe(true);
    expect(gallery).toHaveBeenCalled();
  });

  it('returns false when the user cancels the dialog', async () => {
    choose(2);
    await expect(checkIn('c1')).resolves.toBe(false);
    expect(complete).not.toHaveBeenCalled();
  });

  it('returns false when the user dismisses the dialog', async () => {
    choose(-1);
    await expect(checkIn('c1')).resolves.toBe(false);
    expect(complete).not.toHaveBeenCalled();
  });

  it('returns false when the picker returns no photo', async () => {
    choose(1);
    gallery.mockResolvedValue({});
    await expect(checkIn('c1')).resolves.toBe(false);
    expect(complete).not.toHaveBeenCalled();
  });

  it('refuses when the user is too far, before asking for a photo', async () => {
    const dialog = choose(0);
    check.mockResolvedValue({distance: MAX_DISTANCE_METERS + 1});
    await expect(checkIn('c1')).rejects.toMatchObject({
      key: 'tooFar',
      params: {distance: MAX_DISTANCE_METERS + 1},
    });
    expect(dialog).not.toHaveBeenCalled();
  });

  it('accepts exactly the maximum distance', async () => {
    choose(1);
    check.mockResolvedValue({distance: MAX_DISTANCE_METERS});
    gallery.mockResolvedValue({assets: [photo]});
    await expect(checkIn('c1')).resolves.toBe(true);
  });

  it('throws photoFailed when the picker reports an error', async () => {
    choose(1);
    gallery.mockResolvedValue({errorCode: 'others'});
    const err = await checkIn('c1').catch(e => e);
    expect(err).toBeInstanceOf(CheckInError);
    expect(err.key).toBe('photoFailed');
  });

  it('lets a position error through', async () => {
    (getCurrentPosition as jest.Mock).mockRejectedValue(new Error('denied'));
    await expect(checkIn('c1')).rejects.toThrow('denied');
    expect(check).not.toHaveBeenCalled();
  });
});
