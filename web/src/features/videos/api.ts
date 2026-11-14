import {api} from '@/lib/apiClient';

// Video the admin published (backend: GET /videos, public).
export interface VideoItem {
  id: string;
  title: string;
  location: string;
  youtubeLink: string;
  // direct file URL, "" when the admin gave only the YouTube link
  src: string;
  // YouTube thumbnail, "" for any other link
  thumbnail: string;
}

export const videosApi = {
  // `home`: only the videos the admin chose for the home page
  list: async (home = false) =>
    (await api.get<VideoItem[]>('/videos', {params: home ? {home: 1} : undefined})).data,
};
