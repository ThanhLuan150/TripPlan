import {Asset} from 'react-native-image-picker';
import {api} from './apiClient';

// Uploads a picked photo to the backend (POST /upload/image) and returns its public URL.
export const uploadImage = async (asset: Asset): Promise<string> => {
  const form = new FormData();
  form.append('image', {
    uri: asset.uri,
    name: asset.fileName ?? 'photo.jpg',
    type: asset.type ?? 'image/jpeg',
  } as unknown as Blob);
  const res = await api.post<{url: string}>('/upload/image', form, {
    headers: {'Content-Type': 'multipart/form-data'},
  });
  return res.data.url;
};
