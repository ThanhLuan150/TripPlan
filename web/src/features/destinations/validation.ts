import {provices} from '@/features/trips/data/provinces';
import {MAX_RECOMMEND_BUDGET_LENGTH, MAX_RECOMMEND_QUERY_LENGTH, type RecommendParams} from './types';

export type RecommendErrors = {query?: string; interests?: string; region?: string; budget?: string};

// Error keys of a recommendation request, or {} when it can be sent. At least one input is needed:
// an empty form flags every field (like the new-plan form), the first with what to do and the others
// with the other way out.
export const recommendErrors = ({query, interests, region, budget}: RecommendParams): RecommendErrors => {
  const errors: RecommendErrors = {};
  if (query.trim().length > MAX_RECOMMEND_QUERY_LENGTH) {
    errors.query = 'destinations.tooLong';
  } else if (!query.trim() && interests.length === 0 && !region && !budget.trim()) {
    errors.query = 'destinations.required';
    errors.interests = 'destinations.orChoose';
    errors.region = 'destinations.orChoose';
    errors.budget = 'destinations.orChoose';
  }
  if (region && !provices.includes(region)) {
    errors.region = 'destinations.regionInvalid';
  }
  if (budget.trim().length > MAX_RECOMMEND_BUDGET_LENGTH) {
    errors.budget = 'destinations.budgetTooLong';
  }
  return errors;
};
