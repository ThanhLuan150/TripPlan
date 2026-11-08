import {api, apiBody} from './apiClient';

// Images are uploaded to the Aloca backend (stored in MongoDB), which replaced
// Firebase Storage: Firebase's free Spark plan no longer includes Storage.

const MAX_SIDE = 1600; // px
const QUALITY = 0.82;
const SKIP_BELOW = 400 * 1024; // small images are sent as they are

// Resizes / re-encodes photos to JPEG in the browser so a 6 MB phone photo is
// sent as a few hundred KB. GIFs (animation) and unknown types are left alone.
export const compressImage = async (file: File): Promise<Blob> => {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || typeof createImageBitmap !== 'function') {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SKIP_BELOW) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    // JPEG has no transparency: paint transparent PNG areas white, not black
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    );
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
};

// Uploads an image and returns its public URL.
export const uploadImage = async (file: File): Promise<string> => {
  const blob = await compressImage(file);
  const name = blob === file ? file.name : file.name.replace(/\.\w+$/, '') + '.jpg';
  const form = new FormData();
  form.append('image', blob, name);
  const res = await api.post<{url: string}>('/upload/image', form);
  return res.data.url;
};

// i18n key for an upload rejected by the backend, or null
export const uploadErrorKey = (error: unknown): string | null => {
  const code = apiBody<{code?: string}>(error)?.code;
  if (code === 'IMAGE_TOO_LARGE') {
    return 'common.imageTooLarge';
  }
  if (code === 'IMAGE_TYPE') {
    return 'common.imageType';
  }
  return null;
};
