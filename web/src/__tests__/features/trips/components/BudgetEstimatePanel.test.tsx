import {screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {tripsApi} from '@/features/trips/api/tripsApi';
import {amountErrorKey, travelersErrorKey} from '@/features/trips/budgetValidation';
import BudgetEstimatePanel from '@/features/trips/components/BudgetEstimatePanel';
import type {BudgetEstimate} from '@/features/trips/types';
import {httpError, networkError, pending, renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

const estimate: BudgetEstimate = {
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

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(tripsApi.budgetEstimate).mockResolvedValue(null);
});

const render = () => renderWithProviders(<BudgetEstimatePanel tripId="t1" />);
const clickEstimate = (name = t('trips.budget.estimate')) => userEvent.click(screen.getByRole('button', {name}));

describe('budget validation', () => {
  it('accepts 1..50 whole people and amounts >= 0', () => {
    expect(travelersErrorKey('1')).toBeNull();
    expect(travelersErrorKey('1000')).toBeNull();
    for (const bad of ['', '0', '1001', '1.5', 'abc']) {
      expect(travelersErrorKey(bad)).toBe('trips.budget.travelersInvalid');
    }
    expect(amountErrorKey('0')).toBeNull();
    expect(amountErrorKey('1500')).toBeNull();
    for (const bad of ['', '-1', 'x']) {
      expect(amountErrorKey(bad)).toBe('trips.budget.amountInvalid');
    }
  });
});

describe('BudgetEstimatePanel', () => {
  it('shows the planned costs of the trip (per person) apart from the estimate, only when there are some', async () => {
    const {unmount} = renderWithProviders(
      <BudgetEstimatePanel tripId="t1" days={[{title: 'a', date: '', challenges: [], transportCost: 150000, foodCost: 200000, otherCost: 100000}]} />,
    );
    expect(await screen.findByTestId('budget-planned')).toHaveTextContent('450.000');
    unmount();

    render();
    expect(await screen.findByText(t('trips.budget.empty'))).toBeInTheDocument();
    expect(screen.queryByTestId('budget-planned')).toBeNull();
  });

  it('says it is an estimate and not an expense, and shows the empty state', async () => {
    render();

    expect(screen.getByText(t('trips.budget.notExpense'))).toBeInTheDocument();
    expect(screen.getByText(t('trips.budget.badge'))).toBeInTheDocument();
    expect(await screen.findByText(t('trips.budget.empty'))).toBeInTheDocument();
  });

  it('shows the saved estimate by category with total, assumptions and the estimate badge', async () => {
    vi.mocked(tripsApi.budgetEstimate).mockResolvedValue(estimate);
    render();

    expect(await screen.findByText(t('trips.budget.categories.accommodation'))).toBeInTheDocument();
    expect(screen.getByText('Khách sạn 3 sao')).toBeInTheDocument();
    expect(screen.getByTestId('budget-total')).toHaveTextContent('2.100.000 VND');
    expect(screen.getByText('Ăn quán địa phương')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t('trips.budget.reestimate')})).toBeInTheDocument();
  });

  it('does not call the AI for an invalid number of people', async () => {
    render();

    await userEvent.clear(screen.getByLabelText(t('trips.budget.travelers')));
    await userEvent.type(screen.getByLabelText(t('trips.budget.travelers')), '0');
    await clickEstimate();

    expect(await screen.findByText(t('trips.budget.travelersInvalid', {max: 1000}))).toBeInTheDocument();
    expect(tripsApi.estimateBudget).not.toHaveBeenCalled();
  });

  it('keeps the people field reachable by its label after an error, so the user can correct it and ask again', async () => {
    vi.mocked(tripsApi.estimateBudget).mockResolvedValue(estimate);
    render();

    await userEvent.clear(screen.getByLabelText(t('trips.budget.travelers')));
    await userEvent.type(screen.getByLabelText(t('trips.budget.travelers')), '0');
    await clickEstimate();
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    // the error is not part of the label
    await userEvent.clear(screen.getByLabelText(t('trips.budget.travelers')));
    await userEvent.type(screen.getByLabelText(t('trips.budget.travelers')), '3');
    await clickEstimate();

    expect(tripsApi.estimateBudget).toHaveBeenCalledWith('t1', {travelers: 3, spendingLevel: 'moderate'});
  });

  it('sends the people and the level and shows the new estimate', async () => {
    vi.mocked(tripsApi.estimateBudget).mockResolvedValue(estimate);
    render();

    await userEvent.clear(screen.getByLabelText(t('trips.budget.travelers')));
    await userEvent.type(screen.getByLabelText(t('trips.budget.travelers')), '2');
    await userEvent.click(screen.getByRole('radio', {name: t('trips.budget.levels.premium')}));
    expect(screen.getByRole('radio', {name: t('trips.budget.levels.premium')})).toBeChecked();
    await clickEstimate();

    expect(tripsApi.estimateBudget).toHaveBeenCalledWith('t1', {travelers: 2, spendingLevel: 'premium'});
    expect(await screen.findByTestId('budget-total')).toHaveTextContent('2.100.000 VND');
    expect(await screen.findByText(t('trips.budget.estimated'))).toBeInTheDocument();
  });

  it('shows a loading state while the AI works', async () => {
    vi.mocked(tripsApi.estimateBudget).mockReturnValue(pending());
    render();

    await clickEstimate();

    expect(await screen.findByText(t('trips.budget.loading'))).toBeInTheDocument();
  });

  it.each([
    ['a wrong AI format', httpError(502, {code: 'AI_INVALID_RESPONSE'}), 'trips.budget.invalid'],
    ['the AI being down', httpError(503, {code: 'AI_BUSY'}), 'trips.budget.unavailable'],
    ['a trip without itinerary', httpError(400), 'trips.budget.noItinerary'],
    ['a server error', httpError(500), 'trips.budget.failed'],
    ['a lost connection', networkError(), 'common.networkError'],
  ])('tells the user why the estimate failed and keeps the saved one: %s', async (_name, error, key) => {
    vi.mocked(tripsApi.budgetEstimate).mockResolvedValue(estimate);
    vi.mocked(tripsApi.estimateBudget).mockRejectedValue(error);
    render();
    await screen.findByTestId('budget-total');

    await clickEstimate(t('trips.budget.reestimate'));

    expect(await screen.findByText(t(key))).toBeInTheDocument();
    expect(screen.getByTestId('budget-total')).toHaveTextContent('2.100.000 VND');
  });

  it('tells the user when the saved estimate could not be loaded', async () => {
    vi.mocked(tripsApi.budgetEstimate).mockRejectedValue(httpError(500));
    render();

    expect(await screen.findByText(t('trips.budget.loadFailed'))).toBeInTheDocument();
  });

  describe('adjusting amounts', () => {
    const startEditing = async () => {
      vi.mocked(tripsApi.budgetEstimate).mockResolvedValue(estimate);
      render();
      await userEvent.click(await screen.findByRole('button', {name: t('trips.budget.edit')}));
    };

    it('recomputes the total while typing and saves the amounts', async () => {
      vi.mocked(tripsApi.updateBudgetEstimate).mockResolvedValue({...estimate, total: 2600000, source: 'manual'});
      await startEditing();

      const food = screen.getByLabelText(t('trips.budget.categories.food'));
      await userEvent.clear(food);
      await userEvent.type(food, '1000000');
      expect(screen.getByTestId('budget-total')).toHaveTextContent('2.600.000 VND');
      await userEvent.click(screen.getByRole('button', {name: t('trips.budget.save')}));

      expect(tripsApi.updateBudgetEstimate).toHaveBeenCalledWith('t1', [
        {key: 'accommodation', amount: 1000000},
        {key: 'food', amount: 1000000},
        {key: 'transport', amount: 300000},
        {key: 'activities', amount: 200000},
        {key: 'other', amount: 100000},
      ]);
      expect(await screen.findByText(t('trips.budget.updated'))).toBeInTheDocument();
      expect(await screen.findByText(t('trips.budget.edited'))).toBeInTheDocument();
      expect(screen.queryByRole('button', {name: t('trips.budget.save')})).toBeNull();
    });

    it('blocks saving an invalid amount', async () => {
      await startEditing();

      const food = screen.getByLabelText(t('trips.budget.categories.food'));
      await userEvent.clear(food);

      expect(await screen.findByText(t('trips.budget.amountInvalid'))).toBeInTheDocument();
      expect(screen.getByRole('button', {name: t('trips.budget.save')})).toBeDisabled();
      expect(tripsApi.updateBudgetEstimate).not.toHaveBeenCalled();
    });

    it('cancel drops the changes', async () => {
      await startEditing();
      await userEvent.type(screen.getByLabelText(t('trips.budget.categories.food')), '0');

      await userEvent.click(screen.getByRole('button', {name: t('trips.budget.cancel')}));

      expect(screen.getByTestId('budget-total')).toHaveTextContent('2.100.000 VND');
      expect(within(screen.getByRole('group')).queryByRole('spinbutton')).toBeNull();
      expect(tripsApi.updateBudgetEstimate).not.toHaveBeenCalled();
    });

    it('keeps the editor open when saving fails', async () => {
      vi.mocked(tripsApi.updateBudgetEstimate).mockRejectedValue(httpError(500));
      await startEditing();

      await userEvent.click(screen.getByRole('button', {name: t('trips.budget.save')}));

      expect(await screen.findByText(t('trips.budget.updateFailed'))).toBeInTheDocument();
      expect(screen.getByRole('button', {name: t('trips.budget.save')})).toBeInTheDocument();
    });
  });
});
