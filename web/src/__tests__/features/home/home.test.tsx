import {act, fireEvent, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeroSlider from '@/features/home/components/HeroSlider';
import HomePage from '@/features/home/pages/HomePage';
import {saveSession} from '@/features/auth/store/session';
import {homeApi, type HomeContent} from '@/features/home/api';
import {profileApi} from '@/features/profile/api/profileApi';
import {rankingApi} from '@/features/ranking/api/rankingApi';
import {videosApi, type VideoItem} from '@/features/videos/api';
import {currentPath, currentState, pending, renderWithProviders, t} from '../../utils/render';

vi.mock('@/features/ranking/api/rankingApi');
vi.mock('@/features/videos/api');
vi.mock('@/features/home/api');
vi.mock('@/features/profile/api/profileApi');

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(rankingApi.get).mockResolvedValue([]);
  vi.mocked(videosApi.list).mockResolvedValue([]);
  vi.mocked(homeApi.get).mockResolvedValue({banners: [], suggestions: []});
  vi.mocked(profileApi.notifications).mockResolvedValue([]);
});

const banners = [1, 2, 3, 4].map(n => ({id: `b${n}`, title: `Banner ${n}`, imageUrl: `https://cdn/b${n}.jpg`}));

describe('HeroSlider', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const track = (container: HTMLElement) => container.querySelector<HTMLElement>('.transition-transform')!;

  it('moves to the next photo every 3.5 s and loops', () => {
    vi.useFakeTimers();
    const {container} = renderWithProviders(<HeroSlider banners={banners} />);

    expect(track(container).style.transform).toBe('translateX(-0%)');
    act(() => vi.advanceTimersByTime(3500));
    expect(track(container).style.transform).toBe('translateX(-100%)');
    act(() => vi.advanceTimersByTime(3500 * 3));
    expect(track(container).style.transform).toBe('translateX(-0%)');
  });

  it('pauses while hovered', () => {
    vi.useFakeTimers();
    const {container} = renderWithProviders(<HeroSlider banners={banners} />);
    const slider = container.firstElementChild!;

    fireEvent.mouseEnter(slider);
    act(() => vi.advanceTimersByTime(10000));
    expect(track(container).style.transform).toBe('translateX(-0%)');

    fireEvent.mouseLeave(slider);
    act(() => vi.advanceTimersByTime(3500));
    expect(track(container).style.transform).toBe('translateX(-100%)');
  });

  it('shows the banners of the admin, and no dots for a single one', () => {
    renderWithProviders(<HeroSlider banners={banners.slice(0, 1)} />);

    expect(screen.getByRole('img', {name: 'Banner 1'})).toHaveAttribute('src', 'https://cdn/b1.jpg');
    expect(screen.queryByRole('button', {name: t('home.slide', {n: 1})})).toBeNull();
  });

  it('says so when there is no banner, and keeps the call to action', () => {
    renderWithProviders(<HeroSlider banners={[]} />);

    expect(screen.getByText(t('home.bannersEmpty'))).toBeInTheDocument();
    expect(screen.getByRole('link', {name: t('home.heroCta')})).toBeInTheDocument();
  });

  it('shows a placeholder, not the empty message, while loading', () => {
    const {container} = renderWithProviders(<HeroSlider banners={[]} loading />);

    expect(screen.queryByText(t('home.bannersEmpty'))).toBeNull();
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('jumps to a photo from its dot and links to a new plan', () => {
    const {container} = renderWithProviders(<HeroSlider banners={banners} />);

    fireEvent.click(screen.getByRole('button', {name: t('home.slide', {n: 3})}));

    expect(track(container).style.transform).toBe('translateX(-200%)');
    expect(screen.getByRole('link', {name: t('home.heroCta')})).toHaveAttribute('href', '/assistant/trips/new');
  });
});

describe('HomePage', () => {
  it('greets the user by name', async () => {
    saveSession({accessToken: 't', data: {username: 'lan', fullname: 'Lan Nguyễn', image: 'http://img/lan.jpg'}});
    renderWithProviders(<HomePage />, {route: '/home'});

    expect(await screen.findByRole('heading', {name: /Lan Nguyễn/})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: t('nav.account')})).toHaveAttribute('href', '/profile');
  });

  it('says "you" without a profile', () => {
    renderWithProviders(<HomePage />, {route: '/home'});

    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent(t('home.you'));
    expect(screen.queryByRole('link', {name: t('nav.account')})).toBeNull();
  });

  const announcements = (count: number) =>
    Array.from({length: count}, (_, i) => ({id: `a${i}`, name: `Tin ${i}`, description: 'x'}));

  it('badges the notifications the user has not opened, from the API', async () => {
    vi.mocked(profileApi.notifications).mockResolvedValue(announcements(3));
    renderWithProviders(<HomePage />, {route: '/home'});

    expect(await screen.findByLabelText(t('home.unread', {count: 3}))).toHaveTextContent('3');
  });

  it('caps the badge at 9+', async () => {
    vi.mocked(profileApi.notifications).mockResolvedValue(announcements(12));
    renderWithProviders(<HomePage />, {route: '/home'});

    expect(await screen.findByLabelText(t('home.unread', {count: 12}))).toHaveTextContent('9+');
  });

  it('hides the badge for notifications already opened', async () => {
    window.localStorage.setItem('seenNotifications', JSON.stringify(['a0', 'a1']));
    vi.mocked(profileApi.notifications).mockResolvedValue(announcements(3));
    renderWithProviders(<HomePage />, {route: '/home'});

    expect(await screen.findByLabelText(t('home.unread', {count: 1}))).toHaveTextContent('1');
  });

  it('has no badge without notifications', async () => {
    renderWithProviders(<HomePage />, {route: '/home'});
    await screen.findByText(t('home.videosEmpty'));

    expect(screen.queryByLabelText(/chưa đọc|unread/)).toBeNull();
  });

  it('tells when there are no featured videos', async () => {
    renderWithProviders(<HomePage />, {route: '/home'});

    expect(await screen.findByText(t('home.videosEmpty'))).toBeInTheDocument();
  });

  it('the search box starts a plan for that destination', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />, {route: '/home'});

    await user.type(screen.getByRole('searchbox', {name: t('home.search')}), '  Đà Lạt {Enter}');

    expect(await currentPath()).toBe('/assistant/trips/new');
    expect(await currentState()).toEqual({location: 'Đà Lạt'});
  });

  it('has quick actions and the featured videos the admin chose', async () => {
    const homeVideos: VideoItem[] = [
      {id: 'v1', title: 'Fansipan', location: 'Lào Cai', youtubeLink: 'https://youtu.be/aaaaaaaaaaa', src: '', thumbnail: 'https://img.youtube.com/vi/aaaaaaaaaaa/hqdefault.jpg'},
      {id: 'v2', title: 'Hội An', location: 'Quảng Nam', youtubeLink: 'https://youtu.be/bbbbbbbbbbb', src: 'https://cdn/x.mp4', thumbnail: ''},
    ];
    vi.mocked(videosApi.list).mockResolvedValue(homeVideos);
    renderWithProviders(<HomePage />, {route: '/home'});

    expect(screen.getByRole('link', {name: t('home.quickChat')})).toHaveAttribute('href', '/assistant/chat');
    expect(screen.getByRole('link', {name: t('home.quickPlan')})).toHaveAttribute('href', '/assistant/trips/new');
    expect(screen.getByRole('link', {name: t('home.quickRanking')})).toHaveAttribute('href', '/ranking');
    const videos = await screen.findAllByRole('button', {name: /^(Xem video|Play video)/});
    expect(videos).toHaveLength(homeVideos.length);
    expect(videosApi.list).toHaveBeenCalledWith(true);
  });

  const content = (extra: Partial<HomeContent> = {}): HomeContent => ({
    banners: [],
    suggestions: [
      {id: 's1', title: 'Đà Lạt', location: 'Lâm Đồng', imageUrl: 'https://cdn/dalat.jpg'},
      {id: 's2', title: 'Biển xanh', location: '', imageUrl: 'https://cdn/bien.jpg'},
    ],
    ...extra,
  });

  it('shows the banners and the suggestions from the API', async () => {
    vi.mocked(homeApi.get).mockResolvedValue(content({banners}));
    renderWithProviders(<HomePage />, {route: '/home'});

    expect(await screen.findByRole('img', {name: 'Banner 1'})).toBeInTheDocument();
    expect(await screen.findByRole('button', {name: t('home.planFor', {place: 'Đà Lạt'})})).toBeInTheDocument();
    expect(screen.queryByText(t('home.suggestionsEmpty'))).toBeNull();
    expect(screen.queryByText(t('home.bannersEmpty'))).toBeNull();
  });

  it('a suggestion with a province starts a plan for it; one without is not clickable', async () => {
    vi.mocked(homeApi.get).mockResolvedValue(content());
    const user = userEvent.setup();
    renderWithProviders(<HomePage />, {route: '/home'});

    expect(await screen.findByRole('button', {name: 'Biển xanh'})).toBeDisabled();
    await user.click(await screen.findByRole('button', {name: t('home.planFor', {place: 'Đà Lạt'})}));

    expect(await currentPath()).toBe('/assistant/trips/new');
    expect(await currentState()).toEqual({location: 'Lâm Đồng'});
  });

  it('tells when there are no banners and no suggestions', async () => {
    renderWithProviders(<HomePage />, {route: '/home'});

    expect(await screen.findByText(t('home.suggestionsEmpty'))).toBeInTheDocument();
    expect(screen.getByText(t('home.bannersEmpty'))).toBeInTheDocument();
    expect(screen.getByText(t('home.videosEmpty'))).toBeInTheDocument();
  });

  it('shows placeholders for the suggestions while they load', () => {
    vi.mocked(homeApi.get).mockReturnValue(pending());
    const {container} = renderWithProviders(<HomePage />, {route: '/home'});

    expect(screen.queryByText(t('home.suggestionsEmpty'))).toBeNull();
    expect(container.querySelectorAll('.aspect-\\[4\\/3\\].animate-pulse')).toHaveLength(3);
  });

  it('plays a featured video in the app instead of leaving for YouTube', async () => {
    vi.mocked(videosApi.list).mockResolvedValue([
      {id: 'v1', title: 'Fansipan', location: '', youtubeLink: 'https://youtu.be/aaaaaaaaaaa', src: '', thumbnail: ''},
    ]);
    const user = userEvent.setup();
    renderWithProviders(<HomePage />, {route: '/home'});

    await user.click(await screen.findByRole('button', {name: t('videos.play', {title: 'Fansipan'})}));

    const dialog = screen.getByRole('dialog', {name: 'Fansipan'});
    expect(within(dialog).getByTitle('Fansipan')).toHaveAttribute('src', expect.stringContaining('youtube-nocookie.com/embed/aaaaaaaaaaa'));
    // still on the home page: nothing navigated away
    expect(screen.getByRole('heading', {level: 1})).toBeInTheDocument();
  });

  it('shows the top players', async () => {
    vi.mocked(rankingApi.get).mockResolvedValue([
      {_id: 'u1', fullname: 'Bảo', experience: 900, image: 'http://img/1'},
      {_id: 'u2', fullname: 'Cúc', experience: 500, image: 'http://img/2'},
      {fullname: 'Duy', experience: 300},
      {fullname: 'Yến', experience: 100},
    ]);
    renderWithProviders(<HomePage />, {route: '/home'});

    expect(await screen.findByText('Bảo')).toBeInTheDocument();
    expect(screen.getByText('Cúc')).toBeInTheDocument();
    expect(screen.getByText('Yến')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument(); // rank badge
    expect(rankingApi.get).toHaveBeenCalledWith('highest');
  });

  it('shows placeholders while loading, then the empty message', async () => {
    let resolve: (v: never[]) => void = () => undefined;
    vi.mocked(rankingApi.get).mockReturnValue(new Promise(r => (resolve = r)));
    const {container} = renderWithProviders(<HomePage />, {route: '/home'});

    // 5 ranking placeholders, 4 for the videos, 3 for the suggestions and the slider's
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(13);
    await act(async () => resolve([]));

    expect(await screen.findByText(t('home.rankingEmpty'))).toBeInTheDocument();
  });

  it('keeps loading placeholders while the ranking is pending', () => {
    vi.mocked(rankingApi.get).mockReturnValue(pending());
    renderWithProviders(<HomePage />, {route: '/home'});

    expect(screen.queryByText(t('home.rankingEmpty'))).toBeNull();
  });
});
