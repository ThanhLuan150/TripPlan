import {Platform} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {API_URL} from './config';
import {getAccessToken} from '../store/session';

// File name made from a user text: no characters a file system rejects.
export const safeFileName = (name: string | undefined, fallback: string) => {
  const clean = [...(name ?? '')]
    .map(ch => (ch.charCodeAt(0) < 32 ? ' ' : ch))
    .join('')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  return clean || fallback;
};

// Downloads the PDF the backend builds from the saved trip (read only, owner only) into the
// app cache, then opens it with the system PDF viewer.
export async function exportTripPdf(
  id: string,
  lang: string,
  name: string | undefined,
) {
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${safeFileName(
    name,
    'trip',
  )}.pdf`;
  const res = await ReactNativeBlobUtil.config({path}).fetch(
    'GET',
    `${API_URL}/trip-plan/${id}/export-pdf?lang=${lang === 'en' ? 'en' : 'vi'}`,
    {Authorization: `Bearer ${getAccessToken()}`},
  );
  const status = res.info().status;
  if (status !== 200) {
    await ReactNativeBlobUtil.fs.unlink(path).catch(() => undefined);
    throw new Error(`PDF export failed (${status})`);
  }
  if (Platform.OS === 'android') {
    await ReactNativeBlobUtil.android.actionViewIntent(path, 'application/pdf');
  } else {
    await ReactNativeBlobUtil.ios.openDocument(path);
  }
}
