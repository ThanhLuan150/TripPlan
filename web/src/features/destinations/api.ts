import {api} from '@/lib/apiClient';
import type {RecommendParams, RecommendResult, SearchDetail, SearchStatus, SearchSummary} from './types';

export const destinationsApi = {
  // AI suggestions: the answer is kept in the history, no trip is touched
  recommend: async (params: RecommendParams) => {
    const body = {
      query: params.query.trim(),
      interests: params.interests,
      region: params.region,
      budget: params.budget.trim(),
    };
    return (await api.post<RecommendResult>('/destinations/recommend', body)).data;
  },

  // the user's earlier suggestions (newest first)
  history: async () => (await api.get<{items: SearchSummary[]}>('/destinations/history')).data.items,

  open: async (id: string) => (await api.get<{search: SearchDetail}>(`/destinations/history/${id}`)).data.search,

  // "created": the user started a plan from it
  setStatus: async (id: string, status: SearchStatus, tripId?: string) =>
    (await api.patch(`/destinations/history/${id}`, {status, ...(tripId && {tripId})})).data,

  remove: async (id: string) => (await api.delete(`/destinations/history/${id}`)).data,
};
