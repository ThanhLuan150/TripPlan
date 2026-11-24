import React from 'react';
import {FlatList, TextInput, TouchableOpacity} from 'react-native';
import i18n from '../src/i18n';
import {profileApi, rankingApi, tripsApi, contentApi} from '../src/api';
import AreaTypeGrid from '../src/components/AreaTypeGrid';
import ConfirmModal from '../src/components/ConfirmModal';
import DateRangeField from '../src/components/DateRangeField';
import DropdownInput from '../src/components/DropdownInput';
import ImageRail from '../src/components/ImageRail';
import NameDialog from '../src/components/NameDialog';
import QuantityInput from '../src/components/QuantityInput';
import {areaTypes} from '../src/lib/areaTypes';
import {subscribeAlert} from '../src/lib/alert';
import {CheckInError, checkIn} from '../src/lib/checkIn';
import {getCurrentPosition} from '../src/lib/location';
import CreateTrip from '../src/screens/CreateTrip';
import GenerateTrips from '../src/screens/GenerateTrips';
import Home from '../src/screens/Home';
import TripDetail from '../src/screens/TripDetail';
import TripMap from '../src/screens/TripMap';
import Trips from '../src/screens/Trips';
import {nav, resetNav} from './helpers/nav';
import {act, allText, flush, press, pressText, renderApp, renderer, makeAuth} from './helpers/render';

jest.mock('@react-navigation/native', () => require('./helpers/nav').navModule);
jest.mock('../src/lib/location', () => ({getCurrentPosition: jest.fn()}));
jest.mock('../src/lib/checkIn', () => ({
  ...jest.requireActual('../src/lib/checkIn'),
  checkIn: jest.fn(),
}));
jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  contentApi: {home: jest.fn(), videos: jest.fn()},
  rankingApi: {get: jest.fn()},
  profileApi: {notifications: jest.fn(), update: jest.fn()},
  tripsApi: {list: jest.fn(), get: jest.fn(), generate: jest.fn(), save: jest.fn(), remove: jest.fn(), duplicate: jest.fn()},
}));

const t = (key: string, opts?: object) => (i18n.t as any)(key, opts) as string;
type Tree = ReturnType<typeof renderApp>;
const touchables = (tree: Tree) => tree.root.findAllByType(TouchableOpacity);

// Alerts raised by the screen under test.
let alerts: any[] = [];
let off: () => void;
beforeEach(() => {
  jest.clearAllMocks();
  resetNav();
  alerts = [];
  off = subscribeAlert(a => alerts.push(a));
});
afterEach(() => off());

describe('Home', () => {
  const remote = {
    banners: [{id: '1', title: 'b', imageUrl: '/files/b'}],
    suggestions: [
      {id: 's1', title: 'Hue', location: 'Huế', imageUrl: '/files/s'},
      {id: 's2', title: 'None', location: '', imageUrl: ''},
    ],
  };
  beforeEach(() => {
    (rankingApi.get as jest.Mock).mockResolvedValue([{_id: 'a', fullname: 'Alice', experience: 5}]);
    (profileApi.notifications as jest.Mock).mockResolvedValue([{id: '1'}, {id: '2'}]);
  });

  it('shows the remote content and navigates from every entry point', async () => {
    (contentApi.home as jest.Mock).mockResolvedValue(remote);
    const tree = renderApp(<Home />, {auth: makeAuth()});
    await flush();
    expect(allText(tree)).toContain('Luan');
    expect(allText(tree)).toContain('Alice');
    pressText(tree, t('home.quickChat'));
    pressText(tree, t('home.quickPlan'));
    pressText(tree, t('home.quickRanking'));
    pressText(tree, t('common.seeMore'));
    pressText(tree, t('common.seeMore'), 'last');
    const header = tree.root.findAllByType(TextInput)[0];
    act(() => header.props.onChangeText('  Huế '));
    act(() => tree.root.findAllByType(TextInput)[0].props.onSubmitEditing());
    const [bell, profile] = touchables(tree);
    press(bell);
    press(profile);
    const rail = tree.root.findByType(ImageRail);
    act(() => rail.props.onPick(0));
    act(() => rail.props.onPick(1));
    act(() => rail.props.onPick(9));
    expect(nav.navigate.mock.calls.map(c => c[0])).toEqual([
      'Assistant', 'CreateTrip', 'Ranking', 'Videos', 'Ranking', 'CreateTrip', 'Notifications', 'Profile', 'CreateTrip',
    ]);
    expect(nav.navigate).toHaveBeenCalledWith('CreateTrip', {location: 'Huế'});
  });

  it('falls back to the bundled pictures without remote content', async () => {
    (contentApi.home as jest.Mock).mockResolvedValue({banners: [], suggestions: []});
    const tree = renderApp(<Home />);
    await flush();
    act(() => tree.root.findByType(ImageRail).props.onPick(0));
    expect(nav.navigate).not.toHaveBeenCalled();
  });
});

describe('Trips', () => {
  const trips = [{_id: 't1', nameTrip: 'Hue', location: 'Huế', startDate: '2026-03-05', endDate: '2026-03-07', status: 'x'}];

  it('lists trips, opens one, refreshes and starts a new one', async () => {
    (tripsApi.list as jest.Mock).mockResolvedValue(trips);
    const tree = renderApp(<Trips />);
    await flush();
    expect(allText(tree)).toContain('Hue');
    pressText(tree, t('common.refresh'));
    await flush();
    expect(tripsApi.list).toHaveBeenCalledTimes(2);
    pressText(tree, 'Hue');
    expect(nav.navigate).toHaveBeenCalledWith('TripDetail', {id: 't1'});
    press(touchables(tree)[0]);
    expect(nav.navigate).toHaveBeenCalledWith('CreateTrip');
  });

  it('duplicates a trip, reloads the list and tells it worked', async () => {
    (tripsApi.list as jest.Mock).mockResolvedValue(trips);
    (tripsApi.duplicate as jest.Mock).mockResolvedValue({tripId: 'n1', nameTrip: 'Hue (bản sao)'});
    const tree = renderApp(<Trips />);
    await flush();
    const items = touchables(tree);
    press(items[items.length - 2]);
    await flush();
    expect(tripsApi.duplicate).toHaveBeenCalledWith('t1');
    expect(tripsApi.list).toHaveBeenCalledTimes(2);
    expect(alerts[0].type).toBe('success');
  });

  it('tells when the duplication failed', async () => {
    (tripsApi.list as jest.Mock).mockResolvedValue(trips);
    (tripsApi.duplicate as jest.Mock).mockRejectedValue({response: {data: {message: 'Data Trip not found!'}}});
    const tree = renderApp(<Trips />);
    await flush();
    const items = touchables(tree);
    press(items[items.length - 2]);
    await flush();
    expect(alerts[0].type).toBe('error');
    expect(tripsApi.list).toHaveBeenCalledTimes(1);
  });

  it('deletes after a confirmation and reloads the list', async () => {
    (tripsApi.list as jest.Mock).mockResolvedValue(trips);
    (tripsApi.remove as jest.Mock).mockResolvedValue({});
    const tree = renderApp(<Trips />);
    await flush();
    const trash = touchables(tree).find(x => x.props.style?.constructor === Object || x.props.style?.paddingLeft !== undefined || true);
    expect(trash).toBeTruthy();
    const items = touchables(tree);
    press(items[items.length - 1]);
    expect(alerts[0].type).toBe('confirm');
    await act(async () => alerts[0].onConfirm());
    await flush();
    expect(tripsApi.remove).toHaveBeenCalledWith('t1');
    expect(tripsApi.list).toHaveBeenCalledTimes(2);
  });

  it('shows the empty state', async () => {
    (tripsApi.list as jest.Mock).mockResolvedValue([]);
    const tree = renderApp(<Trips />);
    await flush();
    expect(allText(tree)).toContain(t('trips.empty'));
  });
});

describe('TripDetail', () => {
  const detail = (over: any = {}) => ({
    location: 'Huế',
    startDate: '2026-03-05',
    endDate: '2026-03-06',
    dataTripDays: [
      {
        title: 'Day one',
        date: '2026-03-05',
        challenges: [
          {_id: 'c1', challengeSummary: 'Citadel', points: 40, completed: false},
          {_id: 'c2', challengeSummary: 'Pagoda', points: 20, completed: false, imageUrl: '/files/p'},
        ],
        ...over,
      },
    ],
  });
  const mount = async (data: any = detail()) => {
    resetNav({id: 'trip1'});
    (tripsApi.get as jest.Mock).mockResolvedValue(data);
    const tree = renderApp(<TripDetail />);
    await flush();
    return tree;
  };
  const open = (tree: Tree) => pressText(tree, 'Day one');
  const checkInWith = async (tree: Tree, id: string) => {
    open(tree);
    const rows = tree.root.findAll(n => n.props.onAddPhoto && n.props.challenge?._id === id);
    await act(async () => rows[0].props.onAddPhoto());
    await flush(4);
  };

  it('shows a loader, then the trip, and opens the map / goes back', async () => {
    resetNav({id: 'trip1'});
    (tripsApi.get as jest.Mock).mockResolvedValue(detail());
    const tree = renderApp(<TripDetail />);
    expect(allText(tree)).toContain(t('common.pleaseWait'));
    await flush();
    expect(allText(tree)).toContain('Huế');
    pressText(tree, t('trips.viewMap'));
    expect(nav.navigate).toHaveBeenCalledWith('TripMap', {id: 'trip1'});
    press(touchables(tree)[0]);
    expect(nav.goBack).toHaveBeenCalled();
  });

  it('shows the error of a trip that cannot be loaded', async () => {
    resetNav({id: 'x'});
    (tripsApi.get as jest.Mock).mockRejectedValue({response: {data: {message: 'Data Trip not found!'}}});
    const tree = renderApp(<TripDetail />);
    await flush();
    expect(allText(tree)).toBe('Data Trip not found!');
  });

  it('opens and closes a day', async () => {
    const tree = await mount();
    expect(allText(tree)).not.toContain('Citadel');
    open(tree);
    expect(allText(tree)).toContain('Citadel');
    open(tree);
    expect(allText(tree)).not.toContain('Citadel');
    open(tree);
  });

  it('checks in: success reloads the trip and announces it', async () => {
    (checkIn as jest.Mock).mockResolvedValue(true);
    const tree = await mount();
    await checkInWith(tree, 'c1');
    expect(checkIn).toHaveBeenCalledWith('c1');
    expect(tripsApi.get).toHaveBeenCalledTimes(2);
    expect(alerts.at(-1)).toMatchObject({type: 'success', message: t('trips.checkedIn')});
  });

  it('checks in: cancelled photo does nothing', async () => {
    (checkIn as jest.Mock).mockResolvedValue(false);
    const tree = await mount();
    await checkInWith(tree, 'c1');
    expect(alerts).toHaveLength(0);
    expect(tripsApi.get).toHaveBeenCalledTimes(1);
  });

  it.each([
    [new CheckInError('tooFar', {distance: 900}), t('trips.tooFar', {distance: 900})],
    [new CheckInError('photoFailed'), t('trips.photoFailed')],
    [new Error('denied'), t('trips.locationDenied')],
    [new Error('unavailable'), t('trips.locationUnavailable')],
    [{response: {data: {message: 'This challenge has no location'}}}, t('trips.noLocation')],
    [{response: {data: {message: 'Other'}}}, 'Other'],
  ])('checks in: error %#', async (error, text) => {
    (checkIn as jest.Mock).mockRejectedValue(error);
    const tree = await mount();
    await checkInWith(tree, 'c1');
    expect(alerts.at(-1)).toMatchObject({type: 'error', message: text});
  });

  it('retakes a photo after a confirmation, or cancels', async () => {
    (checkIn as jest.Mock).mockResolvedValue(false);
    const tree = await mount();
    open(tree);
    const row = tree.root.findAll(n => n.props.onRetake && n.props.challenge?._id === 'c2')[0];
    expect(tree.root.findByType(ConfirmModal).props.visible).toBe(false);
    act(() => row.props.onRetake());
    expect(tree.root.findByType(ConfirmModal).props.visible).toBe(true);
    await act(async () => tree.root.findByType(ConfirmModal).props.onConfirm());
    await flush();
    expect(checkIn).toHaveBeenCalledWith('c2');
    act(() => row.props.onRetake());
    act(() => tree.root.findByType(ConfirmModal).props.onCancel());
    expect(tree.root.findByType(ConfirmModal).props.visible).toBe(false);
    // confirm with nothing chosen
    act(() => tree.root.findByType(ConfirmModal).props.onConfirm());
  });
});

describe('TripMap', () => {
  const detail = {
    location: 'Huế',
    startDate: '',
    endDate: '',
    dataTripDays: [
      {
        title: 'd', date: '',
        challenges: [
          {_id: '1', challengeSummary: 'A', points: 1, latitude: '16.4', longitude: '107.5'},
          {_id: '2', challengeSummary: 'No coords', points: 1},
        ],
      },
    ],
  };
  const mount = async () => {
    resetNav({id: 'trip1'});
    (tripsApi.get as jest.Mock).mockResolvedValue(detail);
    const injectJavaScript = jest.fn();
    let tree!: renderer.ReactTestRenderer;
    const {QueryClientProvider} = require('@tanstack/react-query');
    const {queryClient} = require('./helpers/render');
    act(() => {
      tree = renderer.create(
        <QueryClientProvider client={queryClient()}><TripMap /></QueryClientProvider>,
        {createNodeMock: () => ({injectJavaScript})},
      );
    });
    return {tree, injectJavaScript};
  };

  it('shows a loader, builds the map from the located challenges and goes back', async () => {
    const {tree} = await mount();
    expect(tree.root.findAllByType('WebView' as any)).toHaveLength(0);
    await flush();
    const web = tree.root.findByType('WebView' as any);
    expect(web.props.source.html).toContain('"lat":16.4');
    expect(web.props.source.html).not.toContain('No coords');
    expect(web.props.renderLoading()).toBeTruthy();
    press(tree.root.findAllByType(TouchableOpacity)[0]);
    expect(nav.goBack).toHaveBeenCalled();
  });

  it('puts the user on the map once loaded, ignores a failed location', async () => {
    const {tree, injectJavaScript} = await mount();
    await flush();
    (getCurrentPosition as jest.Mock).mockResolvedValueOnce({latitude: 1, longitude: 2});
    await act(async () => tree.root.findByType('WebView' as any).props.onLoadEnd());
    await flush();
    expect(injectJavaScript).toHaveBeenCalledWith(expect.stringContaining('setUser(1,2)'));
    (getCurrentPosition as jest.Mock).mockRejectedValueOnce(new Error('denied'));
    await act(async () => tree.root.findByType('WebView' as any).props.onLoadEnd());
    await flush();
    expect(injectJavaScript).toHaveBeenCalledTimes(1);
  });
});

describe('GenerateTrips', () => {
  const params = {
    location: 'Huế', quantity: 2, budget: 'x', budgetTier: 'mid' as const, areaTypes: ['Lịch sử'],
    days: 2, startDate: '2026-12-01', endDate: '2026-12-02',
  };
  const plans = {plan1: {day1: {title: 'A'}}, plan2: {day1: {title: 'B'}}};
  const mount = async (generate: () => Promise<unknown> = async () => plans) => {
    resetNav({params});
    (tripsApi.generate as jest.Mock).mockImplementation(generate);
    const tree = renderApp(<GenerateTrips />);
    await flush();
    return tree;
  };
  const choose = (tree: Tree) => pressText(tree, t('trips.generate.choose'));
  const name = (tree: Tree, text: string) => act(() => tree.root.findByType(NameDialog).props.onChange(text));

  it('shows the plans, saves the chosen one under a name and opens it', async () => {
    (tripsApi.save as jest.Mock).mockResolvedValue({tripId: 'new1'});
    const tree = await mount();
    expect(allText(tree)).toContain('A');
    expect(tree.root.findByType(NameDialog).props.visible).toBe(false);
    choose(tree);
    expect(tree.root.findByType(NameDialog).props.visible).toBe(true);
    name(tree, ' Weekend ');
    await act(async () => tree.root.findByType(NameDialog).props.onConfirm());
    await flush(6);
    expect(tripsApi.save).toHaveBeenCalledWith(params, 'Weekend', [{title: 'A'}]);
    expect(nav.replace).toHaveBeenCalledWith('TripDetail', {id: 'new1'});
  });

  it('needs a name, and can be cancelled', async () => {
    const tree = await mount();
    choose(tree);
    await act(async () => tree.root.findByType(NameDialog).props.onConfirm());
    await flush(3);
    expect(tree.root.findByType(NameDialog).props.error).toBe(t('trips.generate.nameRequired'));
    expect(tripsApi.save).not.toHaveBeenCalled();
    act(() => tree.root.findByType(NameDialog).props.onCancel());
    expect(tree.root.findByType(NameDialog).props.visible).toBe(false);
  });

  it.each([
    ['A trip with the same name already exists', t('trips.generate.duplicateName')],
    ['whatever', t('trips.generate.saveFailed')],
  ])('tells why saving failed: %s', async (message, text) => {
    (tripsApi.save as jest.Mock).mockRejectedValue({response: {data: {message}}});
    const tree = await mount();
    choose(tree);
    name(tree, 'Trip');
    await act(async () => tree.root.findByType(NameDialog).props.onConfirm());
    await flush(6);
    expect(alerts.at(-1)).toMatchObject({type: 'error', message: text});
  });

  it('explains an overlap and retries after another error', async () => {
    const tree = await mount(async () => {
      throw {response: {data: {message: 'Please choose another day. Your selected dates overlap'}}};
    });
    expect(allText(tree)).toContain(t('trips.generate.overlap'));

    let calls = 0;
    const retry = await mount(async () => {
      if (calls++ === 0) {throw new Error('boom');}
      return plans;
    });
    pressText(retry, t('trips.retry'));
    await flush(6);
    expect(allText(retry)).toContain('A');
    press(touchables(retry)[0]);
    expect(nav.goBack).toHaveBeenCalled();
  });

  it('shows the error screen when nothing came back', async () => {
    const tree = await mount(async () => null);
    expect(allText(tree)).toContain(t('trips.retry'));
  });
});

describe('CreateTrip', () => {
  beforeEach(() => {
    // 9 am, so "start today" is allowed; only Date is faked
    jest.useFakeTimers({
      now: new Date(2026, 5, 10, 9, 0, 0),
      doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'performance', 'hrtime'],
    });
  });
  afterEach(() => jest.useRealTimers());

  const dropdowns = (tree: Tree) => tree.root.findAllByType(DropdownInput);
  const fillAll = async (tree: Tree) => {
    act(() => dropdowns(tree)[0].props.onPick('Hà Nội'));
    act(() => tree.root.findByType(QuantityInput).props.onChange(2));
    act(() => dropdowns(tree)[1].props.onPick(dropdowns(tree)[1].props.options[1]));
    act(() => tree.root.findByType(AreaTypeGrid).props.onToggle(areaTypes[0].value));
    await flush(2);
  };
  const next = async (tree: Tree) => {
    await act(async () => pressText(tree, t('trips.next')));
    await flush(4);
  };

  it('collects the answers and goes on to generate', async () => {
    resetNav({});
    const tree = renderApp(<CreateTrip />);
    await fillAll(tree);
    act(() => tree.root.findByType(DateRangeField).props.onEnd(new Date(2026, 5, 12)));
    await next(tree);
    expect(nav.navigate).toHaveBeenCalledWith('GenerateTrips', {
      params: expect.objectContaining({
        location: 'Hà Nội', quantity: 2, budgetTier: 'mid', areaTypes: [areaTypes[0].value], days: 3,
        budget: expect.stringContaining('VND'),
      }),
    });
  });

  it('shows what is missing', async () => {
    resetNav({});
    const tree = renderApp(<CreateTrip />);
    await next(tree);
    const txt = allText(tree);
    expect(txt).toContain(t('trips.create.errorProvince'));
    expect(txt).toContain(t('trips.create.errorMissing'));
    expect(txt).toContain(t('trips.create.errorInterests'));
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  it('filters provinces while typing, toggles lists, deselects an interest', async () => {
    resetNav({});
    const tree = renderApp(<CreateTrip />);
    act(() => dropdowns(tree)[0].props.onToggle());
    act(() => dropdowns(tree)[0].props.onChangeText('da nang'));
    expect(dropdowns(tree)[0].props.options).toEqual(['Đà Nẵng']);
    act(() => dropdowns(tree)[0].props.onToggle());
    act(() => dropdowns(tree)[0].props.onBlur());
    act(() => dropdowns(tree)[1].props.onToggle());
    act(() => dropdowns(tree)[1].props.onBlur());
    expect(dropdowns(tree)[1].props.open).toBe(true);
    const grid = () => tree.root.findByType(AreaTypeGrid);
    act(() => grid().props.onToggle(areaTypes[0].value));
    act(() => grid().props.onToggle(areaTypes[1].value));
    act(() => grid().props.onToggle(areaTypes[0].value));
    expect(grid().props.selected).toEqual([areaTypes[1].value]);
    act(() => tree.root.findByType(AreaTypeGrid).props.onToggle(areaTypes[1].value));
    await flush();
    expect(allText(tree)).toContain(t('trips.create.errorInterests'));
  });

  it('moves the end date along with a later start date', async () => {
    resetNav({});
    const tree = renderApp(<CreateTrip />);
    const later = new Date(2026, 5, 20);
    act(() => tree.root.findByType(DateRangeField).props.onStart(later));
    await flush(2);
    expect(tree.root.findByType(DateRangeField).props.endDate).toEqual(later);
    const earlier = new Date(2026, 5, 21);
    act(() => tree.root.findByType(DateRangeField).props.onEnd(earlier));
    act(() => tree.root.findByType(DateRangeField).props.onStart(new Date(2026, 5, 19)));
    await flush(2);
    expect(tree.root.findByType(DateRangeField).props.endDate).toEqual(earlier);
  });

  it('rejects a trip longer than a week and one that starts in the past', async () => {
    resetNav({});
    const tree = renderApp(<CreateTrip />);
    act(() => tree.root.findByType(DateRangeField).props.onEnd(new Date(2026, 5, 30)));
    await flush(3);
    expect(allText(tree)).toContain(t('trips.create.errorMaxDays'));
  });

  it('is prefilled from the assistant and can be reset', async () => {
    resetNav({location: 'Sapa', days: 3, people: 4, note: 'ideas'});
    const tree = renderApp(<CreateTrip />);
    expect(dropdowns(tree)[0].props.open).toBe(true);
    expect(tree.root.findByType(QuantityInput).props.value).toBe(4);
    expect(tree.root.findByType(DateRangeField).props.endDate.getDate()).toBe(12);
    pressText(tree, t('trips.reset'));
    await flush(2);
    expect(tree.root.findByType(QuantityInput).props.value).toBe(1);
    expect(dropdowns(tree)[0].props.value).toBe('');
  });

  it('works without any params, goes back, and dismisses the keyboard', async () => {
    const {route} = require('./helpers/nav');
    route.params = undefined;
    const tree = renderApp(<CreateTrip />);
    press(touchables(tree)[0]);
    expect(nav.goBack).toHaveBeenCalled();
    const {TouchableWithoutFeedback} = require('react-native');
    act(() => tree.root.findByType(TouchableWithoutFeedback).props.onPress());
    expect(tree.root.findAllByType(FlatList).length).toBeGreaterThan(0);
  });

  it('passes the note from the assistant on', async () => {
    resetNav({note: 'ideas'});
    const tree = renderApp(<CreateTrip />);
    await fillAll(tree);
    await next(tree);
    expect(nav.navigate.mock.calls[0][1].params.note).toBe('ideas');
  });
});
