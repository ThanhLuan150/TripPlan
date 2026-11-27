import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {tripsApi} from '@/features/trips/api/tripsApi';
import DayRegeneratePanel from '@/features/trips/components/DayRegeneratePanel';
import {MAX_AI_EDIT_LENGTH, type DayRegeneration, type TripDay} from '@/features/trips/types';
import {httpError, networkError, pending, renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

const place = (n: number, name: string) => ({_id: `c${n}`, challengeSummary: '', nameLocation: name, points: 10});
const days: TripDay[] = [
  {_id: 'd1', title: 'Ngày 1', date: '2026-03-01', challenges: [place(1, 'Hồ Xuân Hương')]},
  {_id: 'd2', title: 'Ngày 2', date: '2026-03-02', challenges: [place(2, 'Thung lũng')]},
];

const activity = (name: string, extra = {}) => ({name_location: name, challenge_summary: 'Mô tả', level_of_difficult: 20, ...extra});
const result: DayRegeneration = {
  proposal: {
    id: 'p1',
    dayId: 'd1',
    day: {title: 'Ngày mới', activities: [activity('Hồ Xuân Hương'), activity('Chợ Đà Lạt'), activity('Núi Langbiang', {kept: true})], transportCost: 1000, foodCost: 2000, otherCost: 0},
  },
  current: {id: 'd1', day: 1, title: 'Ngày cũ', activities: [activity('Hồ Xuân Hương')], transportCost: 10, foodCost: 20, otherCost: 0},
};

beforeEach(() => {
  vi.resetAllMocks();
});

const render = () => renderWithProviders(<DayRegeneratePanel tripId="t1" days={days} />);
const regenerate = () => userEvent.click(screen.getByRole('button', {name: t('trips.dayRegen.regenerate')}));

describe('DayRegeneratePanel', () => {
  it('renders nothing when the trip has no day', () => {
    renderWithProviders(<DayRegeneratePanel tripId="t1" days={[]} />);
    expect(screen.queryByText(t('trips.dayRegen.title'))).not.toBeInTheDocument();
  });

  it('offers every day in the app dropdown (not a native select) and asks for the chosen day only', async () => {
    vi.mocked(tripsApi.proposeDayRegeneration).mockResolvedValue({...result, proposal: {...result.proposal, dayId: 'd2'}});
    render();
    expect(document.querySelector('select')).toBeNull();

    await userEvent.click(screen.getByRole('button', {name: t('trips.dayRegen.day')}));
    expect(screen.getAllByRole('option')).toHaveLength(2);
    await userEvent.click(screen.getByRole('option', {name: 'Ngày 2'}).querySelector('button')!);
    await regenerate();

    expect(tripsApi.proposeDayRegeneration).toHaveBeenCalledWith('t1', 'd2', undefined);
  });

  it('sends the trimmed request, and shows the current and proposed day, saving nothing until Accept', async () => {
    vi.mocked(tripsApi.proposeDayRegeneration).mockResolvedValue(result);
    render();

    await userEvent.type(screen.getByLabelText(t('trips.dayRegen.placeholder')), '  more food  ');
    await regenerate();

    expect(await screen.findByText(t('trips.dayRegen.previewTitle'))).toBeInTheDocument();
    expect(tripsApi.proposeDayRegeneration).toHaveBeenCalledWith('t1', 'd1', 'more food');
    expect(screen.getByText(t('trips.dayRegen.current'))).toBeInTheDocument();
    expect(screen.getByText(t('trips.dayRegen.proposed'))).toBeInTheDocument();
    expect(screen.getByText('Ngày cũ')).toBeInTheDocument();
    expect(screen.getByText('Ngày mới')).toBeInTheDocument();
    expect(screen.getByText('Chợ Đà Lạt')).toBeInTheDocument();
    // a new place is marked, a completed one is marked kept, a place that already exists is not marked
    expect(screen.getAllByText(t('trips.dayRegen.newPlace'))).toHaveLength(1);
    expect(screen.getAllByText(t('trips.dayRegen.kept'))).toHaveLength(1);
    expect(tripsApi.applyDayRegeneration).not.toHaveBeenCalled();
  });

  it('Accept sends only the proposal id, then refreshes the trip', async () => {
    vi.mocked(tripsApi.proposeDayRegeneration).mockResolvedValue(result);
    vi.mocked(tripsApi.applyDayRegeneration).mockResolvedValue({});
    render();
    await regenerate();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.dayRegen.accept')}));

    expect(tripsApi.applyDayRegeneration).toHaveBeenCalledWith('t1', 'p1');
    expect(await screen.findByText(t('trips.dayRegen.applied'))).toBeInTheDocument();
    expect(screen.queryByText(t('trips.dayRegen.previewTitle'))).not.toBeInTheDocument();
  });

  it('Reject discards the proposal and never saves', async () => {
    vi.mocked(tripsApi.proposeDayRegeneration).mockResolvedValue(result);
    vi.mocked(tripsApi.rejectDayRegeneration).mockResolvedValue({});
    render();
    await regenerate();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.dayRegen.reject')}));

    expect(tripsApi.rejectDayRegeneration).toHaveBeenCalledWith('t1', 'p1');
    expect(tripsApi.applyDayRegeneration).not.toHaveBeenCalled();
    expect(screen.queryByText(t('trips.dayRegen.previewTitle'))).not.toBeInTheDocument();
    expect(await screen.findByText(t('trips.dayRegen.rejected'))).toBeInTheDocument();
  });

  it('drops the preview when another day is chosen', async () => {
    vi.mocked(tripsApi.proposeDayRegeneration).mockResolvedValue(result);
    render();
    await regenerate();
    expect(await screen.findByText(t('trips.dayRegen.previewTitle'))).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: t('trips.dayRegen.day')}));
    await userEvent.click(screen.getByRole('option', {name: 'Ngày 2'}).querySelector('button')!);

    expect(screen.queryByText(t('trips.dayRegen.previewTitle'))).not.toBeInTheDocument();
  });

  it('refuses a request that is too long, without calling the server', async () => {
    render();
    // paste: typing 501 characters one by one is slow
    await userEvent.click(screen.getByLabelText(t('trips.dayRegen.placeholder')));
    await userEvent.paste('x'.repeat(MAX_AI_EDIT_LENGTH + 1));

    expect(screen.getByText(t('trips.dayRegen.tooLong', {max: MAX_AI_EDIT_LENGTH}))).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t('trips.dayRegen.regenerate')})).toBeDisabled();
    expect(tripsApi.proposeDayRegeneration).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty day', httpError(502, {code: 'AI_EMPTY_DAY'}), 'trips.dayRegen.empty'],
    ['an invalid answer', httpError(502, {code: 'AI_INVALID_RESPONSE'}), 'trips.dayRegen.invalid'],
    ['an AI outage', httpError(503, {code: 'AI_BUSY'}), 'trips.dayRegen.unavailable'],
    ['a network error', networkError(), 'common.networkError'],
    ['any other error', httpError(500), 'trips.dayRegen.failed'],
  ])('keeps the itinerary and explains: %s', async (_name, error, key) => {
    vi.mocked(tripsApi.proposeDayRegeneration).mockRejectedValue(error);
    render();

    await regenerate();

    expect(await screen.findByText(t(key))).toBeInTheDocument();
    expect(screen.queryByText(t('trips.dayRegen.previewTitle'))).not.toBeInTheDocument();
    expect(tripsApi.applyDayRegeneration).not.toHaveBeenCalled();
  });

  it('explains a stale proposal (409) and a failed save', async () => {
    vi.mocked(tripsApi.proposeDayRegeneration).mockResolvedValue(result);
    vi.mocked(tripsApi.applyDayRegeneration).mockRejectedValueOnce(httpError(409)).mockRejectedValueOnce(httpError(500));
    render();
    await regenerate();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.dayRegen.accept')}));
    expect(await screen.findByText(t('trips.dayRegen.applyInvalid'))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: t('trips.dayRegen.accept')}));
    expect(await screen.findByText(t('trips.dayRegen.applyFailed'))).toBeInTheDocument();
  });

  it('disables the button while asking', async () => {
    vi.mocked(tripsApi.proposeDayRegeneration).mockReturnValue(pending());
    render();

    await regenerate();

    expect(await screen.findByText(t('trips.dayRegen.loading'))).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t('trips.dayRegen.regenerate')})).toBeDisabled();
  });
});
