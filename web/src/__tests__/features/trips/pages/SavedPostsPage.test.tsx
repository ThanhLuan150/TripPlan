import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {saveSession} from '@/features/auth/store/session';
import {tripsApi} from '@/features/trips/api/tripsApi';
import SavedPostsPage from '@/features/trips/pages/SavedPostsPage';
import {httpError, renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

const card = (id: string, name: string) => ({
  _id: id,
  nameTrip: name,
  location: 'Lâm Đồng',
  startDate: '2026-03-02T09:00:00',
  endDate: '2026-03-04T09:00:00',
  transportCostTotal: 100000,
  foodCostTotal: 200000,
  otherCostTotal: 50000,
  saved: true,
});

beforeEach(() => {
  vi.resetAllMocks();
  saveSession({message: 'ok', accessToken: 'a.b.c', data: {username: 'reader', role: 'user'}} as never);
});

describe('SavedPostsPage', () => {
  it('lists the saved posts as links to their public page, each marked as saved', async () => {
    vi.mocked(tripsApi.savedPosts).mockResolvedValue({page: 1, limit: 12, total: 2, items: [card('a1', 'Đà Lạt 3 ngày'), card('b2', 'Huế 2 ngày')]});
    renderWithProviders(<SavedPostsPage />, {route: '/saved'});

    expect(await screen.findByRole('link', {name: /Đà Lạt 3 ngày/})).toHaveAttribute('href', '/trip/a1');
    expect(screen.getByRole('link', {name: /Huế 2 ngày/})).toHaveAttribute('href', '/trip/b2');
    expect(screen.getAllByRole('button', {name: t('trips.savePost.unsave')})).toHaveLength(2);
    expect(screen.getAllByText(t('trips.explore.cost', {amount: '350.000'}))).toHaveLength(2);
    expect(tripsApi.savedPosts).toHaveBeenCalledWith(1);
  });

  it('shows an empty state with a way to explore plans', async () => {
    vi.mocked(tripsApi.savedPosts).mockResolvedValue({page: 1, limit: 12, total: 0, items: []});
    renderWithProviders(<SavedPostsPage />, {route: '/saved'});

    expect(await screen.findByText(t('trips.saved.empty'))).toBeInTheDocument();
    expect(screen.getByRole('link', {name: t('trips.saved.goExplore')})).toHaveAttribute('href', '/explore');
  });

  it('shows an error that can be retried', async () => {
    vi.mocked(tripsApi.savedPosts).mockRejectedValueOnce(httpError(500)).mockResolvedValue({page: 1, limit: 12, total: 1, items: [card('a1', 'Back again')]});
    renderWithProviders(<SavedPostsPage />, {route: '/saved'});

    expect(await screen.findByRole('alert')).toHaveTextContent(t('trips.saved.error'));
    await userEvent.click(screen.getByRole('button', {name: t('common.retry')}));

    expect(await screen.findByText('Back again')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('removes a post from the list when it is unsaved', async () => {
    vi.mocked(tripsApi.savedPosts)
      .mockResolvedValueOnce({page: 1, limit: 12, total: 1, items: [card('a1', 'Đà Lạt 3 ngày')]})
      .mockResolvedValue({page: 1, limit: 12, total: 0, items: []});
    vi.mocked(tripsApi.unsavePost).mockResolvedValue({saved: false});
    renderWithProviders(<SavedPostsPage />, {route: '/saved'});

    await userEvent.click(await screen.findByRole('button', {name: t('trips.savePost.unsave')}));

    expect(tripsApi.unsavePost).toHaveBeenCalledWith('a1');
    expect(await screen.findByText(t('trips.saved.empty'))).toBeInTheDocument();
  });

  it('pages through the saved posts', async () => {
    vi.mocked(tripsApi.savedPosts)
      .mockResolvedValueOnce({page: 1, limit: 1, total: 2, items: [card('a1', 'First plan')]})
      .mockResolvedValueOnce({page: 2, limit: 1, total: 2, items: [card('b2', 'Second plan')]});
    renderWithProviders(<SavedPostsPage />, {route: '/saved'});

    await screen.findByText('First plan');
    expect(screen.getByRole('button', {name: t('trips.explore.prev')})).toBeDisabled();
    await userEvent.click(screen.getByRole('button', {name: t('trips.explore.next')}));

    expect(await screen.findByText('Second plan')).toBeInTheDocument();
    expect(tripsApi.savedPosts).toHaveBeenLastCalledWith(2);
    expect(screen.getByRole('button', {name: t('trips.explore.next')})).toBeDisabled();
  });

  it('falls back to the place and a zero cost when a card has no name or prices', async () => {
    vi.mocked(tripsApi.savedPosts).mockResolvedValue({
      page: 1,
      limit: 12,
      total: 1,
      items: [{_id: 'z9', location: 'Cà Mau', startDate: '2026-03-02T09:00:00', endDate: '2026-03-04T09:00:00'}],
    });
    renderWithProviders(<SavedPostsPage />, {route: '/saved'});

    expect(await screen.findByRole('link', {name: /Cà Mau/})).toHaveAttribute('href', '/trip/z9');
    expect(screen.getByText(t('trips.explore.cost', {amount: '0'}))).toBeInTheDocument();
  });
});
