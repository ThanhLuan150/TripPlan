import {TouchableOpacity} from 'react-native';
import i18n from '../src/i18n';
import {tripsApi} from '../src/api';
import {subscribeAlert} from '../src/lib/alert';
import SavedPosts from '../src/screens/SavedPosts';
import SaveButton from '../src/components/SaveButton';
import {nav, resetNav} from './helpers/nav';
import {allText, flush, press, pressText, renderApp} from './helpers/render';

jest.mock('@react-navigation/native', () => require('./helpers/nav').navModule);
jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  tripsApi: {
    savedPosts: jest.fn(),
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
  saved: true,
});

const saveButtons = (tree: ReturnType<typeof renderApp>) =>
  tree.root
    .findAllByType(TouchableOpacity)
    .filter(n =>
      [t('trips.savePost'), t('trips.unsavePost')].includes(
        n.props.accessibilityLabel,
      ),
    );

let alerts: any[] = [];
let off: () => void;
beforeEach(() => {
  jest.clearAllMocks();
  resetNav();
  alerts = [];
  off = subscribeAlert(a => alerts.push(a));
});
afterEach(() => off());

describe('SavedPosts', () => {
  it('lists the saved posts with their total cost, each marked as saved, and opens one', async () => {
    (tripsApi.savedPosts as jest.Mock).mockResolvedValue({
      page: 1,
      limit: 12,
      total: 2,
      items: [card('a1', 'Đà Lạt 3 ngày'), card('b2', 'Huế 2 ngày')],
    });
    const tree = renderApp(<SavedPosts />);
    await flush();

    expect(tripsApi.savedPosts).toHaveBeenCalledWith(1);
    expect(allText(tree)).toContain('Huế 2 ngày');
    expect(allText(tree)).toContain(
      t('trips.exploreCost', {amount: '350.000'}),
    );
    expect(saveButtons(tree).map(b => b.props.accessibilityLabel)).toEqual([
      t('trips.unsavePost'),
      t('trips.unsavePost'),
    ]);
    pressText(tree, 'Đà Lạt 3 ngày');
    expect(nav.navigate).toHaveBeenCalledWith('PublicTripDetail', {id: 'a1'});
  });

  it('shows an empty state with a way to explore plans', async () => {
    (tripsApi.savedPosts as jest.Mock).mockResolvedValue({
      page: 1,
      limit: 12,
      total: 0,
      items: [],
    });
    const tree = renderApp(<SavedPosts />);
    await flush();

    expect(allText(tree)).toContain(t('trips.savedEmpty'));
    pressText(tree, t('trips.savedExplore'));
    expect(nav.navigate).toHaveBeenCalledWith('Tabs', {screen: 'Explore'});
  });

  it('shows an error when loading fails', async () => {
    (tripsApi.savedPosts as jest.Mock).mockRejectedValue(new Error('500'));
    const tree = renderApp(<SavedPosts />);
    await flush(8);

    expect(allText(tree)).toContain(t('trips.savedError'));
  });

  it('loads the next page on demand', async () => {
    (tripsApi.savedPosts as jest.Mock)
      .mockResolvedValueOnce({
        page: 1,
        limit: 1,
        total: 2,
        items: [card('a1', 'First plan')],
      })
      .mockResolvedValueOnce({
        page: 2,
        limit: 1,
        total: 2,
        items: [card('b2', 'Second plan')],
      });
    const tree = renderApp(<SavedPosts />);
    await flush();

    pressText(tree, t('trips.savedMore'));
    await flush();

    expect(tripsApi.savedPosts).toHaveBeenLastCalledWith(2);
    expect(allText(tree)).toContain('First plan');
    expect(allText(tree)).toContain('Second plan');
    expect(allText(tree)).not.toContain(t('trips.savedMore'));
  });

  it('unsaves a post from the list and goes back with the back pill', async () => {
    (tripsApi.savedPosts as jest.Mock)
      .mockResolvedValueOnce({
        page: 1,
        limit: 12,
        total: 1,
        items: [card('a1', 'Đà Lạt 3 ngày')],
      })
      .mockResolvedValue({page: 1, limit: 12, total: 0, items: []});
    (tripsApi.unsavePost as jest.Mock).mockResolvedValue({saved: false});
    const tree = renderApp(<SavedPosts />);
    await flush();

    press(saveButtons(tree)[0]);
    await flush();

    expect(tripsApi.unsavePost).toHaveBeenCalledWith('a1');
    expect(allText(tree)).toContain(t('trips.savedEmpty'));
  });
});

describe('SaveButton', () => {
  it('shows the current state', () => {
    const off1 = renderApp(<SaveButton tripId="t1" />);
    expect(saveButtons(off1)[0].props.accessibilityLabel).toBe(
      t('trips.savePost'),
    );
    const on = renderApp(<SaveButton tripId="t1" saved />);
    expect(saveButtons(on)[0].props.accessibilityLabel).toBe(
      t('trips.unsavePost'),
    );
  });

  it('saves, then shows the state the server answered', async () => {
    (tripsApi.savePost as jest.Mock).mockResolvedValue({saved: true});
    const tree = renderApp(<SaveButton tripId="t1" />);

    press(saveButtons(tree)[0]);
    await flush();

    expect(tripsApi.savePost).toHaveBeenCalledWith('t1');
    expect(saveButtons(tree)[0].props.accessibilityLabel).toBe(
      t('trips.unsavePost'),
    );
  });

  it('unsaves, then shows the state the server answered', async () => {
    (tripsApi.unsavePost as jest.Mock).mockResolvedValue({saved: false});
    const tree = renderApp(<SaveButton tripId="t1" saved />);

    press(saveButtons(tree)[0]);
    await flush();

    expect(tripsApi.unsavePost).toHaveBeenCalledWith('t1');
    expect(saveButtons(tree)[0].props.accessibilityLabel).toBe(
      t('trips.savePost'),
    );
  });

  it('ignores a second tap while the request is running (no duplicate save)', async () => {
    let finish: (v: unknown) => void = () => {};
    (tripsApi.savePost as jest.Mock).mockReturnValue(
      new Promise(resolve => (finish = resolve)),
    );
    const tree = renderApp(<SaveButton tripId="t1" />);

    press(saveButtons(tree)[0]);
    await flush();
    expect(saveButtons(tree)[0].props.disabled).toBe(true);
    expect(tripsApi.savePost).toHaveBeenCalledTimes(1);

    finish({saved: true});
    await flush();
    expect(saveButtons(tree)[0].props.accessibilityLabel).toBe(
      t('trips.unsavePost'),
    );
  });

  it('keeps the old state and tells the user when saving fails (post gone)', async () => {
    (tripsApi.savePost as jest.Mock).mockRejectedValue({
      response: {status: 404, data: {message: 'Post not found'}},
    });
    const tree = renderApp(<SaveButton tripId="t1" />);

    press(saveButtons(tree)[0]);
    await flush();

    expect(alerts.some(a => a.title === t('trips.savePostFailed'))).toBe(true);
    expect(saveButtons(tree)[0].props.accessibilityLabel).toBe(
      t('trips.savePost'),
    );
  });
});
