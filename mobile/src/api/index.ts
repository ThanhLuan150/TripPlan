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
  transportCost?: number;
  foodCost?: number;
  otherCost?: number;
  challenges: Challenge[];
}
export interface TripDetail {
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
};

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

export const profileApi = {
  update: async (data: {
    fullname: string;
    email?: string;
    phone: string;
    address: string;
    image: string;
  }) => (await api.post('/user/profile', data)).data,
  notifications: async () =>
    (await api.get<Announcement[]>('/announcements')).data ?? [],
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
