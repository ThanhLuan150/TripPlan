import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {tripsApi} from '@/features/trips/api/tripsApi';
import RouteOptimizePanel from '@/features/trips/components/RouteOptimizePanel';
import type {RouteProposal, TripDay} from '@/features/trips/types';
import {formatDuration} from '@/lib/location';
import {httpError, networkError, pending, renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

const place = (n: number, name: string) => ({_id: `c${n}`, challengeSummary: '', nameLocation: name, points: 10});
const days: TripDay[] = [
  {_id: 'd1', title: 'Ngày 1', date: '2026-03-01', challenges: [place(1, 'A'), place(2, 'B'), place(3, 'C')]},
  {_id: 'd2', title: 'Ngày 2', date: '2026-03-02', challenges: []},
];

const p = (id: string, name: string) => ({id, name, location: null});
const proposal: RouteProposal = {
  dayId: 'd1',
  source: 'road',
  missingCoordinates: [],
  current: {distance: 5000, duration: 3600},
  proposed: {distance: 3000, duration: 1800},
  currentOrder: [p('c1', 'A'), p('c2', 'B'), p('c3', 'C')],
  proposedOrder: [p('c1', 'A'), p('c3', 'C'), p('c2', 'B')],
  improved: true,
  proposalId: 'p1',
};

beforeEach(() => {
  vi.resetAllMocks();
});

const render = () => renderWithProviders(<RouteOptimizePanel tripId="t1" days={days} />);
const optimize = () => userEvent.click(screen.getByRole('button', {name: t('trips.route.optimize')}));

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(20)).toBe('1 min');
    expect(formatDuration(1800)).toBe('30 min');
    expect(formatDuration(3900)).toBe('1 h 05 min');
  });
});

describe('RouteOptimizePanel', () => {
  it('renders nothing when no day has a place', () => {
    renderWithProviders(<RouteOptimizePanel tripId="t1" days={[days[1]]} />);
    expect(screen.queryByText(t('trips.route.title'))).not.toBeInTheDocument();
  });

  it('only offers the days that have places, in the app dropdown (not a native select)', async () => {
    days.push({_id: 'd3', title: 'Ngày 3', date: '2026-03-03', challenges: [place(4, 'D')]});
    render();
    expect(document.querySelector('select')).toBeNull();

    await userEvent.click(screen.getByRole('button', {name: t('trips.route.day')}));
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.queryByRole('option', {name: 'Ngày 2'})).not.toBeInTheDocument();

    vi.mocked(tripsApi.proposeRoute).mockResolvedValue({...proposal, dayId: 'd3'});
    await userEvent.click(screen.getByRole('option', {name: 'Ngày 3'}).querySelector('button')!);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await optimize();
    expect(tripsApi.proposeRoute).toHaveBeenCalledWith('t1', 'd3');
    days.pop();
  });

  it('shows the current and the suggested order with distances, and saves nothing until Accept', async () => {
    vi.mocked(tripsApi.proposeRoute).mockResolvedValue(proposal);
    render();

    await optimize();

    expect(await screen.findByText(t('trips.route.previewTitle'))).toBeInTheDocument();
    expect(tripsApi.proposeRoute).toHaveBeenCalledWith('t1', 'd1');
    expect(screen.getByText(t('trips.route.current'))).toBeInTheDocument();
    expect(screen.getByText(t('trips.route.proposed'))).toBeInTheDocument();
    expect(screen.getByText(/5 km/)).toBeInTheDocument();
    expect(screen.getByText(/3 km/)).toBeInTheDocument();
    expect(screen.getByText(/30 min/)).toBeInTheDocument();
    expect(tripsApi.applyRoute).not.toHaveBeenCalled();
  });

  it('Accept sends only the proposal id, then refreshes the trip', async () => {
    vi.mocked(tripsApi.proposeRoute).mockResolvedValue(proposal);
    vi.mocked(tripsApi.applyRoute).mockResolvedValue({});
    render();
    await optimize();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.route.accept')}));

    expect(tripsApi.applyRoute).toHaveBeenCalledWith('t1', 'p1');
    expect(await screen.findByText(t('trips.route.applied'))).toBeInTheDocument();
    expect(screen.queryByText(t('trips.route.previewTitle'))).not.toBeInTheDocument();
  });

  it('Reject discards the proposal and never saves', async () => {
    vi.mocked(tripsApi.proposeRoute).mockResolvedValue(proposal);
    vi.mocked(tripsApi.rejectRoute).mockResolvedValue({});
    render();
    await optimize();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.route.reject')}));

    expect(tripsApi.rejectRoute).toHaveBeenCalledWith('t1', 'p1');
    expect(tripsApi.applyRoute).not.toHaveBeenCalled();
    expect(screen.queryByText(t('trips.route.previewTitle'))).not.toBeInTheDocument();
    expect(await screen.findByText(t('trips.route.rejected'))).toBeInTheDocument();
  });

  it('says so, with nothing to accept, when the current order is already the shortest', async () => {
    vi.mocked(tripsApi.proposeRoute).mockResolvedValue({...proposal, improved: false, proposalId: null});
    render();

    await optimize();

    expect(await screen.findByText(t('trips.route.alreadyBest'))).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: t('trips.route.accept')})).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: t('trips.route.close')}));
    expect(screen.queryByText(t('trips.route.alreadyBest'))).not.toBeInTheDocument();
  });

  it('warns about places without a position and about straight-line distances (no time shown)', async () => {
    vi.mocked(tripsApi.proposeRoute).mockResolvedValue({
      ...proposal,
      source: 'straight-line',
      current: {distance: 5000, duration: null},
      proposed: {distance: 3000, duration: null},
      missingCoordinates: [p('c9', 'Quán X')],
    });
    render();

    await optimize();

    expect(await screen.findByText(t('trips.route.straightLine'))).toBeInTheDocument();
    expect(screen.getByText(t('trips.route.missing', {places: 'Quán X'}))).toBeInTheDocument();
    expect(screen.queryByText(/min$/)).not.toBeInTheDocument();
  });

  it.each([
    ['not enough coordinates', httpError(400, {code: 'ROUTE_NOT_ENOUGH_COORDINATES'}), 'trips.route.notEnough'],
    ['too many places', httpError(400, {code: 'ROUTE_TOO_MANY_PLACES'}), 'trips.route.tooMany'],
    ['a network error', networkError(), 'common.networkError'],
    ['any other error', httpError(500), 'trips.route.failed'],
  ])('keeps the itinerary and explains: %s', async (_name, error, key) => {
    vi.mocked(tripsApi.proposeRoute).mockRejectedValue(error);
    render();

    await optimize();

    expect(await screen.findByText(t(key))).toBeInTheDocument();
    expect(tripsApi.applyRoute).not.toHaveBeenCalled();
  });

  it('explains a stale proposal (409) and a failed save', async () => {
    vi.mocked(tripsApi.proposeRoute).mockResolvedValue(proposal);
    vi.mocked(tripsApi.applyRoute).mockRejectedValueOnce(httpError(409)).mockRejectedValueOnce(httpError(500));
    render();
    await optimize();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.route.accept')}));
    expect(await screen.findByText(t('trips.route.applyInvalid'))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: t('trips.route.accept')}));
    expect(await screen.findByText(t('trips.route.applyFailed'))).toBeInTheDocument();
  });

  it('disables the buttons while asking or saving', async () => {
    vi.mocked(tripsApi.proposeRoute).mockReturnValue(pending());
    render();

    await optimize();

    expect(await screen.findByText(t('trips.route.loading'))).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t('trips.route.optimize')})).toBeDisabled();
  });
});
