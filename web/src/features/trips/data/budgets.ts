import {addCommas} from '@/lib/date';
import type {BudgetTier} from '../types';

// Budget ranges per person. `value` (Vietnamese) is sent to the AI prompt.
export const budgetOptions = (people: number) => {
  const m1 = addCommas(1000000 * people);
  const m5 = addCommas(5000000 * people);
  const m15 = addCommas(15000000 * people);
  return [
    {tier: 'low' as BudgetTier, value: `Dưới ${m1} VND`, labelKey: 'trips.create.budgetLow', key: 'trips.create.budgetUnder', vars: {max: m1}},
    {tier: 'mid' as BudgetTier, value: `${m1} VND - ${m5} VND`, labelKey: 'trips.create.budgetMid', key: 'trips.create.budgetRange', vars: {min: m1, max: m5}},
    {tier: 'high' as BudgetTier, value: `${m5} VND - ${m15} VND`, labelKey: 'trips.create.budgetHigh', key: 'trips.create.budgetRange', vars: {min: m5, max: m15}},
  ];
};
