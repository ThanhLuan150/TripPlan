import {api} from '@/lib/apiClient';
import type {
  AdminActivityLog,
  AdminAiOverview,
  AdminAlert,
  AdminAnnouncement,
  AdminAnnouncementInput,
  AdminChallenge,
  AdminDashboard,
  AdminModerationItem,
  AdminReport,
  AdminRoles,
  AdminSettings,
  AdminShowcase,
  AdminShowcaseInput,
  AdminTrip,
  AdminVideo,
  AdminVideoInput,
  ReportPeriod,
} from './types';

// Admin API of the backend (routes/adminRoutes.js, role "admin"). The users
// have their own module: users/api.ts.

const get = async <T>(url: string, params?: Record<string, string>) => (await api.get<T>(url, {params})).data;

export const fetchDashboard = () => get<AdminDashboard>('/admin/dashboard');
export const fetchAlerts = () => get<AdminAlert[]>('/admin/alerts');
export const fetchTrips = () => get<AdminTrip[]>('/admin/trips');
export const fetchChallenges = () => get<AdminChallenge[]>('/admin/challenges');
export const fetchAi = () => get<AdminAiOverview>('/admin/ai');
export const fetchReport = (period: ReportPeriod) => get<AdminReport>('/admin/reports', {period});
export const fetchLogs = () => get<AdminActivityLog[]>('/admin/logs');
export const fetchModeration = () => get<AdminModerationItem[]>('/admin/moderation');
export const fetchVideos = () => get<AdminVideo[]>('/admin/videos');
export const fetchAnnouncements = () => get<AdminAnnouncement[]>('/admin/announcements');
export const fetchShowcase = () => get<AdminShowcase[]>('/admin/showcase');
export const fetchSettings = () => get<AdminSettings>('/admin/settings');
export const fetchRoles = () => get<AdminRoles>('/admin/roles');

export const deleteTrip = async (id: string) => (await api.delete(`/admin/trips/${id}`)).data;

export type ChallengeUpdate = Partial<Pick<AdminChallenge, 'nameLocation' | 'challengeSummary' | 'points'>>;

export const patchChallenge = async (id: string, update: ChallengeUpdate) =>
  (await api.patch<AdminChallenge>(`/admin/challenges/${id}`, update)).data;
export const deleteChallenge = async (id: string) => (await api.delete(`/admin/challenges/${id}`)).data;

export const decideModeration = async (id: string, status: 'approved' | 'rejected') =>
  (await api.patch<AdminModerationItem>(`/admin/moderation/${id}`, {status})).data;

export const postVideo = async (video: AdminVideoInput) => (await api.post<AdminVideo>('/admin/videos', video)).data;
export const patchVideo = async (id: string, video: AdminVideoInput) =>
  (await api.patch<AdminVideo>(`/admin/videos/${id}`, video)).data;
export const deleteVideo = async (id: string) => (await api.delete(`/admin/videos/${id}`)).data;

export const postShowcase = async (item: AdminShowcaseInput) => (await api.post<AdminShowcase>('/admin/showcase', item)).data;
export const patchShowcase = async (id: string, item: AdminShowcaseInput) =>
  (await api.patch<AdminShowcase>(`/admin/showcase/${id}`, item)).data;
export const deleteShowcase = async (id: string) => (await api.delete(`/admin/showcase/${id}`)).data;

export const postAnnouncement = async (item: AdminAnnouncementInput) =>
  (await api.post<AdminAnnouncement>('/admin/announcements', item)).data;
export const patchAnnouncement = async (id: string, item: AdminAnnouncementInput) =>
  (await api.patch<AdminAnnouncement>(`/admin/announcements/${id}`, item)).data;
export const deleteAnnouncement = async (id: string) => (await api.delete(`/admin/announcements/${id}`)).data;

export const putSettings = async (settings: Partial<AdminSettings>) =>
  (await api.put<AdminSettings>('/admin/settings', settings)).data;
