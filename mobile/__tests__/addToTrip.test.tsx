import {TouchableOpacity} from 'react-native';
import i18n from '../src/i18n';
import {tripsApi} from '../src/api';
import AddToTripModal, {addPlaceErrorKey} from '../src/components/AddToTripModal';
import Recommend from '../src/screens/Recommend';
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
  tripsApi: {list: jest.fn(), get: jest.fn(), addPlace: jest.fn()},
}));

const t = (key: string, opts?: object) => (i18n.t as any)(key, opts) as string;
type Tree = ReturnType<typeof renderApp>;

const item = {
  name: 'Thác Datanla',
  province: 'Lâm Đồng',
  description: 'Thác nước',
  reason: 'Thiên nhiên',
  inApp: false,
};
const trips = [
  {_id: 't1', nameTrip: 'Huế 2 ngày', location: 'Thừa Thiên Huế', startDate: '2026-03-01', endDate: '2026-03-02', status: 'active'},
  {_id: 't2', nameTrip: 'Đà Lạt 3 ngày', location: 'Lâm Đồng', startDate: '2026-04-01', endDate: '2026-04-03', status: 'active'},
];
const challenge = (i: number) => ({_id: `c${i}`, challengeSummary: 's', nameLocation: `Nơi ${i}`, points: 10});
const detail = (fullDay1 = false) => ({
  nameTrip: 'Đà Lạt 3 ngày',
  location: 'Lâm Đồng',
  startDate: '2026-04-01',
  endDate: '2026-04-03',
  dataTripDays: [
    {_id: 'd1', title: 'Ngày đầu', date: '2026-04-01', challenges: fullDay1 ? Array.from({length: 10}, (_, i) => challenge(i)) : [challenge(1)]},
    {_id: 'd2', title: 'Ngày hai', date: '2026-04-02', challenges: []},
  ],
});

const onClose = jest.fn();
const mount = (recommendation = item) => renderApp(<AddToTripModal item={recommendation} visible onClose={onClose} />);
const confirmButton = (tree: Tree) =>
  tree.root.findAll(n => n.type === TouchableOpacity && n.props.accessibilityLabel === t('recommend.addConfirm'))[0];
const pick = async (tree: Tree, text: string) => {
  pressText(tree, text);
  await flush();
};
const day = (n: number) => t('recommend.addDay', {n});

beforeEach(() => {
  jest.clearAllMocks();
  resetNav();
  (tripsApi.list as jest.Mock).mockResolvedValue(trips);
  (tripsApi.get as jest.Mock).mockResolvedValue(detail());
});

describe('addPlaceErrorKey', () => {
  it('tells a duplicate, a full day and anything else apart', () => {
    expect(addPlaceErrorKey({response: {data: {code: 'PLACE_ALREADY_IN_TRIP'}}})).toBe('recommend.addDuplicate');
    expect(addPlaceErrorKey({response: {data: {code: 'DAY_FULL'}}})).toBe('recommend.addDayFullError');
    expect(addPlaceErrorKey({response: {status: 500}})).toBe('recommend.addFailed');
    expect(addPlaceErrorKey(new Error('Network Error'))).toBe('recommend.addFailed');
  });
});

describe('AddToTripModal', () => {
  it('lists the trip of the same province first and asks for the day only after a trip is chosen', async () => {
    const tree = mount();
    await flush();

    const text = allText(tree);
    expect(text.indexOf('Đà Lạt 3 ngày')).toBeLessThan(text.indexOf('Huế 2 ngày'));
    expect(text).toContain(t('recommend.addSameProvince'));
    expect(text).toContain(t('recommend.addPickTripFirst'));
    expect(confirmButton(tree).props.disabled).toBe(true);
    expect(tripsApi.get).not.toHaveBeenCalled();
  });

  it('adds the place to the chosen day after reading what will happen, then offers to open the trip', async () => {
    (tripsApi.addPlace as jest.Mock).mockResolvedValue({challengeId: 'c9', day: {id: 'd2', title: 'Ngày hai'}, located: true});
    const tree = mount();
    await flush();

    await pick(tree, 'Đà Lạt 3 ngày');
    await pick(tree, `${day(2)}: Ngày hai`);
    // the summary says exactly what will be added, where, and that the AI place is unverified
    expect(allText(tree)).toContain(t('recommend.addSummary', {name: 'Thác Datanla', day: day(2), trip: 'Đà Lạt 3 ngày'}));
    expect(allText(tree)).toContain(t('recommend.addUnverified'));
    expect(tripsApi.addPlace).not.toHaveBeenCalled();

    press(confirmButton(tree));
    await flush();

    expect(tripsApi.addPlace).toHaveBeenCalledWith('t2', {name: 'Thác Datanla', dayId: 'd2', province: 'Lâm Đồng', summary: 'Thác nước'});
    expect(allText(tree)).toContain(t('recommend.addDone', {name: 'Thác Datanla', day: day(2)}));
    expect(allText(tree)).not.toContain(t('recommend.addNotLocated'));

    pressText(tree, t('recommend.addViewTrip'));
    expect(nav.navigate).toHaveBeenCalledWith('TripDetail', {id: 't2'});
    expect(onClose).toHaveBeenCalled();
  });

  it('does not show the unverified warning for a place the app knows', async () => {
    const tree = mount({...item, inApp: true});
    await flush();
    await pick(tree, 'Đà Lạt 3 ngày');
    await pick(tree, `${day(2)}: Ngày hai`);
    expect(allText(tree)).not.toContain(t('recommend.addUnverified'));
  });

  it('tells the user when the place has no position on the map yet', async () => {
    (tripsApi.addPlace as jest.Mock).mockResolvedValue({challengeId: 'c9', day: {id: 'd1', title: 'Ngày đầu'}, located: false});
    const tree = mount();
    await flush();
    await pick(tree, 'Đà Lạt 3 ngày');
    await pick(tree, `${day(1)}: Ngày đầu`);
    press(confirmButton(tree));
    await flush();
    expect(allText(tree)).toContain(t('recommend.addNotLocated'));
  });

  it('does not let the user choose a day that is full', async () => {
    (tripsApi.get as jest.Mock).mockResolvedValue(detail(true));
    const tree = mount();
    await flush();
    await pick(tree, 'Đà Lạt 3 ngày');

    expect(allText(tree)).toContain(t('recommend.addDayFull', {max: 10}));
    const full = tree.root.findAll(n => n.type === TouchableOpacity && n.props.accessibilityRole === 'radio' && n.props.disabled === true);
    expect(full).toHaveLength(1);
    expect(confirmButton(tree).props.disabled).toBe(true);
  });

  it('changing the trip clears the chosen day', async () => {
    const tree = mount();
    await flush();
    await pick(tree, 'Đà Lạt 3 ngày');
    await pick(tree, `${day(2)}: Ngày hai`);
    expect(confirmButton(tree).props.disabled).toBe(false);

    await pick(tree, 'Huế 2 ngày');
    expect(confirmButton(tree).props.disabled).toBe(true);
  });

  it.each([
    ['the trip already has the place', {response: {data: {code: 'PLACE_ALREADY_IN_TRIP'}}}, 'recommend.addDuplicate'],
    ['the day is full', {response: {data: {code: 'DAY_FULL'}}}, 'recommend.addDayFullError'],
    ['another error', {response: {status: 500}}, 'recommend.addFailed'],
  ])('shows why nothing was added when %s and keeps the modal open', async (_name, error, key) => {
    (tripsApi.addPlace as jest.Mock).mockRejectedValue(error);
    const tree = mount();
    await flush();
    await pick(tree, 'Đà Lạt 3 ngày');
    await pick(tree, `${day(2)}: Ngày hai`);
    press(confirmButton(tree));
    await flush();

    expect(allText(tree)).toContain(t(key));
    expect(confirmButton(tree).props.disabled).toBe(false);
  });

  it('offers to create a trip when the user has none', async () => {
    (tripsApi.list as jest.Mock).mockResolvedValue([]);
    const tree = mount();
    await flush();

    expect(allText(tree)).toContain(t('recommend.addNoTrips'));
    pressText(tree, t('recommend.addCreate'));
    expect(nav.navigate).toHaveBeenCalledWith('CreateTrip', {location: 'Lâm Đồng', fromSuggestion: true, note: 'Thác Datanla (Lâm Đồng): Thác nước'});
  });

  it('can retry when the trips or the days do not load', async () => {
    (tripsApi.list as jest.Mock).mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce(trips);
    (tripsApi.get as jest.Mock).mockRejectedValueOnce(new Error('500')).mockResolvedValueOnce(detail());
    const tree = mount();
    await flush(8);

    expect(allText(tree)).toContain(t('recommend.addLoadTripsFailed'));
    pressText(tree, t('recommend.addRetry'));
    await flush();
    await pick(tree, 'Đà Lạt 3 ngày');
    await flush(8);
    expect(allText(tree)).toContain(t('recommend.addLoadDaysFailed'));
    pressText(tree, t('recommend.addRetry'));
    await flush();
    expect(allText(tree)).toContain(`${day(2)}: Ngày hai`);
  });

  it('closes with Cancel', async () => {
    const tree = mount();
    await flush();
    pressText(tree, t('recommend.addCancel'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Recommend: add to an existing trip', () => {
  it('opens the modal from a suggestion and closes it again', async () => {
    const {destinationsApi} = require('../src/api');
    destinationsApi.recommend.mockResolvedValue({message: 'ok', recommendations: [item]});
    const tree = renderApp(<Recommend />);
    await act(async () => {
      tree.root.findAll(n => n.props.accessibilityLabel === t('recommend.query'))[0].props.onChangeText('Thác');
    });
    press(tree.root.findAll(n => n.type === TouchableOpacity && n.props.accessibilityLabel === t('recommend.ask'))[0]);
    await flush();

    press(tree.root.findAll(n => n.type === TouchableOpacity && n.props.accessibilityLabel === t('recommend.addToTripFor', {name: 'Thác Datanla'}))[0]);
    await flush();
    expect(allText(tree)).toContain(t('recommend.addTitle', {name: 'Thác Datanla'}));

    pressText(tree, t('recommend.addCancel'));
    await flush();
    expect(allText(tree)).not.toContain(t('recommend.addIntro'));
  });
});
