import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import * as api from '../api';
import type {AdminAnnouncementInput, AdminSettings, AdminShowcaseInput, AdminVideoInput, ReportPeriod} from '../types';

// Data of the admin pages, from the admin API (api.ts). Every query lives
// under ['admin', ...] so a change refetches what it affects.

export {useAdminUsers} from '../users/hooks';

export const useAdminDashboard = () => useQuery({queryKey: ['admin', 'dashboard'], queryFn: api.fetchDashboard});
export const useAdminAlerts = () =>
  useQuery({queryKey: ['admin', 'alerts'], queryFn: api.fetchAlerts, refetchInterval: 60_000});
export const useAdminTrips = () => useQuery({queryKey: ['admin', 'trips'], queryFn: api.fetchTrips});
export const useAdminChallenges = () => useQuery({queryKey: ['admin', 'challenges'], queryFn: api.fetchChallenges});
export const useAdminAi = () => useQuery({queryKey: ['admin', 'ai'], queryFn: api.fetchAi});
export const useAdminReports = (period: ReportPeriod) =>
  useQuery({queryKey: ['admin', 'reports', period], queryFn: () => api.fetchReport(period)});
export const useAdminActivityLogs = () => useQuery({queryKey: ['admin', 'logs'], queryFn: api.fetchLogs});
export const useAdminModeration = () => useQuery({queryKey: ['admin', 'moderation'], queryFn: api.fetchModeration});
export const useAdminVideos = () => useQuery({queryKey: ['admin', 'videos'], queryFn: api.fetchVideos});
export const useAdminAnnouncements = () =>
  useQuery({queryKey: ['admin', 'announcements'], queryFn: api.fetchAnnouncements});
export const useAdminShowcase = () => useQuery({queryKey: ['admin', 'showcase'], queryFn: api.fetchShowcase});
export const useAdminSettings = () => useQuery({queryKey: ['admin', 'settings'], queryFn: api.fetchSettings});
export const useAdminRoles = () => useQuery({queryKey: ['admin', 'roles'], queryFn: api.fetchRoles});

// A change: refetch the lists it touches and the dashboard / alerts / log it feeds.
const useChange = <V, R>(fn: (variables: V) => Promise<R>, keys: string[]) => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () =>
      Promise.all([...keys, 'dashboard', 'alerts', 'logs'].map(key => client.invalidateQueries({queryKey: ['admin', key]}))),
  });
};

export const useDeleteTrip = () => useChange((id: string) => api.deleteTrip(id), ['trips', 'users']);

export const useUpdateChallenge = () =>
  useChange(({id, update}: {id: string; update: api.ChallengeUpdate}) => api.patchChallenge(id, update), ['challenges']);
export const useDeleteChallenge = () => useChange((id: string) => api.deleteChallenge(id), ['challenges']);

export const useDecideModeration = () =>
  useChange(({id, status}: {id: string; status: 'approved' | 'rejected'}) => api.decideModeration(id, status), ['moderation']);

export const useSaveVideo = () =>
  useChange(
    ({id, video}: {id?: string; video: AdminVideoInput}) => (id ? api.patchVideo(id, video) : api.postVideo(video)),
    ['videos'],
  );
export const useDeleteVideo = () => useChange((id: string) => api.deleteVideo(id), ['videos']);

export const useSaveShowcase = () =>
  useChange(
    ({id, item}: {id?: string; item: AdminShowcaseInput}) => (id ? api.patchShowcase(id, item) : api.postShowcase(item)),
    ['showcase'],
  );
export const useDeleteShowcase = () => useChange((id: string) => api.deleteShowcase(id), ['showcase']);

export const useSaveAnnouncement = () =>
  useChange(
    ({id, item}: {id?: string; item: AdminAnnouncementInput}) =>
      id ? api.patchAnnouncement(id, item) : api.postAnnouncement(item),
    ['announcements'],
  );
export const useDeleteAnnouncement = () => useChange((id: string) => api.deleteAnnouncement(id), ['announcements']);

export const useSaveSettings = () => useChange((settings: Partial<AdminSettings>) => api.putSettings(settings), ['settings']);
