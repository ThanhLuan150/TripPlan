import {provices} from '@/features/trips/data/provinces';
import {MAX_NOTE} from '@/features/trips/validation';
import type {TripFormPrefill} from '@/features/trips/types';
import type {Recommendation} from './types';

// The new-plan form filled from a suggestion: the province when it is one of the list (the AI may
// write anything), and the place with its description as the note the plan AI uses first.
export const planPrefill = (item: Recommendation): TripFormPrefill => {
  const province = [item.place?.location, item.province].find(value => value && provices.includes(value));
  const where = item.province ? `${item.name} (${item.province})` : item.name;
  return {...(province && {location: province}), fromSuggestion: true, note: `${where}: ${item.description}`.slice(0, MAX_NOTE)};
};
