import {useQuery} from '@tanstack/react-query';
import {videosApi} from './api';

// Videos the admin published; `home`: only those chosen for the home page.
export const useVideos = (home = false) =>
  useQuery({queryKey: ['videos', home], queryFn: () => videosApi.list(home)});
