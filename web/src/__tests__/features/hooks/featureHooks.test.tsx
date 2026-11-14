import {QueryClientProvider} from '@tanstack/react-query';
import {act, renderHook, waitFor} from '@testing-library/react';
import type {ReactNode} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {rankingApi} from '@/features/ranking/api/rankingApi';
import {rankTitleKey, useRanking} from '@/features/ranking/hooks/useRanking';
import {tripsApi} from '@/features/trips/api/tripsApi';
import {useDeleteTrip, useGeneratedPlans, useTripDetail, useTrips} from '@/features/trips/hooks/useTrips';
import type {GenerateTripParams} from '@/features/trips/types';
import {createTestQueryClient} from '../../utils/render';

vi.mock('@/features/ranking/api/rankingApi');
vi.mock('@/features/trips/api/tripsApi');

const setup = () => {
  const client = createTestQueryClient();
  const wrapper = ({children}: {children: ReactNode}) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {client, wrapper};
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useRanking', () => {
  it('loads the ranking of the period', async () => {
    vi.mocked(rankingApi.get).mockResolvedValue([{experience: 10}]);
    const {wrapper} = setup();

    const {result} = renderHook(() => useRanking('monthly'), {wrapper});

    await waitFor(() => expect(result.current.data).toEqual([{experience: 10}]));
    expect(rankingApi.get).toHaveBeenCalledWith('monthly');
  });
});

describe('rankTitleKey', () => {
  it.each([
    [0, 'ranking.titleRookie'],
    [199, 'ranking.titleRookie'],
    [200, 'ranking.titleAdventurer'],
    [499, 'ranking.titleAdventurer'],
    [500, 'ranking.titleKnight'],
    [999, 'ranking.titleKnight'],
    [1000, 'ranking.titleLegend'],
    [1999, 'ranking.titleLegend'],
    [2000, null],
    [-5, null],
  ])('%i points -> %s', (points, key) => {
    expect(rankTitleKey(points)).toBe(key);
  });
});

describe('trip hooks', () => {
  it('useTrips lists the trips', async () => {
    vi.mocked(tripsApi.list).mockResolvedValue([{_id: 't1'}] as never);
    const {wrapper} = setup();

    const {result} = renderHook(() => useTrips(), {wrapper});

    await waitFor(() => expect(result.current.data).toEqual([{_id: 't1'}]));
  });

  it('useTripDetail waits for an id', async () => {
    vi.mocked(tripsApi.get).mockResolvedValue({location: 'Huế'} as never);
    const {wrapper} = setup();

    const idle = renderHook(() => useTripDetail(undefined), {wrapper});
    expect(idle.result.current.fetchStatus).toBe('idle');
    expect(tripsApi.get).not.toHaveBeenCalled();

    const {result} = renderHook(() => useTripDetail('t1'), {wrapper});
    await waitFor(() => expect(result.current.data).toEqual({location: 'Huế'}));
    expect(tripsApi.get).toHaveBeenCalledWith('t1');
  });

  it('useDeleteTrip removes the trip and refreshes the list', async () => {
    vi.mocked(tripsApi.remove).mockResolvedValue({});
    const {client, wrapper} = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const {result} = renderHook(() => useDeleteTrip(), {wrapper});
    await act(() => result.current.mutateAsync('t1'));

    expect(vi.mocked(tripsApi.remove).mock.calls[0][0]).toBe('t1');
    expect(invalidate).toHaveBeenCalledWith({queryKey: ['trips']});
  });

  it('useGeneratedPlans only runs with form values, once (no retry)', async () => {
    const params = {location: 'Huế', days: 2} as GenerateTripParams;
    vi.mocked(tripsApi.generate).mockRejectedValue(new Error('AI busy'));
    const {wrapper} = setup();

    const idle = renderHook(() => useGeneratedPlans(null), {wrapper});
    expect(idle.result.current.fetchStatus).toBe('idle');

    const {result} = renderHook(() => useGeneratedPlans(params), {wrapper});
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(tripsApi.generate).toHaveBeenCalledOnce();
    expect(tripsApi.generate).toHaveBeenCalledWith(params);
  });
});
