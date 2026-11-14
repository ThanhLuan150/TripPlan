import {useEffect} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {Circle, CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer, useMap} from 'react-leaflet';
import {formatDistance, type Coords} from '@/lib/location';
import {markerIconDefault} from '../mapIcon';
import {durationText, routeApi, stepText} from '../route';

// Keeps the place, the user and the route in view. The dialog is still
// animating when the map mounts, so the size is read again before fitting.
function Fit({points}: {points: [number, number][]}) {
  const map = useMap();
  const key = points.map(p => p.join(',')).join(';');
  useEffect(() => {
    const id = window.setTimeout(() => {
      map.invalidateSize();
      if (points.length > 1) {
        map.fitBounds(points, {padding: [30, 30], maxZoom: 17});
      } else {
        map.setView(points[0], 16);
      }
    }, 120);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

// The challenge's place on an OpenStreetMap map inside the app: its marker, the
// circle where a check-in counts and, when known, where the user is, with the
// way there (drawn on the map, and written step by step below it).
export default function ChallengeMap({
  name,
  latitude,
  longitude,
  radius,
  user,
  withRoute = false,
}: {
  name: string;
  latitude: number;
  longitude: number;
  // meters around the place
  radius: number;
  user?: Coords;
  // draw the way from the user to the place
  withRoute?: boolean;
}) {
  const {t, i18n} = useTranslation();
  const target: [number, number] = [latitude, longitude];
  const {data: route, isLoading, isError} = useQuery({
    queryKey: ['route', user?.latitude, user?.longitude, latitude, longitude],
    queryFn: () => routeApi.get(user!, {latitude, longitude}),
    enabled: withRoute && !!user,
    staleTime: 60_000,
    retry: false,
  });
  const points: [number, number][] = route?.path.length
    ? route.path
    : user
      ? [target, [user.latitude, user.longitude]]
      : [target];
  const meters = (m: number) => formatDistance(m, i18n.resolvedLanguage);

  return (
    <div>
      <div role="region" aria-label={t('location.mapLabel')} className="h-56 overflow-hidden rounded-2xl ring-1 ring-slate-200">
        <MapContainer center={target} zoom={16} scrollWheelZoom={false} className="size-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {route && <Polyline positions={route.path} pathOptions={{color: '#2563eb', weight: 5, opacity: 0.85}} />}
          <Circle center={target} radius={radius} pathOptions={{color: '#0f766e', weight: 1, fillOpacity: 0.12}} />
          <Marker position={target} icon={markerIconDefault}>
            <Popup>{name}</Popup>
          </Marker>
          {user && (
            <CircleMarker
              center={[user.latitude, user.longitude]}
              radius={8}
              pathOptions={{color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1}}>
              <Popup>{t('trips.map.you')}</Popup>
            </CircleMarker>
          )}
          <Fit points={points} />
        </MapContainer>
      </div>

      {withRoute && user && (
        <div className="mt-3 text-left text-sm">
          {isLoading && <p className="text-center text-slate-500">{t('route.loading')}</p>}
          {isError && <p className="text-center text-slate-500">{t('route.failed')}</p>}
          {route && (
            <>
              <p className="text-center font-medium text-slate-800">
                {t('route.summary', {distance: meters(route.distance), time: durationText(route.duration, t)})}
              </p>
              <details className="mt-2 rounded-xl bg-slate-50 px-3 py-2">
                <summary className="cursor-pointer font-medium text-brand-700">{t('route.steps', {count: route.steps.length})}</summary>
                <ol className="mt-2 max-h-40 space-y-1.5 overflow-y-auto pr-1">
                  {route.steps.map((step, index) => (
                    <li key={index} className="flex justify-between gap-3 text-slate-700">
                      <span>{stepText(step, t)}</span>
                      {step.distance > 0 && <span className="shrink-0 text-slate-500 tabular-nums">{meters(step.distance)}</span>}
                    </li>
                  ))}
                </ol>
              </details>
            </>
          )}
        </div>
      )}
    </div>
  );
}
