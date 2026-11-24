import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {tripsApi} from '../api/tripsApi';
import type {GenerateTripParams, Trip} from '../types';

export const useTrips = () =>
  useQuery({
    queryKey: ['trips'],
    queryFn: tripsApi.list,
    refetchOnMount: 'always',
  });

export const useTripDetail = (id: string | undefined) =>
  useQuery({
    queryKey: ['trip', id],
    enabled: !!id,
    queryFn: () => tripsApi.get(id!),
  });

export const useDeleteTrip = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tripsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({queryKey: ['trips']}),
  });
};

export const useDuplicateTrip = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tripsApi.duplicate,
    onSuccess: () => queryClient.invalidateQueries({queryKey: ['trips']}),
  });
};

export const FAVORITES_KEY = ['favoriteTrips'];

export const useFavoriteTrips = () =>
  useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: tripsApi.favorites,
    refetchOnMount: 'always',
  });

// Favorite / unfavorite. The heart changes at once (optimistic) and goes back
// if the server refuses; the list is reloaded afterwards either way.
export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({trip, favorite}: {trip: Trip; favorite: boolean}) =>
      favorite ? tripsApi.addFavorite(trip._id) : tripsApi.removeFavorite(trip._id),
    onMutate: async ({trip, favorite}) => {
      await queryClient.cancelQueries({queryKey: FAVORITES_KEY});
      const previous = queryClient.getQueryData<Trip[]>(FAVORITES_KEY);
      if (previous) {
        const others = previous.filter(item => item._id !== trip._id);
        queryClient.setQueryData<Trip[]>(FAVORITES_KEY, favorite ? [trip, ...others] : others);
      }
      return {previous};
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FAVORITES_KEY, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({queryKey: FAVORITES_KEY}),
  });
};

// Generating plans is slow (AI), so the result is cached per form input and
// not refetched automatically; call refetch() to try again.
export const useGeneratedPlans = (params: GenerateTripParams | null) =>
  useQuery({
    queryKey: ['generateTrip', params],
    enabled: params !== null,
    queryFn: () => tripsApi.generate(params!),
    retry: false,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
