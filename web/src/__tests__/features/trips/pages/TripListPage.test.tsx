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
});
