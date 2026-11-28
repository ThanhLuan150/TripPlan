import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {saveSession} from '@/features/auth/store/session';
import {tripsApi} from '@/features/trips/api/tripsApi';
import ExplorePage from '@/features/trips/pages/ExplorePage';
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
  likesCount: 0,
  liked: false,
});

beforeEach(() => vi.resetAllMocks());

describe('ExplorePage', () => {
  it('lists public plans as links to their public page, with the total cost', async () => {
    vi.mocked(tripsApi.listPublic).mockResolvedValue({page: 1, limit: 12, total: 2, items: [card('a1', 'Đà Lạt 3 ngày'), card('b2', 'Huế 2 ngày')]});
    renderWithProviders(<ExplorePage />, {route: '/explore'});

    const link = await screen.findByRole('link', {name: /Đà Lạt 3 ngày/});
    expect(link).toHaveAttribute('href', '/trip/a1');
    expect(screen.getAllByText(t('trips.explore.cost', {amount: '350.000'}))).toHaveLength(2);
    expect(screen.queryByRole('navigation', {name: t('trips.explore.pagination')})).not.toBeInTheDocument();
    expect(tripsApi.listPublic).toHaveBeenCalledWith(1, '');
  });

  it('pages through the plans', async () => {
    vi.mocked(tripsApi.listPublic)
      .mockResolvedValueOnce({page: 1, limit: 1, total: 2, items: [card('a1', 'First plan')]})
      .mockResolvedValueOnce({page: 2, limit: 1, total: 2, items: [card('b2', 'Second plan')]});
    renderWithProviders(<ExplorePage />, {route: '/explore'});

    await screen.findByText('First plan');
    expect(screen.getByRole('button', {name: t('trips.explore.prev')})).toBeDisabled();
    await userEvent.click(screen.getByRole('button', {name: t('trips.explore.next')}));

    expect(await screen.findByText('Second plan')).toBeInTheDocument();
    expect(tripsApi.listPublic).toHaveBeenLastCalledWith(2, '');
    expect(screen.getByRole('button', {name: t('trips.explore.next')})).toBeDisabled();

    await userEvent.click(screen.getByRole('button', {name: t('trips.explore.prev')}));
    expect(tripsApi.listPublic).toHaveBeenLastCalledWith(1, '');
  });

  it('falls back to the place and a zero cost when a card has no name or prices', async () => {
    vi.mocked(tripsApi.listPublic).mockResolvedValue({
      page: 1,
      limit: 12,
      total: 1,
      items: [{_id: 'z9', location: 'Cà Mau', startDate: '2026-03-02T09:00:00', endDate: '2026-03-04T09:00:00'}],
    });
    renderWithProviders(<ExplorePage />, {route: '/explore'});

    expect(await screen.findByRole('link', {name: /Cà Mau/})).toHaveAttribute('href', '/trip/z9');
    expect(screen.getByText(t('trips.explore.cost', {amount: '0'}))).toBeInTheDocument();
  });

  describe('likes', () => {
    const page = {page: 1, limit: 12, total: 2, items: [{...card('a1', 'Đà Lạt 3 ngày'), likesCount: 5, liked: true}, card('b2', 'Huế 2 ngày')]};

    it('shows the total of every plan and a sign-in link to a signed-out visitor', async () => {
      vi.mocked(tripsApi.listPublic).mockResolvedValue(page);
      renderWithProviders(<ExplorePage />, {route: '/explore'});

      await screen.findByText('Đà Lạt 3 ngày');
      expect(screen.getAllByTestId('likes-count').map(n => n.textContent)).toEqual(['5', '0']);
      expect(screen.getAllByRole('link', {name: t('trips.like.signIn')})).toHaveLength(2);
    });

    it('shows which plans the signed-in user liked and likes / unlikes one without leaving the list', async () => {
      saveSession({message: 'ok', accessToken: 'a.b.c', data: {username: 'reader', role: 'user'}} as never);
      vi.mocked(tripsApi.listPublic).mockResolvedValue(page);
      vi.mocked(tripsApi.likePublic).mockResolvedValue({liked: true, likesCount: 1});
      vi.mocked(tripsApi.unlikePublic).mockResolvedValue({liked: false, likesCount: 4});
      renderWithProviders(<ExplorePage />, {route: '/explore'});

      await screen.findByText('Đà Lạt 3 ngày');
      const unlike = screen.getByRole('button', {name: t('trips.like.unlike')});
      expect(unlike).toHaveAttribute('aria-pressed', 'true');

      await userEvent.click(screen.getByRole('button', {name: t('trips.like.like')}));
      expect(tripsApi.likePublic).toHaveBeenCalledWith('b2');
      await userEvent.click(unlike);
      expect(tripsApi.unlikePublic).toHaveBeenCalledWith('a1');

      await waitFor(() => expect(screen.getAllByTestId('likes-count').map(n => n.textContent)).toEqual(['4', '1']));
      expect(screen.queryByTestId('location')).not.toBeInTheDocument();
    });
  });

  describe('saving', () => {
    const page = {page: 1, limit: 12, total: 2, items: [{...card('a1', 'Đà Lạt 3 ngày'), saved: true}, card('b2', 'Huế 2 ngày')]};

    it('shows a sign-in link on every plan to a signed-out visitor', async () => {
      vi.mocked(tripsApi.listPublic).mockResolvedValue(page);
      renderWithProviders(<ExplorePage />, {route: '/explore'});

      await screen.findByText('Đà Lạt 3 ngày');
      expect(screen.getAllByRole('link', {name: t('trips.savePost.signIn')})).toHaveLength(2);
      expect(tripsApi.savePost).not.toHaveBeenCalled();
    });

    it('shows which plans the signed-in user saved and saves / unsaves one without leaving the list', async () => {
      saveSession({message: 'ok', accessToken: 'a.b.c', data: {username: 'reader', role: 'user'}} as never);
      vi.mocked(tripsApi.listPublic).mockResolvedValue(page);
      vi.mocked(tripsApi.savePost).mockResolvedValue({saved: true});
      vi.mocked(tripsApi.unsavePost).mockResolvedValue({saved: false});
      renderWithProviders(<ExplorePage />, {route: '/explore'});

      await screen.findByText('Đà Lạt 3 ngày');
      const unsave = screen.getByRole('button', {name: t('trips.savePost.unsave')});
      expect(unsave).toHaveAttribute('aria-pressed', 'true');

      await userEvent.click(screen.getByRole('button', {name: t('trips.savePost.save')}));
      expect(tripsApi.savePost).toHaveBeenCalledWith('b2');
      await userEvent.click(unsave);
      expect(tripsApi.unsavePost).toHaveBeenCalledWith('a1');

      await waitFor(() => expect(screen.getByRole('button', {name: t('trips.savePost.unsave')})).toBeInTheDocument());
      expect(screen.queryByTestId('location')).not.toBeInTheDocument();
    });
  });

  it('says so when nothing is public yet', async () => {
    vi.mocked(tripsApi.listPublic).mockResolvedValue({page: 1, limit: 12, total: 0, items: []});
    renderWithProviders(<ExplorePage />, {route: '/explore'});

    expect(await screen.findByText(t('trips.explore.empty'))).toBeInTheDocument();
  });

  it('shows an error that can be retried', async () => {
    vi.mocked(tripsApi.listPublic).mockRejectedValueOnce(httpError(500)).mockResolvedValue({page: 1, limit: 12, total: 1, items: [card('a1', 'Back again')]});
    renderWithProviders(<ExplorePage />, {route: '/explore'});

    await userEvent.click(await screen.findByRole('button', {name: t('common.retry')}));

    expect(await screen.findByText('Back again')).toBeInTheDocument();
  });
});
