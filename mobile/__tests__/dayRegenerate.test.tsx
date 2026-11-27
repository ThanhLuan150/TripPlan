import {TextInput, TouchableOpacity} from 'react-native';
import i18n from '../src/i18n';
import {MAX_AI_EDIT_LENGTH, tripsApi} from '../src/api';
import DayRegeneratePanel from '../src/components/DayRegeneratePanel';
import {subscribeAlert} from '../src/lib/alert';
import {act, flush, press, pressText, allText, renderApp} from './helpers/render';

jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  tripsApi: {proposeDayRegeneration: jest.fn(), applyDayRegeneration: jest.fn(), rejectDayRegeneration: jest.fn()},
}));

const t = (key: string, opts?: object) => (i18n.t as any)(key, opts) as string;
type Tree = ReturnType<typeof renderApp>;

const place = (n: number, name: string) => ({_id: `c${n}`, challengeSummary: '', nameLocation: name, points: 10});
const days = [
  {_id: 'd1', title: 'Ngày 1', date: '2026-03-01', challenges: [place(1, 'Hồ Xuân Hương')]},
  {_id: 'd2', title: 'Ngày 2', date: '2026-03-02', challenges: [place(2, 'Thung lũng')]},
];
const activity = (name: string, extra = {}) => ({name_location: name, challenge_summary: 'Mô tả', level_of_difficult: 20, ...extra});
const result = {
  proposal: {
    id: 'p1',
    dayId: 'd1',
    day: {title: 'Ngày mới', activities: [activity('Hồ Xuân Hương'), activity('Chợ Đà Lạt'), activity('Núi Langbiang', {kept: true})], transportCost: 1, foodCost: 2, otherCost: 0},
  },
  current: {id: 'd1', day: 1, title: 'Ngày cũ', activities: [activity('Hồ Xuân Hương')], transportCost: 1, foodCost: 1, otherCost: 0},
};

const button = (tree: Tree, label: string) =>
  tree.root.findAll(n => n.props.accessibilityLabel === label && n.props.onPress && n.type === TouchableOpacity)[0];
const mount = (d: any = days) => renderApp(<DayRegeneratePanel tripId="t1" days={d} />);
const type = (tree: Tree, text: string) => act(() => tree.root.findAllByType(TextInput).find(n => n.props.accessibilityLabel === t('trips.dayRegenPlaceholder'))!.props.onChangeText(text));
const regenerate = async (tree: Tree) => {
  press(button(tree, t('trips.dayRegenRegenerate')));
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

describe('DayRegeneratePanel', () => {
  it('renders nothing when the trip has no day', () => {
    expect(allText(mount([]))).not.toContain(t('trips.dayRegenTitle'));
  });

  it('shows the current and the proposed day and saves nothing until Accept', async () => {
    (tripsApi.proposeDayRegeneration as jest.Mock).mockResolvedValue(result);
    const tree = mount();

    await regenerate(tree);

    expect(tripsApi.proposeDayRegeneration).toHaveBeenCalledWith('t1', 'd1', undefined);
    const text = allText(tree);
    expect(text).toContain(t('trips.dayRegenPreview'));
    expect(text).toContain('Ngày cũ');
    expect(text).toContain('Ngày mới');
    expect(text).toContain(`Chợ Đà Lạt (${t('trips.dayRegenNew')})`);
    expect(text).toContain(`Núi Langbiang (${t('trips.dayRegenKept')})`);
    expect(text).not.toContain(`Hồ Xuân Hương (${t('trips.dayRegenNew')})`);
    expect(tripsApi.applyDayRegeneration).not.toHaveBeenCalled();
  });

  it('regenerates the day the user picked, with the trimmed request', async () => {
    (tripsApi.proposeDayRegeneration as jest.Mock).mockResolvedValue({...result, proposal: {...result.proposal, dayId: 'd2'}});
    const tree = mount();

    press(tree.root.findAll(n => n.type === TouchableOpacity && n.props.onPress)[0]);
    pressText(tree, '2. Ngày 2', 'last');
    type(tree, '  more food  ');
    await regenerate(tree);

    expect(tripsApi.proposeDayRegeneration).toHaveBeenCalledWith('t1', 'd2', 'more food');
  });

  it('Accept sends only the proposal id, confirms and closes the preview', async () => {
    (tripsApi.proposeDayRegeneration as jest.Mock).mockResolvedValue(result);
    (tripsApi.applyDayRegeneration as jest.Mock).mockResolvedValue({});
    const tree = mount();
    await regenerate(tree);

    press(button(tree, t('trips.dayRegenAccept')));
    await flush();

    expect(tripsApi.applyDayRegeneration).toHaveBeenCalledWith('t1', 'p1');
    expect(alerted('trips.dayRegenApplied')).toBe(true);
    expect(allText(tree)).not.toContain(t('trips.dayRegenPreview'));
  });

  it('Reject drops the proposal without saving anything', async () => {
    (tripsApi.proposeDayRegeneration as jest.Mock).mockResolvedValue(result);
    const tree = mount();
    await regenerate(tree);

    press(button(tree, t('trips.dayRegenReject')));
    await flush();

    expect(allText(tree)).not.toContain(t('trips.dayRegenPreview'));
    expect(alerted('trips.dayRegenRejected')).toBe(true);
    expect(tripsApi.rejectDayRegeneration).toHaveBeenCalledWith('t1', 'p1');
    expect(tripsApi.applyDayRegeneration).not.toHaveBeenCalled();
  });

  it('refuses a request that is too long, without calling the server', async () => {
    const tree = mount();

    type(tree, 'x'.repeat(MAX_AI_EDIT_LENGTH + 1));

    expect(allText(tree)).toContain(t('trips.dayRegenTooLong', {max: MAX_AI_EDIT_LENGTH}));
    // the button is disabled (the test helper presses regardless, so check the prop)
    expect(button(tree, t('trips.dayRegenRegenerate')).props.disabled).toBe(true);
    expect(tripsApi.proposeDayRegeneration).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty day', {response: {status: 502, data: {code: 'AI_EMPTY_DAY'}}}, 'trips.dayRegenEmpty'],
    ['an invalid answer', {response: {status: 502, data: {code: 'AI_INVALID_RESPONSE'}}}, 'trips.dayRegenInvalid'],
    ['an AI outage', {response: {status: 503, data: {code: 'AI_BUSY'}}}, 'trips.dayRegenUnavailable'],
    ['a network error', {isAxiosError: true}, 'common.networkError'],
    ['another error', new Error('x'), 'trips.dayRegenFailed'],
  ])('keeps the itinerary and explains: %s', async (_n, error, key) => {
    (tripsApi.proposeDayRegeneration as jest.Mock).mockRejectedValue(error);
    const tree = mount();

    await regenerate(tree);

    expect(alerted(key)).toBe(true);
    expect(allText(tree)).not.toContain(t('trips.dayRegenPreview'));
    expect(tripsApi.applyDayRegeneration).not.toHaveBeenCalled();
  });

  it('explains a stale proposal (409), a network error and a failed save', async () => {
    (tripsApi.proposeDayRegeneration as jest.Mock).mockResolvedValue(result);
    (tripsApi.applyDayRegeneration as jest.Mock)
      .mockRejectedValueOnce({response: {status: 409, data: {}}})
      .mockRejectedValueOnce({isAxiosError: true})
      .mockRejectedValueOnce(new Error('x'));
    const tree = mount();
    await regenerate(tree);

    press(button(tree, t('trips.dayRegenAccept')));
    await flush();
    expect(alerted('trips.dayRegenApplyInvalid')).toBe(true);
    press(button(tree, t('trips.dayRegenAccept')));
    await flush();
    expect(alerted('common.networkError')).toBe(true);
    press(button(tree, t('trips.dayRegenAccept')));
    await flush();
    expect(alerted('trips.dayRegenApplyFailed')).toBe(true);
  });
});
