import type {TFunction} from 'i18next';
import {money} from './text';

type Translate = TFunction;

// Budget ranges for one person, shown to the user (translated).
export const budgetLabelsFor = (t: Translate) => [
  t('trips.create.budgetUnder', {max: money(1000000)}),
  t('trips.create.budgetRange', {min: money(1000000), max: money(5000000)}),
  t('trips.create.budgetRange', {min: money(5000000), max: money(15000000)}),
];

// What is sent to the AI: always Vietnamese, same order as the labels.
export const budgetValues = [
  `Dưới ${money(1000000)} VND`,
  `${money(1000000)} VND - ${money(5000000)} VND`,
  `${money(5000000)} VND - ${money(15000000)} VND`,
];
