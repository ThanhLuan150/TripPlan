import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {saveSession} from '@/features/auth/store/session';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {tripsApi} from '@/features/trips/api/tripsApi';
import PublicTripPage from '@/features/trips/pages/PublicTripPage';
import {currentPath, httpError, renderWithProviders, t} from '../../../utils/render';

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

const renderPage = () => renderWithProviders(<PublicTripPage />, {route: '/trip/t1', path: '/trip/:id'});

beforeEach(() => vi.resetAllMocks());

describe('PublicTripPage', () => {
  it('shows a public plan read only, with no way to change it (signed out: only a sign-in link)', async () => {
    vi.mocked(tripsApi.getPublic).mockResolvedValue(trip);
    renderPage();

    expect(await screen.findByRole('heading', {name: 'Đà Lạt 3 ngày'})).toBeInTheDocument();
    expect(tripsApi.getPublic).toHaveBeenCalledWith('t1');
    expect(screen.getByText(t('trips.publicTrip.readOnly'))).toBeInTheDocument();
    expect(screen.getByText('Chụp ảnh Hồ Xuân Hương')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTestId('likes-count')).toHaveTextContent('0');
  });

  describe('liking the plan', () => {
    it('a signed-out visitor sees the total and a sign-in link', async () => {
      vi.mocked(tripsApi.getPublic).mockResolvedValue({...trip, likesCount: 9, liked: false});
      renderPage();

      expect(await screen.findByRole('link', {name: t('trips.like.signIn')})).toHaveAttribute('href', '/login');
      expect(screen.getByTestId('likes-count')).toHaveTextContent('9');
    });

    it('a signed-in user likes the plan and the total follows the server', async () => {
      saveSession({message: 'ok', accessToken: 'a.b.c', data: {username: 'reader', role: 'user'}} as never);
      vi.mocked(tripsApi.getPublic).mockResolvedValue({...trip, likesCount: 2, liked: false});
      vi.mocked(tripsApi.likePublic).mockResolvedValue({liked: true, likesCount: 3});
      renderPage();

      await userEvent.click(await screen.findByRole('button', {name: t('trips.like.like')}));

      expect(tripsApi.likePublic).toHaveBeenCalledWith('t1');
      expect(await screen.findByRole('button', {name: t('trips.like.unlike')})).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('likes-count')).toHaveTextContent('3');
    });
  });

  describe('keeping a copy', () => {
    const signIn = () =>
      saveSession({message: 'ok', accessToken: 'a.b.c', data: {username: 'reader', role: 'user'}} as never);

    it('a signed-out visitor is sent to sign in, there is no save button', async () => {
      vi.mocked(tripsApi.getPublic).mockResolvedValue(trip);
      renderPage();

      expect(await screen.findByRole('link', {name: t('trips.publicTrip.signInToSave')})).toHaveAttribute('href', '/login');
      expect(screen.queryByRole('button', {name: t('trips.publicTrip.saveCopy')})).not.toBeInTheDocument();
    });

    it('a signed-in user saves a private copy and lands on it', async () => {
      signIn();
      vi.mocked(tripsApi.getPublic).mockResolvedValue(trip);
      vi.mocked(tripsApi.copyPublic).mockResolvedValue({tripId: 'n1', nameTrip: 'Đà Lạt 3 ngày (bản sao)'});
      renderPage();

      await userEvent.click(await screen.findByRole('button', {name: t('trips.publicTrip.saveCopy')}));

      expect(tripsApi.copyPublic).toHaveBeenCalledWith('t1');
      await waitFor(async () => expect(await currentPath()).toBe('/assistant/trips/n1'));
    });

    it('tells the user when saving fails and stays on the page', async () => {
      signIn();
      vi.mocked(tripsApi.getPublic).mockResolvedValue(trip);
      vi.mocked(tripsApi.copyPublic).mockRejectedValue(httpError(404, {message: 'Data Trip not found!'}));
      renderPage();

      await userEvent.click(await screen.findByRole('button', {name: t('trips.publicTrip.saveCopy')}));

      expect(await screen.findByText(t('trips.publicTrip.saveFailed'))).toBeInTheDocument();
      expect(screen.getByRole('heading', {name: 'Đà Lạt 3 ngày'})).toBeInTheDocument();
    });
  });

  it('says the plan is not available when it is private, deleted or unknown (404)', async () => {
    vi.mocked(tripsApi.getPublic).mockRejectedValue(httpError(404, {message: 'x'}));
    renderPage();

    expect(await screen.findByText(t('trips.publicTrip.invalidTitle'))).toBeInTheDocument();
    expect(screen.getByText(t('trips.publicTrip.invalidText'))).toBeInTheDocument();
  });
});
