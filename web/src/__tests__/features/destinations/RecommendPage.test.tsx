import {screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {api} from '@/lib/apiClient';
import {tripsApi} from '@/features/trips/api/tripsApi';
import {destinationsApi} from '@/features/destinations/api';
import RecommendPage from '@/features/destinations/pages/RecommendPage';
import {planPrefill} from '@/features/destinations/plan';
import {recommendErrors} from '@/features/destinations/validation';
import type {RecommendResult} from '@/features/destinations/types';
import {currentPath, currentState, httpError, networkError, pending, renderWithProviders, t} from '../../utils/render';

vi.mock('@/features/destinations/api');
vi.mock('@/features/trips/api/tripsApi');

const result: RecommendResult = {
  message: 'ok',
  historyId: 'h1',
  recommendations: [
    {
      name: 'Hồ Xuân Hương',
      province: 'Lâm Đồng',
      description: 'Hồ giữa lòng thành phố',
      reason: 'Không khí mát mẻ',
      inApp: true,
      place: {
        id: 's1',
        title: 'Hồ Xuân Hương, Đà Lạt',
        location: 'Lâm Đồng',
        imageUrl: 'https://img/x.jpg',
        videos: [
          {id: 'v1', title: 'Đà Lạt 4K', youtubeLink: 'https://www.youtube.com/watch?v=V9IIO8GkssE', thumbnail: ''},
          {id: 'v2', title: 'Video lạ', youtubeLink: 'https://evil.example/x', thumbnail: ''},
        ],
      },
    },
    {name: 'Thác Datanla', province: 'Lâm Đồng', description: 'Thác nước', reason: 'Thiên nhiên', inApp: false},
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  window.localStorage.clear();
  vi.mocked(destinationsApi.history).mockResolvedValue([]);
  vi.mocked(destinationsApi.setStatus).mockResolvedValue({});
});

const render = () => renderWithProviders(<RecommendPage />, {route: '/assistant/recommend'});
const ask = async (text = 'Nơi mát mẻ') => {
  await userEvent.type(screen.getByLabelText(t('destinations.query')), text);
  await userEvent.click(screen.getByRole('button', {name: t('destinations.ask')}));
};

describe('recommendErrors', () => {
  const base = {query: '', interests: [], region: '', budget: ''};
  it('needs at least one input and limits the lengths', () => {
    expect(recommendErrors(base)).toEqual({query: 'destinations.required', interests: 'destinations.orChoose', region: 'destinations.orChoose', budget: 'destinations.orChoose'});
    expect(recommendErrors({...base, query: '  '})).toEqual({query: 'destinations.required', interests: 'destinations.orChoose', region: 'destinations.orChoose', budget: 'destinations.orChoose'});
    expect(recommendErrors({...base, query: 'biển'})).toEqual({});
    expect(recommendErrors({...base, interests: ['Lịch sử']})).toEqual({});
    expect(recommendErrors({...base, region: 'Đà Nẵng'})).toEqual({});
    expect(recommendErrors({...base, budget: '3 triệu'})).toEqual({});
    expect(recommendErrors({...base, region: 'Không có thật'})).toEqual({region: 'destinations.regionInvalid'});
    expect(recommendErrors({...base, query: 'a'.repeat(501)})).toEqual({query: 'destinations.tooLong'});
    expect(recommendErrors({...base, query: 'a', budget: 'b'.repeat(51)})).toEqual({budget: 'destinations.budgetTooLong'});
  });
});

describe('planPrefill', () => {
  const item = {name: 'A', province: '', description: 'd', reason: 'r', inApp: false};
  it('uses a valid province of the place, then of the suggestion, and limits the note', () => {
    expect(planPrefill({...item, province: 'Hà Giang'})).toEqual({location: 'Hà Giang', fromSuggestion: true, note: 'A (Hà Giang): d'});
    expect(planPrefill({...item, province: 'x', place: {id: '1', title: 't', location: 'Lâm Đồng', imageUrl: '', videos: []}}).location).toBe('Lâm Đồng');
    expect(planPrefill(item)).toEqual({fromSuggestion: true, note: 'A: d'});
    expect(planPrefill({...item, description: 'd'.repeat(2000)}).note).toHaveLength(1500);
  });
});

describe('destinationsApi', () => {
  afterEach(() => vi.restoreAllMocks());
  it('posts the trimmed request and unwraps the answer', async () => {
    const actual = await vi.importActual<typeof import('@/features/destinations/api')>('@/features/destinations/api');
    const post = vi.spyOn(api, 'post').mockResolvedValue({data: result} as never);
    const answer = await actual.destinationsApi.recommend({query: ' biển ', interests: ['Lịch sử'], region: 'Đà Nẵng', budget: ' 3 triệu '});
    expect(post).toHaveBeenCalledWith('/destinations/recommend', {query: 'biển', interests: ['Lịch sử'], region: 'Đà Nẵng', budget: '3 triệu'});
    expect(answer).toBe(result);
  });

  it('reads, opens, updates and deletes the history of the user', async () => {
    const actual = await vi.importActual<typeof import('@/features/destinations/api')>('@/features/destinations/api');
    const get = vi.spyOn(api, 'get').mockResolvedValueOnce({data: {items: [{id: 'a'}]}} as never).mockResolvedValueOnce({data: {search: {id: 'a'}}} as never);
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({data: {}} as never);
    const del = vi.spyOn(api, 'delete').mockResolvedValue({data: {}} as never);

    expect(await actual.destinationsApi.history()).toEqual([{id: 'a'}]);
    expect(get).toHaveBeenCalledWith('/destinations/history');
    expect(await actual.destinationsApi.open('a')).toEqual({id: 'a'});
    expect(get).toHaveBeenLastCalledWith('/destinations/history/a');
    await actual.destinationsApi.setStatus('a', 'created', 't1');
    expect(patch).toHaveBeenCalledWith('/destinations/history/a', {status: 'created', tripId: 't1'});
    await actual.destinationsApi.setStatus('a', 'draft');
    expect(patch).toHaveBeenLastCalledWith('/destinations/history/a', {status: 'draft'});
    await actual.destinationsApi.remove('a');
    expect(del).toHaveBeenCalledWith('/destinations/history/a');
  });
});

describe('RecommendPage', () => {
  it('links to the chat for anything else to ask', async () => {
    render();
    expect(screen.getByText(t('destinations.toChatHint'))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: t('destinations.toChat')}));
    expect(await currentPath()).toBe('/assistant/chat');
  });

  it('does not call the AI for an empty request and flags every field, like the new-plan form', async () => {
    render();
    await userEvent.click(screen.getByRole('button', {name: t('destinations.ask')}));
    expect(await screen.findByText(t('destinations.required'))).toBeInTheDocument();
    // interests, region and budget say how else to fix it
    expect(screen.getAllByText(t('destinations.orChoose'))).toHaveLength(3);
    expect(screen.getByLabelText(t('destinations.query'))).toBeInvalid();
    expect(screen.getByRole('group', {name: t('destinations.interests')})).toBeInvalid();
    expect(destinationsApi.recommend).not.toHaveBeenCalled();
  });

  it('clears the error as soon as the user gives any input, and shows it again if they take it back', async () => {
    render();
    await userEvent.click(screen.getByRole('button', {name: t('destinations.ask')}));
    expect(await screen.findByText(t('destinations.required'))).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', {name: t('trips.create.areaHistory')}));
    expect(screen.queryByText(t('destinations.required'))).toBeNull();

    await userEvent.click(screen.getByRole('button', {name: t('trips.create.areaHistory')}));
    expect(screen.getByText(t('destinations.required'))).toBeInTheDocument();
  });

  it('shows no error before the first send, but counts the characters and flags a too long request at once', async () => {
    render();
    expect(screen.queryByText(t('destinations.required'))).toBeNull();
    expect(screen.getByText('0/500')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(t('destinations.query')));
    await userEvent.paste('a'.repeat(501));
    expect(screen.getByText('501/500')).toBeInTheDocument();
    expect(screen.getByText(t('destinations.tooLong', {max: 500}))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: t('destinations.ask')}));
    expect(destinationsApi.recommend).not.toHaveBeenCalled();
  });

  it('does not send a region that is not in the list and says so under the field', async () => {
    render();
    await userEvent.type(screen.getByPlaceholderText(t('destinations.anyRegion')), 'Không có thật');
    await ask();
    expect(await screen.findByText(t('destinations.regionInvalid'))).toBeInTheDocument();
    expect(destinationsApi.recommend).not.toHaveBeenCalled();
  });

  it('sends the interests, region and budget with the request', async () => {
    vi.mocked(destinationsApi.recommend).mockResolvedValue(result);
    render();

    await userEvent.click(screen.getByRole('button', {name: t('trips.create.areaHistory')}));
    await userEvent.type(screen.getByPlaceholderText(t('destinations.anyRegion')), 'Đà N');
    await userEvent.click(within(screen.getByRole('listbox')).getByRole('button', {name: 'Đà Nẵng'}));
    await userEvent.click(screen.getByRole('radio', {name: new RegExp(t('trips.create.budgetMid'))}));
    await ask();

    expect(await screen.findByText('Thác Datanla')).toBeInTheDocument();
    expect(destinationsApi.recommend).toHaveBeenCalledWith({
      query: 'Nơi mát mẻ',
      interests: ['Lịch sử'],
      region: 'Đà Nẵng',
      budget: '1.000.000 VND - 5.000.000 VND',
    });
  });

  it('clears the budget when the chosen range is chosen again', async () => {
    vi.mocked(destinationsApi.recommend).mockResolvedValue(result);
    render();
    const mid = () => screen.getByRole('radio', {name: new RegExp(t('trips.create.budgetMid'))});
    await userEvent.click(mid());
    expect(mid()).toBeChecked();
    await userEvent.click(mid());
    expect(mid()).not.toBeChecked();
    await ask();
    expect(destinationsApi.recommend).toHaveBeenCalledWith(expect.objectContaining({budget: ''}));
  });

  it('shows name, description and reason, and labels places the app does not know', async () => {
    vi.mocked(destinationsApi.recommend).mockResolvedValue(result);
    render();
    await ask();

    expect(await screen.findByText('Hồ Xuân Hương')).toBeInTheDocument();
    expect(screen.getByText('Hồ giữa lòng thành phố')).toBeInTheDocument();
    expect(screen.getByText('Không khí mát mẻ')).toBeInTheDocument();
    expect(screen.getByText(t('destinations.inApp'))).toBeInTheDocument();
    expect(screen.getByText(t('destinations.aiOnly'))).toBeInTheDocument();
    expect(screen.getByText(t('destinations.aiOnlyHint'))).toBeInTheDocument();
    // details only for the place the app has data for
    expect(screen.getAllByRole('button', {name: t('destinations.viewDetails')})).toHaveLength(1);
  });

  it('opens the details (image, safe videos only)', async () => {
    vi.mocked(destinationsApi.recommend).mockResolvedValue(result);
    render();
    await ask();

    await userEvent.click(await screen.findByRole('button', {name: t('destinations.viewDetails')}));
    expect(screen.getByRole('img', {name: 'Hồ Xuân Hương, Đà Lạt'})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Đà Lạt 4K'})).toHaveAttribute('href', 'https://www.youtube.com/watch?v=V9IIO8GkssE');
    expect(screen.queryByText('Video lạ')).toBeNull();
  });

  it('plans a trip from any suggestion: province and the place as a note', async () => {
    vi.mocked(destinationsApi.recommend).mockResolvedValue(result);
    render();
    await ask();

    // a place the AI alone suggested can be planned too
    await userEvent.click(await screen.findByRole('button', {name: t('destinations.planTripFor', {name: 'Thác Datanla'})}));
    expect(await currentPath()).toBe('/assistant/trips/new');
    expect(await currentState()).toEqual({location: 'Lâm Đồng', fromSuggestion: true, note: 'Thác Datanla (Lâm Đồng): Thác nước'});
  });

  it('opens the dialog to add a suggestion to an existing trip', async () => {
    vi.mocked(destinationsApi.recommend).mockResolvedValue(result);
    vi.mocked(tripsApi.list).mockResolvedValue([]);
    render();
    await ask();

    await userEvent.click(await screen.findByRole('button', {name: t('destinations.addToTripFor', {name: 'Thác Datanla'})}));
    expect(await screen.findByRole('dialog', {name: t('destinations.addTitle', {name: 'Thác Datanla'})})).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: t('destinations.addCancel')}));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not prefill a province that is not in the list', async () => {
    vi.mocked(destinationsApi.recommend).mockResolvedValue({message: 'ok', historyId: null, recommendations: [{name: 'Nơi X', province: 'Tỉnh lạ', description: 'Mô tả', reason: 'Lý do', inApp: false}]});
    render();
    await ask();
    await userEvent.click(await screen.findByRole('button', {name: t('destinations.planTripFor', {name: 'Nơi X'})}));
    expect(await currentState()).toEqual({fromSuggestion: true, note: 'Nơi X (Tỉnh lạ): Mô tả'});
  });

  it('hides the details again', async () => {
    vi.mocked(destinationsApi.recommend).mockResolvedValue(result);
    render();
    await ask();

    await userEvent.click(await screen.findByRole('button', {name: t('destinations.viewDetails')}));
    await userEvent.click(screen.getByRole('button', {name: t('destinations.hideDetails')}));
    expect(screen.queryByRole('region', {name: t('destinations.detailsOf', {name: 'Hồ Xuân Hương'})})).toBeNull();
  });

  it('shows a loading state while the AI works', async () => {
    vi.mocked(destinationsApi.recommend).mockReturnValue(pending());
    render();
    await ask();
    expect(await screen.findByText(t('destinations.loading'))).toBeInTheDocument();
  });

  it('tells the user when the AI finds nothing', async () => {
    vi.mocked(destinationsApi.recommend).mockResolvedValue({recommendations: [], historyId: null, message: 'none'});
    render();
    await ask();
    expect(await screen.findByText(t('destinations.empty'))).toBeInTheDocument();
  });

  it.each([
    ['an unreadable answer (502)', httpError(502, {code: 'AI_INVALID_RESPONSE'}), 'destinations.invalid'],
    ['an AI outage (503)', httpError(503, {code: 'AI_QUOTA'}), 'destinations.unavailable'],
    ['a database outage (503)', httpError(503), 'common.databaseError'],
    ['no connection', networkError(), 'common.networkError'],
    ['another error', httpError(500), 'destinations.failed'],
  ])('shows an error for %s and lets the user retry', async (_name, error, key) => {
    vi.mocked(destinationsApi.recommend).mockRejectedValueOnce(error).mockResolvedValueOnce(result);
    render();
    await ask();

    expect(await screen.findByText(t(key))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: t('common.retry')}));
    expect(await screen.findByText('Thác Datanla')).toBeInTheDocument();
    expect(destinationsApi.recommend).toHaveBeenCalledTimes(2);
  });
});
