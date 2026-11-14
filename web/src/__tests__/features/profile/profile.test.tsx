import {fireEvent, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import BenefitPage from '@/features/about/pages/BenefitPage';
import WhatAlocaPage from '@/features/about/pages/WhatAlocaPage';
import {chatCache, initialMessages} from '@/features/assistant/store/chatCache';
import {getSession, getUser, saveSession} from '@/features/auth/store/session';
import {profileApi} from '@/features/profile/api/profileApi';
import EditProfilePage from '@/features/profile/pages/EditProfilePage';
import NotificationsPage from '@/features/profile/pages/NotificationsPage';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import VideosPage from '@/features/videos/pages/VideosPage';
import {allVideos} from '@/features/videos/data/videos';
import {uploadImage} from '@/lib/upload';
import {currentPath, httpError, networkError, pending, renderWithProviders, t} from '../../utils/render';

vi.mock('@/features/profile/api/profileApi');
vi.mock('@/lib/upload', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/upload')>()),
  uploadImage: vi.fn(),
}));

const user = {
  username: 'lan',
  fullname: 'Lan Nguyễn',
  email: 'lan@x.vn',
  phone: 901234567,
  address: 'Hà Nội',
  image: 'http://img/lan.jpg',
  experience: 40,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('ProfilePage', () => {
  it("shows the user's name, email, photo and points", async () => {
    saveSession({accessToken: 't', data: user});
    const {container} = renderWithProviders(<ProfilePage />, {route: '/profile'});

    expect(await screen.findByRole('heading', {name: 'Lan Nguyễn'})).toBeInTheDocument();
    expect(screen.getByText('lan@x.vn')).toBeInTheDocument();
    expect(screen.getByText(t('profile.points', {count: 40}))).toBeInTheDocument();
    expect(container.querySelector('img[src="http://img/lan.jpg"]')).not.toBeNull();
  });

  it('shows the initial without photo, and links to the other screens', async () => {
    saveSession({accessToken: 't', data: {username: 'minh'}});
    renderWithProviders(<ProfilePage />, {route: '/profile'});

    expect(await screen.findByText('M')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: t('profile.edit')})).toHaveAttribute('href', '/profile/edit');
    expect(screen.getByRole('link', {name: t('profile.notifications')})).toHaveAttribute('href', '/notification');
    expect(screen.getByRole('link', {name: t('profile.plans')})).toHaveAttribute('href', '/assistant/trips');
    expect(screen.getByRole('link', {name: t('profile.whatIs')})).toHaveAttribute('href', '/what-aloca');
    expect(screen.getByText(t('profile.genzTitle')).closest('a')).toHaveAttribute('href', '/benefit');
    expect(screen.getByRole('link', {name: t('profile.hotline')})).toHaveAttribute('href', 'tel:19001009');
  });

  it("falls back to 'A' when signed out", () => {
    renderWithProviders(<ProfilePage />, {route: '/profile'});
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('logs out: clears the session and the open chat', async () => {
    saveSession({accessToken: 't', data: user});
    chatCache.idChat = 'c1';
    const u = userEvent.setup();
    renderWithProviders(<ProfilePage />, {route: '/profile'});

    await u.click(screen.getByRole('button', {name: t('profile.logout')}));

    expect(await currentPath()).toBe('/login');
    expect(getSession()).toBeNull();
    expect(chatCache.idChat).toBeNull();
    expect(chatCache.messages).toBe(initialMessages);
  });
});

describe('EditProfilePage', () => {
  beforeEach(() => {
    saveSession({accessToken: 't', data: user});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const save = () => fireEvent.click(screen.getByRole('button', {name: t('profile.save')}));

  it('is filled with the current profile', () => {
    renderWithProviders(<EditProfilePage />, {route: '/profile/edit'});

    expect(screen.getByLabelText(t('profile.fullname'))).toHaveValue('Lan Nguyễn');
    expect(screen.getByLabelText(t('profile.email'))).toHaveValue('lan@x.vn');
    expect(screen.getByLabelText(t('profile.email'))).toHaveAttribute('readonly');
    expect(screen.getByLabelText(t('profile.phone'))).toHaveValue('901234567');
    expect(screen.getByLabelText(t('profile.address'))).toHaveValue('Hà Nội');
  });

  it('starts empty for a profile without details', () => {
    saveSession({accessToken: 't', data: {username: 'lan'}});
    renderWithProviders(<EditProfilePage />, {route: '/profile/edit'});

    expect(screen.getByLabelText(t('profile.fullname'))).toHaveValue('');
    expect(screen.getByLabelText(t('profile.phone'))).toHaveValue('');
  });

  it('requires every field and a photo', async () => {
    const u = userEvent.setup();
    renderWithProviders(<EditProfilePage />, {route: '/profile/edit'});

    await u.clear(screen.getByLabelText(t('profile.address')));
    save();

    expect(await screen.findByText(t('profile.missingInfo'))).toBeInTheDocument();
    expect(profileApi.update).not.toHaveBeenCalled();
  });

  it('requires a 10-digit phone number (digits only)', async () => {
    const u = userEvent.setup();
    renderWithProviders(<EditProfilePage />, {route: '/profile/edit'});
    const phone = screen.getByLabelText(t('profile.phone'));

    await u.clear(phone);
    await u.type(phone, '09a01-23');
    expect(phone).toHaveValue('090123');
    save();

    expect(await screen.findByText(t('profile.invalidPhone'))).toBeInTheDocument();
  });

  it('saves the profile and updates the stored user', async () => {
    vi.mocked(profileApi.update).mockResolvedValue({message: 'ok'});
    const u = userEvent.setup();
    renderWithProviders(<EditProfilePage />, {route: '/profile/edit'});

    await u.clear(screen.getByLabelText(t('profile.phone')));
    await u.type(screen.getByLabelText(t('profile.phone')), '0901234567');
    await u.clear(screen.getByLabelText(t('profile.fullname')));
    await u.type(screen.getByLabelText(t('profile.fullname')), 'Lan N.');
    save();

    expect(await currentPath()).toBe('/profile');
    const data = {fullname: 'Lan N.', email: 'lan@x.vn', phone: '0901234567', address: 'Hà Nội', image: 'http://img/lan.jpg'};
    expect(vi.mocked(profileApi.update).mock.calls[0][0]).toEqual(data);
    expect(uploadImage).not.toHaveBeenCalled();
    expect(getUser()).toMatchObject(data);
  });

  it('uploads a newly chosen photo first', async () => {
    vi.stubGlobal('URL', {...URL, createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn()});
    vi.mocked(uploadImage).mockResolvedValue('http://api/files/new');
    vi.mocked(profileApi.update).mockResolvedValue({message: 'ok'});
    const {container} = renderWithProviders(<EditProfilePage />, {route: '/profile/edit'});
    const photo = new File(['x'], 'me.png', {type: 'image/png'});
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const click = vi.spyOn(input, 'click');

    fireEvent.click(screen.getByRole('button', {name: t('profile.choosePhoto')}));
    expect(click).toHaveBeenCalled();
    fireEvent.change(input, {target: {files: [photo]}});
    expect(container.querySelector('img[src="blob:preview"]')).not.toBeNull();

    fireEvent.change(screen.getByLabelText(t('profile.phone')), {target: {value: '0901234567'}});
    save();

    expect(await currentPath()).toBe('/profile');
    expect(uploadImage).toHaveBeenCalledWith(photo);
    expect(vi.mocked(profileApi.update).mock.calls[0][0]).toMatchObject({image: 'http://api/files/new'});
    // the preview URL is freed
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });

  it('ignores an empty file selection', () => {
    const {container} = renderWithProviders(<EditProfilePage />, {route: '/profile/edit'});

    fireEvent.change(container.querySelector('input[type="file"]')!, {target: {files: []}});

    expect(container.querySelector('img[src="http://img/lan.jpg"]')).not.toBeNull();
  });

  it.each([
    ['a photo too large', httpError(413, {code: 'IMAGE_TOO_LARGE'}), 'common.imageTooLarge'],
    ['a network error', networkError(), 'common.networkError'],
    ['any other error', httpError(500), 'profile.saveFailed'],
  ])('explains %s', async (_label, error, key) => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.mocked(profileApi.update).mockRejectedValue(error);
    renderWithProviders(<EditProfilePage />, {route: '/profile/edit'});

    fireEvent.change(screen.getByLabelText(t('profile.phone')), {target: {value: '0901234567'}});
    save();

    expect(await screen.findByText(t(key))).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t('profile.save')})).toBeEnabled();
  });

  it('shows "saving" while saving', async () => {
    vi.mocked(profileApi.update).mockReturnValue(pending());
    renderWithProviders(<EditProfilePage />, {route: '/profile/edit'});

    fireEvent.change(screen.getByLabelText(t('profile.phone')), {target: {value: '0901234567'}});
    save();

    expect(await screen.findByRole('button', {name: t('profile.saving')})).toBeDisabled();
  });
});

describe('NotificationsPage', () => {
  it('shows placeholders, then the notifications', async () => {
    vi.mocked(profileApi.notifications).mockResolvedValue([
      {id: 1, name: 'Chuyến đi sắp tới', description: 'Đà Lạt bắt đầu sau 2 ngày'},
      {id: 'x', name: 'Thử thách mới', description: 'Check-in Hồ Gươm'},
    ]);
    const {container} = renderWithProviders(<NotificationsPage />, {route: '/notification'});

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3);
    expect(await screen.findByText('Chuyến đi sắp tới')).toBeInTheDocument();
    expect(screen.getByText('Check-in Hồ Gươm')).toBeInTheDocument();
  });

  it('says when there is none', async () => {
    vi.mocked(profileApi.notifications).mockResolvedValue([]);
    renderWithProviders(<NotificationsPage />, {route: '/notification'});

    expect(await screen.findByText(t('profile.noNotifications'))).toBeInTheDocument();
  });
});

describe('static pages', () => {
  it('VideosPage lists every video', () => {
    renderWithProviders(<VideosPage />, {route: '/videos'});

    expect(screen.getByRole('heading', {name: t('videos.title')})).toBeInTheDocument();
    const links = screen.getAllByRole('link', {name: t('common.watchOnYoutube')});
    expect(links).toHaveLength(allVideos.length);
    expect(links.map(a => a.getAttribute('href'))).toEqual(allVideos.map(v => v.youtubeLink));
  });

  it('WhatAlocaPage', () => {
    renderWithProviders(<WhatAlocaPage />, {route: '/what-aloca'});

    expect(screen.getByRole('heading', {name: t('about.whatHeading')})).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('BenefitPage, with a back button', async () => {
    const u = userEvent.setup();
    renderWithProviders(<BenefitPage />, {route: '/benefit', history: ['/profile']});

    expect(screen.getByRole('heading', {name: t('about.benefitHeading')})).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: t('about.benefit2Title')})).toBeInTheDocument();
    await u.click(screen.getByRole('button', {name: t('common.back')}));

    expect(await currentPath()).toBe('/profile');
  });
});
