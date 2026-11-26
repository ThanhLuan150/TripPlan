import {
  MAX_RECOMMEND_BUDGET_LENGTH,
  MAX_RECOMMEND_QUERY_LENGTH,
  Recommendation,
  RecommendParams,
} from '../api';
import {provices} from './provinces';

export type RecommendErrors = {
  query?: 'recommend.required' | 'recommend.tooLong';
  interests?: 'recommend.orChoose';
  region?: 'recommend.regionInvalid' | 'recommend.orChoose';
  budget?: 'recommend.budgetTooLong' | 'recommend.orChoose';
};

// Error keys of a recommendation request, or {} when it can be sent: at least one input is needed.
export const recommendErrors = ({
  query,
  interests,
  region,
  budget,
}: RecommendParams): RecommendErrors => {
  const errors: RecommendErrors = {};
  if (query.trim().length > MAX_RECOMMEND_QUERY_LENGTH) {
    errors.query = 'recommend.tooLong';
  } else if (
    !query.trim() &&
    interests.length === 0 &&
    !region.trim() &&
    !budget.trim()
  ) {
    errors.query = 'recommend.required';
    errors.interests = 'recommend.orChoose';
    errors.region = 'recommend.orChoose';
    errors.budget = 'recommend.orChoose';
  }
  if (region.trim() && !provices.includes(region.trim())) {
    errors.region = 'recommend.regionInvalid';
  }
  if (budget.trim().length > MAX_RECOMMEND_BUDGET_LENGTH) {
    errors.budget = 'recommend.budgetTooLong';
  }
  return errors;
};

// Why no suggestions came back. The AI errors come first: an AI outage is a 503 too.
export const recommendErrorKey = (error: unknown) => {
  const response = (
    error as {response?: {status?: number; data?: {code?: string}}}
  )?.response;
  if (response?.data?.code === 'AI_INVALID_RESPONSE' || response?.status === 502) {
    return 'recommend.invalid';
  }
  return response?.data?.code?.startsWith('AI_')
    ? 'recommend.unavailable'
    : 'recommend.failed';
};

// only a youtube link is opened from a video of a suggestion
export const isYoutubeLink = (link: string) =>
  /^https:\/\/((www|m)\.)?(youtube\.com|youtu\.be)\//i.test(link);

// The new-plan form filled from a suggestion: the province when it is one of the list (the AI may
// write anything), and the place with its description as the note the plan AI uses first.
export const planParams = (item: Recommendation) => {
  const province = [item.place?.location, item.province].find(
    value => value && provices.includes(value),
  );
  const where = item.province ? `${item.name} (${item.province})` : item.name;
  return {
    ...(province && {location: province}),
    fromSuggestion: true,
    note: `${where}: ${item.description}`.slice(0, 1500),
  };
};
