import {screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {tripsApi} from '@/features/trips/api/tripsApi';
import GenerateTripsPage from '@/features/trips/pages/GenerateTripsPage';
import type {GenerateTripParams} from '@/features/trips/types';
import {currentPath, httpError, networkError, pending, renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

const params: GenerateTripParams = {
  location: 'Lâm Đồng',
  quantity: 2,
  budget: '2.000.000 VND - 10.000.000 VND',
  budgetTier: 'mid',
  areaTypes: [],
  userLocation: null,
  days: 2,
  startDate: '2026-03-02T02:00:00.000Z',
  endDate: '2026-03-03T02:00:00.000Z',
};

const plans = {
  plan1: {
    day1: {title: 'Trung tâm Đà Lạt', activities: [{challenge_summary: 'Chụp ảnh Hồ Xuân Hương'}]},
    day2: {title: 'Langbiang', activities: [{challenge_summary: 'Leo núi Langbiang'}]},
  },
  plan2: {
    day1: {title: 'Thác Datanla', activities: [{challenge_summary: 'Máng trượt Datanla'}]},
    day2: {title: 'Cầu Đất'},
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(tripsApi.generate).mockResolvedValue(plans);
});

const render = (state: unknown = params) =>
  renderWithProviders(<GenerateTripsPage />, {
    route: '/assistant/trips/generate',
    state,
    history: ['/assistant/trips/new'],
  });

const choosePlan = async (index: number) => {
  const user = userEvent.setup();
  const buttons = await screen.findAllByRole('button', {name: t('trips.generate.choose')});
  await user.click(buttons[index]);
  return user;
};

describe('GenerateTripsPage', () => {
  it('goes back to the form when opened without form values', async () => {
    render(null);
    expect(await currentPath()).toBe('/assistant/trips/new');
  });

  it('shows a waiting screen while the AI works', () => {
    vi.mocked(tripsApi.generate).mockReturnValue(pending());
    render();

    expect(screen.getByText(t('trips.generate.loading', {location: 'Lâm Đồng'}))).toBeInTheDocument();
    expect(tripsApi.generate).toHaveBeenCalledWith(params);
  });

  it('shows every plan with its days and activities', async () => {
    render();

    expect(await screen.findByText(t('trips.generate.plan', {n: 1}))).toBeInTheDocument();
    expect(screen.getByText(t('trips.generate.plan', {n: 2}))).toBeInTheDocument();
    expect(screen.getByText('Leo núi Langbiang')).toBeInTheDocument();
    expect(screen.getByText(/Cầu Đất/)).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: t('trips.generate.title', {location: 'Lâm Đồng'})})).toBeInTheDocument();
    expect(
      screen.getByText(t('trips.generate.summary', {days: 2, people: 2, budget: t('trips.create.budgetMid')})),
    ).toBeInTheDocument();
  });

  it('saves the chosen plan under a name and opens it', async () => {
    vi.mocked(tripsApi.save).mockResolvedValue({tripId: 't9'});
    render();

    const user = await choosePlan(1);
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByRole('textbox', {name: t('trips.generate.nameLabel')}), '  Đà Lạt 2N  {Enter}');

    expect(await currentPath()).toBe('/assistant/trips/t9');
    expect(tripsApi.save).toHaveBeenCalledWith(params, 'Đà Lạt 2N', Object.values(plans.plan2));
  });

  it('can confirm with the button too', async () => {
    vi.mocked(tripsApi.save).mockResolvedValue({tripId: 't1'});
    render();

    const user = await choosePlan(0);
    await user.type(screen.getByRole('textbox', {name: t('trips.generate.nameLabel')}), 'Kế hoạch A');
    await user.click(screen.getByRole('button', {name: t('common.confirm')}));

    expect(await currentPath()).toBe('/assistant/trips/t1');
  });

  it('needs a name', async () => {
    render();

    const user = await choosePlan(0);
    await user.click(screen.getByRole('button', {name: t('common.confirm')}));

    expect(await screen.findByText(t('trips.generate.nameRequired'))).toBeInTheDocument();
    expect(tripsApi.save).not.toHaveBeenCalled();
  });

  it('cancel closes the name dialog', async () => {
    render();

    const user = await choosePlan(0);
    await user.type(screen.getByRole('textbox', {name: t('trips.generate.nameLabel')}), 'abc');
    await user.click(screen.getByRole('button', {name: t('common.cancel')}));

    expect(screen.queryByRole('dialog')).toBeNull();
    await choosePlan(0);
    expect(screen.getByRole('textbox', {name: t('trips.generate.nameLabel')})).toHaveValue('');
  });

  it('shows a waiting screen while saving', async () => {
    vi.mocked(tripsApi.save).mockReturnValue(pending());
    render();

    const user = await choosePlan(0);
    await user.type(screen.getByRole('textbox', {name: t('trips.generate.nameLabel')}), 'A{Enter}');

    expect(await screen.findByText(t('trips.generate.saving'))).toBeInTheDocument();
  });

  it.each([
    [httpError(400, {message: 'A trip with the same name already exists'}), 'trips.generate.duplicateName'],
    [httpError(500), 'trips.generate.saveFailed'],
  ])('explains a failed save', async (error, key) => {
    vi.mocked(tripsApi.save).mockRejectedValue(error);
    render();

    const user = await choosePlan(0);
    await user.type(screen.getByRole('textbox', {name: t('trips.generate.nameLabel')}), 'A{Enter}');

    expect(await screen.findByText(t(key))).toBeInTheDocument();
  });

  it.each([
    ['AI unavailable', httpError(503, {code: 'AI_BUSY'}), 'trips.generate.aiUnavailable'],
    ['network', networkError(), 'common.networkError'],
    ['other', httpError(502), 'trips.generate.errorText'],
  ])('error screen (%s) with retry', async (_label, error, key) => {
    vi.mocked(tripsApi.generate).mockRejectedValueOnce(error);
    render();

    expect(await screen.findByText(t(key))).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', {name: t('common.retry')}));

    expect(await screen.findByText(t('trips.generate.plan', {n: 1}))).toBeInTheDocument();
    expect(tripsApi.generate).toHaveBeenCalledTimes(2);
  });

  it('no retry when the dates overlap another trip', async () => {
    vi.mocked(tripsApi.generate).mockRejectedValue(
      httpError(400, {message: 'Please choose another day. Your selected dates overlap with existing trip plans.'}),
    );
    render();

    expect(await screen.findByText(t('trips.generate.overlap'))).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: t('common.retry')})).toBeNull();

    await userEvent.setup().click(screen.getByRole('button', {name: t('common.back')}));
    expect(await currentPath()).toBe('/assistant/trips/new');
  });

  it('treats an empty answer as an error', async () => {
    vi.mocked(tripsApi.generate).mockResolvedValue(null);
    render();

    expect(await screen.findByText(t('trips.generate.errorTitle'))).toBeInTheDocument();
  });

  it('the back arrow returns to the form', async () => {
    render();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', {name: t('common.back')}));

    expect(await currentPath()).toBe('/assistant/trips/new');
  });
});
