import {screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {rankingApi} from '@/features/ranking/api/rankingApi';
import RankingPage from '@/features/ranking/pages/RankingPage';
import {renderWithProviders, t} from '../../utils/render';

vi.mock('@/features/ranking/api/rankingApi');

const highest = [
  {_id: 'u3', fullname: 'Duy', experience: 260, image: 'http://img/3'},
  {_id: 'u1', fullname: 'Bảo', experience: 1200, image: 'http://img/1'},
  {_id: 'u2', fullname: 'Cúc', experience: 640},
  {_id: 'u4', fullname: 'Yến', experience: 90, image: 'http://img/4'},
  {_id: 'u5', fullname: 'Tuấn', experience: 2500, image: 'http://img/5'},
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(rankingApi.get).mockImplementation(async period => (period === 'highest' ? highest : []));
});

describe('RankingPage', () => {
  it('starts with the all-time ranking', async () => {
    renderWithProviders(<RankingPage />, {route: '/ranking'});

    expect(await screen.findAllByText('Bảo')).not.toHaveLength(0);
    expect(rankingApi.get).toHaveBeenCalledWith('highest');
    expect(screen.getByRole('tab', {name: t('ranking.highest')})).toHaveAttribute('aria-selected', 'true');
  });

  it('puts the 3 best on the podium in the order 2nd - 1st - 3rd', async () => {
    const {container} = renderWithProviders(<RankingPage />, {route: '/ranking'});
    await screen.findAllByText('Bảo');

    const podium = container.querySelector('section .grid')!;
    const names = [...podium.children].map(c => c.querySelector('p')!.textContent);
    expect(names).toEqual(['Bảo', 'Tuấn', 'Cúc']);
    expect(within(podium as HTMLElement).getByText(t('ranking.points', {count: 2500}))).toBeInTheDocument();
  });

  it('lists everyone with their title', async () => {
    renderWithProviders(<RankingPage />, {route: '/ranking'});
    await screen.findAllByText('Bảo');

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(highest.length);
    expect(within(rows[0]).getByText(t('ranking.titleAdventurer'))).toBeInTheDocument(); // 260
    expect(within(rows[1]).getByText(t('ranking.titleLegend'))).toBeInTheDocument(); // 1200
    expect(within(rows[2]).getByText(t('ranking.titleKnight'))).toBeInTheDocument(); // 640
    expect(within(rows[3]).getByText(t('ranking.titleRookie'))).toBeInTheDocument(); // 90
    expect(within(rows[4]).queryByText(/./, {selector: '.rounded-full.bg-brand-50'})).toBeNull(); // 2500: no title
  });

  it('links every ranked user to their public profile', async () => {
    renderWithProviders(<RankingPage />, {route: '/ranking'});
    await screen.findAllByText('Bảo');

    const links = within(screen.getAllByRole('listitem')[1]).getAllByRole('link', {name: 'Bảo'});
    // the avatar and the name
    expect(links).toHaveLength(2);
    links.forEach(link => expect(link).toHaveAttribute('href', '/user/u1'));
    // the avatar opens it too, in the list and on the podium
    const avatarLinks = screen.getAllByRole('link', {name: 'Bảo'}).map(a => a.getAttribute('href'));
    expect(avatarLinks.length).toBeGreaterThanOrEqual(3);
    expect(new Set(avatarLinks)).toEqual(new Set(['/user/u1']));
  });

  it('switches period and shows an empty podium / list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RankingPage />, {route: '/ranking'});
    await screen.findAllByText('Bảo');

    await user.click(screen.getByRole('tab', {name: t('ranking.weekly')}));

    expect(await screen.findByText(t('ranking.empty'))).toBeInTheDocument();
    expect(rankingApi.get).toHaveBeenLastCalledWith('weekly');
    expect(screen.getByRole('tab', {name: t('ranking.weekly')})).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText('—')).toHaveLength(3);

    await user.click(screen.getByRole('tab', {name: t('ranking.monthly')}));
    expect(rankingApi.get).toHaveBeenLastCalledWith('monthly');
  });

  it('shows placeholders while loading', () => {
    vi.mocked(rankingApi.get).mockReturnValue(new Promise(() => undefined));
    const {container} = renderWithProviders(<RankingPage />, {route: '/ranking'});

    expect(container.querySelectorAll('li.animate-pulse')).toHaveLength(4);
  });
});
