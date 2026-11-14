// Admin layout: sidebar (collapse + drawer), header, breadcrumb, alerts menu,
// account menu, page title.
import {QueryClientProvider} from '@tanstack/react-query';
import {act, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {routerFuture} from '@/app/routes';
import AdminLayout, {SIDEBAR_COLLAPSED_KEY} from '@/features/admin/components/layout/AdminLayout';
import {getUser, saveSession} from '@/features/auth/store/session';
import i18n from '@/lib/i18n';
import {createTestQueryClient, LocationProbe, t} from '../../utils/render';

const signInAsAdmin = () =>
  saveSession({
    accessToken: 'token',
    data: {username: 'annguyen1', fullname: 'Nguyễn Văn An', email: 'an@example.com', role: 'admin'},
  });

const renderLayout = (path = '/admin/users') =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[path]} future={routerFuture}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/admin/users" element={<p>trang người dùng</p>} />
            <Route path="/admin/trips" element={<p>trang chuyến đi</p>} />
            <Route path="/admin/moderation" element={<p>trang kiểm duyệt</p>} />
            <Route path="/admin/unknown" element={<p>trang lạ</p>} />
          </Route>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  document.title = 'Aloca';
  signInAsAdmin();
});

afterEach(async () => {
  await act(() => i18n.changeLanguage('vi'));
});

describe('AdminLayout', () => {
  it('shows the page next to the sidebar and the header', () => {
    renderLayout();

    expect(screen.getByText('trang người dùng')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent('trang người dùng');
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('has a link to skip to the content', () => {
    renderLayout();

    expect(screen.getByRole('link', {name: t('admin.layout.skipToContent')})).toHaveAttribute('href', '#admin-main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'admin-main');
  });

  it('puts the current page in the browser tab, and restores the old title', () => {
    const {unmount} = renderLayout('/admin/trips');

    expect(document.title).toBe(`${t('admin.nav.trips')} · ${t('admin.title')}`);
    unmount();
    expect(document.title).toBe('Aloca');
  });

  it('uses the plain admin title for a page that is not in the menu', () => {
    renderLayout('/admin/unknown');

    expect(document.title).toBe(t('admin.title'));
    const breadcrumb = screen.getByRole('navigation', {name: t('admin.layout.breadcrumb')});
    expect(within(breadcrumb).queryByRole('listitem', {current: 'page'})).toBeNull();
  });

  it('follows the language', async () => {
    renderLayout();
    await act(() => i18n.changeLanguage('en'));

    expect(document.title).toBe('Users · Aloca Admin');
    expect(screen.getByRole('link', {name: 'Dashboard'})).toBeInTheDocument();
  });
});

describe('sidebar', () => {
  it('lists the 13 pages in three groups, marking the current one', () => {
    renderLayout();
    const nav = screen.getByRole('navigation', {name: t('admin.nav.label')});

    expect(within(nav).getAllByRole('link')).toHaveLength(13);
    for (const group of ['overview', 'management', 'system']) {
      expect(within(nav).getByText(t(`admin.nav.groups.${group}`))).toBeInTheDocument();
    }
    expect(within(nav).getByRole('link', {name: t('admin.nav.users')})).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', {name: t('admin.nav.trips')})).toHaveAttribute('href', '/admin/trips');
    expect(within(nav).getByRole('link', {name: t('admin.nav.trips')})).not.toHaveAttribute('aria-current');
  });

  it('has the Aloca logo linking to the dashboard', () => {
    renderLayout();

    const logo = within(screen.getByRole('complementary')).getByRole('link', {name: /Aloca/});
    expect(logo).toHaveAttribute('href', '/admin/dashboard');
    expect(within(logo).getByText(t('admin.panel'))).toBeInTheDocument();
  });

  it('navigates when a link is clicked', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('link', {name: t('admin.nav.trips')}));

    expect(screen.getByText('trang chuyến đi')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: t('admin.nav.trips')})).toHaveAttribute('aria-current', 'page');
  });

  it('collapses to icons, expands again, and remembers the choice', async () => {
    const user = userEvent.setup();
    renderLayout();
    const toggle = screen.getByRole('button', {name: t('admin.layout.collapse')});

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('complementary')).toHaveClass('lg:w-64');

    await user.click(toggle);

    expect(screen.getByRole('complementary')).toHaveClass('lg:w-[4.5rem]');
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe('1');
    const expand = screen.getByRole('button', {name: t('admin.layout.expand')});
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    // labels stay readable by screen readers and appear as tooltips
    const users = screen.getByRole('link', {name: t('admin.nav.users')});
    expect(users).toHaveAttribute('title', t('admin.nav.users'));

    await user.click(expand);

    expect(screen.getByRole('complementary')).toHaveClass('lg:w-64');
    expect(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe('0');
    expect(users).not.toHaveAttribute('title');
  });

  it('opens already collapsed when it was left collapsed', () => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, '1');
    renderLayout();

    expect(screen.getByRole('complementary')).toHaveClass('lg:w-[4.5rem]');
  });

  it('is a drawer on phones: opens from the header, closes from every side', async () => {
    const user = userEvent.setup();
    renderLayout();
    const open = screen.getByRole('button', {name: t('admin.layout.openMenu')});
    const sidebar = screen.getByRole('complementary');

    expect(sidebar).toHaveClass('-translate-x-full');
    expect(screen.queryByTestId('admin-sidebar-backdrop')).toBeNull();
    expect(open).toHaveAttribute('aria-expanded', 'false');

    // close button
    await user.click(open);
    expect(sidebar).toHaveClass('translate-x-0');
    expect(open).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', {name: t('admin.layout.closeMenu')}));
    expect(sidebar).toHaveClass('-translate-x-full');

    // backdrop
    await user.click(open);
    await user.click(screen.getByTestId('admin-sidebar-backdrop'));
    expect(sidebar).toHaveClass('-translate-x-full');

    // Escape
    await user.click(open);
    await user.keyboard('{Escape}');
    expect(sidebar).toHaveClass('-translate-x-full');

    // choosing a page
    await user.click(open);
    await user.click(screen.getByRole('link', {name: t('admin.nav.trips')}));
    expect(sidebar).toHaveClass('-translate-x-full');
    expect(screen.getByText('trang chuyến đi')).toBeInTheDocument();
  });

  it('ignores other keys while the drawer is open', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', {name: t('admin.layout.openMenu')}));
    await user.keyboard('a');

    expect(screen.getByRole('complementary')).toHaveClass('translate-x-0');
  });
});

describe('breadcrumb', () => {
  it('shows Admin › current page, linking Admin to the dashboard', () => {
    renderLayout();
    const breadcrumb = screen.getByRole('navigation', {name: t('admin.layout.breadcrumb')});

    expect(within(breadcrumb).getByRole('link', {name: t('admin.layout.home')})).toHaveAttribute('href', '/admin/dashboard');
    expect(within(breadcrumb).getByText(t('admin.nav.users'))).toHaveAttribute('aria-current', 'page');
  });
});

describe('language switch', () => {
  it('is in the header and switches the whole panel', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(within(screen.getByRole('banner')).getAllByRole('button', {name: 'EN'})[0]);

    expect(i18n.resolvedLanguage).toBe('en');
    expect(window.localStorage.getItem('aloca.lang')).toBe('en');
    expect(screen.getByRole('link', {name: 'Trips'})).toBeInTheDocument();
  });
});

describe('alerts menu', () => {
  const bell = () => screen.findByRole('button', {name: t('admin.layout.notificationsLabel', {count: 3})});

  it('shows the number of unread alerts on the bell', async () => {
    renderLayout();

    expect(await bell()).toHaveTextContent('3');
  });

  it('lists the alerts with their counts', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(await bell());

    const menu = screen.getByRole('region', {name: t('admin.layout.notifications')});
    expect(within(menu).getAllByRole('link')).toHaveLength(4);
    expect(within(menu).getByText(t('admin.layout.alerts.pendingModeration', {count: 8}))).toBeInTheDocument();
    expect(within(menu).getByText(t('admin.layout.alerts.reportReady', {count: 1}))).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t('admin.layout.notificationsLabel', {count: 3})})).toHaveAttribute('aria-expanded', 'true');
  });

  it('uses singular and plural forms in English', async () => {
    const user = userEvent.setup();
    renderLayout();
    await act(() => i18n.changeLanguage('en'));
    await user.click(await screen.findByRole('button', {name: /Notifications \(3 unread\)/}));

    expect(screen.getByText('24 new users signed up today')).toBeInTheDocument();
    expect(screen.getByText('8 items waiting for moderation')).toBeInTheDocument();
    expect(t('admin.layout.alerts.newUsers', {count: 1})).toBe('1 new user signed up today');
  });

  it('marks everything as read', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(await bell());

    await user.click(screen.getByRole('button', {name: t('admin.layout.markAllRead')}));

    expect(screen.getByRole('button', {name: t('admin.layout.notificationsLabel', {count: 0})})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t('admin.layout.markAllRead')})).toBeDisabled();
  });

  it('opens an alert: goes to its page, reads it, closes the menu', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(await bell());

    // (the link's name also holds the time)
    await user.click(screen.getByText(t('admin.layout.alerts.pendingModeration', {count: 8})).closest('a')!);

    expect(screen.getByText('trang kiểm duyệt')).toBeInTheDocument();
    expect(screen.queryByRole('region', {name: t('admin.layout.notifications')})).toBeNull();
    expect(screen.getByRole('button', {name: t('admin.layout.notificationsLabel', {count: 2})})).toBeInTheDocument();
  });

  it('closes with Escape and with a click outside', async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(await bell());
    const menu = () => screen.queryByRole('region', {name: t('admin.layout.notifications')});

    await user.keyboard('{Escape}');
    expect(menu()).toBeNull();

    await user.click(await bell());
    expect(menu()).not.toBeNull();
    await user.click(screen.getByText('trang người dùng'));
    expect(menu()).toBeNull();
  });
});

describe('account menu', () => {
  const account = () => screen.getByRole('button', {name: t('admin.layout.account')});

  it('shows who is signed in', async () => {
    renderLayout();

    expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument();
    expect(screen.getAllByText(t('admin.roles.admin')).length).toBeGreaterThan(0);
  });

  it('opens with the name, email, role and the actions', async () => {
    const user = userEvent.setup();
    renderLayout();
    await screen.findByText('Nguyễn Văn An');

    await user.click(account());

    const menu = screen.getByRole('region', {name: t('admin.layout.account')});
    expect(within(menu).getByText('an@example.com')).toBeInTheDocument();
    expect(within(menu).getByRole('link', {name: t('admin.layout.userApp')})).toHaveAttribute('href', '/home');
    expect(within(menu).getByRole('button', {name: t('admin.layout.logout')})).toBeInTheDocument();
    // language switch for phones
    expect(within(menu).getByRole('group', {name: t('common.language')})).toBeInTheDocument();
  });

  it('has no email line when the account has none, and shows the photo when there is one', async () => {
    saveSession({accessToken: 't', data: {username: 'lan', role: 'admin', image: 'http://img/lan.jpg'}});
    const user = userEvent.setup();
    const {container} = renderLayout();
    await waitFor(() => expect(container.querySelector('img[src="http://img/lan.jpg"]')).not.toBeNull());

    await user.click(account());

    const menu = screen.getByRole('region', {name: t('admin.layout.account')});
    expect(within(menu).queryByText(/@/)).toBeNull();
    expect(within(menu).getByText('lan')).toBeInTheDocument();
  });

  it('signs out: forgets the session and goes back to the landing page', async () => {
    const user = userEvent.setup();
    renderLayout();
    await screen.findByText('Nguyễn Văn An');
    expect(getUser()).not.toBeNull();

    await user.click(account());
    await user.click(screen.getByRole('button', {name: t('admin.layout.logout')}));

    expect(getUser()).toBeNull();
    expect(await screen.findByTestId('location')).toHaveTextContent('/');
  });

  it('closes with Escape and with a click outside', async () => {
    const user = userEvent.setup();
    renderLayout();
    const menu = () => screen.queryByRole('region', {name: t('admin.layout.account')});

    await user.click(account());
    expect(menu()).not.toBeNull();
    await user.keyboard('{Escape}');
    expect(menu()).toBeNull();

    await user.click(account());
    await user.click(screen.getByText('trang người dùng'));
    expect(menu()).toBeNull();
  });
});
