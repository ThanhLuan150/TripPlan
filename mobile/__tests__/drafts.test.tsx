import AsyncStorage from '@react-native-async-storage/async-storage';
import {TextInput, TouchableOpacity} from 'react-native';
import i18n from '../src/i18n';
import {destinationsApi} from '../src/api';
import AreaTypeGrid from '../src/components/AreaTypeGrid';
import DropdownInput from '../src/components/DropdownInput';
import {areaTypes} from '../src/lib/areaTypes';
import {DraftNames, drafts} from '../src/lib/drafts';
import {subscribeAlert} from '../src/lib/alert';
import CreateTrip from '../src/screens/CreateTrip';
import Recommend from '../src/screens/Recommend';
import {nav, resetNav} from './helpers/nav';
import {act, allText, flush, press, pressText, renderApp} from './helpers/render';

jest.mock('@react-navigation/native', () => require('./helpers/nav').navModule);
jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  destinationsApi: {
    recommend: jest.fn(),
    history: jest.fn(),
    open: jest.fn(),
    setStatus: jest.fn(),
    remove: jest.fn(),
  },
  tripsApi: {list: jest.fn(), get: jest.fn(), addPlace: jest.fn()},
}));

const t = (key: string, opts?: object) => (i18n.t as any)(key, opts) as string;
type Tree = ReturnType<typeof renderApp>;
const api = destinationsApi as unknown as Record<string, jest.Mock>;

const KEY = (name: string) => `draft:${name}:anonymous`;
const stored = async (name: string) => JSON.parse((await AsyncStorage.getItem(KEY(name))) ?? 'null');
const wait = (ms = 600) => act(async () => new Promise(resolve => setTimeout(resolve, ms)));
const field = (tree: Tree, label: string) =>
  tree.root.findAllByType(TextInput).find(n => n.props.accessibilityLabel === label || n.props.placeholder === label)!;
const button = (tree: Tree, label: string) =>
  tree.root.findAll(n => n.type === TouchableOpacity && n.props.accessibilityLabel === label)[0];

const summary = (id: string, status: 'draft' | 'created', extra = {}) => ({
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
const result = {
  message: 'ok',
  historyId: 'h1',
  recommendations: [
    {name: 'Hồ Xuân Hương', province: 'Lâm Đồng', description: 'Hồ giữa lòng thành phố', reason: 'Mát mẻ', inApp: false},
    {name: 'Thác Datanla', province: 'Lâm Đồng', description: 'Thác nước', reason: 'Thiên nhiên', inApp: false},
  ],
};

// trees are unmounted after each test: a form left on screen would keep saving its draft into the next test
const trees: Tree[] = [];
const mountApp = (element: Parameters<typeof renderApp>[0]) => {
  const tree = renderApp(element);
  trees.push(tree);
  return tree;
};
afterEach(() => {
  trees.splice(0).forEach(tree => act(() => tree.unmount()));
});

let alerts: any[] = [];
let off: () => void;
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  resetNav({});
  api.history.mockResolvedValue([]);
  api.setStatus.mockResolvedValue({});
  alerts = [];
  off = subscribeAlert(a => alerts.push(a));
});
afterEach(() => off());

describe('drafts', () => {
  it('saves, loads and clears a draft per account', async () => {
    expect(await drafts.load('x')).toBeNull();
    await drafts.save('x', {a: 1});
    expect((await drafts.load<{a: number}>('x'))?.value).toEqual({a: 1});
    expect(await AsyncStorage.getItem('draft:x:anonymous')).not.toBeNull();

    await AsyncStorage.setItem('user', JSON.stringify({username: 'luan'}));
    expect(await drafts.load('x')).toBeNull();
    await drafts.save('x', {a: 2});
    expect(await AsyncStorage.getItem('draft:x:luan')).not.toBeNull();
    await drafts.clear('x');
    expect(await AsyncStorage.getItem('draft:x:luan')).toBeNull();
    expect(await AsyncStorage.getItem('draft:x:anonymous')).not.toBeNull();
  });

  it('ignores an unreadable draft and an unreadable user', async () => {
    await AsyncStorage.setItem('draft:y:anonymous', '{not json');
    expect(await drafts.load('y')).toBeNull();
    await AsyncStorage.setItem('draft:z:anonymous', JSON.stringify({value: 1}));
    expect(await drafts.load('z')).toBeNull();
    await AsyncStorage.setItem('user', 'not json');
    await drafts.save('y', 1);
    expect(await AsyncStorage.getItem('draft:y:anonymous')).toContain('"value":1');
  });

  it('never throws when the storage fails', async () => {
    const storage = AsyncStorage as unknown as Record<string, jest.Mock>;
    // load reads the user, then the draft
    storage.getItem.mockRejectedValueOnce(new Error('disk')).mockRejectedValueOnce(new Error('disk'));
    expect(await drafts.load('x')).toBeNull();
    storage.setItem.mockRejectedValueOnce(new Error('disk'));
    await expect(drafts.save('x', 1)).resolves.toBeUndefined();
    storage.removeItem.mockRejectedValueOnce(new Error('disk'));
    await expect(drafts.clear('x')).resolves.toBeUndefined();
  });
});

describe('CreateTrip draft', () => {
  const dropdowns = (tree: Tree) => tree.root.findAllByType(DropdownInput);

  it('does not save an empty form, saves what the user fills and offers it back with Continue', async () => {
    const first = mountApp(<CreateTrip />);
    await flush();
    await wait();
    expect(await stored(DraftNames.createTrip)).toBeNull();

    act(() => dropdowns(first)[0].props.onPick('Hà Nội'));
    act(() => first.root.findByType(AreaTypeGrid).props.onToggle(areaTypes[0].value));
    await wait();
    expect((await stored(DraftNames.createTrip)).value).toMatchObject({location: 'Hà Nội', areaTypes: [areaTypes[0].value]});
    act(() => first.unmount());

    const again = mountApp(<CreateTrip />);
    await flush();
    expect(allText(again)).toContain(t('drafts.found'));
    // the offer is not overwritten by the blank form
    expect(dropdowns(again)[0].props.value).toBe('');
    pressText(again, t('drafts.continue'));
    await flush();

    expect(dropdowns(again)[0].props.value).toBe('Hà Nội');
    expect(again.root.findByType(AreaTypeGrid).props.selected).toEqual([areaTypes[0].value]);
    expect(allText(again)).not.toContain(t('drafts.found'));
  });

  it('moves the dates of an old draft to today and keeps its length', async () => {
    await drafts.save(DraftNames.createTrip, {
      location: 'Hà Nội',
      startDate: new Date(2020, 0, 10).toISOString(),
      endDate: new Date(2020, 0, 12).toISOString(),
      quantity: 1,
      budget: '',
      areaTypes: [],
    });
    const tree = mountApp(<CreateTrip />);
    await flush();
    pressText(tree, t('drafts.continue'));
    await flush();

    const {DateRangeField} = {DateRangeField: require('../src/components/DateRangeField').default};
    const range = tree.root.findByType(DateRangeField);
    expect(range.props.startDate.getFullYear()).toBeGreaterThanOrEqual(2026);
    expect(range.props.endDate.getTime() - range.props.startDate.getTime()).toBe(2 * 24 * 60 * 60 * 1000);
  });

  it('Start new throws the draft away', async () => {
    await drafts.save(DraftNames.createTrip, {location: 'Huế', startDate: new Date().toISOString(), endDate: new Date().toISOString(), quantity: 1, budget: '', areaTypes: []});
    const tree = mountApp(<CreateTrip />);
    await flush();
    pressText(tree, t('drafts.startNew'));
    await flush();

    expect(dropdowns(tree)[0].props.value).toBe('');
    expect(await stored(DraftNames.createTrip)).toBeNull();
  });

  it('does not offer a draft when opened from a suggestion, and says where it came from', async () => {
    await drafts.save(DraftNames.createTrip, {location: 'Huế', startDate: new Date().toISOString(), endDate: new Date().toISOString(), quantity: 1, budget: '', areaTypes: []});
    resetNav({location: 'Lâm Đồng', note: 'Thác Datanla (Lâm Đồng): Thác nước', fromSuggestion: true});
    const tree = mountApp(<CreateTrip />);
    await flush();

    expect(allText(tree)).not.toContain(t('drafts.found'));
    expect(allText(tree)).toContain(t('trips.create.fromSuggestion'));
    expect(dropdowns(tree)[0].props.value).toBe('Lâm Đồng');
  });

  it('asks to pick the province when the suggestion has none, and links to the AI ideas', async () => {
    resetNav({note: 'Nơi X', fromSuggestion: true});
    const tree = mountApp(<CreateTrip />);
    await flush();
    expect(allText(tree)).toContain(t('trips.create.fromChatNoPlace'));

    pressText(tree, t('trips.create.askAi'));
    expect(nav.navigate).toHaveBeenCalledWith('Recommend');
  });
});

describe('Recommend draft', () => {
  it('does not save an empty form, saves what the user types and offers it after a reload', async () => {
    const first = mountApp(<Recommend />);
    await flush();
    await wait();
    expect(await stored(DraftNames.recommend)).toBeNull();

    act(() => field(first, t('recommend.query')).props.onChangeText('Nơi mát mẻ'));
    pressText(first, t('trips.create.areaHistory'));
    await wait();
    expect((await stored(DraftNames.recommend)).value).toMatchObject({query: 'Nơi mát mẻ', interests: ['Lịch sử'], budgetIndex: -1});
    act(() => first.unmount());

    const again = mountApp(<Recommend />);
    await flush();
    expect(allText(again)).toContain(t('drafts.found'));
    expect(field(again, t('recommend.query')).props.value).toBe('');
    pressText(again, t('drafts.continue'));
    await flush();

    expect(field(again, t('recommend.query')).props.value).toBe('Nơi mát mẻ');
    expect(allText(again)).not.toContain(t('drafts.found'));
  });

  it('Start new throws the draft away', async () => {
    await drafts.save(DraftNames.recommend, {query: 'cũ', interests: [], region: '', budgetIndex: -1});
    const tree = mountApp(<Recommend />);
    await flush();
    pressText(tree, t('drafts.startNew'));
    await flush();

    expect(field(tree, t('recommend.query')).props.value).toBe('');
    expect(await stored(DraftNames.recommend)).toBeNull();
  });

  it('does not keep a draft once the AI has answered (the history has it)', async () => {
    api.recommend.mockResolvedValue(result);
    const tree = mountApp(<Recommend />);
    await flush();
    act(() => field(tree, t('recommend.query')).props.onChangeText('Nơi mát mẻ'));
    press(button(tree, t('recommend.ask')));
    await flush();
    await wait();

    expect(allText(tree)).toContain('Thác Datanla');
    expect(await stored(DraftNames.recommend)).toBeNull();
  });
});

describe('Recommend history', () => {
  const mount = async () => {
    const tree = mountApp(<Recommend />);
    await flush();
    return tree;
  };

  it('shows the drafts and the created ones in two groups', async () => {
    api.history.mockResolvedValue([summary('a', 'draft'), summary('b', 'created', {query: 'Biển đẹp'})]);
    const tree = await mount();

    const text = allText(tree);
    expect(text).toContain(t('recommend.historyDrafts'));
    expect(text).toContain(t('recommend.historyCreated'));
    expect(text).toContain('Nơi mát mẻ');
    expect(text).toContain('Biển đẹp');
    expect(text).toContain('Hồ Xuân Hương, Thác Datanla');
  });

  it('names a suggestion made only of choices by those choices, and says so when there is nothing', async () => {
    api.history.mockResolvedValue([summary('a', 'draft', {query: ''})]);
    expect(allText(await mount())).toContain('Lịch sử, Lâm Đồng');

    api.history.mockResolvedValue([]);
    expect(allText(await mount())).toContain(t('recommend.historyEmpty'));
  });

  it('can retry when the history does not load', async () => {
    api.history.mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce([summary('a', 'draft')]);
    const tree = await mount();
    await flush(8);
    expect(allText(tree)).toContain(t('recommend.historyLoadFailed'));

    pressText(tree, t('recommend.addRetry'));
    await flush();
    expect(allText(tree)).toContain('Nơi mát mẻ');
  });

  it('opens an earlier suggestion: its request goes back into the form and its places are shown', async () => {
    api.history.mockResolvedValue([summary('a', 'draft')]);
    api.open.mockResolvedValue({...summary('a', 'draft'), recommendations: result.recommendations});
    const tree = await mount();

    press(button(tree, `${t('recommend.historyOpen')}: Nơi mát mẻ`));
    await flush();

    expect(api.open).toHaveBeenCalledWith('a');
    expect(allText(tree)).toContain('Thác Datanla');
    expect(field(tree, t('recommend.query')).props.value).toBe('Nơi mát mẻ');
    expect(allText(tree)).toContain(t('recommend.historyOpened', {date: '1/3/2026'}));
    // reading is not a new question
    expect(api.recommend).not.toHaveBeenCalled();
  });

  it('tells the user when a suggestion cannot be opened', async () => {
    api.history.mockResolvedValue([summary('a', 'draft')]);
    api.open.mockRejectedValue(new Error('404'));
    const tree = await mount();
    press(button(tree, `${t('recommend.historyOpen')}: Nơi mát mẻ`));
    await flush();
    expect(alerts.some(a => a.title === t('recommend.historyOpenFailed'))).toBe(true);
  });

  it('deletes a suggestion only after the user confirms, and keeps it on cancel', async () => {
    api.history.mockResolvedValue([summary('a', 'draft')]);
    api.remove.mockResolvedValue({});
    const tree = await mount();

    press(button(tree, `${t('recommend.historyDelete')}: Nơi mát mẻ`));
    await flush();
    expect(allText(tree)).toContain(t('recommend.historyDeleteTitle'));
    pressText(tree, t('common.cancel'));
    await flush();
    expect(api.remove).not.toHaveBeenCalled();

    press(button(tree, `${t('recommend.historyDelete')}: Nơi mát mẻ`));
    await flush();
    pressText(tree, t('recommend.historyDelete'), 'last');
    await flush();
    expect(api.remove).toHaveBeenCalledWith('a');
    expect(alerts.some(a => a.title === t('recommend.historyDeleted'))).toBe(true);
  });

  it('tells the user when deleting fails', async () => {
    api.history.mockResolvedValue([summary('a', 'draft')]);
    api.remove.mockRejectedValue(new Error('500'));
    const tree = await mount();
    press(button(tree, `${t('recommend.historyDelete')}: Nơi mát mẻ`));
    await flush();
    pressText(tree, t('recommend.historyDelete'), 'last');
    await flush();
    expect(alerts.some(a => a.title === t('recommend.historyDeleteFailed'))).toBe(true);
  });

  it('moves a suggestion to "created" when a plan is started from it', async () => {
    api.recommend.mockResolvedValue(result);
    const tree = await mount();
    act(() => field(tree, t('recommend.query')).props.onChangeText('Nơi mát mẻ'));
    press(button(tree, t('recommend.ask')));
    await flush();

    press(button(tree, t('recommend.planTripFor', {name: 'Thác Datanla'})));
    await flush();

    expect(api.setStatus).toHaveBeenCalledWith('h1', 'created', undefined);
    expect(nav.navigate).toHaveBeenCalledWith('CreateTrip', expect.objectContaining({fromSuggestion: true}));
  });

  it('moves a suggestion to "created" when a place of it is added to a trip', async () => {
    const {tripsApi} = require('../src/api');
    api.recommend.mockResolvedValue(result);
    tripsApi.list.mockResolvedValue([{_id: 't2', nameTrip: 'Đà Lạt 3 ngày', location: 'Lâm Đồng', startDate: '2026-04-01', endDate: '2026-04-03', status: 'active'}]);
    tripsApi.get.mockResolvedValue({location: 'Lâm Đồng', startDate: '2026-04-01', endDate: '2026-04-03', dataTripDays: [{_id: 'd1', title: 'Ngày đầu', date: '2026-04-01', challenges: []}]});
    tripsApi.addPlace.mockResolvedValue({challengeId: 'c9', day: {id: 'd1', title: 'Ngày đầu'}, located: true});
    const tree = await mount();
    act(() => field(tree, t('recommend.query')).props.onChangeText('Nơi mát mẻ'));
    press(button(tree, t('recommend.ask')));
    await flush();

    press(button(tree, t('recommend.addToTripFor', {name: 'Thác Datanla'})));
    await flush();
    pressText(tree, 'Đà Lạt 3 ngày');
    await flush();
    pressText(tree, `${t('recommend.addDay', {n: 1})}: Ngày đầu`);
    press(button(tree, t('recommend.addConfirm')));
    await flush();

    expect(api.setStatus).toHaveBeenCalledWith('h1', 'created', 't2');
  });

  it('still works when marking the suggestion fails', async () => {
    api.recommend.mockResolvedValue(result);
    api.setStatus.mockRejectedValue(new Error('500'));
    const tree = await mount();
    act(() => field(tree, t('recommend.query')).props.onChangeText('Nơi mát mẻ'));
    press(button(tree, t('recommend.ask')));
    await flush();
    press(button(tree, t('recommend.planTripFor', {name: 'Thác Datanla'})));
    await flush();
    expect(nav.navigate).toHaveBeenCalledWith('CreateTrip', expect.anything());
  });

  it('keeps the history out of the way when the AI found nothing', async () => {
    api.recommend.mockResolvedValue({recommendations: [], historyId: null, message: 'none'});
    const tree = await mount();
    act(() => field(tree, t('recommend.query')).props.onChangeText('x'));
    press(button(tree, t('recommend.ask')));
    await flush();
    expect(allText(tree)).toContain(t('recommend.empty'));
  });
});
