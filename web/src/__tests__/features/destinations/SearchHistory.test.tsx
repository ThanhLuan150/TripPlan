import {screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {destinationsApi} from '@/features/destinations/api';
import RecommendPage from '@/features/destinations/pages/RecommendPage';
import type {RecommendResult, SearchStatus} from '@/features/destinations/types';
import {tripsApi} from '@/features/trips/api/tripsApi';
import {currentPath, httpError, renderWithProviders, t} from '../../utils/render';

vi.mock('@/features/destinations/api');
vi.mock('@/features/trips/api/tripsApi');

const result: RecommendResult = {
  message: 'ok',
  historyId: 'h1',
  recommendations: [
    {name: 'Hồ Xuân Hương', province: 'Lâm Đồng', description: 'Hồ giữa lòng thành phố', reason: 'Mát mẻ', inApp: false},
    {name: 'Thác Datanla', province: 'Lâm Đồng', description: 'Thác nước', reason: 'Thiên nhiên', inApp: false},
  ],
};

const summary = (id: string, status: SearchStatus, extra = {}) => ({
  id,
  query: 'Nơi mát mẻ',
  interests: ['Lịch sử'],
  region: 'Lâm Đồng',
  budget: '1.000.000 VND - 5.000.000 VND',
  count: 2,
  names: ['Hồ Xuân Hương', 'Thác Datanla'],
  status,
  createdAt: '2026-03-01T10:00:00',
  ...extra,
});

const render = () => renderWithProviders(<RecommendPage />, {route: '/assistant/recommend'});
const ask = async () => {
  await userEvent.type(screen.getByLabelText(t('destinations.query')), 'Nơi mát mẻ');
  await userEvent.click(screen.getByRole('button', {name: t('destinations.ask')}));
};
const openButton = () => screen.findByRole('button', {name: new RegExp(`^${t('destinations.historyOpen')}: `)});
const deleteButton = () => screen.findByRole('button', {name: new RegExp(`^${t('destinations.historyDelete')}: `)});

beforeEach(() => {
  vi.resetAllMocks();
  window.localStorage.clear();
  vi.mocked(destinationsApi.history).mockResolvedValue([]);
  vi.mocked(destinationsApi.setStatus).mockResolvedValue({});
  vi.mocked(tripsApi.list).mockResolvedValue([]);
  // jsdom has no scrolling: opening a suggestion scrolls the page to the top
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

describe('draft of the request', () => {
  const key = 'draft:recommend:anonymous';
  const saved = () => JSON.parse(window.localStorage.getItem(key) ?? 'null');

  it('does not save an empty form, saves what the user types and offers it after a reload', async () => {
    const first = render();
    await new Promise(resolve => setTimeout(resolve, 600));
    expect(saved()).toBeNull();

    await userEvent.type(screen.getByLabelText(t('destinations.query')), 'Nơi mát mẻ');
    await userEvent.click(screen.getByRole('button', {name: t('trips.create.areaHistory')}));
    await waitFor(() => expect(saved()?.value).toMatchObject({query: 'Nơi mát mẻ', interests: ['Lịch sử']}));
    first.unmount();

    render();
    expect(screen.getByText(t('drafts.found'))).toBeInTheDocument();
    // the offer is not overwritten by the blank form
    expect(screen.getByLabelText(t('destinations.query'))).toHaveValue('');
    await userEvent.click(screen.getByRole('button', {name: t('drafts.continue')}));

    expect(screen.getByLabelText(t('destinations.query'))).toHaveValue('Nơi mát mẻ');
    expect(screen.getByRole('button', {name: t('trips.create.areaHistory')})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText(t('drafts.found'))).toBeNull();
  });

  it('Start new throws the draft away', async () => {
    window.localStorage.setItem(key, JSON.stringify({savedAt: Date.now(), value: {query: 'cũ', interests: [], region: '', budgetTier: ''}}));
    render();
    await userEvent.click(screen.getByRole('button', {name: t('drafts.startNew')}));

    expect(screen.getByLabelText(t('destinations.query'))).toHaveValue('');
    expect(saved()).toBeNull();
  });

  it('does not keep a draft once the AI has answered (the history has it)', async () => {
    vi.mocked(destinationsApi.recommend).mockResolvedValue(result);
    render();
    await ask();
    await screen.findByText('Thác Datanla');
    await new Promise(resolve => setTimeout(resolve, 600));
    expect(saved()).toBeNull();
  });
});

describe('history of suggestions', () => {
  it('shows the drafts and the created ones in two groups', async () => {
    vi.mocked(destinationsApi.history).mockResolvedValue([summary('a', 'draft'), summary('b', 'created', {query: 'Biển đẹp'})]);
    render();

    const drafts = await screen.findByRole('region', {name: t('destinations.historyDrafts')});
    expect(within(drafts).getByText('Nơi mát mẻ')).toBeInTheDocument();
    expect(within(drafts).getByText(/Hồ Xuân Hương, Thác Datanla/)).toBeInTheDocument();
    const created = screen.getByRole('region', {name: t('destinations.historyCreated')});
    expect(within(created).getByText('Biển đẹp')).toBeInTheDocument();
  });

  it('names a suggestion made only of choices by those choices', async () => {
    vi.mocked(destinationsApi.history).mockResolvedValue([summary('a', 'draft', {query: ''})]);
    render();
    expect(await screen.findByText('Lịch sử, Lâm Đồng')).toBeInTheDocument();
  });

  it('says so when there is no history yet', async () => {
    render();
    expect(await screen.findByText(t('destinations.historyEmpty'))).toBeInTheDocument();
  });

  it('can retry when the history does not load', async () => {
    vi.mocked(destinationsApi.history).mockRejectedValueOnce(httpError(500)).mockResolvedValueOnce([summary('a', 'draft')]);
    render();
    expect(await screen.findByText(t('destinations.historyLoadFailed'))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: t('common.retry')}));
    expect(await screen.findByText('Nơi mát mẻ')).toBeInTheDocument();
  });

  it('opens an earlier suggestion: its request goes back into the form and its places are shown', async () => {
    vi.mocked(destinationsApi.history).mockResolvedValue([summary('a', 'draft')]);
    vi.mocked(destinationsApi.open).mockResolvedValue({...summary('a', 'draft'), recommendations: result.recommendations});
    render();

    await userEvent.click(await openButton());

    expect(await screen.findByText('Thác Datanla')).toBeInTheDocument();
    expect(destinationsApi.open).toHaveBeenCalledWith('a');
    expect(screen.getByLabelText(t('destinations.query'))).toHaveValue('Nơi mát mẻ');
    expect(screen.getByRole('button', {name: t('trips.create.areaHistory')})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('radio', {name: new RegExp(t('trips.create.budgetMid'))})).toBeChecked();
    expect(screen.getByText(t('destinations.historyOpened', {date: '1/3/2026'}))).toBeInTheDocument();
    // reading is not a new question
    expect(destinationsApi.recommend).not.toHaveBeenCalled();
  });

  it('tells the user when a suggestion cannot be opened', async () => {
    vi.mocked(destinationsApi.history).mockResolvedValue([summary('a', 'draft')]);
    vi.mocked(destinationsApi.open).mockRejectedValue(httpError(404));
    render();
    await userEvent.click(await openButton());
    expect(await screen.findByText(t('destinations.historyOpenFailed'))).toBeInTheDocument();
  });

  it('deletes a suggestion only after the user confirms', async () => {
    vi.mocked(destinationsApi.history).mockResolvedValue([summary('a', 'draft')]);
    vi.mocked(destinationsApi.remove).mockResolvedValue({});
    render();

    await userEvent.click(await deleteButton());
    expect(screen.getByText(t('destinations.historyDeleteTitle'))).toBeInTheDocument();
    expect(destinationsApi.remove).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', {name: t('destinations.historyDelete')}));
    await waitFor(() => expect(destinationsApi.remove).toHaveBeenCalledWith('a'));
    expect(await screen.findByText(t('destinations.historyDeleted'))).toBeInTheDocument();
  });

  it('keeps the suggestion when the user cancels, and tells them when deleting fails', async () => {
    vi.mocked(destinationsApi.history).mockResolvedValue([summary('a', 'draft')]);
    vi.mocked(destinationsApi.remove).mockRejectedValue(httpError(500));
    render();

    await userEvent.click(await deleteButton());
    await userEvent.click(screen.getByRole('button', {name: t('common.cancel')}));
    expect(destinationsApi.remove).not.toHaveBeenCalled();

    await userEvent.click(await deleteButton());
    await userEvent.click(screen.getByRole('button', {name: t('destinations.historyDelete')}));
    expect(await screen.findByText(t('destinations.historyDeleteFailed'))).toBeInTheDocument();
  });

  it('moves a suggestion to "created" when a plan is started from it', async () => {
    vi.mocked(destinationsApi.recommend).mockResolvedValue(result);
    render();
    await ask();

    await userEvent.click(await screen.findByRole('button', {name: t('destinations.planTripFor', {name: 'Thác Datanla'})}));

    expect(destinationsApi.setStatus).toHaveBeenCalledWith('h1', 'created', undefined);
    expect(await currentPath()).toBe('/assistant/trips/new');
  });

  it('moves a suggestion to "created" when a place of it is added to a trip', async () => {
    vi.mocked(destinationsApi.recommend).mockResolvedValue(result);
    vi.mocked(tripsApi.list).mockResolvedValue([
      {_id: 't2', nameTrip: 'Đà Lạt 3 ngày', location: 'Lâm Đồng', startDate: '2026-04-01', endDate: '2026-04-03', status: 'active'},
    ]);
    vi.mocked(tripsApi.get).mockResolvedValue({
      location: 'Lâm Đồng',
      startDate: '2026-04-01',
      endDate: '2026-04-03',
      dataTripDays: [{_id: 'd1', title: 'Ngày đầu', date: '2026-04-01', challenges: []}],
    } as never);
    vi.mocked(tripsApi.addPlace).mockResolvedValue({challengeId: 'c9', day: {id: 'd1', title: 'Ngày đầu'}, located: true});
    render();
    await ask();

    await userEvent.click(await screen.findByRole('button', {name: t('destinations.addToTripFor', {name: 'Thác Datanla'})}));
    await userEvent.click(await screen.findByRole('radio', {name: /Đà Lạt 3 ngày/}));
    await userEvent.click(await screen.findByRole('radio', {name: /Ngày đầu/}));
    await userEvent.click(screen.getByRole('button', {name: t('destinations.addConfirm')}));

    await waitFor(() => expect(destinationsApi.setStatus).toHaveBeenCalledWith('h1', 'created', 't2'));
  });

  it('refreshes the history after a new answer', async () => {
    vi.mocked(destinationsApi.recommend).mockResolvedValue(result);
    render();
    await screen.findByText(t('destinations.historyEmpty'));
    vi.mocked(destinationsApi.history).mockResolvedValue([summary('h1', 'draft')]);

    await ask();

    expect(await screen.findByText(/Hồ Xuân Hương, Thác Datanla/)).toBeInTheDocument();
  });
});
