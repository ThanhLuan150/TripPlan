import {api} from '@/lib/apiClient';

// The way by road to a place (backend: GET /geo/route, from OpenStreetMap data).
export interface RouteStep {
  type: string;
  modifier: string;
  name: string;
  // meters
  distance: number;
}

export interface Route {
  // meters / seconds
  distance: number;
  duration: number;
  // [lat, lng] points to draw
  path: [number, number][];
  steps: RouteStep[];
}

export const routeApi = {
  get: async (from: {latitude: number; longitude: number}, to: {latitude: number; longitude: number}) =>
    (
      await api.get<Route>('/geo/route', {
        params: {fromLat: from.latitude, fromLng: from.longitude, toLat: to.latitude, toLng: to.longitude},
      })
    ).data,
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

const MODIFIERS: Record<string, string> = {
  left: 'left',
  right: 'right',
  'slight left': 'slightLeft',
  'slight right': 'slightRight',
  'sharp left': 'sharpLeft',
  'sharp right': 'sharpRight',
  straight: 'straight',
  uturn: 'uturn',
};

// "Rẽ trái vào Nguyễn Huệ", "Đi thẳng trên Lê Lợi", "Đến nơi"...
export const stepText = (step: RouteStep, t: Translate) => {
  if (step.type === 'arrive') {
    return t('route.arrive');
  }
  if (step.type === 'depart') {
    return step.name ? t('route.departOn', {name: step.name}) : t('route.depart');
  }
  if (step.type === 'roundabout' || step.type === 'rotary' || step.type === 'roundabout turn') {
    return step.name ? t('route.roundaboutOnto', {name: step.name}) : t('route.roundabout');
  }
  const action = t(`route.${MODIFIERS[step.modifier] ?? 'continue'}`);
  return step.name ? `${action} ${t(step.modifier === 'straight' || !MODIFIERS[step.modifier] ? 'route.along' : 'route.onto', {name: step.name})}` : action;
};

// "25 phút" / "1 giờ 5 phút"
export const durationText = (seconds: number, t: Translate) => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60 ? t('route.minutes', {count: minutes}) : t('route.hours', {hours: Math.floor(minutes / 60), minutes: minutes % 60});
};
