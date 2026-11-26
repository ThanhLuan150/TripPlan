export const MAX_RECOMMEND_QUERY_LENGTH = 500;
export const MAX_RECOMMEND_BUDGET_LENGTH = 50;

export interface RecommendParams {
  query: string;
  interests: string[];
  region: string;
  budget: string;
}

export interface RecommendVideo {
  id: string;
  title: string;
  youtubeLink: string;
  thumbnail: string;
}

// A destination the app itself has data for (home page destination + its videos)
export interface RecommendPlace {
  id: string;
  title: string;
  location: string;
  imageUrl: string;
  videos: RecommendVideo[];
}

export interface Recommendation {
  name: string;
  province: string;
  description: string;
  reason: string;
  // false: only the AI suggested it (not verified by the app), no place data
  inApp: boolean;
  place?: RecommendPlace;
}

export interface RecommendResult {
  recommendations: Recommendation[];
  // the saved copy in the history; null when the AI found nothing
  historyId: string | null;
  message: string;
}

// "draft": not used yet, "created": a plan was started from it
export type SearchStatus = 'draft' | 'created';

export interface SearchSummary {
  id: string;
  query: string;
  interests: string[];
  region: string;
  budget: string;
  count: number;
  names: string[];
  status: SearchStatus;
  tripId?: string;
  createdAt: string;
}

export interface SearchDetail extends SearchSummary {
  recommendations: Recommendation[];
}
