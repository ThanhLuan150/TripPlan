import {TextInput, TouchableOpacity} from 'react-native';
import i18n from '../src/i18n';
import {tripsApi} from '../src/api';
import PublicTrips from '../src/screens/PublicTrips';
import {nav, resetNav} from './helpers/nav';
import {act, allText, flush, press, pressText, renderApp} from './helpers/render';

jest.mock('@react-navigation/native', () => require('./helpers/nav').navModule);
jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  tripsApi: {
    listPublic: jest.fn(),
    likePublic: jest.fn(),
    unlikePublic: jest.fn(),
    savePost: jest.fn(),
    unsavePost: jest.fn(),
  },
}));

const t = (key: string, opts?: object) => (i18n.t as any)(key, opts) as string;
const list = tripsApi.listPublic as jest.Mock;

const card = (id: string, nameTrip: string, extra: object = {}) => ({
  _id: id,
  nameTrip,
  location: 'Lâm Đồng',
  startDate: '2026-03-02T09:00:00',
  endDate: '2026-03-04T09:00:00',
  likesCount: 0,
  liked: false,
  ...extra,
});
const plain = {page: 1, limit: 12, total: 1, items: [card('z9', 'Every plan')]};
const found = {q: 'lạt', page: 1, limit: 12, total: 2, items: [card('a1', 'Đà Lạt 3 ngày'), card('b2', 'Đà Lạt 2 ngày')]};

type Tree = ReturnType<typeof renderApp>;
const box = (tree: Tree) => tree.root.findByType(TextInput);
const type = (tree: Tree, text: string) => act(() => box(tree).props.onChangeText(text));
const submit = (tree: Tree) => act(() => box(tree).props.onSubmitEditing());
const clearButtons = (tree: Tree) =>
  tree.root.findAllByType(TouchableOpacity).filter(n => n.props.accessibilityLabel === t('trips.searchClear'));
// the pause after which typing searches by itself
const pause = () => act(async () => new Promise(resolve => setTimeout(resolve, 450)));

beforeEach(() => {
  jest.clearAllMocks();
  resetNav();
  list.mockImplementation(async (_page: number, q: string) => (q ? found : plain));
});

describe('PublicTrips: search', () => {
  it('has a search box with a hint and a length limit', async () => {
    const tree = renderApp(<PublicTrips />);
    await flush();

    expect(box(tree).props.accessibilityLabel).toBe(t('trips.searchLabel'));
    expect(box(tree).props.placeholder).toBe(t('trips.searchPlaceholder'));
    expect(box(tree).props.maxLength).toBe(100);
    expect(list).toHaveBeenCalledWith(1, '');
  });

  it('searches after the user stops typing and shows how many plans were found', async () => {
    const tree = renderApp(<PublicTrips />);
    await flush();

    type(tree, 'l');
    type(tree, 'lạt');
    await pause();
    await flush();

    expect(list).toHaveBeenLastCalledWith(1, 'lạt');
    expect(allText(tree)).toContain('Đà Lạt 3 ngày');
    expect(allText(tree)).toContain(t('trips.searchResults', {q: 'lạt', count: 2}));
    // one request for the whole word, not one per letter
    expect(list.mock.calls.filter(([, q]) => q)).toHaveLength(1);
  });

  it('searches at once when the user submits, with the keyword trimmed', async () => {
    const tree = renderApp(<PublicTrips />);
    await flush();

    type(tree, '  lạt  ');
    submit(tree);
    await flush();

    expect(list).toHaveBeenLastCalledWith(1, 'lạt');
  });

  it('a keyword of only spaces is not a search', async () => {
    const tree = renderApp(<PublicTrips />);
    await flush();

    type(tree, '    ');
    submit(tree);
    await pause();
    await flush();

    expect(list).toHaveBeenCalledTimes(1);
    expect(allText(tree)).not.toContain(t('trips.searchResults', {q: '', count: 1}));
  });

  it('says so when nothing matches, and clearing the keyword brings the whole list back', async () => {
    list.mockImplementation(async (_page: number, q: string) => (q ? {q, page: 1, limit: 12, total: 0, items: []} : plain));
    const tree = renderApp(<PublicTrips />);
    await flush();

    type(tree, 'zzz');
    submit(tree);
    await flush();

    expect(allText(tree)).toContain(t('trips.searchEmpty', {q: 'zzz'}));
    expect(allText(tree)).toContain(t('trips.searchEmptyHint'));
    // two clear controls: the x of the box and the button of the empty state
    press(clearButtons(tree)[clearButtons(tree).length - 1]);
    await flush();

    expect(list).toHaveBeenLastCalledWith(1, '');
    expect(allText(tree)).toContain('Every plan');
    expect(box(tree).props.value).toBe('');
  });

  it('the clear button of the box only shows while there is text', async () => {
    const tree = renderApp(<PublicTrips />);
    await flush();
    expect(clearButtons(tree)).toHaveLength(0);

    type(tree, 'a');

    expect(clearButtons(tree)).toHaveLength(1);
    press(clearButtons(tree)[0]);
    await flush();
    expect(box(tree).props.value).toBe('');
    expect(clearButtons(tree)).toHaveLength(0);
  });

  it('pages the results of a search', async () => {
    list.mockImplementation(async (page: number, q: string) => ({
      q,
      page,
      limit: 1,
      total: 2,
      items: [card(`id${page}`, `${q || 'all'} plan ${page}`)],
    }));
    const tree = renderApp(<PublicTrips />);
    await flush();
    type(tree, 'hue');
    submit(tree);
    await flush();

    pressText(tree, t('trips.exploreMore'));
    await flush();

    expect(list).toHaveBeenLastCalledWith(2, 'hue');
    expect(allText(tree)).toContain('hue plan 1');
    expect(allText(tree)).toContain('hue plan 2');
  });

  it('shows the introduction of a post on its card', async () => {
    list.mockResolvedValue({...plain, items: [card('z9', 'Every plan', {postContent: 'A week of coffee and pine hills'})]});
    const tree = renderApp(<PublicTrips />);
    await flush();

    expect(allText(tree)).toContain('A week of coffee and pine hills');
  });

  it('shows a search error when the search fails', async () => {
    list.mockResolvedValueOnce(plain).mockRejectedValue({response: {status: 500, data: {}}});
    const tree = renderApp(<PublicTrips />);
    await flush();

    type(tree, 'lạt');
    submit(tree);
    await flush();

    expect(allText(tree)).toContain(t('trips.searchFailed'));
    expect(nav.navigate).not.toHaveBeenCalled();
  });
});
