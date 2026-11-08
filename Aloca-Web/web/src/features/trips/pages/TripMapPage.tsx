import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, ZoomControl} from 'react-leaflet';
import L, {LatLngExpression} from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {IoArrowBack, IoClose, IoLocate, IoRefresh, IoWarning} from 'react-icons/io5';
import {routes} from '@/app/routes';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import {
  Coords,
  getCurrentPosition,
  getLocationPermission,
  isLocationError,
  LocationErrorReason,
  watchLocationPermission,
} from '@/lib/location';
import LocationSteps from '../components/LocationSteps';
import {useTripDetail} from '../hooks/useTrips';

// Leaflet's default icon guesses its image path from CSS, which breaks under
// Vite, so markers use an explicit icon built from the bundled images.
const markerIconDefault = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Center of Vietnam, same default as the mobile MapView
const DEFAULT_CENTER: LatLngExpression = [16.0583, 105.7772];

function FitBounds({points}: {points: [number, number][]}) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else if (points.length > 1) {
      map.fitBounds(points, {padding: [40, 40]});
    }
  }, [map, points]);
  return null;
}

function FlyTo({target}: {target: Coords | null}) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.latitude, target.longitude], 15);
    }
  }, [map, target]);
  return null;
}

// Shown only when the browser cannot show its own location prompt: location
// is blocked for the site (the browser will not ask again), the page is not on
// HTTPS, or the device could not find the position.
function LocationNotice({
  problem,
  onRetry,
  onClose,
}: {
  problem: LocationErrorReason;
  onRetry: () => void;
  onClose: () => void;
}) {
  const {t} = useTranslation();
  const title = t(`location.${problem}Title`);
  const text = problem === 'denied' ? t('location.mapDenied') : t(`location.${problem}Text`);
  const canRetry = problem !== 'insecure' && problem !== 'unsupported';

  return (
    <div
      role="alert"
      className="absolute inset-x-4 top-16 z-[600] mx-auto max-w-sm animate-pop-in rounded-2xl bg-white p-4 shadow-xl">
      <button
        type="button"
        aria-label={t('common.close')}
        onClick={onClose}
        className="absolute top-2 right-2 grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
        <IoClose size={18} />
      </button>
      <div className="flex gap-3 pr-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
          <IoWarning size={22} />
        </span>
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 leading-relaxed text-slate-600">{text}</p>
        </div>
      </div>
      {problem === 'denied' && <LocationSteps className="mt-3 text-sm" />}
      {canRetry && (
        <button type="button" className="btn btn-primary mt-3 h-10 w-full" onClick={onRetry}>
          <IoRefresh size={17} />
          {t('location.retry')}
        </button>
      )}
    </div>
  );
}

// react-native-maps MapView -> Leaflet + OpenStreetMap (no API key needed)
export default function TripMapPage() {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const {idTrip} = useParams();
  const {data: trip} = useTripDetail(idTrip);
  const [userPos, setUserPos] = useState<Coords | null>(null);
  const [flyTarget, setFlyTarget] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState<LocationErrorReason | null>(null);
  const busy = useRef(false);

  // Asks the browser for the position; the first time, the browser shows its
  // own "Allow / Block" prompt. fly: the user pressed "My location", so move
  // the map to them instead of keeping the trip's places in view.
  const locate = useCallback(
    async (fly: boolean) => {
      if (busy.current) {
        return;
      }
      busy.current = true;
      setLocating(true);
      try {
        const pos = await getCurrentPosition({maximumAge: 10000});
        setUserPos(pos);
        setProblem(null);
        if (fly) {
          setFlyTarget({...pos});
        }
      } catch (error) {
        const reason = isLocationError(error) ? error.reason : 'unavailable';
        // Closing the browser prompt without choosing also reports "denied",
        // but the browser can still ask next time, so no unblock steps then.
        const dismissed = reason === 'denied' && (await getLocationPermission()) === 'prompt';
        if (!dismissed) {
          setProblem(reason);
        } else if (fly) {
          Toast.show({type: 'error', text1: t('location.mapAskTitle'), text2: t('location.mapAskText')});
        }
      } finally {
        busy.current = false;
        setLocating(false);
      }
    },
    [t],
  );

  // Opening the map asks for the location right away: the browser shows its
  // own prompt, or shows the user directly if already allowed.
  useEffect(() => {
    let cancelled = false;
    if (!window.isSecureContext) {
      setProblem('insecure');
      return;
    }
    getLocationPermission().then(permission => {
      if (cancelled) {
        return;
      }
      if (permission === 'denied' || permission === 'unsupported') {
        // the browser will not show its prompt: explain how to re-allow
        setProblem(permission);
      } else {
        locate(false);
      }
    });
    // the user changed the permission in the browser settings
    const unwatch = watchLocationPermission(permission => {
      if (permission === 'granted') {
        locate(false);
      } else if (permission === 'denied' && !busy.current) {
        setUserPos(null);
        setProblem('denied');
      }
    });
    return () => {
      cancelled = true;
      unwatch();
    };
  }, [locate]);

  const markers = useMemo(
    () =>
      (trip?.dataTripDays ?? [])
        .flatMap(day => day.challenges)
        .map(c => ({
          latitude: parseFloat(c.latitude ?? ''),
          longitude: parseFloat(c.longitude ?? ''),
          challengeSummary: c.challengeSummary,
        }))
        .filter(m => !isNaN(m.latitude) && !isNaN(m.longitude)),
    [trip],
  );

  const points = useMemo(
    () => markers.map(m => [m.latitude, m.longitude] as [number, number]),
    [markers],
  );

  return (
    <div className="md:px-6 md:pb-6">
      <div className="relative isolate h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] overflow-hidden bg-slate-200 md:h-[calc(100dvh-9rem)] md:rounded-3xl md:shadow-soft">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={6}
          scrollWheelZoom
          zoomControl={false}
          className="absolute inset-0 z-0">
          {/* top-left is taken by the back button and the location card */}
          <ZoomControl position="bottomleft" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map((marker, index) => (
            <Marker key={index} icon={markerIconDefault} position={[marker.latitude, marker.longitude]}>
              <Popup>{marker.challengeSummary}</Popup>
            </Marker>
          ))}
          {userPos && (
            <CircleMarker
              center={[userPos.latitude, userPos.longitude]}
              radius={8}
              pathOptions={{color: '#fff', weight: 3, fillColor: '#1a73e8', fillOpacity: 1}}>
              <Popup>{t('trips.map.you')}</Popup>
            </CircleMarker>
          )}
          <FitBounds points={points} />
          <FlyTo target={flyTarget} />
        </MapContainer>

        <button
          type="button"
          onClick={() => navigate(routes.DetailTripScreen(idTrip!))}
          className="absolute top-4 left-4 z-[500] flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-slate-800 shadow-lg transition hover:bg-slate-50">
          <IoArrowBack size={18} />
          {t('trips.map.back')}
        </button>
        {markers.length > 0 && (
          <span className="absolute top-4 right-4 z-[500] rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg">
            {t('trips.map.places', {count: markers.length})}
          </span>
        )}
        {problem && (
          <LocationNotice problem={problem} onRetry={() => locate(true)} onClose={() => setProblem(null)} />
        )}
        <button
          type="button"
          aria-label={t('trips.map.myLocation')}
          title={t('trips.map.myLocation')}
          onClick={() => locate(true)}
          disabled={locating}
          className="absolute right-4 bottom-6 z-[500] grid size-11 place-items-center rounded-full bg-white text-brand-600 shadow-lg transition hover:bg-slate-50">
          {locating ? <Spinner size={20} /> : <IoLocate size={22} />}
        </button>
      </div>
    </div>
  );
}
