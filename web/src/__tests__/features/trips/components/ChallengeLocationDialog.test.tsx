import {act, fireEvent, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {challengeApi} from '@/features/trips/api/tripsApi';
import ChallengeLocationDialog from '@/features/trips/components/ChallengeLocationDialog';
import LocationSteps from '@/features/trips/components/LocationSteps';
import type {Challenge} from '@/features/trips/types';
import {
  detectBrowser,
  getCurrentPosition,
  getLocationPermission,
  LocationError,
  LocationPermission,
  saveUserLocation,
  watchLocationPermission,
} from '@/lib/location';
import {httpError, networkError, pending, renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');
vi.mock('@/lib/location', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/location')>()),
  getCurrentPosition: vi.fn(),
  getLocationPermission: vi.fn(),
  watchLocationPermission: vi.fn(),
  saveUserLocation: vi.fn(),
  detectBrowser: vi.fn(),
}));

const challenge: Challenge = {
  _id: 'c2',
  challengeSummary: 'Check-in Hồ Gươm',
  latitude: '21.0288',
  longitude: '105.8525',
  points: 30,
};
const here = {latitude: 21.029, longitude: 105.8526, accuracy: 20};

// the callback the dialog registered with watchLocationPermission
let permissionChanged: (state: LocationPermission) => void;
const unwatch = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('isSecureContext', true);
  vi.mocked(getLocationPermission).mockResolvedValue('prompt');
  vi.mocked(getCurrentPosition).mockResolvedValue(here);
  vi.mocked(saveUserLocation).mockResolvedValue(undefined);
  vi.mocked(detectBrowser).mockReturnValue('desktop');
  vi.mocked(watchLocationPermission).mockImplementation(cb => {
    permissionChanged = cb;
    return unwatch;
  });
  vi.mocked(challengeApi.checkProgress).mockResolvedValue({distance: 42, message: 'Complete the challenge'});
});

const render = (props: Partial<Parameters<typeof ChallengeLocationDialog>[0]> = {}) => {
  const onClose = vi.fn();
  const onPhoto = vi.fn();
  const utils = renderWithProviders(
    <ChallengeLocationDialog challenge={challenge} onClose={onClose} onPhoto={onPhoto} {...props} />,
  );
  return {...utils, onClose, onPhoto};
};

const title = () => screen.getByRole('heading', {level: 2});

describe('ChallengeLocationDialog', () => {
  it('checks the position right away and accepts a user on site', async () => {
    render();

    expect(title()).toHaveTextContent(t('location.checking'));
    expect(await screen.findByRole('heading', {name: t('location.nearTitle')})).toBeInTheDocument();
    expect(screen.getByText(t('location.nearText', {distance: '42 m'}))).toBeInTheDocument();
    expect(challengeApi.checkProgress).toHaveBeenCalledWith('c2', 21.029, 105.8526);
    expect(saveUserLocation).toHaveBeenCalledWith(here);
    expect(getCurrentPosition).toHaveBeenCalledWith({maximumAge: 10000});
  });

  it('then opens the camera and hands the photo over', async () => {
    const {container, onPhoto, onClose} = render();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const click = vi.spyOn(input, 'click');
    expect(input).toHaveAttribute('capture', 'environment');

    fireEvent.click(await screen.findByRole('button', {name: t('location.takePhoto')}));
    expect(click).toHaveBeenCalled();

    const photo = new File(['x'], 'p.jpg', {type: 'image/jpeg'});
    fireEvent.change(input, {target: {files: [photo]}});
    expect(onPhoto).toHaveBeenCalledWith(photo);
    expect(onClose).toHaveBeenCalled();
  });

  it('does nothing when the camera is cancelled', async () => {
    const {container, onPhoto, onClose} = render();
    await screen.findByRole('heading', {name: t('location.nearTitle')});

    fireEvent.change(container.querySelector('input[type="file"]')!, {target: {files: []}});

    expect(onPhoto).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('too far: tells the distance, gives directions and checks again', async () => {
    vi.mocked(challengeApi.checkProgress).mockResolvedValue({distance: 1500, message: 'far'});
    vi.mocked(getCurrentPosition).mockResolvedValue({...here, accuracy: 180});
    const user = userEvent.setup();
    render();

    expect(await screen.findByRole('heading', {name: t('location.farTitle')})).toBeInTheDocument();
    expect(screen.getByText(t('location.farText', {distance: '1,5 km', max: 250}))).toBeInTheDocument();
    expect(screen.getByText(t('location.lowAccuracy', {accuracy: 180}))).toBeInTheDocument();
    expect(screen.getByRole('link', {name: t('location.directions')})).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=21.0288,105.8525',
    );

    vi.mocked(challengeApi.checkProgress).mockResolvedValue({distance: 100, message: 'ok'});
    await user.click(screen.getByRole('button', {name: t('location.checkAgain')}));
    expect(await screen.findByRole('heading', {name: t('location.nearTitle')})).toBeInTheDocument();
  });

  it('no directions for a challenge without coordinates', async () => {
    vi.mocked(challengeApi.checkProgress).mockResolvedValue({distance: 900, message: 'far'});
    render({challenge: {...challenge, latitude: undefined, longitude: undefined}});

    await screen.findByRole('heading', {name: t('location.farTitle')});
    expect(screen.queryByRole('link', {name: t('location.directions')})).toBeNull();
    expect(screen.queryByText(t('location.lowAccuracy', {accuracy: 20}))).toBeNull();
  });

  it('blocked location: explains how to re-allow it for the browser', async () => {
    vi.mocked(getLocationPermission).mockResolvedValue('denied');
    render();

    expect(await screen.findByRole('heading', {name: t('location.deniedTitle')})).toBeInTheDocument();
    const steps = t('location.stepsDesktop', {returnObjects: true}) as string[];
    expect(screen.getAllByRole('listitem')).toHaveLength(steps.length);
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('re-checks by itself once the user allows the location in the browser', async () => {
    vi.mocked(getLocationPermission).mockResolvedValue('denied');
    render();
    await screen.findByRole('heading', {name: t('location.deniedTitle')});

    await act(async () => permissionChanged('granted'));

    expect(await screen.findByRole('heading', {name: t('location.nearTitle')})).toBeInTheDocument();
  });

  it('shows the problem when the user blocks the location meanwhile', async () => {
    vi.mocked(challengeApi.checkProgress).mockResolvedValue({distance: 900, message: 'far'});
    render();
    await screen.findByRole('heading', {name: t('location.farTitle')});

    act(() => permissionChanged('denied'));

    expect(title()).toHaveTextContent(t('location.deniedTitle'));
  });

  it('ignores permission changes that do not matter', async () => {
    render();
    await screen.findByRole('heading', {name: t('location.nearTitle')});

    act(() => permissionChanged('granted'));
    act(() => permissionChanged('prompt'));

    expect(title()).toHaveTextContent(t('location.nearTitle'));
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });

  it('closing the browser prompt: offers to ask again', async () => {
    vi.mocked(getCurrentPosition).mockRejectedValueOnce(new LocationError('denied'));
    vi.mocked(getLocationPermission).mockResolvedValue('prompt');
    const user = userEvent.setup();
    render();

    expect(await screen.findByText(t('location.explain'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: t('location.allow')}));

    expect(await screen.findByRole('heading', {name: t('location.nearTitle')})).toBeInTheDocument();
  });

  it.each(['timeout', 'unavailable'] as const)('position %s: can retry', async reason => {
    vi.mocked(getCurrentPosition).mockRejectedValueOnce(new LocationError(reason));
    const user = userEvent.setup();
    render();

    expect(await screen.findByRole('heading', {name: t(`location.${reason}Title`)})).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: t('location.retry')}));

    expect(await screen.findByRole('heading', {name: t('location.nearTitle')})).toBeInTheDocument();
  });

  it('blocked after the prompt (permission now denied): shows the unblock steps', async () => {
    vi.mocked(getCurrentPosition).mockRejectedValueOnce(new LocationError('denied'));
    vi.mocked(getLocationPermission).mockResolvedValueOnce('prompt').mockResolvedValue('denied');
    render();

    expect(await screen.findByRole('heading', {name: t('location.deniedTitle')})).toBeInTheDocument();
  });

  it('plain http: explains why, without a retry button', async () => {
    vi.stubGlobal('isSecureContext', false);
    render();

    expect(await screen.findByRole('heading', {name: t('location.insecureTitle')})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: t('location.retry')})).toBeNull();
    expect(getLocationPermission).not.toHaveBeenCalled();
  });

  it('no geolocation in the browser', async () => {
    vi.mocked(getLocationPermission).mockResolvedValue('unsupported');
    render();

    expect(await screen.findByRole('heading', {name: t('location.unsupportedTitle')})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: t('location.retry')})).toBeNull();
  });

  it('backend unreachable: shows the error with a retry', async () => {
    vi.mocked(challengeApi.checkProgress).mockRejectedValueOnce(networkError());
    const user = userEvent.setup();
    render();

    expect(await screen.findByText(t('common.networkError'))).toBeInTheDocument();
    expect(title()).toHaveTextContent(t('common.failed'));
    await user.click(screen.getByRole('button', {name: t('location.retry')}));

    expect(await screen.findByRole('heading', {name: t('location.nearTitle')})).toBeInTheDocument();
  });

  it('explains when the place has no coordinates', async () => {
    vi.mocked(challengeApi.checkProgress).mockRejectedValue(httpError(400, {message: 'This challenge has no location'}));
    render();

    expect(await screen.findByText(t('trips.detail.challengeNoLocation'))).toBeInTheDocument();
  });

  it('other API errors use the generic message', async () => {
    vi.mocked(challengeApi.checkProgress).mockRejectedValue(new Error('boom'));
    render();

    expect(await screen.findByText(t('trips.detail.updateFailed'))).toBeInTheDocument();
  });

  it('closes with the X, the backdrop or Escape', async () => {
    vi.mocked(getCurrentPosition).mockReturnValue(pending());
    const {onClose, container} = render();

    fireEvent.click(screen.getByRole('button', {name: t('common.close')}));
    fireEvent.click(container.querySelector('.backdrop-blur-sm')!);
    fireEvent.keyDown(window, {key: 'Escape'});
    fireEvent.keyDown(window, {key: 'Enter'});

    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('stops watching the permission when closed', async () => {
    const {unmount} = render();
    await screen.findByRole('heading', {name: t('location.nearTitle')});

    unmount();

    expect(unwatch).toHaveBeenCalled();
  });

  it('a permission answer after closing is ignored', async () => {
    let answer: (p: LocationPermission) => void = () => undefined;
    vi.mocked(getLocationPermission).mockReturnValue(new Promise(r => (answer = r)));
    const {unmount} = render();

    unmount();
    await act(async () => answer('granted'));

    expect(getCurrentPosition).not.toHaveBeenCalled();
  });
});

describe('LocationSteps', () => {
  it.each(['ios', 'android', 'firefox', 'safari', 'desktop'] as const)('%s steps', browser => {
    vi.mocked(detectBrowser).mockReturnValue(browser);
    const key = `location.steps${browser.charAt(0).toUpperCase()}${browser.slice(1)}`;
    const steps = t(key, {returnObjects: true}) as string[];

    renderWithProviders(<LocationSteps className="mt-3" />);

    expect(steps.length).toBeGreaterThan(0);
    expect(screen.getAllByRole('listitem').map(li => li.textContent)).toEqual(steps);
    expect(screen.getByRole('list')).toHaveClass('mt-3');
  });
});
