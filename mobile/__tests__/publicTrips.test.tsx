import {TouchableOpacity} from 'react-native';
import i18n from '../src/i18n';
import {tripsApi} from '../src/api';
import {subscribeAlert} from '../src/lib/alert';
import {addCommas} from '../src/lib/money';
import PublicTripDetail from '../src/screens/PublicTripDetail';
import PublicTrips from '../src/screens/PublicTrips';
import Trips from '../src/screens/Trips';
import {nav, resetNav} from './helpers/nav';
import {allText, flush, press, pressText, renderApp} from './helpers/render';

jest.mock('@react-navigation/native', () => require('./helpers/nav').navModule);
jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  tripsApi: {
    list: jest.fn(),
    favorites: jest.fn(),
    listPublic: jest.fn(),
    getPublic: jest.fn(),
    copyPublic: jest.fn(),
    likePublic: jest.fn(),
    unlikePublic: jest.fn(),
    savePost: jest.fn(),
    unsavePost: jest.fn(),
  },
}));

const t = (key: string, opts?: object) => (i18n.t as any)(key, opts) as string;

const card = (id: string, nameTrip: string) => ({
  _id: id,
  nameTrip,
  location: 'Lâm Đồng',
  startDate: '2026-03-02T09:00:00',
  endDate: '2026-03-04T09:00:00',
  transportCostTotal: 100000,
  foodCostTotal: 200000,
  otherCostTotal: 50000,
  likesCount: 0,
  liked: false,
});

const saveButtons = (tree: ReturnType<typeof renderApp>) =>
  tree.root
    .findAllByType(TouchableOpacity)
    .filter(n =>
      [t('trips.savePost'), t('trips.unsavePost')].includes(n.props.accessibilityLabel),
    );

const likeButtons = (tree: ReturnType<typeof renderApp>) =>
  tree.root
    .findAllByType(TouchableOpacity)
    .filter(n =>
      [t('trips.like'), t('trips.unlike')].includes(n.props.accessibilityLabel),
    );

let alerts: any[] = [];
let off: () => void;
beforeEach(() => {
  jest.clearAllMocks();
  resetNav({id: 'p1'});
  alerts = [];
  off = subscribeAlert(a => alerts.push(a));
});
afterEach(() => off());

describe('money', () => {
  it('groups thousands with dots', () => {
    expect(addCommas(1250000)).toBe('1.250.000');
    expect(addCommas(999)).toBe('999');
    expect(addCommas(undefined)).toBe('0');
  });
});

describe('Trips: explore entry', () => {
  it('no longer has an Explore button (Explore is a tab of its own)', async () => {
    (tripsApi.list as jest.Mock).mockResolvedValue([]);
    (tripsApi.favorites as jest.Mock).mockResolvedValue([]);
    const tree = renderApp(<Trips />);
    await flush();

    expect(allText(tree)).not.toContain(t('trips.exploreOpen'));
  });
});

describe('PublicTrips', () => {
  it('lists public plans with their total cost and opens one', async () => {
    (tripsApi.listPublic as jest.Mock).mockResolvedValue({page: 1, limit: 12, total: 2, items: [card('a1', 'Đà Lạt 3 ngày'), card('b2', 'Huế 2 ngày')]});
    const tree = renderApp(<PublicTrips />);
    await flush();

    expect(allText(tree)).toContain('Huế 2 ngày');
    expect(allText(tree)).toContain(t('trips.exploreCost', {amount: '350.000'}));
    expect(allText(tree)).not.toContain(t('trips.exploreMore'));
    pressText(tree, 'Đà Lạt 3 ngày');
    expect(nav.navigate).toHaveBeenCalledWith('PublicTripDetail', {id: 'a1'});
  });

  it('loads the next page on demand', async () => {
    (tripsApi.listPublic as jest.Mock)
      .mockResolvedValueOnce({page: 1, limit: 1, total: 2, items: [card('a1', 'First plan')]})
      .mockResolvedValueOnce({page: 2, limit: 1, total: 2, items: [card('b2', 'Second plan')]});
    const tree = renderApp(<PublicTrips />);
    await flush();

    pressText(tree, t('trips.exploreMore'));
    await flush();

    expect(tripsApi.listPublic).toHaveBeenLastCalledWith(2, '');
    expect(allText(tree)).toContain('First plan');
    expect(allText(tree)).toContain('Second plan');
    expect(allText(tree)).not.toContain(t('trips.exploreMore'));
  });

  describe('likes', () => {
    const page = {
      page: 1,
      limit: 12,
      total: 2,
      items: [{...card('a1', 'Đà Lạt 3 ngày'), likesCount: 5, liked: true}, card('b2', 'Huế 2 ngày')],
    };

    it('shows the total and the state of every plan', async () => {
      (tripsApi.listPublic as jest.Mock).mockResolvedValue(page);
      const tree = renderApp(<PublicTrips />);
      await flush();

      const buttons = likeButtons(tree);
      expect(buttons.map(b => b.props.accessibilityLabel)).toEqual([t('trips.unlike'), t('trips.like')]);
      expect(allText(tree)).toContain('5');
    });

    it('likes and unlikes a plan with the count the server answered', async () => {
      (tripsApi.listPublic as jest.Mock).mockResolvedValue(page);
      (tripsApi.likePublic as jest.Mock).mockResolvedValue({liked: true, likesCount: 1});
      (tripsApi.unlikePublic as jest.Mock).mockResolvedValue({liked: false, likesCount: 4});
      const tree = renderApp(<PublicTrips />);
      await flush();

      press(likeButtons(tree)[1]);
      await flush();
      expect(tripsApi.likePublic).toHaveBeenCalledWith('b2');
      press(likeButtons(tree)[0]);
      await flush();
      expect(tripsApi.unlikePublic).toHaveBeenCalledWith('a1');

      expect(likeButtons(tree).map(b => b.props.accessibilityLabel)).toEqual([t('trips.like'), t('trips.unlike')]);
      expect(allText(tree)).toContain('4');
      expect(nav.navigate).not.toHaveBeenCalled();
    });

    it('ignores a second tap while the request is running (no duplicate like)', async () => {
      (tripsApi.listPublic as jest.Mock).mockResolvedValue(page);
      let finish: (v: unknown) => void = () => {};
      (tripsApi.likePublic as jest.Mock).mockReturnValue(new Promise(resolve => (finish = resolve)));
      const tree = renderApp(<PublicTrips />);
      await flush();

      press(likeButtons(tree)[1]);
      await flush();
      expect(likeButtons(tree)[1].props.disabled).toBe(true);
      expect(tripsApi.likePublic).toHaveBeenCalledTimes(1);

      finish({liked: true, likesCount: 1});
      await flush();
      expect(likeButtons(tree)[1].props.accessibilityLabel).toBe(t('trips.unlike'));
    });

    it('keeps the old state and tells the user when liking fails', async () => {
      (tripsApi.listPublic as jest.Mock).mockResolvedValue(page);
      (tripsApi.likePublic as jest.Mock).mockRejectedValue({response: {status: 404, data: {message: 'Post not found'}}});
      const tree = renderApp(<PublicTrips />);
      await flush();

      press(likeButtons(tree)[1]);
      await flush();

      expect(alerts.some(a => a.title === t('trips.likeFailed'))).toBe(true);
      expect(likeButtons(tree)[1].props.accessibilityLabel).toBe(t('trips.like'));
    });
  });

  describe('saving', () => {
    const page = {
      page: 1,
      limit: 12,
      total: 2,
      items: [{...card('a1', 'Đà Lạt 3 ngày'), saved: true}, card('b2', 'Huế 2 ngày')],
    };

    it('shows which plans are saved and saves / unsaves one without leaving the list', async () => {
      (tripsApi.listPublic as jest.Mock).mockResolvedValue(page);
      (tripsApi.savePost as jest.Mock).mockResolvedValue({saved: true});
      (tripsApi.unsavePost as jest.Mock).mockResolvedValue({saved: false});
      const tree = renderApp(<PublicTrips />);
      await flush();

      expect(saveButtons(tree).map(b => b.props.accessibilityLabel)).toEqual([t('trips.unsavePost'), t('trips.savePost')]);
      press(saveButtons(tree)[1]);
      await flush();
      expect(tripsApi.savePost).toHaveBeenCalledWith('b2');
      press(saveButtons(tree)[0]);
      await flush();
      expect(tripsApi.unsavePost).toHaveBeenCalledWith('a1');

      expect(saveButtons(tree).map(b => b.props.accessibilityLabel)).toEqual([t('trips.savePost'), t('trips.unsavePost')]);
      expect(nav.navigate).not.toHaveBeenCalled();
    });
  });

  it('says so when there is nothing public, or when loading fails', async () => {
    (tripsApi.listPublic as jest.Mock).mockResolvedValue({page: 1, limit: 12, total: 0, items: []});
    const empty = renderApp(<PublicTrips />);
    await flush();
    expect(allText(empty)).toContain(t('trips.exploreEmpty'));

    (tripsApi.listPublic as jest.Mock).mockRejectedValue(new Error('500'));
    const failed = renderApp(<PublicTrips />);
    await flush(8);
    expect(allText(failed)).toContain(t('trips.exploreError'));
  });
});

describe('PublicTripDetail', () => {
  const trip = {
    ...card('p1', 'Đà Lạt 3 ngày'),
    dataTripDays: [
      {
        title: 'Trung tâm Đà Lạt',
        date: '2026-03-02T09:00:00',
        transportCost: 100000,
        foodCost: 200000,
        challenges: [{_id: 'c1', challengeSummary: 'Chụp ảnh Hồ Xuân Hương', location: 'Hồ Xuân Hương', points: 20}],
      },
    ],
  };
  const saveButton = (tree: ReturnType<typeof renderApp>) =>
    tree.root.findAll(n => n.props.accessibilityLabel === t('trips.publicSave') && n.props.onPress)[0];

  it('shows the plan read only', async () => {
    (tripsApi.getPublic as jest.Mock).mockResolvedValue(trip);
    const tree = renderApp(<PublicTripDetail />);
    await flush();

    expect(tripsApi.getPublic).toHaveBeenCalledWith('p1');
    expect(allText(tree)).toContain(t('trips.publicReadOnly'));
    expect(allText(tree)).toContain('Chụp ảnh Hồ Xuân Hương');
  });

  it('shows the like state of the plan and likes it', async () => {
    (tripsApi.getPublic as jest.Mock).mockResolvedValue({...trip, likesCount: 2, liked: false});
    (tripsApi.likePublic as jest.Mock).mockResolvedValue({liked: true, likesCount: 3});
    const tree = renderApp(<PublicTripDetail />);
    await flush();

    expect(likeButtons(tree)[0].props.accessibilityLabel).toBe(t('trips.like'));
    press(likeButtons(tree)[0]);
    await flush();

    expect(tripsApi.likePublic).toHaveBeenCalledWith('p1');
    expect(likeButtons(tree)[0].props.accessibilityLabel).toBe(t('trips.unlike'));
    expect(allText(tree)).toContain('3');
  });

  it('shows the saved state of the plan and unsaves it', async () => {
    (tripsApi.getPublic as jest.Mock).mockResolvedValue({...trip, saved: true});
    (tripsApi.unsavePost as jest.Mock).mockResolvedValue({saved: false});
    const tree = renderApp(<PublicTripDetail />);
    await flush();

    expect(saveButtons(tree)[0].props.accessibilityLabel).toBe(t('trips.unsavePost'));
    press(saveButtons(tree)[0]);
    await flush();

    expect(tripsApi.unsavePost).toHaveBeenCalledWith('p1');
    expect(saveButtons(tree)[0].props.accessibilityLabel).toBe(t('trips.savePost'));
  });

  it('keeps a private copy and opens it', async () => {
    (tripsApi.getPublic as jest.Mock).mockResolvedValue(trip);
    (tripsApi.copyPublic as jest.Mock).mockResolvedValue({tripId: 'n1', nameTrip: 'Đà Lạt 3 ngày (bản sao)'});
    const tree = renderApp(<PublicTripDetail />);
    await flush();

    press(saveButton(tree));
    await flush();

    expect(tripsApi.copyPublic).toHaveBeenCalledWith('p1');
    expect(nav.replace).toHaveBeenCalledWith('TripDetail', {id: 'n1'});
  });

  it('tells the user when saving fails and stays on the plan', async () => {
    (tripsApi.getPublic as jest.Mock).mockResolvedValue(trip);
    (tripsApi.copyPublic as jest.Mock).mockRejectedValue({response: {data: {message: 'Data Trip not found!'}}});
    const tree = renderApp(<PublicTripDetail />);
    await flush();

    press(saveButton(tree));
    await flush();

    expect(alerts.some(a => a.title === t('trips.publicSaveFailed'))).toBe(true);
    expect(nav.replace).not.toHaveBeenCalled();
  });

  it('says the plan is not available when it is private, deleted or unknown', async () => {
    (tripsApi.getPublic as jest.Mock).mockRejectedValue({response: {status: 404, data: {message: 'Data Trip not found!'}}});
    const tree = renderApp(<PublicTripDetail />);
    await flush(8);

    expect(allText(tree)).toContain(t('trips.publicNotAvailable'));
    expect(saveButton(tree)).toBeUndefined();
  });
});
