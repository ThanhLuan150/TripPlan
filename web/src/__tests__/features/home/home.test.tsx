import {act, fireEvent, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import HeroSlider from '@/features/home/components/HeroSlider';
import HomePage from '@/features/home/pages/HomePage';
import {saveSession} from '@/features/auth/store/session';
import {rankingApi} from '@/features/ranking/api/rankingApi';
import {homeVideos} from '@/features/videos/data/videos';
import {currentPath, currentState, pending, renderWithProviders, t} from '../../utils/render';

vi.mock('@/features/ranking/api/rankingApi');

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(rankingApi.get).mockResolvedValue([]);
});

describe('HeroSlider', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const track = (container: HTMLElement) => container.querySelector<HTMLElement>('.transition-transform')!;

  it('moves to the next photo every 3.5 s and loops', () => {
    vi.useFakeTimers();
    const {container} = renderWithProviders(<HeroSlider />);

    expect(track(container).style.transform).toBe('translateX(-0%)');
    act(() => vi.advanceTimersByTime(3500));
    expect(track(container).style.transform).toBe('translateX(-100%)');
    act(() => vi.advanceTimersByTime(3500 * 3));
    expect(track(container).style.transform).toBe('translateX(-0%)');
  });

  it('pauses while hovered', () => {
    vi.useFakeTimers();
    const {container} = renderWithProviders(<HeroSlider />);
    const slider = container.firstElementChild!;

    fireEvent.mouseEnter(slider);
    act(() => vi.advanceTimersByTime(10000));
    expect(track(container).style.transform).toBe('translateX(-0%)');

    fireEvent.mouseLeave(slider);
    act(() => vi.advanceTimersByTime(3500));
    expect(track(container).style.transform).toBe('translateX(-100%)');
  });

  it('jumps to a photo from its dot and links to a new plan', () => {
    const {container} = renderWithProviders(<HeroSlider />);

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

  it('says "you" without a profile and shows the notification badge', () => {
    renderWithProviders(<HomePage />, {route: '/home'});

    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent(t('home.you'));
    expect(screen.getByRole('link', {name: t('home.notifications')})).toHaveTextContent('9+');
    expect(screen.queryByRole('link', {name: t('nav.account')})).toBeNull();
  });

  it('the search box starts a plan for that destination', async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />, {route: '/home'});

    await user.type(screen.getByRole('searchbox', {name: t('home.search')}), '  Đà Lạt {Enter}');

    expect(await currentPath()).toBe('/assistant/trips/new');
    expect(await currentState()).toEqual({location: 'Đà Lạt'});
  });

  it('has quick actions and the featured videos', () => {
    renderWithProviders(<HomePage />, {route: '/home'});

    expect(screen.getByRole('link', {name: t('home.quickChat')})).toHaveAttribute('href', '/assistant/chat');
    expect(screen.getByRole('link', {name: t('home.quickPlan')})).toHaveAttribute('href', '/assistant/trips/new');
    expect(screen.getByRole('link', {name: t('home.quickRanking')})).toHaveAttribute('href', '/ranking');
    const videos = screen.getAllByRole('link', {name: t('common.watchOnYoutube')});
    expect(videos).toHaveLength(homeVideos.length);
    expect(videos[0]).toHaveAttribute('target', '_blank');
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

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(5);
    await act(async () => resolve([]));

    expect(await screen.findByText(t('home.rankingEmpty'))).toBeInTheDocument();
  });

  it('keeps loading placeholders while the ranking is pending', () => {
    vi.mocked(rankingApi.get).mockReturnValue(pending());
    renderWithProviders(<HomePage />, {route: '/home'});

    expect(screen.queryByText(t('home.rankingEmpty'))).toBeNull();
  });
});
