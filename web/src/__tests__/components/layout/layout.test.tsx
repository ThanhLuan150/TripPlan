import {QueryClientProvider} from '@tanstack/react-query';
import {act, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {routerFuture} from '@/app/routes';
import AssistantLayout from '@/components/layout/AssistantLayout';
import BackHeader from '@/components/layout/BackHeader';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import MainLayout from '@/components/layout/MainLayout';
import Page from '@/components/layout/Page';
import {saveSession} from '@/features/auth/store/session';
import i18n from '@/lib/i18n';
import {createTestQueryClient, currentPath, renderWithProviders, t} from '../../utils/render';

vi.mock('@/features/assistant/pages/ChatPage', () => ({ChatPage: () => <p>chat page</p>}));

afterEach(async () => {
  await act(() => i18n.changeLanguage('vi'));
});

describe('BackHeader / Page', () => {
  it('goes back in history by default', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BackHeader title="Video" />, {route: '/videos', history: ['/home']});

    expect(screen.getByRole('heading', {name: 'Video'})).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: t('common.back')}));

    expect(await currentPath()).toBe('/home');
  });

  it('uses a custom back action and shows the right slot', async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<BackHeader title="x" onBack={onBack} right={<span>extra</span>} />);

    await user.click(screen.getByRole('button', {name: t('common.back')}));

    expect(onBack).toHaveBeenCalled();
    expect(screen.getByText('extra')).toBeInTheDocument();
  });

  it('Page renders its title, content and width', () => {
    const {container, rerender} = renderWithProviders(<Page title="Thông báo">nội dung</Page>);

    expect(screen.getByRole('heading', {name: 'Thông báo'})).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('nội dung');
    expect(container.querySelector('main')).toHaveClass('max-w-3xl');

    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter future={routerFuture}>
          <Page title="Video" wide>
            x
          </Page>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole('main')).toHaveClass('max-w-5xl');
  });
});

describe('LanguageSwitcher', () => {
  it('marks the current language and switches language', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    const group = screen.getByRole('group', {name: t('common.language')});

    expect(within(group).getByRole('button', {name: 'VI'})).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(group).getByRole('button', {name: 'EN'}));

    expect(i18n.resolvedLanguage).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(window.localStorage.getItem('aloca.lang')).toBe('en');
    expect(screen.getByRole('button', {name: 'EN'})).toHaveAttribute('aria-pressed', 'true');
  });

  it('has a dark variant for photos', () => {
    render(<LanguageSwitcher tone="dark" className="extra" />);

    expect(screen.getByRole('group')).toHaveClass('bg-white/15', 'extra');
    expect(screen.getByRole('button', {name: 'VI'})).toHaveClass('text-slate-900');
    expect(screen.getByRole('button', {name: 'EN'})).toHaveClass('text-white/80');
  });
});

const renderLayout = (path: string) =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[path]} future={routerFuture}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/home" element={<p>home content</p>} />
            <Route path="/ranking" element={<p>ranking content</p>} />
            <Route path="/assistant" element={<AssistantLayout />}>
              <Route path="chat" element={null} />
              <Route path="trips" element={<p>trip list</p>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('MainLayout', () => {
  it('shows the page with the tab bar (top and bottom)', async () => {
    saveSession({accessToken: 't', data: {username: 'lan', fullname: 'Lan Nguyễn'}});
    renderLayout('/home');

    expect(screen.getByText('home content')).toBeInTheDocument();
    const navs = screen.getAllByRole('navigation', {name: t('nav.main')});
    expect(navs).toHaveLength(2);
    for (const nav of navs) {
      expect(within(nav).getByRole('link', {name: t('nav.home')})).toHaveAttribute('aria-current', 'page');
      expect(within(nav).getByRole('link', {name: t('nav.ranking')})).toHaveAttribute('href', '/ranking');
    }
    expect(await screen.findByText('Lan Nguyễn')).toBeInTheDocument();
    // no photo: the initial letter
    expect(screen.getByText('L')).toBeInTheDocument();
  });

  it("shows the user's photo when there is one", async () => {
    saveSession({accessToken: 't', data: {username: 'lan', image: 'http://img/me.jpg'}});
    const {container} = renderLayout('/ranking');

    await vi.waitFor(() => expect(container.querySelector('img[src="http://img/me.jpg"]')).not.toBeNull());
  });

  it("falls back to 'A' without any name", () => {
    renderLayout('/home');
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});

describe('AssistantLayout', () => {
  it('keeps the chat mounted and shows it on /assistant/chat', () => {
    renderLayout('/assistant/chat');

    expect(screen.getByText('chat page')).toBeVisible();
    expect(screen.queryByText('trip list')).toBeNull();
    const tabs = screen.getByRole('navigation', {name: t('nav.assistant')});
    expect(within(tabs).getByRole('link', {name: t('nav.chat')})).toHaveAttribute('aria-current', 'page');
  });

  it('hides the chat on the plans tab', () => {
    renderLayout('/assistant/trips');

    expect(screen.getByText('trip list')).toBeInTheDocument();
    expect(screen.getByText('chat page').parentElement).toHaveAttribute('hidden');
  });
});
