import {api} from '@/lib/apiClient';

// Reviews of a destination (a province): 1-5 stars and a comment, one review per user per destination.
export const MAX_REVIEW_LENGTH = 1000;
export const MAX_STARS = 5;

export interface ReviewSummary {
  // average of all the ratings (one decimal), null while there is no review
  average: number | null;
  count: number;
}

export interface Review {
  _id: string;
  destination: string;
  rating: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {_id: string; username: string; image: string | null};
  // written by the signed-in viewer (the only one who may edit or delete it)
  mine: boolean;
}

export interface ReviewsPage {
  destination: string;
  summary: ReviewSummary;
  page: number;
  limit: number;
  total: number;
  items: Review[];
  // the signed-in viewer's own review of this destination, wherever it is in the list
  myReview: Review | null;
}

export interface ReviewResult {
  review: Review;
  summary: ReviewSummary;
}

export const reviewsApi = {
  // public (sign-in only adds myReview); 404 for a destination that does not exist
  list: async (destination: string, page: number) =>
    (await api.get<ReviewsPage>('/destination-reviews', {params: {destination, page}})).data,

  create: async (destination: string, rating: number, content: string) =>
    (await api.post<ReviewResult>('/destination-reviews', {destination, rating, content})).data,

  // only the author (403 for anybody else)
  update: async (id: string, rating: number, content: string) =>
    (await api.put<ReviewResult>(`/destination-reviews/${id}`, {rating, content})).data,

  remove: async (id: string) => (await api.delete<{summary: ReviewSummary}>(`/destination-reviews/${id}`)).data,
};
