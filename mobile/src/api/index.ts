import {api} from '../lib/apiClient';
import type {StoredSession} from '../store/session';

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
  transportCost?: number;
  foodCost?: number;
  otherCost?: number;
  challenges: Challenge[];
}
export interface TripDetail {
  nameTrip?: string;
  location: string;
  startDate: string;
  endDate: string;
  dataTripDays: TripDay[];
}
export interface RankItem {
  _id?: string;
  fullname?: string;
  image?: string;
  experience: number;
}
export interface VideoItem {
  id: string;
  title: string;
  location: string;
  youtubeLink: string;
  thumbnail: string;
}
export interface HomeContent {
  banners: {id: string; title: string; imageUrl: string}[];
  suggestions: {
    id: string;
    title: string;
    location: string;
    imageUrl: string;
  }[];
}
export interface ChatSummary {
  _id: string;
  title?: string;
  createdAt: string;
  updatedAt?: string;
}
export interface ChatMessageDto {
  role: 'user' | 'model';
  text: string;
  createdAt: string;
}
export interface SendMessageResponse {
  message: string;
  data?: {ChatResponse: string; chatAi?: {_id: string}};
  chatAi?: {_id: string};
}

export const authApi = {
  login: async (data: {username: string; password: string}) =>
    (await api.post<StoredSession>('/auth/login', data)).data,
  register: async (data: {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
  }) => (await api.post('/auth/register', data)).data,
  confirmAccount: async (email: string, code: string) =>
    (await api.post('/auth/confirm-account', {email, code})).data,
  resendCode: async (email: string) =>
    (await api.post('/auth/refresh-verification', {email})).data,
  forgotPassword: async (email: string) =>
    (await api.post('/auth/forgot-password', {email})).data,
  verifyResetCode: async (email: string, code: string) =>
    (await api.post(`/auth/reset-password/${code}`, {email})).data,
  resetPassword: async (
    email: string,
    password: string,
    confirmPassword: string,
  ) =>
    (
      await api.post('/auth/reset-password/', {
        email,
        password,
        confirmPassword,
      })
    ).data,
};

export interface Plan {
  [day: string]: {
    title: string;
    activities?: {
      challenge_summary: string;
      name_location?: string;
      province?: string;
      level_of_difficult?: number;
    }[];
    transportCost?: number;
    foodCost?: number;
    otherCost?: number;
  };
}
export type PlanDay = Plan[string];
export interface GenerateParams {
  location: string;
  quantity: number;
  budget: string;
  budgetTier: 'low' | 'mid' | 'high';
  areaTypes: string[];
  days: number;
  startDate: string;
  endDate: string;
  note?: string;
}

export const tripsApi = {
  generate: async (p: GenerateParams) =>
    (
      await api.post<{data?: Record<string, Plan>}>('/trip-plan/', {
        location: p.location,
        numberOfPeople: p.quantity,
        budget: p.budget,
        interest: p.areaTypes,
        userLocation: null,
        numberOfDay: p.days,
        startDate: p.startDate,
        endDate: p.endDate,
        note: p.note,
      })
    ).data.data ?? null,
  save: async (p: GenerateParams, nameTrip: string, days: PlanDay[]) =>
    (
      await api.post<{tripId: string}>('/trip-plan/save-trip', {
        jsonTrip: days,
        location: p.location,
        startDate: p.startDate,
        endDate: p.endDate,
        nameTrip,
      })
    ).data,
  list: async () =>
    (await api.get<{dataTrip: Trip[]}>('/trip-plan/get-trip')).data.dataTrip ??
    [],
  get: async (id: string) =>
    (await api.get<{tripDatas: TripDetail}>(`/trip-plan/get-trip/${id}`)).data
      .tripDatas,
  remove: async (id: string) => (await api.delete(`/trip-plan/${id}`)).data,
  duplicate: async (id: string) =>
    (
      await api.post<{tripId: string; nameTrip: string}>(
        `/trip-plan/${id}/duplicate`,
      )
    ).data,
  // favorites of the signed-in user (deleted trips are left out by the backend)
  favorites: async () =>
    (await api.get<{dataTrip: Trip[]}>('/trip-plan/favorites')).data.dataTrip,
  addFavorite: async (id: string) =>
    (await api.post(`/trip-plan/${id}/favorite`)).data,
  removeFavorite: async (id: string) =>
    (await api.delete(`/trip-plan/${id}/favorite`)).data,
  // sharing by link (owner only; the link is read only)
  shareStatus: async (id: string) =>
    (await api.get<ShareStatus>(`/trip-plan/${id}/share`)).data,
  enableShare: async (id: string) =>
    (await api.post<ShareStatus>(`/trip-plan/${id}/share`)).data,
  disableShare: async (id: string) =>
    (await api.delete<ShareStatus>(`/trip-plan/${id}/share`)).data,
  // public trips of everyone (cards only), newest first; no sign-in needed
  listPublic: async (page: number) =>
    (await api.get<PublicTripsPage>('/public-trip', {params: {page}})).data,
  // one public trip, read only (404: private, deleted or unknown)
  getPublic: async (id: string) =>
    (await api.get<{tripDatas: PublicTrip}>(`/public-trip/${id}`)).data.tripDatas,
  // keep a private copy of a public trip (signed in)
  copyPublic: async (id: string) =>
    (await api.post<{tripId: string; nameTrip: string}>(`/public-trip/${id}/copy`)).data,
  // who can see the trip (owner only): "public" = anyone, read only; "private" = only the owner
  visibility: async (id: string) =>
    (await api.get<VisibilityStatus>(`/trip-plan/${id}/visibility`)).data,
  setVisibility: async (id: string, visibility: TripVisibility) =>
    (await api.put<VisibilityStatus>(`/trip-plan/${id}/visibility`, {visibility})).data,
  // AI itinerary editing (owner only): propose changes (nothing saved), then apply the accepted proposal
  proposeAiEdit: async (id: string, instruction: string) =>
    (await api.post<{proposal: AiEditProposal}>(`/trip-plan/${id}/ai-edit`, {instruction})).data.proposal,
  // Accept: the server saves the proposal it stored (the client sends only its id)
  applyAiEdit: async (id: string, proposalId: string) =>
    (await api.post(`/trip-plan/${id}/ai-edit/apply`, {proposalId})).data,
  // Reject: the server forgets the proposal
  rejectAiEdit: async (id: string, proposalId: string) =>
    (await api.delete(`/trip-plan/${id}/ai-edit/${proposalId}`)).data,
  // AI regeneration of one day (owner only): propose a replacement (nothing saved), then apply it
  proposeDayRegeneration: async (id: string, dayId: string, instruction?: string) =>
    (await api.post<DayRegeneration>(`/trip-plan/${id}/day-regeneration`, {dayId, ...(instruction ? {instruction} : {})})).data,
  // Accept: the server saves the day it stored (the client sends only the proposal id)
  applyDayRegeneration: async (id: string, proposalId: string) =>
    (await api.post(`/trip-plan/${id}/day-regeneration/apply`, {proposalId})).data,
  // Reject: the server forgets the proposal
  rejectDayRegeneration: async (id: string, proposalId: string) =>
    (await api.delete(`/trip-plan/${id}/day-regeneration/${proposalId}`)).data,
  // AI route optimization of one day (owner only): propose an order (nothing saved), then apply it
  proposeRoute: async (id: string, dayId: string) =>
    (await api.post<RouteProposal>(`/trip-plan/${id}/route-optimization`, {dayId})).data,
  // Accept: the server saves the order it stored (the client sends only the proposal id)
  applyRoute: async (id: string, proposalId: string) =>
    (await api.post(`/trip-plan/${id}/route-optimization/apply`, {proposalId})).data,
  // Reject: the server forgets the proposal
  rejectRoute: async (id: string, proposalId: string) =>
    (await api.delete(`/trip-plan/${id}/route-optimization/${proposalId}`)).data,
  // AI budget estimate (owner only): an estimate, never an expense. null when none was made yet
  budgetEstimate: async (id: string) =>
    (await api.get<{estimate: BudgetEstimate | null}>(`/trip-plan/${id}/budget-estimate`)).data.estimate,
  estimateBudget: async (id: string, body: {travelers: number; spendingLevel: SpendingLevel}) =>
    (await api.post<{estimate: BudgetEstimate}>(`/trip-plan/${id}/budget-estimate`, body)).data.estimate,
  // the user corrects amounts; the server recomputes the total
  updateBudgetEstimate: async (id: string, amounts: {key: BudgetCategoryKey; amount: number}[]) =>
    (await api.put<{estimate: BudgetEstimate}>(`/trip-plan/${id}/budget-estimate`, {categories: amounts})).data.estimate,
  // add one place to a day of the trip (owner only)
  addPlace: async (id: string, body: AddPlaceBody) =>
    (await api.post<AddPlaceResult>(`/trip-plan/${id}/places`, body)).data,
  // personal notes of the trip (owner only; nobody else can read or change them)
  notes: async (id: string) =>
    (await api.get<{notes: TripNote[]}>(`/trip-plan/${id}/notes`)).data.notes,
  addNote: async (id: string, content: string) =>
    (await api.post<{note: TripNote}>(`/trip-plan/${id}/notes`, {content})).data.note,
  updateNote: async (id: string, noteId: string, content: string) =>
    (await api.put<{note: TripNote}>(`/trip-plan/${id}/notes/${noteId}`, {content})).data.note,
  removeNote: async (id: string, noteId: string) =>
    (await api.delete(`/trip-plan/${id}/notes/${noteId}`)).data,
};

export type TripVisibility = 'public' | 'private';

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

export const MAX_PLACES_PER_DAY = 10;
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

export const MAX_RECOMMEND_QUERY_LENGTH = 500;
export const MAX_RECOMMEND_BUDGET_LENGTH = 50;

export interface RecommendParams {
  query: string;
  interests: string[];
  region: string;
  budget: string;
}
// A destination the app itself has data for (home page destination + its videos)
export interface RecommendPlace {
  id: string;
  title: string;
  location: string;
  imageUrl: string;
  videos: {id: string; title: string; youtubeLink: string; thumbnail: string}[];
}
export interface Recommendation {
  name: string;
  province: string;
  description: string;
  reason: string;
  // false: only the AI suggested it (not verified by the app), no place data
  inApp: boolean;
  place?: RecommendPlace;
}
export interface RecommendResult {
  recommendations: Recommendation[];
  // the saved copy in the history; null when the AI found nothing
  historyId: string | null;
  message: string;
}
// "draft": not used yet, "created": a plan was started from it
export type SearchStatus = 'draft' | 'created';
export interface SearchSummary {
  id: string;
  query: string;
  interests: string[];
  region: string;
  budget: string;
  count: number;
  names: string[];
  status: SearchStatus;
  tripId?: string;
  createdAt: string;
}
export interface SearchDetail extends SearchSummary {
  recommendations: Recommendation[];
}

export const destinationsApi = {
  // AI suggestions: the answer is kept in the history, no trip is touched
  recommend: async (params: RecommendParams) =>
    (
      await api.post<RecommendResult>('/destinations/recommend', {
        query: params.query.trim(),
        interests: params.interests,
        region: params.region.trim(),
        budget: params.budget.trim(),
      })
    ).data,
  // the user's earlier suggestions (newest first)
  history: async () =>
    (await api.get<{items: SearchSummary[]}>('/destinations/history')).data
      .items,
  open: async (id: string) =>
    (await api.get<{search: SearchDetail}>(`/destinations/history/${id}`)).data
      .search,
  // "created": the user started a plan from it
  setStatus: async (id: string, status: SearchStatus, tripId?: string) =>
    (
      await api.patch(`/destinations/history/${id}`, {
        status,
        ...(tripId && {tripId}),
      })
    ).data,
  remove: async (id: string) =>
    (await api.delete(`/destinations/history/${id}`)).data,
};

export const MAX_NOTE_LENGTH = 2000;

export const MAX_AI_EDIT_LENGTH = 500;
// A day of an AI proposal for a trip (only a preview until the user accepts it)
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

// What the AI proposed: kept on the server under this id until the user accepts or rejects it
export interface AiEditProposal {
  id: string;
  days: AiEditDay[];
}
// kept: a completed place the AI left out, put back because its photo and points are already earned
export interface AiEditDay {
  title: string;
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

// A private note of the signed-in user on one of their trips
export interface TripNote {
  _id: string;
  tripId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublicTripCard {
  _id: string;
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
// What anyone sees of a public trip: the plan only (no owner, progress or photos)
export interface PublicTrip extends Omit<PublicTripCard, '_id'> {
  dataTripDays: {
    title: string;
    date: string;
    transportCost?: number;
    foodCost?: number;
    otherCost?: number;
    challenges: {_id: string; challengeSummary: string; location?: string; points: number}[];
  }[];
}

export interface VisibilityStatus {
  visibility: TripVisibility;
  // web page of a public trip (null: private, or the backend does not know WEB_URL)
  publicUrl?: string | null;
}

export interface ShareStatus {
  isShared: boolean;
  permission: 'view' | null;
  shareToken: string | null;
  // full link when the backend knows the web address (WEB_URL), else null
  shareUrl: string | null;
  sharedAt: string | null;
}

export const rankingApi = {
  get: async (period: 'weekly' | 'monthly' | 'highest') =>
    (
      await api.get<{dataRanks?: RankItem[]}>(
        period === 'highest'
          ? '/rankings/rankingUserHighest'
          : `/rankings/${period}`,
      )
    ).data.dataRanks ?? [],
};

export const contentApi = {
  home: async () => (await api.get<HomeContent>('/home')).data,
  videos: async () => (await api.get<VideoItem[]>('/videos')).data,
};

export const CHAT_SUCCESS = 'Send message successfully';
export const CHAT_ERROR = 'Đã xảy ra lỗi trong quá trình gửi tin nhắn, thử lại';

export const chatApi = {
  send: async (message: string, idChat: string | null) =>
    (await api.post<SendMessageResponse>('/chat', {message, idChat})).data,
  // the user's conversations, most recent first
  list: async () =>
    (await api.get<{data: ChatSummary[]}>('/chat')).data.data ?? [],
  // messages of one conversation, oldest first
  messages: async (id: string): Promise<ChatMessageDto[]> => {
    const body = (
      await api.get<{
        messages?: ChatMessageDto[];
        questions?: {content: string; createdAt: string}[];
        responses?: {content: string; createdAt: string}[];
      }>(`/chat/${id}`)
    ).data;
    if (body.messages) {return body.messages;}
    return [
      ...(body.questions ?? []).map(q => ({
        role: 'user' as const,
        text: q.content,
        createdAt: q.createdAt,
      })),
      ...(body.responses ?? []).map(r => ({
        role: 'model' as const,
        text: r.content,
        createdAt: r.createdAt,
      })),
    ].sort((x, y) => +new Date(x.createdAt) - +new Date(y.createdAt));
  },
  remove: async (id: string) => (await api.delete(`/chat/${id}`)).data,
};

export interface Announcement {
  id: string;
  title: string;
  message: string;
  publishAt?: string;
}

// Travel preferences the AI personalizes with (same groups and limits as the backend)
export const PREFERENCE_CATEGORIES = ['nature', 'food', 'culture', 'shopping', 'discovery'] as const;
export type PreferenceCategory = (typeof PREFERENCE_CATEGORIES)[number];
export const MAX_PREFERENCE_NOTES = 300;
export interface TravelPreferences {
  categories: PreferenceCategory[];
  notes: string;
  updatedAt: string | null;
}

export const profileApi = {
  update: async (data: {
    fullname: string;
    email?: string;
    phone: string;
    address: string;
    image: string;
  }) => (await api.post('/user/profile', data)).data,
  preferences: async () =>
    (await api.get<{preferences: TravelPreferences}>('/user/preferences')).data.preferences,
  savePreferences: async (data: {categories: PreferenceCategory[]; notes: string}) =>
    (await api.put<{message: string; preferences: TravelPreferences}>('/user/preferences', data)).data,
  deletePreferences: async () =>
    (await api.delete<{message: string; preferences: TravelPreferences}>('/user/preferences')).data,
  notifications: async () =>
    (await api.get<Announcement[]>('/announcements')).data ?? [],
};

// Public profile of another account and the follow state of the signed-in user
export interface CommunityUser {
  id: string;
  fullname: string;
  image?: string;
  experience: number;
  isSelf: boolean;
  following: boolean;
  followersCount: number;
  followingCount: number;
}
export interface FollowState {
  message: string;
  following: boolean;
  followersCount: number;
  followingCount: number;
}

export const communityApi = {
  profile: async (id: string) =>
    (await api.get<{user: CommunityUser}>(`/user/${id}/profile`)).data.user,
  follow: async (id: string) =>
    (await api.post<FollowState>(`/user/${id}/follow`)).data,
  unfollow: async (id: string) =>
    (await api.delete<FollowState>(`/user/${id}/follow`)).data,
};

export const challengeApi = {
  checkProgress: async (chaId: string, lat: number, lng: number) =>
    (
      await api.post<{distance: number; message: string}>(
        '/challenge/checkProgress',
        {chaId, lat, lng},
      )
    ).data,
  complete: async (chaId: string, imageUrl: string) =>
    (await api.post('/challenge/updateProgress', {chaId, imageUrl})).data,
};
