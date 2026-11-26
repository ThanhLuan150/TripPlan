import {Linking, TextInput, TouchableOpacity} from 'react-native';
import i18n from '../src/i18n';
import {api} from '../src/lib/apiClient';
import {destinationsApi} from '../src/api';
import {
  isYoutubeLink,
  planParams,
  recommendErrorKey,
  recommendErrors,
} from '../src/lib/recommend';
import DropdownInput from '../src/components/DropdownInput';
import Recommend from '../src/screens/Recommend';
import Trips from '../src/screens/Trips';
import {nav, resetNav} from './helpers/nav';
import {act, allText, flush, press, pressText, renderApp} from './helpers/render';

jest.mock('@react-navigation/native', () => require('./helpers/nav').navModule);
jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  destinationsApi: {
    recommend: jest.fn(),
    history: jest.fn().mockResolvedValue([]),
    open: jest.fn(),
    setStatus: jest.fn().mockResolvedValue({}),
    remove: jest.fn(),
  },
  tripsApi: {list: jest.fn(), favorites: jest.fn()},
}));

const t = (key: string, opts?: object) => (i18n.t as any)(key, opts) as string;
type Tree = ReturnType<typeof renderApp>;

const result = {
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

const recommend = destinationsApi.recommend as jest.Mock;
const field = (tree: Tree, label: string) =>
  tree.root.findAllByType(TextInput).find(n => n.props.accessibilityLabel === label || n.props.placeholder === label)!;
const type = (tree: Tree, label: string, text: string) => act(() => field(tree, label).props.onChangeText(text));
const button = (tree: Tree, label: string) =>
  tree.root.findAll(n => n.props.accessibilityLabel === label && n.props.onPress && n.type === TouchableOpacity)[0];
const ask = async (tree: Tree, text = 'Nơi mát mẻ') => {
  type(tree, t('recommend.query'), text);
  press(button(tree, t('recommend.ask')));
  await flush();
};

beforeEach(() => {
  jest.clearAllMocks();
  resetNav();
});

describe('recommendErrors', () => {
  const base = {query: '', interests: [], region: '', budget: ''};
  it('needs at least one input and limits the lengths', () => {
    expect(recommendErrors(base)).toEqual({query: 'recommend.required', interests: 'recommend.orChoose', region: 'recommend.orChoose', budget: 'recommend.orChoose'});
    expect(recommendErrors({...base, query: '  '})).toEqual({query: 'recommend.required', interests: 'recommend.orChoose', region: 'recommend.orChoose', budget: 'recommend.orChoose'});
    expect(recommendErrors({...base, query: 'biển'})).toEqual({});
    expect(recommendErrors({...base, interests: ['Lịch sử']})).toEqual({});
    expect(recommendErrors({...base, region: 'Đà Nẵng'})).toEqual({});
    expect(recommendErrors({...base, budget: '3 triệu'})).toEqual({});
    expect(recommendErrors({...base, region: 'Không có thật'})).toEqual({region: 'recommend.regionInvalid'});
    expect(recommendErrors({...base, query: 'a'.repeat(501)})).toEqual({query: 'recommend.tooLong'});
    expect(recommendErrors({...base, query: 'a', budget: 'b'.repeat(51)})).toEqual({budget: 'recommend.budgetTooLong'});
  });
});

describe('recommendErrorKey / isYoutubeLink', () => {
  it('tells an unreadable answer, an AI outage and other errors apart', () => {
    expect(recommendErrorKey({response: {status: 502, data: {code: 'AI_INVALID_RESPONSE'}}})).toBe('recommend.invalid');
    expect(recommendErrorKey({response: {status: 502}})).toBe('recommend.invalid');
    expect(recommendErrorKey({response: {status: 503, data: {code: 'AI_QUOTA'}}})).toBe('recommend.unavailable');
    expect(recommendErrorKey({response: {status: 500}})).toBe('recommend.failed');
    expect(recommendErrorKey(new Error('Network Error'))).toBe('recommend.failed');
  });

  it('accepts only youtube links', () => {
    expect(isYoutubeLink('https://www.youtube.com/watch?v=abc')).toBe(true);
    expect(isYoutubeLink('https://youtu.be/abc')).toBe(true);
    expect(isYoutubeLink('https://evil.example/youtube.com/x')).toBe(false);
    expect(isYoutubeLink('http://youtube.com/x')).toBe(false);
  });
});

describe('planParams', () => {
  const item = {name: 'A', province: '', description: 'd', reason: 'r', inApp: false};
  it('uses a valid province of the place, then of the suggestion, and limits the note', () => {
    expect(planParams({...item, province: 'Hà Giang'})).toEqual({location: 'Hà Giang', fromSuggestion: true, note: 'A (Hà Giang): d'});
    expect(planParams({...item, province: 'x', place: {id: '1', title: 't', location: 'Lâm Đồng', imageUrl: '', videos: []}}).location).toBe('Lâm Đồng');
    expect(planParams(item)).toEqual({fromSuggestion: true, note: 'A: d'});
    expect(planParams({...item, description: 'd'.repeat(2000)}).note).toHaveLength(1500);
  });
});

describe('destinationsApi', () => {
  it('posts the trimmed request and unwraps the answer', async () => {
    const actual = jest.requireActual('../src/api').destinationsApi;
    const post = jest.spyOn(api, 'post').mockResolvedValue({data: result} as never);
    const answer = await actual.recommend({query: ' biển ', interests: ['Lịch sử'], region: ' Đà Nẵng ', budget: ' 3 triệu '});
    expect(post).toHaveBeenCalledWith('/destinations/recommend', {query: 'biển', interests: ['Lịch sử'], region: 'Đà Nẵng', budget: '3 triệu'});
    expect(answer).toBe(result);
    post.mockRestore();
  });
});

describe('Trips: recommendation entry', () => {
  it('opens the recommendation screen', async () => {
    (require('../src/api').tripsApi.list as jest.Mock).mockResolvedValue([]);
    (require('../src/api').tripsApi.favorites as jest.Mock).mockResolvedValue([]);
    const tree = renderApp(<Trips />);
    await flush();
    pressText(tree, t('recommend.open'));
    expect(nav.navigate).toHaveBeenCalledWith('Recommend');
  });
});

describe('Recommend', () => {
  it('links to the chat for anything else to ask', async () => {
    const tree = renderApp(<Recommend />);
    expect(allText(tree)).toContain(t('recommend.toChatHint'));
    pressText(tree, t('recommend.toChat'));
    expect(nav.navigate).toHaveBeenCalledWith('Tabs', {screen: 'Assistant'});
  });

  it('does not call the AI for an empty request and flags every field, like the new-plan form', async () => {
    const tree = renderApp(<Recommend />);
    press(button(tree, t('recommend.ask')));
    expect(allText(tree)).toContain(t('recommend.required'));
    // interests, region and budget say how else to fix it
    expect(allText(tree).split(t('recommend.orChoose'))).toHaveLength(4);
    expect(recommend).not.toHaveBeenCalled();
  });

  it('clears the error as soon as the user gives any input, and shows it again if they take it back', async () => {
    const tree = renderApp(<Recommend />);
    press(button(tree, t('recommend.ask')));
    expect(allText(tree)).toContain(t('recommend.required'));

    pressText(tree, t('trips.create.areaHistory'));
    expect(allText(tree)).not.toContain(t('recommend.required'));

    pressText(tree, t('trips.create.areaHistory'));
    expect(allText(tree)).toContain(t('recommend.required'));
  });

  it('shows no error before the first send, but counts the characters and flags a too long request at once', async () => {
    const tree = renderApp(<Recommend />);
    expect(allText(tree)).not.toContain(t('recommend.required'));
    expect(allText(tree)).toContain('0/500');

    type(tree, t('recommend.query'), 'a'.repeat(501));
    expect(allText(tree)).toContain('501/500');
    expect(allText(tree)).toContain(t('recommend.tooLong', {max: 500}));
    press(button(tree, t('recommend.ask')));
    expect(recommend).not.toHaveBeenCalled();
  });

  it('does not send a region that is not in the list and says so under the field', async () => {
    const tree = renderApp(<Recommend />);
    type(tree, t('recommend.regionPlaceholder'), 'Không có thật');
    press(button(tree, t('recommend.ask')));
    expect(allText(tree)).toContain(t('recommend.regionInvalid'));
    expect(recommend).not.toHaveBeenCalled();
  });

  it('sends the interests, region and budget with the request', async () => {
    recommend.mockResolvedValue(result);
    const tree = renderApp(<Recommend />);
    pressText(tree, t('trips.create.areaHistory'));
    type(tree, t('recommend.regionPlaceholder'), 'Đà N');
    pressText(tree, 'Đà Nẵng');
    // the second dropdown is the budget: open it and pick the middle range
    act(() => tree.root.findAllByType(DropdownInput)[1].props.onToggle());
    pressText(tree, t('trips.create.budgetRange', {min: '1.000.000', max: '5.000.000'}));
    await ask(tree);

    expect(recommend).toHaveBeenCalledWith({query: 'Nơi mát mẻ', interests: ['Lịch sử'], region: 'Đà Nẵng', budget: '1.000.000 VND - 5.000.000 VND'});
  });

  it('picking "any budget" clears the budget', async () => {
    recommend.mockResolvedValue(result);
    const tree = renderApp(<Recommend />);
    act(() => tree.root.findAllByType(DropdownInput)[1].props.onToggle());
    pressText(tree, t('trips.create.budgetUnder', {max: '1.000.000'}));
    act(() => tree.root.findAllByType(DropdownInput)[1].props.onToggle());
    pressText(tree, t('recommend.anyBudget'));
    await ask(tree);
    expect(recommend).toHaveBeenCalledWith(expect.objectContaining({budget: ''}));
  });

  it('shows name, description and reason and labels places the app does not know', async () => {
    recommend.mockResolvedValue(result);
    const tree = renderApp(<Recommend />);
    await ask(tree);

    const text = allText(tree);
    for (const part of ['Hồ Xuân Hương', 'Hồ giữa lòng thành phố', 'Không khí mát mẻ', 'Thác Datanla', t('recommend.inApp'), t('recommend.aiOnly'), t('recommend.aiOnlyHint')]) {
      expect(text).toContain(part);
    }
    // details only for the place the app has data for
    expect(allText(tree).split(t('recommend.viewDetails'))).toHaveLength(2);
  });

  it('opens the details (safe videos only), plans a trip there and hides them again', async () => {
    recommend.mockResolvedValue(result);
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const tree = renderApp(<Recommend />);
    await ask(tree);

    pressText(tree, t('recommend.viewDetails'));
    expect(allText(tree)).toContain('Hồ Xuân Hương, Đà Lạt · Lâm Đồng');
    expect(allText(tree)).not.toContain('Video lạ');
    pressText(tree, 'Đà Lạt 4K');
    expect(open).toHaveBeenCalledWith('https://www.youtube.com/watch?v=V9IIO8GkssE');

    pressText(tree, t('recommend.hideDetails'));
    expect(allText(tree)).not.toContain('Hồ Xuân Hương, Đà Lạt · Lâm Đồng');
    open.mockRestore();
  });

  it('plans a trip from any suggestion: province and the place as a note', async () => {
    recommend.mockResolvedValue(result);
    const tree = renderApp(<Recommend />);
    await ask(tree);

    // a place the AI alone suggested can be planned too
    press(button(tree, t('recommend.planTripFor', {name: 'Thác Datanla'})));
    expect(nav.navigate).toHaveBeenCalledWith('CreateTrip', {location: 'Lâm Đồng', fromSuggestion: true, note: 'Thác Datanla (Lâm Đồng): Thác nước'});
  });

  it('does not prefill a province that is not in the list', async () => {
    recommend.mockResolvedValue({message: 'ok', recommendations: [{name: 'Nơi X', province: 'Tỉnh lạ', description: 'Mô tả', reason: 'Lý do', inApp: false}]});
    const tree = renderApp(<Recommend />);
    await ask(tree);
    press(button(tree, t('recommend.planTripFor', {name: 'Nơi X'})));
    expect(nav.navigate).toHaveBeenCalledWith('CreateTrip', {fromSuggestion: true, note: 'Nơi X (Tỉnh lạ): Mô tả'});
  });

  it('tells the user when the AI finds nothing', async () => {
    recommend.mockResolvedValue({recommendations: [], message: 'none'});
    const tree = renderApp(<Recommend />);
    await ask(tree);
    expect(allText(tree)).toContain(t('recommend.empty'));
  });

  it.each([
    ['an unreadable answer', {response: {status: 502, data: {code: 'AI_INVALID_RESPONSE'}}}, 'recommend.invalid'],
    ['an AI outage', {response: {status: 503, data: {code: 'AI_QUOTA'}}}, 'recommend.unavailable'],
    ['another error', {response: {status: 500}}, 'recommend.failed'],
  ])('shows an error for %s and a new request clears it', async (_name, error, key) => {
    recommend.mockRejectedValueOnce(error).mockResolvedValueOnce(result);
    const tree = renderApp(<Recommend />);
    await ask(tree);
    expect(allText(tree)).toContain(t(key));

    press(button(tree, t('recommend.ask')));
    await flush();
    expect(allText(tree)).not.toContain(t(key));
    expect(allText(tree)).toContain('Thác Datanla');
  });
});
