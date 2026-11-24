import {
  launchCamera,
  launchImageLibrary,
  Asset,
} from 'react-native-image-picker';
import {Alert} from 'react-native';
import i18n from '../i18n';
import {challengeApi} from '../api';
import {getCurrentPosition} from './location';
import {uploadImage} from './upload';

// Backend rule: the photo only counts within this distance of the challenge's place.
export const MAX_DISTANCE_METERS = 250;

// A check-in failure that has its own i18n message (`trips.<key>`).
export class CheckInError extends Error {
  constructor(public key: string, public params: Record<string, unknown> = {}) {
    super(key);
  }
}

// Asks whether to take a photo or upload one from the gallery; null = cancelled.
const askSource = () =>
  new Promise<'camera' | 'gallery' | null>(resolve =>
    Alert.alert(
      i18n.t('trips.photoChoose'),
      undefined,
      [
        {text: i18n.t('trips.photoCamera'), onPress: () => resolve('camera')},
        {text: i18n.t('trips.photoGallery'), onPress: () => resolve('gallery')},
        {
          text: i18n.t('common.cancel'),
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      {cancelable: true, onDismiss: () => resolve(null)},
    ),
  );

// Takes a photo or uploads one; on a device without a camera (emulator) falls back to the gallery.
const takePhoto = async (): Promise<Asset | undefined> => {
  const source = await askSource();
  if (!source) {return undefined;}
  const options = {
    mediaType: 'photo' as const,
    quality: 0.7 as const,
    maxWidth: 1600,
    maxHeight: 1600,
  };
  let result =
    source === 'camera'
      ? await launchCamera(options)
      : await launchImageLibrary(options);
  if (result.errorCode === 'camera_unavailable')
    {result = await launchImageLibrary(options);}
  if (result.errorCode) {throw new CheckInError('photoFailed');}
  return result.assets?.[0];
};

// Check the user is at the place, take (or pick) a photo, upload it and mark the challenge done.
// Returns false when the user cancelled the photo.
export async function checkIn(chaId: string): Promise<boolean> {
  const pos = await getCurrentPosition();
  const {distance} = await challengeApi.checkProgress(
    chaId,
    pos.latitude,
    pos.longitude,
  );
  // the backend answers 200 even when the user is too far: the distance decides
  if (distance > MAX_DISTANCE_METERS)
    {throw new CheckInError('tooFar', {distance});}
  const photo = await takePhoto();
  if (!photo) {return false;}
  await challengeApi.complete(chaId, await uploadImage(photo));
  return true;
}
