import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {tripsApi} from '../api/tripsApi';
import type {GenerateTripParams} from '../types';

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
