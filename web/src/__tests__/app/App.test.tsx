// App + router: which screen each URL shows, guards and redirects. Pages are
// replaced by stubs (they have their own tests).
import {render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import App from '@/app/App';
import {saveSession} from '@/features/auth/store/session';
import {saveUserLocation} from '@/lib/location';
import {t} from '../utils/render';

const {stub} = vi.hoisted(() => ({stub: (name: string) => ({default: () => <p>{name}</p>})}));

vi.mock('@/features/admin/users/api', () => ({fetchUsers: () => new Promise(() => undefined)}));
vi.mock('@/features/auth/pages/LandingPage', () => stub('LandingPage'));
vi.mock('@/features/auth/pages/LoginPage', () => stub('LoginPage'));
vi.mock('@/features/auth/pages/RegisterPage', () => stub('RegisterPage'));
vi.mock('@/features/auth/pages/ForgotPasswordPage', () => stub('ForgotPasswordPage'));
vi.mock('@/features/auth/pages/VerifyAccountPage', () => stub('VerifyAccountPage'));
vi.mock('@/features/auth/pages/ResetCodePage', () => stub('ResetCodePage'));
vi.mock('@/features/auth/pages/NewPasswordPage', () => stub('NewPasswordPage'));
vi.mock('@/features/home/pages/HomePage', () => stub('HomePage'));
vi.mock('@/features/trips/pages/TripListPage', () => stub('TripListPage'));
vi.mock('@/features/trips/pages/CreateTripPage', () => stub('CreateTripPage'));
vi.mock('@/features/trips/pages/GenerateTripsPage', () => stub('GenerateTripsPage'));
vi.mock('@/features/trips/pages/TripDetailPage', () => stub('TripDetailPage'));
vi.mock('@/features/trips/pages/TripMapPage', () => stub('TripMapPage'));
vi.mock('@/features/ranking/pages/RankingPage', () => stub('RankingPage'));
vi.mock('@/features/profile/pages/ProfilePage', () => stub('ProfilePage'));
vi.mock('@/features/profile/pages/EditProfilePage', () => stub('EditProfilePage'));
vi.mock('@/features/profile/pages/NotificationsPage', () => stub('NotificationsPage'));
vi.mock('@/features/videos/pages/VideosPage', () => stub('VideosPage'));
vi.mock('@/features/about/pages/WhatAlocaPage', () => stub('WhatAlocaPage'));
vi.mock('@/features/about/pages/BenefitPage', () => stub('BenefitPage'));
vi.mock('@/features/assistant/pages/ChatPage', () => ({ChatPage: () => <p>ChatPage</p>}));
vi.mock('@/lib/location', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/location')>()),
  saveUserLocation: vi.fn(),
}));

const open = (path: string) => {
  window.history.pushState({}, '', path);
  return render(<App />);
};

beforeEach(() => {
  vi.mocked(saveUserLocation).mockResolvedValue(undefined);
});

afterEach(() => {
  window.history.pushState({}, '', '/');
});

const signIn = () => saveSession({accessToken: 't', data: {username: 'lan'}});

describe('public routes', () => {
  it.each([
    ['/', 'LandingPage'],
    ['/login', 'LoginPage'],
    ['/registration', 'RegisterPage'],
    ['/forgot-password', 'ForgotPasswordPage'],
    ['/verify-account', 'VerifyAccountPage'],
    ['/refresh-verify-code', 'ResetCodePage'],
    ['/new-password', 'NewPasswordPage'],
  ])('%s -> %s', async (path, page) => {
    open(path);
    expect(await screen.findByText(page)).toBeInTheDocument();
  });

  it('the site opens on the landing page, even when signed in', async () => {
    signIn();
    open('/');

    expect(await screen.findByText('LandingPage')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('unknown URLs go to the landing page', async () => {
    open('/no/such/page');

    expect(await screen.findByText('LandingPage')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });
});

describe('signed-in routes', () => {
  it('send visitors to the landing page', async () => {
    open('/home');

    expect(await screen.findByText('LandingPage')).toBeInTheDocument();
  });

  it.each([
    ['/home', 'HomePage'],
    ['/ranking', 'RankingPage'],
    ['/profile', 'ProfilePage'],
    ['/assistant/trips', 'TripListPage'],
    ['/assistant/trips/new', 'CreateTripPage'],
    ['/assistant/trips/generate', 'GenerateTripsPage'],
    ['/assistant/trips/t1', 'TripDetailPage'],
    ['/assistant/trips/t1/map', 'TripMapPage'],
    ['/profile/edit', 'EditProfilePage'],
    ['/notification', 'NotificationsPage'],
    ['/videos', 'VideosPage'],
    ['/what-aloca', 'WhatAlocaPage'],
    ['/benefit', 'BenefitPage'],
  ])('%s -> %s', async (path, page) => {
    signIn();
    open(path);

    expect(await screen.findByText(page)).toBeInTheDocument();
  });

  it('tab screens have the tab bar, stack screens do not', async () => {
    signIn();
    const {unmount} = open('/home');
    expect(await screen.findAllByRole('navigation')).not.toHaveLength(0);
    unmount();

    open('/videos');
    await screen.findByText('VideosPage');
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('/assistant opens the chat', async () => {
    signIn();
    open('/assistant');

    expect(await screen.findByText('ChatPage')).toBeVisible();
    expect(window.location.pathname).toBe('/assistant/chat');
  });
});

describe('admin routes', () => {
  const signInAs = (role: 'user' | 'admin') => saveSession({accessToken: 't', data: {username: 'lan', role}});

  it('send visitors to the landing page', async () => {
    open('/admin/users');

    expect(await screen.findByText('LandingPage')).toBeInTheDocument();
  });

  it('send a plain user home', async () => {
    signInAs('user');
    open('/admin/users');

    expect(await screen.findByText('HomePage')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/home');
  });

  it('open the admin panel (its own layout, loaded on demand) for an admin', async () => {
    signInAs('admin');
    open('/admin/users');

    // (the first visit downloads / transforms the whole admin chunk)
    const title = await screen.findByRole('heading', {level: 1, name: t('admin.users.title')}, {timeout: 10_000});
    expect(title).toBeInTheDocument();
    expect(screen.getByRole('navigation', {name: t('admin.nav.label')})).toBeInTheDocument();
    // not the user app's tab bar
    expect(screen.queryByRole('navigation', {name: t('nav.main')})).toBeNull();
  });

  it.each(['/admin', '/admin/no-such-page'])('%s opens the dashboard of an admin', async path => {
    signInAs('admin');
    open(path);

    expect(await screen.findByRole('heading', {level: 1, name: t('admin.dashboard.title')})).toBeInTheDocument();
    expect(window.location.pathname).toBe('/admin/dashboard');
  });
});

describe('App', () => {
  it("refreshes the user's area on start, and survives a failure", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(saveUserLocation).mockRejectedValue(new Error('denied'));

    open('/');

    expect(saveUserLocation).toHaveBeenCalled();
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith(expect.any(String), expect.any(Error)));
    expect(await screen.findByText('LandingPage')).toBeInTheDocument();
  });
});
