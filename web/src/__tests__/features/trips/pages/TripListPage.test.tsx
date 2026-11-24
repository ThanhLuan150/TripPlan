import {fireEvent, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {tripsApi} from '@/features/trips/api/tripsApi';
import TripListPage from '@/features/trips/pages/TripListPage';
import {currentPath, pending, renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

const trips = [
  {_id: 't1', nameTrip: 'Đà Lạt mộng mơ', location: 'Lâm Đồng', startDate: '2026-03-02T00:00:00', endDate: '2026-03-04T00:00:00', status: 'active'},
  {_id: 't2', nameTrip: 'Đã xoá', location: 'Huế', startDate: '2026-01-01T00:00:00', endDate: '2026-01-02T00:00:00', status: 'delete'},
  {_id: 't3', nameTrip: 'Biển Nha Trang', location: 'Khánh Hòa', startDate: '2026-05-10T00:00:00', endDate: '2026-05-12T00:00:00', status: 'active'},
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(tripsApi.list).mockResolvedValue(trips);
  vi.mocked(tripsApi.favorites).mockResolvedValue([]);
  vi.mocked(tripsApi.addFavorite).mockResolvedValue({});
  vi.mocked(tripsApi.removeFavorite).mockResolvedValue({});
});

const render = () => renderWithProviders(<TripListPage />, {route: '/assistant/trips'});
const cards = () => screen.getAllByRole('link').filter(el => el.tagName === 'DIV');

describe('TripListPage', () => {
  it('lists the active trips, newest first, with their dates', async () => {
    render();

    expect(await screen.findByText('Biển Nha Trang')).toBeInTheDocument();
    expect(screen.queryByText('Đã xoá')).toBeNull();
    expect(cards().map(c => within(c).getByText(/Đà Lạt|Nha Trang/).textContent)).toEqual([
      'Biển Nha Trang',
      'Đà Lạt mộng mơ',
    ]);
    expect(screen.getByRole('heading', {level: 2})).toHaveTextContent(`${t('trips.list.title')}(2)`);
    expect(screen.getByText('10/5 - 12/5')).toBeInTheDocument();
  });

  it('opens a trip on click or Enter', async () => {
    render();
    await screen.findByText('Biển Nha Trang');

    fireEvent.keyDown(cards()[1], {key: 'Enter'});
    expect(await currentPath()).toBe('/assistant/trips/t1');
  });

  it('opens a trip on click', async () => {
    const user = userEvent.setup();
    render();

    await user.click(await screen.findByText('Biển Nha Trang'));

    expect(await currentPath()).toBe('/assistant/trips/t3');
  });

  it('other keys do nothing', async () => {
    render();
    await screen.findByText('Biển Nha Trang');

    fireEvent.keyDown(cards()[0], {key: 'a'});
    expect(screen.queryByTestId('location')).toBeNull();
  });

  it('deletes a trip after confirmation and reloads the list', async () => {
    vi.mocked(tripsApi.remove).mockResolvedValue({});
    const user = userEvent.setup();
    render();

    await user.click(await screen.findByRole('button', {name: t('trips.list.deleteLabel', {name: 'Đà Lạt mộng mơ'})}));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(t('trips.list.deleteConfirm', {name: 'Đà Lạt mộng mơ'}));
    await user.click(within(dialog).getByRole('button', {name: t('common.delete')}));

    expect(vi.mocked(tripsApi.remove).mock.calls[0][0]).toBe('t1');
    await vi.waitFor(() => expect(tripsApi.list).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('can cancel the deletion', async () => {
    const user = userEvent.setup();
    render();

    await user.click(await screen.findByRole('button', {name: t('trips.list.deleteLabel', {name: 'Biển Nha Trang'})}));
    await user.click(screen.getByRole('button', {name: t('common.cancel')}));

    expect(tripsApi.remove).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByTestId('location')).toBeNull(); // the card was not opened
  });

  it('tells when the deletion failed', async () => {
    vi.mocked(tripsApi.remove).mockRejectedValue(new Error('500'));
    const user = userEvent.setup();
    render();

    await user.click(await screen.findByRole('button', {name: t('trips.list.deleteLabel', {name: 'Biển Nha Trang'})}));
    await user.click(screen.getByRole('button', {name: t('common.delete')}));

    expect(await screen.findByText(t('trips.list.deleteFailed'))).toBeInTheDocument();
  });

  it('duplicates a trip, reloads the list and confirms', async () => {
    vi.mocked(tripsApi.duplicate).mockResolvedValue({tripId: 'n1', nameTrip: 'Đà Lạt mộng mơ (bản sao)'});
    const user = userEvent.setup();
    render();

    await user.click(await screen.findByRole('button', {name: t('trips.list.duplicateLabel', {name: 'Đà Lạt mộng mơ'})}));

    expect(vi.mocked(tripsApi.duplicate).mock.calls[0][0]).toBe('t1');
    expect(await screen.findByText(t('trips.list.duplicateSuccessText', {name: 'Đà Lạt mộng mơ (bản sao)'}))).toBeInTheDocument();
    await vi.waitFor(() => expect(tripsApi.list).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('location')).toBeNull(); // the card was not opened
  });

  it('tells when the duplication failed', async () => {
    vi.mocked(tripsApi.duplicate).mockRejectedValue(new Error('404'));
    const user = userEvent.setup();
    render();

    await user.click(await screen.findByRole('button', {name: t('trips.list.duplicateLabel', {name: 'Biển Nha Trang'})}));

    expect(await screen.findByText(t('trips.list.duplicateFailed'))).toBeInTheDocument();
    expect(tripsApi.list).toHaveBeenCalledTimes(1);
  });

  it('reloads on "refresh"', async () => {
    const user = userEvent.setup();
    render();
    await screen.findByText('Biển Nha Trang');

    await user.click(screen.getByRole('button', {name: t('common.refresh')}));

    await vi.waitFor(() => expect(tripsApi.list).toHaveBeenCalledTimes(2));
  });

  it('shows the empty state', async () => {
    vi.mocked(tripsApi.list).mockResolvedValue([trips[1]]);
    render();

    expect(await screen.findByText(t('trips.list.emptyTitle'))).toBeInTheDocument();
  });

  it('shows placeholders while loading and links to a new plan', () => {
    vi.mocked(tripsApi.list).mockReturnValue(pending());
    const {container} = render();

    expect(container.querySelectorAll('li.animate-pulse')).toHaveLength(3);
    expect(screen.getByRole('link', {name: new RegExp(t('trips.list.add'))})).toHaveAttribute('href', '/assistant/trips/new');
    expect(screen.getByRole('button', {name: t('common.refresh')})).toBeDisabled();
  });

  it('hides a cover photo that fails to load', async () => {
    const {container} = render();
    await screen.findByText('Biển Nha Trang');

    const img = container.querySelector('img')!;
    fireEvent.error(img);

    expect(img.style.display).toBe('none');
  });

  describe('favorites', () => {
    const label = (key: string, name: string) => t(`trips.list.${key}`, {name});

    it('adds a trip to the favorites: the heart changes at once, then the list is reloaded', async () => {
      const user = userEvent.setup();
      render();

      const heart = await screen.findByRole('button', {name: label('favoriteLabel', 'Đà Lạt mộng mơ')});
      expect(heart).toHaveAttribute('aria-pressed', 'false');
      vi.mocked(tripsApi.favorites).mockResolvedValue([trips[0]]);
      await user.click(heart);

      expect(vi.mocked(tripsApi.addFavorite).mock.calls[0][0]).toBe('t1');
      expect(await screen.findByRole('button', {name: label('unfavoriteLabel', 'Đà Lạt mộng mơ')})).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.queryByTestId('location')).toBeNull(); // the card was not opened
      await vi.waitFor(() => expect(tripsApi.favorites).toHaveBeenCalledTimes(2));
    });

    it('removes a trip from the favorites', async () => {
      vi.mocked(tripsApi.favorites).mockResolvedValue([trips[0]]);
      const user = userEvent.setup();
      render();

      vi.mocked(tripsApi.favorites).mockResolvedValue([]);
      await user.click(await screen.findByRole('button', {name: label('unfavoriteLabel', 'Đà Lạt mộng mơ')}));

      expect(vi.mocked(tripsApi.removeFavorite).mock.calls[0][0]).toBe('t1');
      expect(tripsApi.addFavorite).not.toHaveBeenCalled();
      expect(await screen.findByRole('button', {name: label('favoriteLabel', 'Đà Lạt mộng mơ')})).toBeInTheDocument();
    });

    it('goes back and tells the user when the server refuses', async () => {
      vi.mocked(tripsApi.addFavorite).mockRejectedValue(new Error('500'));
      const user = userEvent.setup();
      render();

      await user.click(await screen.findByRole('button', {name: label('favoriteLabel', 'Biển Nha Trang')}));

      expect(await screen.findByText(t('trips.list.favoriteFailed'))).toBeInTheDocument();
      expect(screen.getByRole('button', {name: label('favoriteLabel', 'Biển Nha Trang')})).toHaveAttribute('aria-pressed', 'false');
    });

    it('shows only the favorites in the favorites tab', async () => {
      vi.mocked(tripsApi.favorites).mockResolvedValue([trips[2]]);
      const user = userEvent.setup();
      render();

      await user.click(await screen.findByRole('tab', {name: t('trips.list.tabFavorites')}));

      expect(await screen.findByText('Biển Nha Trang')).toBeInTheDocument();
      expect(screen.queryByText('Đà Lạt mộng mơ')).toBeNull();
      expect(screen.getByRole('heading', {level: 2})).toHaveTextContent('(1)');
    });

    it('removing a favorite makes it leave the favorites tab', async () => {
      vi.mocked(tripsApi.favorites).mockResolvedValue([trips[2]]);
      const user = userEvent.setup();
      render();
      await user.click(await screen.findByRole('tab', {name: t('trips.list.tabFavorites')}));

      vi.mocked(tripsApi.favorites).mockResolvedValue([]);
      await user.click(await screen.findByRole('button', {name: label('unfavoriteLabel', 'Biển Nha Trang')}));

      expect(await screen.findByText(t('trips.list.favoritesEmptyTitle'))).toBeInTheDocument();
    });

    it('does not show a favorite whose trip was deleted', async () => {
      vi.mocked(tripsApi.favorites).mockResolvedValue([trips[1], trips[0]]);
      const user = userEvent.setup();
      render();

      await user.click(await screen.findByRole('tab', {name: t('trips.list.tabFavorites')}));

      expect(await screen.findByText('Đà Lạt mộng mơ')).toBeInTheDocument();
      expect(screen.queryByText('Đã xoá')).toBeNull();
    });

    it('shows a loading state, an empty state and an error state with retry', async () => {
      vi.mocked(tripsApi.favorites).mockReturnValue(pending());
      const user = userEvent.setup();
      const {container} = render();
      await user.click(await screen.findByRole('tab', {name: t('trips.list.tabFavorites')}));
      expect(container.querySelectorAll('li.animate-pulse')).toHaveLength(3);
    });

    it('shows the empty state when there is no favorite', async () => {
      const user = userEvent.setup();
      render();

      await user.click(await screen.findByRole('tab', {name: t('trips.list.tabFavorites')}));

      expect(await screen.findByText(t('trips.list.favoritesEmptyText'))).toBeInTheDocument();
    });

    it('shows an error with a retry button when the favorites cannot be loaded', async () => {
      vi.mocked(tripsApi.favorites).mockRejectedValueOnce(new Error('500'));
      const user = userEvent.setup();
      render();
      await user.click(await screen.findByRole('tab', {name: t('trips.list.tabFavorites')}));

      expect(await screen.findByRole('alert')).toHaveTextContent(t('trips.list.favoritesError'));
      await user.click(screen.getByRole('button', {name: t('common.retry')}));

      expect(await screen.findByText(t('trips.list.favoritesEmptyTitle'))).toBeInTheDocument();
    });
  });
});
