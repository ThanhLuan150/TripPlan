import {act, fireEvent, screen} from '@testing-library/react';
import type {ReactNode} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {tripsApi} from '@/features/trips/api/tripsApi';
import TripMapPage from '@/features/trips/pages/TripMapPage';
import {
  detectBrowser,
  getCurrentPosition,
  getLocationPermission,
  LocationError,
  LocationPermission,
  watchLocationPermission,
} from '@/lib/location';
import {currentPath, pending, renderWithProviders, t} from '../../../utils/render';

// Leaflet needs a real layout: the map is replaced by plain elements and a
// fake map object that records the camera moves.
const map = vi.hoisted(() => ({setView: vi.fn(), fitBounds: vi.fn(), flyTo: vi.fn()}));
vi.mock('react-leaflet', () => ({
  MapContainer: ({children}: {children?: ReactNode}) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  ZoomControl: () => null,
  Marker: ({children, position}: {children?: ReactNode; position: number[]}) => (
    <div data-testid="marker" data-position={position.join(',')}>
      {children}
    </div>
  ),
  CircleMarker: ({children, center}: {children?: ReactNode; center: number[]}) => (
    <div data-testid="me" data-center={center.join(',')}>
      {children}
    </div>
  ),
  Popup: ({children}: {children?: ReactNode}) => <span>{children}</span>,
  useMap: () => map,
}));
vi.mock('@/features/trips/api/tripsApi');
vi.mock('@/lib/location', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/location')>()),
  getCurrentPosition: vi.fn(),
  getLocationPermission: vi.fn(),
  watchLocationPermission: vi.fn(),
  detectBrowser: vi.fn(),
}));

const trip = (challenges: {challengeSummary: string; latitude?: string; longitude?: string}[]) => ({
  location: 'Hà Nội',
  startDate: '2026-03-02',
  endDate: '2026-03-02',
  dataTripDays: [{title: 'Ngày 1', date: '2026-03-02', challenges}],
});
const here = {latitude: 21.03, longitude: 105.85, accuracy: 10};
let permissionChanged: (state: LocationPermission) => void;
const unwatch = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('isSecureContext', true);
  vi.mocked(detectBrowser).mockReturnValue('android');
  vi.mocked(getLocationPermission).mockResolvedValue('granted');
  vi.mocked(getCurrentPosition).mockResolvedValue(here);
  vi.mocked(watchLocationPermission).mockImplementation(cb => {
    permissionChanged = cb;
    return unwatch;
  });
  vi.mocked(tripsApi.get).mockResolvedValue(
    trip([
      {challengeSummary: 'Hồ Gươm', latitude: '21.0288', longitude: '105.8525'},
      {challengeSummary: 'Lăng Bác', latitude: '21.0368', longitude: '105.8342'},
      {challengeSummary: 'Không có toạ độ'},
    ]) as never,
  );
});

const render = () =>
  renderWithProviders(<TripMapPage />, {route: '/assistant/trips/t1/map', path: '/assistant/trips/:idTrip/map'});
const myLocation = () => screen.getByRole('button', {name: t('trips.map.myLocation')});

describe('TripMapPage', () => {
  it('shows the places that have coordinates and frames them', async () => {
    render();

    const markers = await screen.findAllByTestId('marker');
    expect(markers.map(m => m.dataset.position)).toEqual(['21.0288,105.8525', '21.0368,105.8342']);
    expect(screen.getByText('Hồ Gươm')).toBeInTheDocument();
    expect(screen.getByText(t('trips.map.places', {count: 2}))).toBeInTheDocument();
    expect(map.fitBounds).toHaveBeenCalledWith(
      [
        [21.0288, 105.8525],
        [21.0368, 105.8342],
      ],
      {padding: [40, 40]},
    );
    expect(tripsApi.get).toHaveBeenCalledWith('t1');
  });

  it('zooms on a single place', async () => {
    vi.mocked(tripsApi.get).mockResolvedValue(trip([{challengeSummary: 'Hồ Gươm', latitude: '21.0288', longitude: '105.8525'}]) as never);
    render();

    await screen.findByTestId('marker');
    expect(map.setView).toHaveBeenCalledWith([21.0288, 105.8525], 14);
  });

  it('shows the user when location is allowed, without moving the map', async () => {
    render();

    expect((await screen.findByTestId('me')).dataset.center).toBe('21.03,105.85');
    expect(screen.getByText(t('trips.map.you'))).toBeInTheDocument();
    expect(map.flyTo).not.toHaveBeenCalled();
  });

  it('"my location" flies to the user', async () => {
    render();
    await screen.findByTestId('me');

    await act(async () => fireEvent.click(myLocation()));

    expect(map.flyTo).toHaveBeenCalledWith([21.03, 105.85], 15);
  });

  it('disables "my location" while locating', async () => {
    vi.mocked(getCurrentPosition).mockReturnValue(pending());
    render();

    await vi.waitFor(() => expect(myLocation()).toBeDisabled());
    // a second request while busy is ignored
    fireEvent.click(myLocation());
    act(() => permissionChanged('granted'));
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it('blocked location: explains how to re-allow it', async () => {
    vi.mocked(getLocationPermission).mockResolvedValue('denied');
    render();

    expect(await screen.findByRole('alert')).toHaveTextContent(t('location.deniedTitle'));
    expect(screen.getByText(t('location.mapDenied'))).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('the notice can retry or be closed', async () => {
    vi.mocked(getCurrentPosition).mockRejectedValueOnce(new LocationError('timeout'));
    render();
    expect(await screen.findByRole('alert')).toHaveTextContent(t('location.timeoutTitle'));

    await act(async () => fireEvent.click(screen.getByRole('button', {name: t('location.retry')})));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(map.flyTo).toHaveBeenCalled();

    vi.mocked(getCurrentPosition).mockRejectedValueOnce(new LocationError('unavailable'));
    await act(async () => fireEvent.click(myLocation()));
    fireEvent.click(await screen.findByRole('button', {name: t('common.close')}));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('plain http / no geolocation: no retry', async () => {
    vi.stubGlobal('isSecureContext', false);
    const {unmount} = render();
    expect(await screen.findByRole('alert')).toHaveTextContent(t('location.insecureTitle'));
    expect(screen.queryByRole('button', {name: t('location.retry')})).toBeNull();
    unmount();

    vi.stubGlobal('isSecureContext', true);
    vi.mocked(getLocationPermission).mockResolvedValue('unsupported');
    render();
    expect(await screen.findByRole('alert')).toHaveTextContent(t('location.unsupportedTitle'));
  });

  it('a closed browser prompt only shows a hint when the user asked', async () => {
    vi.mocked(getLocationPermission).mockResolvedValue('prompt');
    vi.mocked(getCurrentPosition).mockRejectedValue(new LocationError('denied'));
    render();
    await vi.waitFor(() => expect(getCurrentPosition).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();

    await act(async () => fireEvent.click(myLocation()));

    // a toast (role "alert" too), not the unblock notice
    expect(await screen.findByText(t('location.mapAskText'))).toBeInTheDocument();
    expect(screen.queryByText(t('location.deniedTitle'))).toBeNull();
  });

  it('an unexpected error counts as "unavailable"', async () => {
    vi.mocked(getCurrentPosition).mockRejectedValue(new Error('weird'));
    render();

    expect(await screen.findByRole('alert')).toHaveTextContent(t('location.unavailableTitle'));
  });

  it('follows permission changes made in the browser settings', async () => {
    vi.mocked(getLocationPermission).mockResolvedValue('denied');
    render();
    await screen.findByRole('alert');

    await act(async () => permissionChanged('granted'));
    expect(await screen.findByTestId('me')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();

    act(() => permissionChanged('denied'));
    expect(screen.queryByTestId('me')).toBeNull();
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => permissionChanged('prompt'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('back returns to the trip', async () => {
    render();

    fireEvent.click(screen.getByRole('button', {name: t('trips.map.back')}));

    expect(await currentPath()).toBe('/assistant/trips/t1');
    expect(unwatch).toHaveBeenCalled();
  });

  it('a permission answer after leaving is ignored', async () => {
    let answer: (p: LocationPermission) => void = () => undefined;
    vi.mocked(getLocationPermission).mockReturnValue(new Promise(r => (answer = r)));
    const {unmount} = render();

    unmount();
    await act(async () => answer('granted'));

    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});
