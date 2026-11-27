import {MAX_TRAVELERS} from './types';

// Error key for the number of people, or null when it is a whole number from 1 to MAX_TRAVELERS.
export const travelersErrorKey = (value: string): 'trips.budget.travelersInvalid' | null => {
  const n = Number(value);
  return value.trim() !== '' && Number.isInteger(n) && n >= 1 && n <= MAX_TRAVELERS ? null : 'trips.budget.travelersInvalid';
};

// Error key for an amount typed by the user, or null when it is a number >= 0.
export const amountErrorKey = (value: string): 'trips.budget.amountInvalid' | null => {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) && n >= 0 ? null : 'trips.budget.amountInvalid';
};
