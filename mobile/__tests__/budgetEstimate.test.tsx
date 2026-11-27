import {TextInput, TouchableOpacity} from 'react-native';
import i18n from '../src/i18n';
import {MAX_TRAVELERS, tripsApi} from '../src/api';
import BudgetEstimatePanel, {amountErrorKey, travelersErrorKey} from '../src/components/BudgetEstimatePanel';
import {subscribeAlert} from '../src/lib/alert';
import {act, allText, flush, press, renderApp} from './helpers/render';

jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  tripsApi: {budgetEstimate: jest.fn(), estimateBudget: jest.fn(), updateBudgetEstimate: jest.fn()},
}));

const t = (key: string, opts?: object) => (i18n.t as any)(key, opts) as string;
type Tree = ReturnType<typeof renderApp>;

const estimate = {
  id: 'e1',
  isEstimate: true,
  currency: 'VND',
  travelers: 2,
  spendingLevel: 'moderate',
  categories: [
    {key: 'accommodation', amount: 1000000, note: 'Khách sạn 3 sao'},
    {key: 'food', amount: 500000, note: ''},
    {key: 'transport', amount: 300000, note: ''},
    {key: 'activities', amount: 200000, note: ''},
    {key: 'other', amount: 100000, note: ''},
  ],
  total: 2100000,
  assumptions: ['Ăn quán địa phương'],
  source: 'ai',
  updatedAt: '2026-11-27T00:00:00.000Z',
};

const button = (tree: Tree, label: string) =>
  tree.root.findAll(n => n.props.accessibilityLabel === label && n.props.onPress && n.type === TouchableOpacity)[0];
const field = (tree: Tree, label: string) =>
  tree.root.findAllByType(TextInput).find(n => n.props.accessibilityLabel === label)!;
const type = (tree: Tree, label: string, text: string) => act(() => field(tree, label).props.onChangeText(text));
const mount = async (saved: unknown = null) => {
  (tripsApi.budgetEstimate as jest.Mock).mockResolvedValue(saved);
  const tree = renderApp(<BudgetEstimatePanel tripId="t1" />);
  await flush();
  return tree;
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

describe('budget validation', () => {
  it('accepts 1..50 whole people and amounts >= 0', () => {
    expect(travelersErrorKey('1')).toBeNull();
    expect(travelersErrorKey(String(MAX_TRAVELERS))).toBeNull();
    for (const bad of ['', '0', '1001', '1.5', 'abc']) {
      expect(travelersErrorKey(bad)).toBe('trips.budgetTravelersInvalid');
    }
    expect(amountErrorKey('0')).toBeNull();
    for (const bad of ['', '-1', 'x']) {
      expect(amountErrorKey(bad)).toBe('trips.budgetAmountInvalid');
    }
  });
});

describe('BudgetEstimatePanel', () => {
  it('shows the planned costs of the trip (per person) apart from the estimate, only when there are some', async () => {
    (tripsApi.budgetEstimate as jest.Mock).mockResolvedValue(null);
    const days = [{title: 'a', date: '', challenges: [], transportCost: 150000, foodCost: 200000, otherCost: 100000}];
    const withDays = renderApp(<BudgetEstimatePanel tripId="t1" days={days as any} />);
    await flush();
    expect(allText(withDays)).toContain(t('trips.budgetPlanned', {amount: '450.000'}));

    const without = await mount();
    expect(allText(without)).not.toContain('450.000');
  });

  it('says it is an estimate and not an expense, and shows the empty state', async () => {
    const tree = await mount();
    expect(allText(tree)).toContain(t('trips.budgetNotExpense'));
    expect(allText(tree)).toContain(t('trips.budgetBadge'));
    expect(allText(tree)).toContain(t('trips.budgetEmpty'));
  });

  it('shows the saved estimate by category with total and assumptions', async () => {
    const tree = await mount(estimate);
    const text = allText(tree);
    expect(text).toContain(t('trips.budgetAccommodation'));
    expect(text).toContain('Khách sạn 3 sao');
    expect(text).toContain('2.100.000');
    expect(text).toContain('Ăn quán địa phương');
    expect(button(tree, t('trips.budgetReestimate'))).toBeTruthy();
  });

  it('does not call the AI for an invalid number of people', async () => {
    const tree = await mount();
    type(tree, t('trips.budgetTravelers'), '0');
    press(button(tree, t('trips.budgetEstimate')));
    await flush();
    expect(allText(tree)).toContain(t('trips.budgetTravelersInvalid', {max: MAX_TRAVELERS}));
    expect(tripsApi.estimateBudget).not.toHaveBeenCalled();
  });

  it('sends people and level and shows the new estimate', async () => {
    (tripsApi.estimateBudget as jest.Mock).mockResolvedValue(estimate);
    const tree = await mount();
    type(tree, t('trips.budgetTravelers'), '2');
    // open the dropdown and pick an option
    press(tree.root.findAll(n => n.props.accessibilityRole === 'button' && n.props.onPress && n.type === TouchableOpacity)[0]);
    press(tree.root.findAll(n => n.type === TouchableOpacity && n.props.onPress && n.findAll(c => c.children?.includes?.(t('trips.budgetLevelPremium'))).length > 0).slice(-1)[0]);
    press(button(tree, t('trips.budgetEstimate')));
    await flush();

    expect(tripsApi.estimateBudget).toHaveBeenCalledWith('t1', {travelers: 2, spendingLevel: 'premium'});
    expect(allText(tree)).toContain('2.100.000');
    expect(alerted('trips.budgetEstimated')).toBe(true);
  });

  it.each([
    ['a wrong AI format', {response: {status: 502, data: {code: 'AI_INVALID_RESPONSE'}}}, 'trips.budgetInvalid'],
    ['the AI being down', {response: {status: 503, data: {code: 'AI_BUSY'}}}, 'trips.budgetUnavailable'],
    ['a trip without itinerary', {response: {status: 400, data: {}}}, 'trips.budgetNoItinerary'],
    ['another error', new Error('x'), 'trips.budgetFailed'],
  ])('tells the user why the estimate failed and keeps the saved one: %s', async (_n, error, key) => {
    (tripsApi.estimateBudget as jest.Mock).mockRejectedValue(error);
    const tree = await mount(estimate);
    press(button(tree, t('trips.budgetReestimate')));
    await flush();
    expect(alerted(key)).toBe(true);
    expect(allText(tree)).toContain('2.100.000');
  });

  it('tells the user when the saved estimate could not be loaded', async () => {
    (tripsApi.budgetEstimate as jest.Mock).mockRejectedValue(new Error('x'));
    const tree = renderApp(<BudgetEstimatePanel tripId="t1" />);
    await flush();
    await flush();
    expect(allText(tree)).toContain(t('trips.budgetLoadFailed'));
  });

  describe('adjusting amounts', () => {
    const edit = async () => {
      const tree = await mount(estimate);
      press(button(tree, t('trips.budgetEdit')));
      return tree;
    };

    it('recomputes the total while typing and saves the amounts', async () => {
      (tripsApi.updateBudgetEstimate as jest.Mock).mockResolvedValue({...estimate, total: 2600000, source: 'manual'});
      const tree = await edit();

      type(tree, t('trips.budgetFood'), '1000000');
      expect(allText(tree)).toContain('2.600.000');
      press(button(tree, t('trips.budgetSave')));
      await flush();

      expect(tripsApi.updateBudgetEstimate).toHaveBeenCalledWith('t1', [
        {key: 'accommodation', amount: 1000000},
        {key: 'food', amount: 1000000},
        {key: 'transport', amount: 300000},
        {key: 'activities', amount: 200000},
        {key: 'other', amount: 100000},
      ]);
      expect(alerted('trips.budgetUpdated')).toBe(true);
      expect(allText(tree)).toContain(t('trips.budgetEdited'));
      expect(button(tree, t('trips.budgetSave'))).toBeUndefined();
    });

    it('blocks saving an invalid amount', async () => {
      const tree = await edit();
      type(tree, t('trips.budgetFood'), '');
      expect(allText(tree)).toContain(t('trips.budgetAmountInvalid'));
      press(button(tree, t('trips.budgetSave')));
      await flush();
      expect(tripsApi.updateBudgetEstimate).not.toHaveBeenCalled();
    });

    it('cancel drops the changes', async () => {
      const tree = await edit();
      type(tree, t('trips.budgetFood'), '9');
      press(button(tree, t('trips.budgetCancel')));
      expect(allText(tree)).toContain('2.100.000');
      expect(tree.root.findAllByType(TextInput).filter(n => n.props.accessibilityLabel === t('trips.budgetFood'))).toHaveLength(0);
    });

    it('keeps the editor open when saving fails', async () => {
      (tripsApi.updateBudgetEstimate as jest.Mock).mockRejectedValue(new Error('x'));
      const tree = await edit();
      press(button(tree, t('trips.budgetSave')));
      await flush();
      expect(alerted('trips.budgetUpdateFailed')).toBe(true);
      expect(button(tree, t('trips.budgetSave'))).toBeTruthy();
    });
  });
});
