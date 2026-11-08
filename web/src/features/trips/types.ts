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
  location?: string;
  latitude?: string;
  longitude?: string;
  points: number;
  imageUrl?: string;
  completed?: boolean;
}

export interface TripDay {
  title: string;
  date: string;
  challenges: Challenge[];
  transportCost?: number;
  foodCost?: number;
  otherCost?: number;
}

export interface TripDetail {
  location: string;
  startDate: string;
  endDate: string;
  dataTripDays: TripDay[];
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
