import {api} from '@/lib/apiClient';

// Pictures of the home page the admin manages (backend: GET /home, public).
export interface HomeBanner {
  id: string;
  title: string;
  imageUrl: string;
}

export interface HomeSuggestion {
  id: string;
  title: string;
  // province: tapping the card starts a plan for it
  location: string;
  imageUrl: string;
}

export interface HomeContent {
  banners: HomeBanner[];
  suggestions: HomeSuggestion[];
}

export const homeApi = {
  get: async () => (await api.get<HomeContent>('/home')).data,
};

