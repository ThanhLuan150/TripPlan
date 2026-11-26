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
});

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
  it('opens the public plans', async () => {
    (tripsApi.list as jest.Mock).mockResolvedValue([]);
    (tripsApi.favorites as jest.Mock).mockResolvedValue([]);
    const tree = renderApp(<Trips />);
    await flush();

    pressText(tree, t('trips.exploreOpen'));

    expect(nav.navigate).toHaveBeenCalledWith('PublicTrips');
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

    expect(tripsApi.listPublic).toHaveBeenLastCalledWith(2);
    expect(allText(tree)).toContain('First plan');
    expect(allText(tree)).toContain('Second plan');
    expect(allText(tree)).not.toContain(t('trips.exploreMore'));
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
