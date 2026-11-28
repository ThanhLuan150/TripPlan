import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {saveSession} from '@/features/auth/store/session';
import {tripsApi} from '@/features/trips/api/tripsApi';
import PublicTripPage from '@/features/trips/pages/PublicTripPage';
import {renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

const trip = {
  nameTrip: 'Hà Giang loop',
  location: 'Hà Giang',
  startDate: '2026-03-02T09:00:00',
  endDate: '2026-03-04T09:00:00',
  postContent: 'Four days on the Ha Giang loop.\nGo in autumn.',
  postedAt: '2026-03-01T09:00:00.000Z',
  dataTripDays: [
    {
      title: 'Day one',
      date: '2026-03-02T09:00:00',
      transportCost: 100000,
      foodCost: 200000,
      challenges: [{_id: 'c1', challengeSummary: 'Mã Pí Lèng', location: 'Mã Pí Lèng', points: 20}],
    },
  ],
};

const renderPage = () => renderWithProviders(<PublicTripPage />, {route: '/trip/t1', path: '/trip/:id'});

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
});

describe('PublicTripPage: a plan shared as a post', () => {
  it('shows the introduction of the author with the plan', async () => {
    vi.mocked(tripsApi.getPublic).mockResolvedValue(trip);
    renderPage();

    expect(await screen.findByText(/Four days on the Ha Giang loop/)).toBeInTheDocument();
    expect(screen.getByText(t('trips.publicTrip.authorNote'))).toBeInTheDocument();
    expect(screen.getByText('Mã Pí Lèng', {selector: 'p.font-medium'})).toBeInTheDocument();
  });

  it('shows no introduction block for a public plan without one', async () => {
    vi.mocked(tripsApi.getPublic).mockResolvedValue({...trip, postContent: undefined});
    renderPage();

    await screen.findByRole('heading', {name: 'Hà Giang loop'});
    expect(screen.queryByText(t('trips.publicTrip.authorNote'))).not.toBeInTheDocument();
  });

  it('links to the reviews of the destination of the plan', async () => {
    vi.mocked(tripsApi.getPublic).mockResolvedValue(trip);
    renderPage();

    const link = await screen.findByRole('link', {name: t('trips.publicTrip.reviewsLink', {place: 'Hà Giang'})});
    expect(link).toHaveAttribute('href', `/destination/${encodeURIComponent('Hà Giang')}`);
  });

  it('a signed-out visitor gets a sign-in link to report, not a button', async () => {
    vi.mocked(tripsApi.getPublic).mockResolvedValue(trip);
    renderPage();

    expect(await screen.findByRole('link', {name: t('trips.report.signIn')})).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('button', {name: t('trips.report.open')})).not.toBeInTheDocument();
  });

  it('a signed-in user reports the post from its page', async () => {
    saveSession({message: 'ok', accessToken: 'a.b.c', data: {username: 'reader', role: 'user'}} as never);
    vi.mocked(tripsApi.getPublic).mockResolvedValue(trip);
    vi.mocked(tripsApi.reportPost).mockResolvedValue({message: 'ok'});
    renderPage();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.report.open')}));
    await userEvent.click(screen.getByRole('radio', {name: t('trips.report.reasons.copyright')}));
    await userEvent.click(screen.getByRole('button', {name: t('trips.report.submit')}));

    expect(tripsApi.reportPost).toHaveBeenCalledWith('t1', 'copyright', undefined);
    expect(await screen.findByText(t('trips.report.success'))).toBeInTheDocument();
  });
});
