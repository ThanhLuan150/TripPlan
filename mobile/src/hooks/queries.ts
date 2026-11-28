import {useInfiniteQuery, useQuery} from '@tanstack/react-query';
import {
  GenerateParams,
  chatApi,
  communityApi,
  contentApi,
  profileApi,
  rankingApi,
  reviewsApi,
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
  tripBudget: (id: string) => ['tripBudget', id] as const,
  publicTrips: ['publicTrips'] as const,
  tripPost: (id: string) => ['tripPost', id] as const,
  destinationReviews: (destination: string) =>
    ['destinationReviews', destination] as const,
  savedPosts: ['savedPosts'] as const,
  destinationHistory: ['destinationHistory'] as const,
  publicTrip: (id: string) => ['publicTrip', id] as const,
  notifications: ['notifications'] as const,
  preferences: ['travelPreferences'] as const,
  communityUser: (id: string) => ['communityUser', id] as const,
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

export const useCommunityUser = (id: string) =>
  useQuery({
    queryKey: queryKeys.communityUser(id),
    queryFn: () => communityApi.profile(id),
    retry: false,
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

export const useTripBudget = (id: string) =>
  useQuery({
    queryKey: queryKeys.tripBudget(id),
    queryFn: () => tripsApi.budgetEstimate(id),
  });

// q: the keyword of the search (empty: every public plan); a new keyword starts again at page 1
export const usePublicTrips = (q = '') =>
  useInfiniteQuery({
    queryKey: [...queryKeys.publicTrips, q],
    queryFn: ({pageParam}) => tripsApi.listPublic(pageParam, q),
    initialPageParam: 1,
    getNextPageParam: last =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
  });

// The user's own saved posts (private list), newest save first
export const useSavedPosts = () =>
  useInfiniteQuery({
    queryKey: queryKeys.savedPosts,
    queryFn: ({pageParam}) => tripsApi.savedPosts(pageParam),
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

export const usePreferences = () =>
  useQuery({queryKey: queryKeys.preferences, queryFn: profileApi.preferences});

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

// Is the plan shared as a post (owner only), and its introduction
export const useTripPost = (id: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.tripPost(id),
    queryFn: () => tripsApi.postStatus(id),
    enabled,
  });

// Reviews of a destination, page by page (the average is over ALL the reviews)
export const useDestinationReviews = (destination: string) =>
  useInfiniteQuery({
    queryKey: queryKeys.destinationReviews(destination),
    queryFn: ({pageParam}) => reviewsApi.list(destination, pageParam),
    initialPageParam: 1,
    getNextPageParam: last =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    retry: false,
  });
