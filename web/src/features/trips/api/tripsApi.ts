import {api} from '@/lib/apiClient';
import type {AiEditProposal, GenerateTripParams, Plan, PlanDay, PublicTripsPage, ShareStatus, SharedTrip, Trip, TripDetail, TripNote, TripVisibility} from '../types';

export const tripsApi = {
  list: async () =>
    (await api.get<{dataTrip: Trip[]}>('/trip-plan/get-trip')).data.dataTrip,

  get: async (id: string) =>
    (await api.get<{tripDatas: TripDetail}>(`/trip-plan/get-trip/${id}`)).data.tripDatas,

  remove: async (id: string) => (await api.delete(`/trip-plan/${id}`)).data,

  duplicate: async (id: string) =>
    (await api.post<{tripId: string; nameTrip: string}>(`/trip-plan/${id}/duplicate`)).data,

  // PDF of the trip (read only on the backend; only the owner can get it)
  exportPdf: async (id: string, lang: string) =>
    (
      await api.get<Blob>(`/trip-plan/${id}/export-pdf`, {
        params: {lang},
        responseType: 'blob',
      })
    ).data,

  // sharing by link (owner only; the link itself is read only)
  shareStatus: async (id: string) => (await api.get<ShareStatus>(`/trip-plan/${id}/share`)).data,

  enableShare: async (id: string) => (await api.post<ShareStatus>(`/trip-plan/${id}/share`)).data,

  disableShare: async (id: string) => (await api.delete<ShareStatus>(`/trip-plan/${id}/share`)).data,

  // visibility (owner only): "public" = anyone can read it, "private" = only the owner
  visibility: async (id: string) =>
    (await api.get<{visibility: TripVisibility}>(`/trip-plan/${id}/visibility`)).data,

  setVisibility: async (id: string, visibility: TripVisibility) =>
    (await api.put<{visibility: TripVisibility}>(`/trip-plan/${id}/visibility`, {visibility})).data,

  // AI itinerary editing (owner only): propose changes (nothing saved), then apply the accepted proposal
  proposeAiEdit: async (id: string, instruction: string) =>
    (await api.post<{proposal: AiEditProposal}>(`/trip-plan/${id}/ai-edit`, {instruction})).data.proposal,

  // Accept: the server saves the proposal it stored (the client sends only its id)
  applyAiEdit: async (id: string, proposalId: string) =>
    (await api.post(`/trip-plan/${id}/ai-edit/apply`, {proposalId})).data,

  // Reject: the server forgets the proposal
  rejectAiEdit: async (id: string, proposalId: string) =>
    (await api.delete(`/trip-plan/${id}/ai-edit/${proposalId}`)).data,

  // personal notes (owner only; nobody else can read or change them)
  notes: async (id: string) =>
    (await api.get<{notes: TripNote[]}>(`/trip-plan/${id}/notes`)).data.notes,

  addNote: async (id: string, content: string) =>
    (await api.post<{note: TripNote}>(`/trip-plan/${id}/notes`, {content})).data.note,

  updateNote: async (id: string, noteId: string, content: string) =>
    (await api.put<{note: TripNote}>(`/trip-plan/${id}/notes/${noteId}`, {content})).data.note,

  removeNote: async (id: string, noteId: string) =>
    (await api.delete(`/trip-plan/${id}/notes/${noteId}`)).data,

  // public: the trip behind a share link (404 when invalid or turned off)
  getShared: async (token: string) =>
    (await api.get<{tripDatas: SharedTrip}>(`/shared/${encodeURIComponent(token)}`)).data.tripDatas,

  // public: a trip its owner made public (404 when private, deleted or unknown)
  getPublic: async (id: string) =>
    (await api.get<{tripDatas: SharedTrip}>(`/public-trip/${encodeURIComponent(id)}`)).data.tripDatas,

  // public trips of everyone (cards only), newest first
  listPublic: async (page: number) =>
    (await api.get<PublicTripsPage>('/public-trip', {params: {page}})).data,

  // keep a private copy of a public trip (signed in)
  copyPublic: async (id: string) =>
    (await api.post<{tripId: string; nameTrip: string}>(`/public-trip/${encodeURIComponent(id)}/copy`)).data,

  // favorites of the signed-in user (deleted trips are left out by the backend)
  favorites: async () =>
    (await api.get<{dataTrip: Trip[]}>('/trip-plan/favorites')).data.dataTrip,

  addFavorite: async (id: string) => (await api.post(`/trip-plan/${id}/favorite`)).data,

  removeFavorite: async (id: string) => (await api.delete(`/trip-plan/${id}/favorite`)).data,

  // AI suggestions (nothing is saved yet)
  generate: async (params: GenerateTripParams) =>
    (
      await api.post<{data?: Record<string, Plan>}>('/trip-plan/', {
        location: params.location,
        numberOfPeople: params.quantity,
        budget: params.budget,
        interest: params.areaTypes,
        userLocation: params.userLocation,
        numberOfDay: params.days,
        startDate: params.startDate,
        endDate: params.endDate,
        note: params.note,
      })
    ).data.data ?? null,

  save: async (params: GenerateTripParams, nameTrip: string, days: PlanDay[]) =>
    (
      await api.post<{tripId: string}>('/trip-plan/save-trip', {
        jsonTrip: days,
        location: params.location,
        startDate: params.startDate,
        endDate: params.endDate,
        nameTrip,
      })
    ).data,
};

export const challengeApi = {
  checkProgress: async (chaId: string, lat: number, lng: number) =>
    (await api.post<{distance: number; message: string}>('/challenge/checkProgress', {chaId, lat, lng}))
      .data,

  complete: async (chaId: string, imageUrl: string) =>
    (await api.post('/challenge/updateProgress', {chaId, imageUrl})).data,
};
