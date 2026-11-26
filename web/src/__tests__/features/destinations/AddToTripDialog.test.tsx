import {screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import AddToTripDialog from '@/features/destinations/components/AddToTripDialog';
import type {Recommendation} from '@/features/destinations/types';
import {tripsApi} from '@/features/trips/api/tripsApi';
import type {Trip, TripDetail} from '@/features/trips/types';
import {currentPath, currentState, httpError, networkError, renderWithProviders, t} from '../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

const item: Recommendation = {
  name: 'Thác Datanla',
  province: 'Lâm Đồng',
  description: 'Thác nước',
  reason: 'Thiên nhiên',
  inApp: false,
};
const trips: Trip[] = [
  {_id: 't1', nameTrip: 'Huế 2 ngày', location: 'Thừa Thiên Huế', startDate: '2026-03-01', endDate: '2026-03-02', status: 'active'},
  {_id: 't2', nameTrip: 'Đà Lạt 3 ngày', location: 'Lâm Đồng', startDate: '2026-04-01', endDate: '2026-04-03', status: 'active'},
];
const challenge = (i: number) => ({_id: `c${i}`, challengeSummary: 's', nameLocation: `Nơi ${i}`, points: 10});
const detail = (fullDay1 = false): TripDetail =>
  ({
    nameTrip: 'Đà Lạt 3 ngày',
    location: 'Lâm Đồng',
    startDate: '2026-04-01',
    endDate: '2026-04-03',
    dataTripDays: [
      {_id: 'd1', title: 'Ngày đầu', date: '2026-04-01', challenges: fullDay1 ? Array.from({length: 10}, (_, i) => challenge(i)) : [challenge(1)]},
      {_id: 'd2', title: 'Ngày hai', date: '2026-04-02', challenges: []},
    ],
  }) as TripDetail;

const onClose = vi.fn();
const render = (recommendation = item) => renderWithProviders(<AddToTripDialog item={recommendation} onClose={onClose} />, {route: '/assistant/recommend'});
const confirm = () => screen.getByRole('button', {name: t('destinations.addConfirm')});
const pickTrip = async (name: string) => userEvent.click(await screen.findByRole('radio', {name: new RegExp(name)}));
const pickDay = async (name: string) => userEvent.click(await screen.findByRole('radio', {name: new RegExp(name)}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(tripsApi.list).mockResolvedValue(trips);
  vi.mocked(tripsApi.get).mockResolvedValue(detail());
});

describe('AddToTripDialog', () => {
  it('lists the trips of the same province first, and asks for the day only after a trip is chosen', async () => {
    render();

    const radios = await screen.findAllByRole('radio');
    expect(radios[0]).toHaveTextContent('Đà Lạt 3 ngày');
    expect(within(radios[0]).getByText(t('destinations.addSameProvince'))).toBeInTheDocument();
    expect(screen.getByText(t('destinations.addPickTripFirst'))).toBeInTheDocument();
    expect(confirm()).toBeDisabled();
    expect(tripsApi.get).not.toHaveBeenCalled();
  });

  it('adds the place to the chosen day after reading what will happen, then offers to open the trip', async () => {
    vi.mocked(tripsApi.addPlace).mockResolvedValue({challengeId: 'c9', day: {id: 'd2', title: 'Ngày hai'}, located: true});
    render();

    await pickTrip('Đà Lạt 3 ngày');
    await pickDay('Ngày hai');
    // the summary says exactly what will be added, where, and that the AI place is unverified
    expect(screen.getByText(t('destinations.addSummary', {name: 'Thác Datanla', day: t('trips.aiEdit.day', {n: 2}), trip: 'Đà Lạt 3 ngày'}))).toBeInTheDocument();
    expect(screen.getByText(t('destinations.addUnverified'))).toBeInTheDocument();
    expect(tripsApi.addPlace).not.toHaveBeenCalled();

    await userEvent.click(confirm());

    expect(tripsApi.addPlace).toHaveBeenCalledWith('t2', {name: 'Thác Datanla', dayId: 'd2', province: 'Lâm Đồng', summary: 'Thác nước'});
    expect(await screen.findByText(t('destinations.addDone', {name: 'Thác Datanla', day: t('trips.aiEdit.day', {n: 2})}))).toBeInTheDocument();
    expect(screen.queryByText(t('destinations.addNotLocated'))).toBeNull();

    await userEvent.click(screen.getByRole('button', {name: t('destinations.addViewTrip')}));
    expect(await currentPath()).toBe('/assistant/trips/t2');
  });

  it('does not call the unverified warning for a place the app knows', async () => {
    render({...item, inApp: true});
    await pickTrip('Đà Lạt 3 ngày');
    await pickDay('Ngày hai');
    expect(screen.queryByText(t('destinations.addUnverified'))).toBeNull();
  });

  it('tells the user when the place has no position on the map yet', async () => {
    vi.mocked(tripsApi.addPlace).mockResolvedValue({challengeId: 'c9', day: {id: 'd1', title: 'Ngày đầu'}, located: false});
    render();
    await pickTrip('Đà Lạt 3 ngày');
    await pickDay('Ngày đầu');
    await userEvent.click(confirm());
    expect(await screen.findByText(t('destinations.addNotLocated'))).toBeInTheDocument();
  });

  it('does not let the user choose a day that is full', async () => {
    vi.mocked(tripsApi.get).mockResolvedValue(detail(true));
    render();
    await pickTrip('Đà Lạt 3 ngày');

    expect(await screen.findByRole('radio', {name: new RegExp('Ngày đầu')})).toBeDisabled();
    expect(screen.getByText(t('destinations.addDayFull', {max: 10}))).toBeInTheDocument();
    expect(confirm()).toBeDisabled();
  });

  it('changing the trip clears the chosen day', async () => {
    render();
    await pickTrip('Đà Lạt 3 ngày');
    await pickDay('Ngày hai');
    expect(confirm()).toBeEnabled();

    await pickTrip('Huế 2 ngày');
    expect(confirm()).toBeDisabled();
  });

  it.each([
    ['the trip already has the place', httpError(409, {code: 'PLACE_ALREADY_IN_TRIP'}), 'destinations.addDuplicate'],
    ['the day is full', httpError(409, {code: 'DAY_FULL'}), 'destinations.addDayFullError'],
    ['no connection', networkError(), 'common.networkError'],
    ['another error', httpError(500), 'destinations.addFailed'],
  ])('shows why nothing was added when %s', async (_name, error, key) => {
    vi.mocked(tripsApi.addPlace).mockRejectedValue(error);
    render();
    await pickTrip('Đà Lạt 3 ngày');
    await pickDay('Ngày hai');
    await userEvent.click(confirm());

    expect(await screen.findByRole('alert')).toHaveTextContent(t(key));
    // the dialog stays open so the user can pick another day
    expect(confirm()).toBeEnabled();
  });

  it('offers to create a trip when the user has none', async () => {
    vi.mocked(tripsApi.list).mockResolvedValue([]);
    render();

    expect(await screen.findByText(t('destinations.addNoTrips'))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: t('destinations.addCreate')}));
    expect(await currentPath()).toBe('/assistant/trips/new');
    expect(await currentState()).toEqual({location: 'Lâm Đồng', fromSuggestion: true, note: 'Thác Datanla (Lâm Đồng): Thác nước'});
  });

  it('can retry when the trips or the days do not load', async () => {
    vi.mocked(tripsApi.list).mockRejectedValueOnce(httpError(500)).mockResolvedValueOnce(trips);
    vi.mocked(tripsApi.get).mockRejectedValueOnce(httpError(500)).mockResolvedValueOnce(detail());
    render();

    expect(await screen.findByText(t('destinations.addLoadTripsFailed'))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: t('common.retry')}));
    await pickTrip('Đà Lạt 3 ngày');
    expect(await screen.findByText(t('destinations.addLoadDaysFailed'))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: t('common.retry')}));
    expect(await screen.findByRole('radio', {name: new RegExp('Ngày hai')})).toBeInTheDocument();
  });

  it('closes with Cancel, the close button and Escape', async () => {
    render();
    await userEvent.click(screen.getByRole('button', {name: t('destinations.addCancel')}));
    await userEvent.click(screen.getByRole('button', {name: t('common.close')}));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(3);
  });
});
