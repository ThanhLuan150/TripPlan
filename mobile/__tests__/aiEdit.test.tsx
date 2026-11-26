import {TextInput, TouchableOpacity} from 'react-native';
import i18n from '../src/i18n';
import {MAX_AI_EDIT_LENGTH, tripsApi} from '../src/api';
import AiEditPanel, {aiEditErrorKey} from '../src/components/AiEditPanel';
import {subscribeAlert} from '../src/lib/alert';
import {act, allText, flush, press, renderApp} from './helpers/render';

jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  tripsApi: {proposeAiEdit: jest.fn(), applyAiEdit: jest.fn(), rejectAiEdit: jest.fn()},
}));

const t = (key: string, opts?: object) => (i18n.t as any)(key, opts) as string;
type Tree = ReturnType<typeof renderApp>;

const days = [
  {
    title: 'Ngày 1',
    date: '2026-03-01',
    challenges: [{_id: 'c1', challengeSummary: 'Đi dạo', nameLocation: 'Hồ Xuân Hương', points: 20}],
  },
];
const proposal = {
  id: 'p1',
  days: [
  {
    title: 'Ngày 1 mới',
    activities: [
      {name_location: 'Hồ Xuân Hương', challenge_summary: 'Đi dạo', level_of_difficult: 20},
      {name_location: 'Quán Mê Linh', challenge_summary: 'Cà phê', level_of_difficult: 10},
    ],
    transportCost: 1,
    foodCost: 2,
    otherCost: 3,
  },
  ],
};

const button = (tree: Tree, label: string) =>
  tree.root.findAll(n => n.props.accessibilityLabel === label && n.props.onPress && n.type === TouchableOpacity)[0];
const type = (tree: Tree, text: string) => act(() => tree.root.findAllByType(TextInput)[0].props.onChangeText(text));
const mount = () => renderApp(<AiEditPanel tripId="t1" days={days as any} />);
const ask = async (tree: Tree, text = 'Thêm quán cà phê') => {
  type(tree, text);
  press(button(tree, t('trips.aiEditAsk')));
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

describe('aiEditErrorKey', () => {
  it('accepts text, rejects empty and too long', () => {
    expect(aiEditErrorKey('hello')).toBeNull();
    expect(aiEditErrorKey('  ')).toBe('trips.aiEditRequired');
    expect(aiEditErrorKey('a'.repeat(MAX_AI_EDIT_LENGTH + 1))).toBe('trips.aiEditTooLong');
  });
});

describe('AiEditPanel', () => {
  it('does not call the AI for an empty request', async () => {
    const tree = mount();
    press(button(tree, t('trips.aiEditAsk')));
    expect(allText(tree)).toContain(t('trips.aiEditRequired'));
    expect(tripsApi.proposeAiEdit).not.toHaveBeenCalled();
  });

  it('the keyboard return key sends the request', async () => {
    (tripsApi.proposeAiEdit as jest.Mock).mockResolvedValue(proposal);
    const tree = mount();
    const field = tree.root.findAllByType(TextInput)[0];
    expect(field.props.submitBehavior).toBe('submit');

    type(tree, 'Thêm quán cà phê');
    act(() => field.props.onSubmitEditing());
    await flush();

    expect(tripsApi.proposeAiEdit).toHaveBeenCalledWith('t1', 'Thêm quán cà phê');
    expect(allText(tree)).toContain(t('trips.aiEditPreview'));
  });

  it('shows a preview (new places marked) and saves nothing until Accept', async () => {
    (tripsApi.proposeAiEdit as jest.Mock).mockResolvedValue(proposal);
    const tree = mount();
    await ask(tree);

    expect(tripsApi.proposeAiEdit).toHaveBeenCalledWith('t1', 'Thêm quán cà phê');
    expect(allText(tree)).toContain(t('trips.aiEditPreview'));
    expect(allText(tree)).toContain(`Quán Mê Linh (${t('trips.aiEditNew')})`);
    expect(allText(tree)).not.toContain(`Hồ Xuân Hương (${t('trips.aiEditNew')})`);
    expect(tripsApi.applyAiEdit).not.toHaveBeenCalled();
  });

  it('marks a completed place the AI left out as kept, not as new', async () => {
    (tripsApi.proposeAiEdit as jest.Mock).mockResolvedValue({
      id: 'p2',
      days: [{...proposal.days[0], activities: [{name_location: 'Hồ Xuân Hương', challenge_summary: 'Đi dạo', level_of_difficult: 20, kept: true}]}],
    });
    const tree = mount();
    await ask(tree);

    expect(allText(tree)).toContain(`Hồ Xuân Hương (${t('trips.aiEditKept')})`);
    expect(allText(tree)).not.toContain(`(${t('trips.aiEditNew')})`);
  });

  it('Accept sends the proposal id, confirms and closes the preview', async () => {
    (tripsApi.proposeAiEdit as jest.Mock).mockResolvedValue(proposal);
    (tripsApi.applyAiEdit as jest.Mock).mockResolvedValue({});
    const tree = mount();
    await ask(tree);

    press(button(tree, t('trips.aiEditAccept')));
    await flush();

    expect(tripsApi.applyAiEdit).toHaveBeenCalledWith('t1', 'p1');
    expect(alerted('trips.aiEditApplied')).toBe(true);
    expect(allText(tree)).not.toContain(t('trips.aiEditPreview'));
  });

  it('Reject drops the proposal without saving anything', async () => {
    (tripsApi.proposeAiEdit as jest.Mock).mockResolvedValue(proposal);
    const tree = mount();
    await ask(tree);

    press(button(tree, t('trips.aiEditReject')));
    await flush();

    expect(allText(tree)).not.toContain(t('trips.aiEditPreview'));
    expect(alerted('trips.aiEditRejected')).toBe(true);
    expect(tripsApi.rejectAiEdit).toHaveBeenCalledWith('t1', 'p1');
    expect(tripsApi.applyAiEdit).not.toHaveBeenCalled();
  });

  it('tells the user when the AI answers badly or fails, with no preview', async () => {
    (tripsApi.proposeAiEdit as jest.Mock).mockRejectedValue({response: {status: 502, data: {code: 'AI_INVALID_RESPONSE'}}});
    const tree = mount();
    await ask(tree);
    expect(alerted('trips.aiEditInvalid')).toBe(true);
    expect(allText(tree)).not.toContain(t('trips.aiEditPreview'));

    (tripsApi.proposeAiEdit as jest.Mock).mockRejectedValue(new Error('x'));
    await ask(tree);
    expect(alerted('trips.aiEditFailed')).toBe(true);
    expect(tripsApi.applyAiEdit).not.toHaveBeenCalled();
  });

  it('keeps the preview when saving fails so the user can retry', async () => {
    (tripsApi.proposeAiEdit as jest.Mock).mockResolvedValue(proposal);
    (tripsApi.applyAiEdit as jest.Mock).mockRejectedValue(new Error('x'));
    const tree = mount();
    await ask(tree);

    press(button(tree, t('trips.aiEditAccept')));
    await flush();

    expect(alerted('trips.aiEditApplyFailed')).toBe(true);
    expect(allText(tree)).toContain(t('trips.aiEditPreview'));
  });
});
