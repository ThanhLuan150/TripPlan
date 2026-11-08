import {api} from '@/lib/apiClient';
import type {GenerateTripParams, Plan, PlanDay, Trip, TripDetail} from '../types';

export const tripsApi = {
  list: async () =>
    (await api.get<{dataTrip: Trip[]}>('/trip-plan/get-trip')).data.dataTrip,

  get: async (id: string) =>
    (await api.get<{tripDatas: TripDetail}>(`/trip-plan/get-trip/${id}`)).data.tripDatas,

  remove: async (id: string) => (await api.delete(`/trip-plan/${id}`)).data,

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
