import {useEffect, useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L, {LatLngExpression} from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {IoArrowBack, IoLocate} from 'react-icons/io5';
import {Coords, getCurrentPosition} from '../Helper/location';
import Toast from '../components/Toast';
import {routes} from '../navigation/routes';
import {useTripDetail} from './TripPlannersStack/DetailTripScreen';

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

// react-native-maps MapView -> Leaflet + OpenStreetMap (no API key needed)
export const MapScreen = () => {
  const navigate = useNavigate();
  const {idTrip} = useParams();
  const {data: trip} = useTripDetail(idTrip);
  const [userPos, setUserPos] = useState<Coords | null>(null);
  const [flyTarget, setFlyTarget] = useState<Coords | null>(null);

  useEffect(() => {
    getCurrentPosition()
      .then(setUserPos)
      .catch(() =>
        Toast.show({
          type: 'error',
          text1: 'Thông báo',
          text2: 'Vui lòng bật định vị để sử dụng ứng dụng.',
        }),
      );
  }, []);

  const markers = useMemo(
    () =>
      (trip?.dataTripDays ?? [])
        .flatMap(day => day.challenges)
        .map(challenge => ({
          latitude: parseFloat(challenge.latitude),
          longitude: parseFloat(challenge.longitude),
          challengeSummary: challenge.challengeSummary,
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
          className="absolute inset-0 z-0">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map((marker, index) => (
            <Marker
              key={index}
              icon={markerIconDefault}
              position={[marker.latitude, marker.longitude]}>
              <Popup>{marker.challengeSummary}</Popup>
            </Marker>
          ))}
          {userPos && (
            <CircleMarker
              center={[userPos.latitude, userPos.longitude]}
              radius={8}
              pathOptions={{
                color: '#fff',
                weight: 3,
                fillColor: '#1a73e8',
                fillOpacity: 1,
              }}>
              <Popup>Vị trí của bạn</Popup>
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
          Quay lại kế hoạch
        </button>
        {markers.length > 0 && (
          <span className="absolute top-4 right-4 z-[500] rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg">
            {markers.length} địa điểm
          </span>
        )}
        {userPos && (
          <button
            type="button"
            aria-label="Vị trí của tôi"
            title="Vị trí của tôi"
            onClick={() => setFlyTarget({...userPos})}
            className="absolute right-4 bottom-6 z-[500] grid size-11 place-items-center rounded-full bg-white text-brand-600 shadow-lg transition hover:bg-slate-50">
            <IoLocate size={22} />
          </button>
        )}
      </div>
    </div>
  );
};
