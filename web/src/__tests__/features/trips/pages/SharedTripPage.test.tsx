import {screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {tripsApi} from '@/features/trips/api/tripsApi';
import SharedTripPage from '@/features/trips/pages/SharedTripPage';
import {httpError, networkError, renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

const trip = {
  nameTrip: 'Đà Lạt 3 ngày',
  location: 'Lâm Đồng',
  startDate: '2026-03-02T09:00:00',
  endDate: '2026-03-04T09:00:00',
  dataTripDays: [
    {
      title: 'Trung tâm Đà Lạt',
      date: '2026-03-02T09:00:00',
      transportCost: 100000,
      foodCost: 200000,
      challenges: [{_id: 'c1', challengeSummary: 'Chụp ảnh Hồ Xuân Hương', location: 'Hồ Xuân Hương', points: 20}],
    },
  ],
};

const renderPage = () =>
  renderWithProviders(<SharedTripPage />, {route: '/shared/abc', path: '/shared/:token'});

beforeEach(() => vi.resetAllMocks());

describe('SharedTripPage', () => {
  it('shows the shared plan read only, with no way to change it', async () => {
    vi.mocked(tripsApi.getShared).mockResolvedValue(trip);
    renderPage();

    expect(await screen.findByRole('heading', {name: 'Đà Lạt 3 ngày'})).toBeInTheDocument();
    expect(tripsApi.getShared).toHaveBeenCalledWith('abc');
    expect(screen.getByText(t('trips.shared.readOnly'))).toBeInTheDocument();
    expect(screen.getByText('Chụp ảnh Hồ Xuân Hương')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows "link does not work" for an invalid or revoked link (404)', async () => {
    vi.mocked(tripsApi.getShared).mockRejectedValue(httpError(404, {message: 'x'}));
    renderPage();

    expect(await screen.findByText(t('trips.shared.invalidTitle'))).toBeInTheDocument();
    expect(screen.getByRole('link', {name: t('trips.shared.goHome')})).toBeInTheDocument();
  });

  it('other errors can be retried', async () => {
    vi.mocked(tripsApi.getShared).mockRejectedValueOnce(networkError()).mockResolvedValue(trip);
    renderPage();

    expect(await screen.findByText(t('trips.shared.errorTitle'))).toBeInTheDocument();
    screen.getByRole('button', {name: t('common.retry')}).click();

    expect(await screen.findByRole('heading', {name: 'Đà Lạt 3 ngày'})).toBeInTheDocument();
  });
});
