export interface Trip {
  _id: string;
  nameTrip: string;
  location: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface Challenge {
  _id: string;
  challengeSummary: string;
  nameLocation?: string;
  location?: string;
  latitude?: string;
  longitude?: string;
  points: number;
  imageUrl?: string;
  completed?: boolean;
}

export interface TripDay {
  _id?: string;
  title: string;
  date: string;
  challenges: Challenge[];
  transportCost?: number;
  foodCost?: number;
  otherCost?: number;
}

export interface TripDetail {
  nameTrip?: string;
  location: string;
  startDate: string;
  endDate: string;
  dataTripDays: TripDay[];
}

export interface PublicTripCard {
  _id: string;
  // likes of the post and whether the signed-in viewer liked it
  likesCount?: number;
  liked?: boolean;
  nameTrip?: string;
  location: string;
  startDate: string;
  endDate: string;
  transportCostTotal?: number;
  foodCostTotal?: number;
  otherCostTotal?: number;
}

export interface PublicTripsPage {
  page: number;
  limit: number;
  total: number;
  items: PublicTripCard[];
}

export const MAX_NOTE_LENGTH = 2000;

// A private note of the signed-in user on one of their trips
export interface TripNote {
  _id: string;
  tripId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// What like / unlike answers: the real state after the change
export interface LikeState {
  liked: boolean;
  likesCount: number;
}

export type TripVisibility = 'public' | 'private';

export interface ShareStatus {
  isShared: boolean;
  permission: 'view' | null;
  shareToken: string | null;
  sharedAt: string | null;
}

// What a share link shows: the plan only (no progress, photos or owner)
export interface SharedTrip {
  // like state of a public post (not present on a share link)
  likesCount?: number;
  liked?: boolean;
  nameTrip?: string;
  location: string;
  startDate: string;
  endDate: string;
  dataTripDays: {
    title: string;
    date: string;
    transportCost?: number;
    foodCost?: number;
    otherCost?: number;
    challenges: {_id: string; challengeSummary: string; location?: string; points: number}[];
  }[];
}

// Form values passed from "create" to "generate" (router state)
export type BudgetTier = 'low' | 'mid' | 'high';

export interface GenerateTripParams {
  location: string;
  quantity: number;
  // Vietnamese text sent to the AI prompt, e.g. "Dưới 1.000.000 VND"
  budget: string;
  budgetTier: BudgetTier;
  areaTypes: string[];
  userLocation: string | null;
  days: number;
  startDate: string;
  endDate: string;
  // free text for the AI, e.g. places suggested in the chat
  note?: string;
}

// Router state that pre-fills the "create plan" form (home search, chat)
export interface TripFormPrefill {
  location?: string;
  days?: number;
  people?: number;
  note?: string;
  fromChat?: boolean;
  // filled from an AI destination suggestion
  fromSuggestion?: boolean;
}

// AI suggestion: plans -> days -> activities
export interface PlanActivity {
  challenge_summary: string;
  name_location?: string;
  province?: string;
  level_of_difficult?: number;
}
export interface PlanDay {
  title: string;
  activities?: PlanActivity[];
  transportCost?: number;
  foodCost?: number;
  otherCost?: number;
}
export type Plan = Record<string, PlanDay>;

// AI itinerary editing: the proposal is only a preview until the user accepts it
export const MAX_AI_EDIT_LENGTH = 500;
// What the AI proposed: kept on the server under this id until the user accepts or rejects it
export interface AiEditProposal {
  id: string;
  days: AiEditDay[];
}
export interface AiEditDay {
  title: string;
  // kept: a completed place the AI left out, put back because its photo and points are already earned
  activities: {name_location: string; challenge_summary: string; level_of_difficult: number; province?: string; kept?: boolean}[];
  transportCost: number;
  foodCost: number;
  otherCost: number;
}

// AI regeneration of ONE day: the replacement proposed for the day and the day as it is now. Kept on the
// server under proposal.id until the user accepts or rejects it; the other days are never part of it.
export interface DayRegeneration {
  proposal: {id: string; dayId: string; day: AiEditDay};
  current: AiEditDay & {id: string; day?: number};
}

// One place added to a day of an existing trip (e.g. a destination the AI recommended)
export interface AddPlaceBody {
  name: string;
  dayId: string;
  province?: string;
  summary?: string;
}

export interface AddPlaceResult {
  challengeId: string;
  day: {id: string; title: string};
  // false: the place has no position on the map yet
  located: boolean;
}

export const MAX_PLACES_PER_DAY = 10;

// AI budget estimation: an ESTIMATE of the cost of the trip, never an expense or money actually spent
export const BUDGET_CATEGORIES = ['accommodation', 'food', 'transport', 'activities', 'other'] as const;
export type BudgetCategoryKey = (typeof BUDGET_CATEGORIES)[number];
export const SPENDING_LEVELS = ['budget', 'moderate', 'premium'] as const;
export type SpendingLevel = (typeof SPENDING_LEVELS)[number];
export const MAX_TRAVELERS = 1000;

export interface BudgetEstimate {
  id: string;
  // always true: lets the UI tell an estimate from a real expense
  isEstimate: true;
  currency: string;
  travelers: number;
  spendingLevel: SpendingLevel;
  categories: {key: BudgetCategoryKey; amount: number; note: string}[];
  // the sum of the categories, computed by the server
  total: number;
  assumptions: string[];
  // "manual": the user adjusted the amounts after the AI answered
  source: 'ai' | 'manual';
  updatedAt: string;
}

// AI route optimization of one day: the current visiting order and the proposed one, with the distances
// and times given by the routing service ("road") or measured on the map ("straight-line": no time)
export interface RoutePlace {
  id: string;
  name: string;
  location: string | null;
}
export interface RouteTotals {
  distance: number;
  // seconds; null when only straight-line distances are known
  duration: number | null;
}
export interface RouteProposal {
  dayId: string;
  source: 'road' | 'straight-line';
  // places of the day without a position: they are not moved and have no distance
  missingCoordinates: RoutePlace[];
  current: RouteTotals;
  proposed: RouteTotals;
  currentOrder: RoutePlace[];
  proposedOrder: RoutePlace[];
  // false: the current order is already the shortest, there is nothing to accept
  improved: boolean;
  proposalId: string | null;
}
