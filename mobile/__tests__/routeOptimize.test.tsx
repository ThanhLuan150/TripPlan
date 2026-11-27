import {TouchableOpacity} from 'react-native';
import i18n from '../src/i18n';
import {tripsApi} from '../src/api';
import RouteOptimizePanel, {formatDistance, formatDuration} from '../src/components/RouteOptimizePanel';
import {subscribeAlert} from '../src/lib/alert';
import {flush, press, pressText, allText, renderApp} from './helpers/render';

jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  tripsApi: {proposeRoute: jest.fn(), applyRoute: jest.fn(), rejectRoute: jest.fn()},
}));

const t = (key: string, opts?: object) => (i18n.t as any)(key, opts) as string;
type Tree = ReturnType<typeof renderApp>;

const place = (n: number, name: string) => ({_id: `c${n}`, challengeSummary: '', nameLocation: name, points: 10});
const days = [
  {_id: 'd1', title: 'Ngày 1', date: '2026-03-01', challenges: [place(1, 'A'), place(2, 'B'), place(3, 'C')]},
  {_id: 'd2', title: 'Ngày 2', date: '2026-03-02', challenges: []},
  {_id: 'd3', title: 'Ngày 3', date: '2026-03-03', challenges: [place(4, 'D'), place(5, 'E'), place(6, 'F')]},
];
const p = (id: string, name: string) => ({id, name, location: null});
const proposal = {
  dayId: 'd1',
  source: 'road',
  missingCoordinates: [],
  current: {distance: 5000, duration: 3600},
  proposed: {distance: 3000, duration: 1800},
  currentOrder: [p('c1', 'A'), p('c2', 'B'), p('c3', 'C')],
  proposedOrder: [p('c1', 'A'), p('c3', 'C'), p('c2', 'B')],
  improved: true,
  proposalId: 'p1',
};

const button = (tree: Tree, label: string) =>
  tree.root.findAll(n => n.props.accessibilityLabel === label && n.props.onPress && n.type === TouchableOpacity)[0];
const mount = (d: any = days) => renderApp(<RouteOptimizePanel tripId="t1" days={d} />);
const optimize = async (tree: Tree) => {
  press(button(tree, t('trips.routeOptimize')));
  await flush();
};

let alerts: any[] = [];
let off: () => void;
beforeEach(() => {
  jest.clearAllMocks();
  alerts = [];
  off = subscribeAlert(a => alerts.push(a));
});
afterEach(() => off());
const alerted = (key: string) => alerts.some(a => a.title === t(key) || a.message === t(key));

describe('formatters', () => {
  it('formats distance and duration', () => {
    expect(formatDistance(350)).toBe('350 m');
    expect(formatDistance(2400)).toBe('2.4 km');
    expect(formatDuration(20)).toBe('1 min');
    expect(formatDuration(3900)).toBe('1 h 05 min');
  });
});

describe('RouteOptimizePanel', () => {
  it('renders nothing when no day has a place', () => {
    const tree = mount([days[1]]);
    expect(allText(tree)).not.toContain(t('trips.routeTitle'));
  });

  it('shows current and suggested order with distances and saves nothing until Accept', async () => {
    (tripsApi.proposeRoute as jest.Mock).mockResolvedValue(proposal);
    const tree = mount();

    await optimize(tree);

    expect(tripsApi.proposeRoute).toHaveBeenCalledWith('t1', 'd1');
    const text = allText(tree);
    expect(text).toContain(t('trips.routePreview'));
    expect(text).toContain(t('trips.routeCurrent'));
    expect(text).toContain(t('trips.routeProposed'));
    expect(text).toContain('2. B');
    expect(text).toContain('2. C');
    expect(text).toContain('5 km');
    expect(text).toContain('30 min');
    expect(tripsApi.applyRoute).not.toHaveBeenCalled();
  });

  it('optimizes the day the user picked (days without places are not offered)', async () => {
    (tripsApi.proposeRoute as jest.Mock).mockResolvedValue({...proposal, improved: false, proposalId: null});
    const tree = mount();

    // open the dropdown and pick the third day
    press(tree.root.findAll(n => n.type === TouchableOpacity && n.props.onPress)[0]);
    expect(allText(tree)).not.toContain("2. Ngày 2");
    pressText(tree, "3. Ngày 3", "last");
    await optimize(tree);

    expect(tripsApi.proposeRoute).toHaveBeenCalledWith('t1', 'd3');
  });

  it('Accept sends only the proposal id, confirms and closes the preview', async () => {
    (tripsApi.proposeRoute as jest.Mock).mockResolvedValue(proposal);
    (tripsApi.applyRoute as jest.Mock).mockResolvedValue({});
    const tree = mount();
    await optimize(tree);

    press(button(tree, t('trips.routeAccept')));
    await flush();

    expect(tripsApi.applyRoute).toHaveBeenCalledWith('t1', 'p1');
    expect(alerted('trips.routeApplied')).toBe(true);
    expect(allText(tree)).not.toContain(t('trips.routePreview'));
  });

  it('Reject drops the proposal without saving anything', async () => {
    (tripsApi.proposeRoute as jest.Mock).mockResolvedValue(proposal);
    const tree = mount();
    await optimize(tree);

    press(button(tree, t('trips.routeReject')));
    await flush();

    expect(allText(tree)).not.toContain(t('trips.routePreview'));
    expect(alerted('trips.routeRejected')).toBe(true);
    expect(tripsApi.rejectRoute).toHaveBeenCalledWith('t1', 'p1');
    expect(tripsApi.applyRoute).not.toHaveBeenCalled();
  });

  it('says the order is already the shortest, with nothing to accept', async () => {
    (tripsApi.proposeRoute as jest.Mock).mockResolvedValue({...proposal, improved: false, proposalId: null});
    const tree = mount();

    await optimize(tree);

    expect(allText(tree)).toContain(t('trips.routeAlreadyBest'));
    expect(button(tree, t('trips.routeAccept'))).toBeUndefined();
    press(button(tree, t('trips.routeClose')));
    await flush();
    expect(allText(tree)).not.toContain(t('trips.routeAlreadyBest'));
  });

  it('warns about straight-line distances (no time) and places without a position', async () => {
    (tripsApi.proposeRoute as jest.Mock).mockResolvedValue({
      ...proposal,
      source: 'straight-line',
      current: {distance: 5000, duration: null},
      proposed: {distance: 3000, duration: null},
      missingCoordinates: [p('c9', 'Quán X')],
    });
    const tree = mount();

    await optimize(tree);

    const text = allText(tree);
    expect(text).toContain(t('trips.routeStraightLine'));
    expect(text).toContain(t('trips.routeMissing', {places: 'Quán X'}));
    expect(text).not.toContain('driving time');
  });

  it.each([
    ['not enough coordinates', {response: {status: 400, data: {code: 'ROUTE_NOT_ENOUGH_COORDINATES'}}}, 'trips.routeNotEnough'],
    ['too many places', {response: {status: 400, data: {code: 'ROUTE_TOO_MANY_PLACES'}}}, 'trips.routeTooMany'],
    ['a network error', {isAxiosError: true}, 'common.networkError'],
    ['another error', new Error('x'), 'trips.routeFailed'],
  ])('keeps the itinerary and explains: %s', async (_n, error, key) => {
    (tripsApi.proposeRoute as jest.Mock).mockRejectedValue(error);
    const tree = mount();

    await optimize(tree);

    expect(alerted(key)).toBe(true);
    expect(tripsApi.applyRoute).not.toHaveBeenCalled();
  });

  it('explains a stale proposal (409) and a failed save', async () => {
    (tripsApi.proposeRoute as jest.Mock).mockResolvedValue(proposal);
    (tripsApi.applyRoute as jest.Mock)
      .mockRejectedValueOnce({response: {status: 409, data: {}}})
      .mockRejectedValueOnce(new Error('x'));
    const tree = mount();
    await optimize(tree);

    press(button(tree, t('trips.routeAccept')));
    await flush();
    expect(alerted('trips.routeApplyInvalid')).toBe(true);
    press(button(tree, t('trips.routeAccept')));
    await flush();
    expect(alerted('trips.routeApplyFailed')).toBe(true);
  });
});
