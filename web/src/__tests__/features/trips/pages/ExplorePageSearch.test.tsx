import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
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
  likesCount: 0,
  liked: false,
});

const found = {q: 'lạt', page: 1, limit: 12, total: 2, items: [card('a1', 'Đà Lạt 3 ngày'), card('b2', 'Đà Lạt 2 ngày')]};
const plain = {page: 1, limit: 12, total: 1, items: [card('z9', 'Every plan')]};
const box = () => screen.getByRole('searchbox', {name: t('trips.explore.searchLabel')});

beforeEach(() => vi.resetAllMocks());

describe('ExplorePage search', () => {
  it('searches after the user stops typing and shows how many plans were found', async () => {
    vi.mocked(tripsApi.listPublic).mockImplementation(async (_page, q) => (q ? found : plain));
    renderWithProviders(<ExplorePage />, {route: '/explore'});
    await screen.findByText('Every plan');

    await userEvent.type(box(), 'lạt');

    expect(await screen.findByText('Đà Lạt 3 ngày')).toBeInTheDocument();
    expect(tripsApi.listPublic).toHaveBeenLastCalledWith(1, 'lạt');
    expect(screen.getByRole('status')).toHaveTextContent(t('trips.explore.results', {q: 'lạt', count: 2}));
    // one request for the whole word, not one per letter
    expect(vi.mocked(tripsApi.listPublic).mock.calls.filter(([, q]) => q)).toHaveLength(1);
  });

  it('Enter searches at once, with the keyword trimmed', async () => {
    vi.mocked(tripsApi.listPublic).mockImplementation(async (_page, q) => (q ? found : plain));
    renderWithProviders(<ExplorePage />, {route: '/explore'});
    await screen.findByText('Every plan');

    await userEvent.type(box(), '  lạt  {Enter}');

    await waitFor(() => expect(tripsApi.listPublic).toHaveBeenLastCalledWith(1, 'lạt'));
  });

  it('a keyword of only spaces is not a search', async () => {
    vi.mocked(tripsApi.listPublic).mockResolvedValue(plain);
    renderWithProviders(<ExplorePage />, {route: '/explore'});
    await screen.findByText('Every plan');

    await userEvent.type(box(), '   {Enter}');
    await new Promise(resolve => setTimeout(resolve, 500));

    expect(tripsApi.listPublic).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('starts from the keyword in the address', async () => {
    vi.mocked(tripsApi.listPublic).mockResolvedValue(found);
    renderWithProviders(<ExplorePage />, {route: '/explore', search: '?q=l%E1%BA%A1t'});

    expect(await screen.findByText('Đà Lạt 3 ngày')).toBeInTheDocument();
    expect(tripsApi.listPublic).toHaveBeenCalledWith(1, 'lạt');
    expect(box()).toHaveValue('lạt');
  });

  it('says so when nothing matches, and clearing the keyword brings the whole list back', async () => {
    vi.mocked(tripsApi.listPublic).mockImplementation(async (_page, q) => (q ? {q, page: 1, limit: 12, total: 0, items: []} : plain));
    renderWithProviders(<ExplorePage />, {route: '/explore'});
    await screen.findByText('Every plan');

    await userEvent.type(box(), 'zzz{Enter}');

    expect(await screen.findByText(t('trips.explore.noResults', {q: 'zzz'}))).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', {name: t('trips.explore.clearSearch')})[0]);

    expect(await screen.findByText('Every plan')).toBeInTheDocument();
    expect(box()).toHaveValue('');
    expect(tripsApi.listPublic).toHaveBeenLastCalledWith(1, '');
  });

  it('the clear button only shows while there is text', async () => {
    vi.mocked(tripsApi.listPublic).mockResolvedValue(plain);
    renderWithProviders(<ExplorePage />, {route: '/explore'});
    await screen.findByText('Every plan');
    expect(screen.queryByRole('button', {name: t('trips.explore.clearSearch')})).not.toBeInTheDocument();

    await userEvent.type(box(), 'a');

    expect(screen.getByRole('button', {name: t('trips.explore.clearSearch')})).toBeInTheDocument();
  });

  it('pages the results of a search and goes back to page 1 for a new keyword', async () => {
    vi.mocked(tripsApi.listPublic).mockImplementation(async (page, q) => ({
      q,
      page,
      limit: 1,
      total: 2,
      items: [card(`id${page}${q}`, `${q || 'all'} plan ${page}`)],
    }));
    renderWithProviders(<ExplorePage />, {route: '/explore', search: '?q=hue'});
    await screen.findByText('hue plan 1');

    await userEvent.click(screen.getByRole('button', {name: t('trips.explore.next')}));
    expect(await screen.findByText('hue plan 2')).toBeInTheDocument();
    expect(tripsApi.listPublic).toHaveBeenLastCalledWith(2, 'hue');

    await userEvent.clear(box());
    await userEvent.type(box(), 'sapa{Enter}');

    expect(await screen.findByText('sapa plan 1')).toBeInTheDocument();
    expect(tripsApi.listPublic).toHaveBeenLastCalledWith(1, 'sapa');
  });

  it('limits the length of the keyword in the box', async () => {
    vi.mocked(tripsApi.listPublic).mockResolvedValue(plain);
    renderWithProviders(<ExplorePage />, {route: '/explore'});
    await screen.findByText('Every plan');

    expect(box()).toHaveAttribute('maxLength', '100');
  });

  it('shows the introduction of a post on its card', async () => {
    vi.mocked(tripsApi.listPublic).mockResolvedValue({
      ...plain,
      items: [{...card('z9', 'Every plan'), postContent: 'A week of coffee and pine hills'}],
    });
    renderWithProviders(<ExplorePage />, {route: '/explore'});

    expect(await screen.findByText('A week of coffee and pine hills')).toBeInTheDocument();
  });

  it('shows a search error that can be retried', async () => {
    vi.mocked(tripsApi.listPublic).mockResolvedValueOnce(plain).mockRejectedValueOnce(httpError(500)).mockResolvedValue(found);
    renderWithProviders(<ExplorePage />, {route: '/explore'});
    await screen.findByText('Every plan');

    await userEvent.type(box(), 'lạt{Enter}');
    await userEvent.click(await screen.findByRole('button', {name: t('common.retry')}));

    expect(await screen.findByText('Đà Lạt 3 ngày')).toBeInTheDocument();
  });
});
