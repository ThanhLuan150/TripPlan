import {useInfiniteQuery, useQuery} from '@tanstack/react-query';
import {
  GenerateParams,
  chatApi,
  contentApi,
  profileApi,
  rankingApi,
  tripsApi,
} from '../api';

export type RankingPeriod = 'weekly' | 'monthly' | 'highest';

// Every server read of the app goes through React Query; keys are defined here.
export const queryKeys = {
  home: ['home'] as const,
  videos: ['videos'] as const,
  ranking: (period: RankingPeriod) => ['ranking', period] as const,
  trips: ['trips'] as const,
  favoriteTrips: ['favoriteTrips'] as const,
  trip: (id: string) => ['trip', id] as const,
  tripShare: (id: string) => ['tripShare', id] as const,
  tripVisibility: (id: string) => ['tripVisibility', id] as const,
  tripNotes: (id: string) => ['tripNotes', id] as const,
  publicTrips: ['publicTrips'] as const,
  destinationHistory: ['destinationHistory'] as const,
  publicTrip: (id: string) => ['publicTrip', id] as const,
  notifications: ['notifications'] as const,
  chats: ['chats'] as const,
  generate: (params: GenerateParams) => ['generate', params] as const,
};

export const useHome = () =>
  useQuery({queryKey: queryKeys.home, queryFn: contentApi.home});

export const useVideos = () =>
  useQuery({queryKey: queryKeys.videos, queryFn: contentApi.videos});

export const useRanking = (period: RankingPeriod) =>
  useQuery({
    queryKey: queryKeys.ranking(period),
    queryFn: () => rankingApi.get(period),
  });

export const useTrips = () =>
  useQuery({queryKey: queryKeys.trips, queryFn: tripsApi.list});

export const useFavoriteTrips = () =>
  useQuery({queryKey: queryKeys.favoriteTrips, queryFn: tripsApi.favorites});

export const useShareStatus = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.tripShare(id),
    queryFn: () => tripsApi.shareStatus(id),
    enabled,
  });

export const useTripVisibility = (id: string) =>
  useQuery({
    queryKey: queryKeys.tripVisibility(id),
    queryFn: () => tripsApi.visibility(id),
  });

export const useTripNotes = (id: string) =>
  useQuery({
    queryKey: queryKeys.tripNotes(id),
    queryFn: () => tripsApi.notes(id),
  });

export const usePublicTrips = () =>
  useInfiniteQuery({
    queryKey: queryKeys.publicTrips,
    queryFn: ({pageParam}) => tripsApi.listPublic(pageParam),
    initialPageParam: 1,
    getNextPageParam: last =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
  });

export const usePublicTrip = (id: string) =>
  useQuery({
    queryKey: queryKeys.publicTrip(id),
    queryFn: () => tripsApi.getPublic(id),
    retry: false,
  });

export const useTrip = (id: string) =>
  useQuery({queryKey: queryKeys.trip(id), queryFn: () => tripsApi.get(id)});

export const useNotifications = () =>
  useQuery({
    queryKey: queryKeys.notifications,
    queryFn: profileApi.notifications,
  });

// AI suggestions: asked once per set of answers, never refetched by itself.
export const useGeneratedPlans = (params: GenerateParams) =>
  useQuery({
    queryKey: queryKeys.generate(params),
    queryFn: () => tripsApi.generate(params),
    staleTime: Infinity,
    retry: false,
  });

// Saved conversations (loaded when the history drawer opens).
export const useChats = (enabled: boolean) =>
  useQuery({queryKey: queryKeys.chats, queryFn: chatApi.list, enabled});
