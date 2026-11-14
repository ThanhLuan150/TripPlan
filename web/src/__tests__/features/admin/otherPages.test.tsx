// Admin pages that are not plain lists: Dashboard, Reports, Moderation,
// Roles, Settings, and the /admin routes.
import {QueryClient} from '@tanstack/react-query';
import {act, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import Toast from '@/components/ui/Toast';
import AdminRoutes from '@/features/admin/AdminRoutes';
import {mockActivityLogs, mockModeration, mockRoles} from '@/__tests__/fixtures/admin/data';
import DashboardPage from '@/features/admin/pages/DashboardPage';
import ModerationPage from '@/features/admin/pages/ModerationPage';
import ReportsPage from '@/features/admin/pages/ReportsPage';
import RolesPage from '@/features/admin/pages/RolesPage';
import SettingsPage from '@/features/admin/pages/SettingsPage';
import {renderWithProviders, t} from '../../utils/render';

import * as adminApi from '@/features/admin/api';
import {httpError} from '../../utils/render';

const stat = (label: string) =>
  screen
    .getAllByText(label)
    .map(element => element.closest<HTMLElement>('div.rounded-xl'))
    .find(Boolean)!;
const vi_ = new Intl.NumberFormat('vi');

// a client that already holds some admin data and never refetches it
const clientWith = (data: Record<string, unknown>) => {
  const client = new QueryClient({defaultOptions: {queries: {retry: false, staleTime: Infinity, gcTime: Infinity}}});
  for (const [key, value] of Object.entries(data)) {
    client.setQueryData(['admin', key], value);
  }
  return client;
};

describe('DashboardPage', () => {
  const page = (client?: QueryClient) => renderWithProviders(<DashboardPage />, {route: '/admin/dashboard', client});

  it('shows skeletons while loading', () => {
    page();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('shows the four key figures with their change', async () => {
    page();
    await screen.findByText(vi_.format(12846));

    expect(stat(t('admin.dashboard.stats.users'))).toHaveTextContent(vi_.format(12846));
    expect(stat(t('admin.dashboard.stats.trips'))).toHaveTextContent(vi_.format(3912));
    expect(stat(t('admin.dashboard.stats.challengesCompleted'))).toHaveTextContent(vi_.format(8754));
    expect(stat(t('admin.dashboard.stats.aiChats'))).toHaveTextContent(vi_.format(21430));
    // completed challenges fell (bad): red
    expect(within(stat(t('admin.dashboard.stats.challengesCompleted'))).getByText(t('admin.common.decrease')).parentElement).toHaveClass(
      'text-rose-700',
    );
    expect(within(stat(t('admin.dashboard.stats.users'))).getAllByText(t('admin.common.vsLastMonth'))).toHaveLength(1);
  });

  it('draws the new-users chart with a month per bar, and its table', async () => {
    page();
    await screen.findByText(vi_.format(12846));

    const table = screen.getByRole('table', {name: t('admin.dashboard.newUsers')});
    expect(within(table).getAllByRole('row')).toHaveLength(12);
    expect(within(table).getAllByRole('row')[0]).toHaveTextContent(/^T\d+/);
  });

  it('ranks the top destinations', async () => {
    page();
    const list = (await screen.findByText(t('admin.dashboard.topDestinations'))).closest('section')!;

    const items = await within(list).findAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent('Đà Lạt');
    expect(items[0]).toHaveTextContent(t('admin.dashboard.tripsCount', {value: '642'}));
  });

  it('lists recent activity, flagging only entries that need attention', async () => {
    page();
    const card = (await screen.findByText(t('admin.dashboard.recentActivity'))).closest('section')!;

    const items = await within(card).findAllByRole('listitem');
    expect(items).toHaveLength(6);
    expect(items[0]).toHaveTextContent(mockActivityLogs[0].actor);
    const flagged = mockActivityLogs.slice(0, 6).filter(log => log.level !== 'info').length;
    expect(within(card).queryAllByText(t('admin.status.info'))).toHaveLength(0);
    expect(within(card).queryAllByText(new RegExp(`^(${t('admin.status.warning')}|${t('admin.status.error')})$`))).toHaveLength(flagged);
    expect(within(card).getByRole('link', {name: t('admin.common.viewAll')})).toHaveAttribute('href', '/admin/activity-logs');
  });

  it('lists what waits for moderation', async () => {
    page();
    const card = (await screen.findByText(t('admin.dashboard.pendingModeration'))).closest('section')!;

    const pending = mockModeration.filter(item => item.status === 'pending');
    await within(card).findByText(pending[0].content);
    expect(within(card).getAllByRole('listitem')).toHaveLength(5);
    expect(within(card).getByText(t('admin.dashboard.pendingCount', {count: pending.length}))).toBeInTheDocument();
    expect(within(card).getByRole('link', {name: t('admin.common.viewAll')})).toHaveAttribute('href', '/admin/moderation');
  });

  it('says when nothing waits for moderation', async () => {
    page(clientWith({moderation: mockModeration.map(item => ({...item, status: 'approved'}))}));

    expect(await screen.findByText(t('admin.moderation.emptyTitle'))).toBeInTheDocument();
  });

  it('refreshes the figures', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByText(vi_.format(12846));

    await user.click(screen.getByRole('button', {name: t('admin.common.refresh')}));

    await waitFor(() => expect(screen.getByRole('button', {name: t('admin.common.refresh')})).toBeEnabled());
    expect(screen.getByText(vi_.format(12846))).toBeInTheDocument();
  });
});

describe('ReportsPage', () => {
  const page = () => renderWithProviders(<ReportsPage />, {route: '/admin/reports'});
  const bars = (container: HTMLElement) => container.querySelectorAll('.rounded-t-\\[4px\\]').length;

  it('shows a skeleton, then the last 30 days', async () => {
    const {container} = page();
    expect(screen.getByRole('status')).toBeInTheDocument();

    await screen.findByText(t('admin.reports.stats.newUsers'));

    expect(screen.getByLabelText(t('admin.reports.period'))).toHaveValue('30d');
    expect(bars(container)).toBe(30);
    expect(stat(t('admin.reports.stats.newUsers'))).toHaveTextContent(vi_.format(1763));
    expect(stat(t('admin.reports.stats.completionRate'))).toHaveTextContent('64%');
    expect(stat(t('admin.reports.stats.avgTripCost'))).toHaveTextContent('₫');
  });

  it('breaks trips down by province', async () => {
    page();
    const table = await screen.findByRole('table', {name: t('admin.reports.byProvince')});

    expect(within(table).getAllByRole('row')).toHaveLength(8);
    expect(within(table).getByText('Lâm Đồng')).toBeInTheDocument();
  });

  it('switches the period', async () => {
    const user = userEvent.setup();
    const {container} = page();
    await screen.findByText(t('admin.reports.stats.newUsers'));

    await user.selectOptions(screen.getByLabelText(t('admin.reports.period')), '7d');
    expect(bars(container)).toBe(7);
    expect(stat(t('admin.reports.stats.newUsers'))).toHaveTextContent('410');

    await user.selectOptions(screen.getByLabelText(t('admin.reports.period')), '90d');
    expect(bars(container)).toBe(13);
    expect(screen.getAllByText(t('admin.reports.periods.90d')).length).toBeGreaterThan(0);
  });

  it('exports the report as CSV', async () => {
    const create = vi.fn(() => 'blob:report');
    Object.assign(URL, {createObjectURL: create, revokeObjectURL: vi.fn()});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const user = userEvent.setup();
    page();
    await screen.findByText(t('admin.reports.stats.newUsers'));

    await user.click(screen.getByRole('button', {name: t('admin.common.export')}));

    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('asks the API for the chosen period', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByText(t('admin.reports.stats.newUsers'));
    expect(adminApi.fetchReport).toHaveBeenCalledWith('30d');

    await user.selectOptions(screen.getByLabelText(t('admin.reports.period')), '7d');
    await waitFor(() => expect(adminApi.fetchReport).toHaveBeenCalledWith('7d'));
  });
});

describe('ModerationPage', () => {
  const page = (client?: QueryClient) => renderWithProviders(<ModerationPage />, {route: '/admin/moderation', client});
  const pending = mockModeration.filter(item => item.status === 'pending');
  const items = () => within(screen.getByRole('list')).getAllByRole('listitem');
  const tab = (status: string) => screen.getByRole('button', {name: new RegExp(`^${t(`admin.status.${status}`)}`)});

  it('shows a skeleton, then the pending reports, six per page', async () => {
    page();
    expect(screen.getByRole('status')).toBeInTheDocument();

    await screen.findByRole('list');

    expect(items()).toHaveLength(6);
    expect(screen.getByText(t('admin.pagination.summary', {from: 1, to: 6, total: 8}))).toBeInTheDocument();
    expect(within(items()[0]).getByText(pending[0].content)).toBeInTheDocument();
    expect(within(items()[0]).getByText(t(`admin.moderation.types.${pending[0].type}`))).toBeInTheDocument();
    expect(within(items()[0]).getByText(t(`admin.moderation.reasons.${pending[0].reason}`))).toBeInTheDocument();
  });

  it('counts each tab', async () => {
    page();
    await screen.findByRole('list');

    expect(tab('pending')).toHaveAttribute('aria-pressed', 'true');
    expect(tab('pending')).toHaveTextContent('8');
    expect(tab('approved')).toHaveTextContent('3');
    expect(tab('rejected')).toHaveTextContent('3');
  });

  it('shows decided reports with their outcome and no buttons', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('list');

    await user.click(tab('approved'));

    expect(tab('approved')).toHaveAttribute('aria-pressed', 'true');
    expect(items()).toHaveLength(3);
    expect(within(items()[0]).getByText(t('admin.status.approved'))).toBeInTheDocument();
    expect(within(items()[0]).queryByRole('button')).toBeNull();

    await user.click(tab('rejected'));
    expect(items()).toHaveLength(3);
    expect(within(items()[0]).getByText(t('admin.status.rejected'))).toBeInTheDocument();
  });

  it('goes back to the first page when the tab changes', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('list');

    await user.click(screen.getByRole('button', {name: t('admin.pagination.next')}));
    expect(items()).toHaveLength(2);

    await user.click(tab('approved'));
    await user.click(tab('pending'));

    expect(items()).toHaveLength(6);
  });

  it('filters by type and searches by content or author', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('list');

    await user.selectOptions(screen.getByLabelText(t('admin.moderation.type')), 'video');
    expect(items()).toHaveLength(pending.filter(item => item.type === 'video').length);

    await user.selectOptions(screen.getByLabelText(t('admin.moderation.type')), 'all');
    await user.type(screen.getByRole('searchbox', {name: t('admin.moderation.search')}), pending[0].author);
    expect(within(items()[0]).getByText(pending[0].content)).toBeInTheDocument();
  });

  it('says when nothing matches', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('list');

    await user.type(screen.getByRole('searchbox', {name: t('admin.moderation.search')}), 'zzzz');

    expect(screen.getByText(t('admin.common.noResults'))).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('asks before approving, then approves', async () => {
    vi.mocked(adminApi.decideModeration).mockResolvedValue({...pending[0], status: 'approved'});
    const user = userEvent.setup();
    page();
    await screen.findByRole('list');
    const name = t('admin.moderation.approveItem', {name: pending[0].content});

    await user.click(screen.getByRole('button', {name}));
    const dialog = screen.getByRole('alertdialog', {name: t('admin.moderation.approveTitle')});
    expect(dialog).toHaveAccessibleDescription(t('admin.moderation.approveText'));
    // approving is not destructive: primary button
    expect(within(dialog).getByRole('button', {name: t('admin.moderation.approve')})).toHaveClass('bg-brand-700');

    await user.click(within(dialog).getByRole('button', {name: t('common.cancel')}));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(adminApi.decideModeration).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', {name}));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: t('admin.moderation.approve')}));
    expect(await screen.findByText(t('admin.moderation.approved'))).toBeInTheDocument();
    expect(adminApi.decideModeration).toHaveBeenCalledWith(pending[0].id, 'approved');
    expect(adminApi.fetchModeration).toHaveBeenCalledTimes(2);
  });

  it('asks before rejecting, with a danger button', async () => {
    vi.mocked(adminApi.decideModeration).mockResolvedValue({...pending[0], status: 'rejected'});
    const user = userEvent.setup();
    page();
    await screen.findByRole('list');
    act(() => Toast.hide());

    await user.click(screen.getByRole('button', {name: t('admin.moderation.rejectItem', {name: pending[0].content})}));
    const dialog = screen.getByRole('alertdialog', {name: t('admin.moderation.rejectTitle')});
    expect(dialog).toHaveAccessibleDescription(t('admin.moderation.rejectText'));
    expect(within(dialog).getByRole('button', {name: t('admin.moderation.reject')})).toHaveClass('bg-rose-600');

    await user.click(within(dialog).getByRole('button', {name: t('admin.moderation.reject')}));
    expect(await screen.findByText(t('admin.moderation.rejected'))).toBeInTheDocument();
    expect(adminApi.decideModeration).toHaveBeenCalledWith(pending[0].id, 'rejected');
  });

  it('shows the backend message when the decision fails', async () => {
    vi.mocked(adminApi.decideModeration).mockRejectedValue(httpError(404, {message: 'Report not found'}));
    const user = userEvent.setup();
    page();
    await screen.findByRole('list');

    await user.click(screen.getByRole('button', {name: t('admin.moderation.approveItem', {name: pending[0].content})}));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: t('admin.moderation.approve')}));

    expect(await screen.findByText('Report not found')).toBeInTheDocument();
  });

  it('shows the empty state when there is nothing at all', async () => {
    page(clientWith({moderation: []}));

    expect(await screen.findByText(t('admin.common.noResults'))).toBeInTheDocument();
  });
});

describe('RolesPage', () => {
  const page = () => renderWithProviders(<RolesPage />, {route: '/admin/roles', });

  it('describes both roles with their members and permissions', async () => {
    page();
    // members count arrives with the roles
    await waitFor(() => expect(screen.getAllByText(String(mockRoles.members.user))).not.toHaveLength(0));

    const cards = screen.getAllByRole('heading', {level: 2}).slice(0, 2);
    expect(cards[0]).toHaveTextContent(t('admin.roles.admin'));
    expect(cards[1]).toHaveTextContent(t('admin.roles.user'));
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText(t('admin.rolesPage.readOnly'))).toBeInTheDocument();
  });

  it('shows dashes until the counts are known', () => {
    vi.mocked(adminApi.fetchRoles).mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<RolesPage />, {route: '/admin/roles'});
    expect(screen.getAllByText('—').length).toBe(4);
  });

  it('draws the permission matrix', async () => {
    page();
    const table = await screen.findByRole('table', {name: t('admin.rolesPage.matrix')});

    expect(within(table).getAllByRole('row')).toHaveLength(11);
    expect(within(table).getByText(t('admin.rolesPage.permissions.moderate'))).toBeInTheDocument();
    // admin: 10 permissions, user: 5
    expect(within(table).getAllByText(t('admin.rolesPage.allowed'))).toHaveLength(15);
    expect(within(table).getAllByText(t('admin.rolesPage.notAllowed'))).toHaveLength(5);
    const moderate = within(table).getByText(t('admin.rolesPage.permissions.moderate')).closest('tr')!;
    expect(within(moderate).getAllByRole('cell')[1]).toHaveTextContent(t('admin.rolesPage.allowed'));
    expect(within(moderate).getAllByRole('cell')[2]).toHaveTextContent(t('admin.rolesPage.notAllowed'));
  });
});

describe('SettingsPage', () => {
  const page = () => renderWithProviders(<SettingsPage />, {route: '/admin/settings'});
  const field = (key: string) => screen.getByLabelText(t(`admin.settings.fields.${key}`));
  const save = () => screen.getByRole('button', {name: t('admin.settings.save')});
  const undo = () => screen.getByRole('button', {name: t('admin.settings.reset')});

  it('shows a spinner, then the settings of the backend', async () => {
    page();
    expect(screen.getByRole('status')).toBeInTheDocument();

    await screen.findByLabelText(t('admin.settings.fields.appName'));

    expect(field('appName')).toHaveValue('Aloca');
    expect(field('supportEmail')).toHaveValue('support@example.com');
    expect(field('hotline')).toHaveValue('19001009');
  });

  it('offers a retry when the settings cannot be loaded', async () => {
    vi.mocked(adminApi.fetchSettings).mockRejectedValueOnce(httpError(500));
    const user = userEvent.setup();
    page();

    await user.click(await screen.findByRole('button', {name: t('admin.common.refresh')}));
    expect(await screen.findByLabelText(t('admin.settings.fields.appName'))).toBeInTheDocument();
  });

  it('keeps Save and Undo disabled until something changes', async () => {
    page();
    await screen.findByLabelText(t('admin.settings.fields.appName'));

    expect(save()).toBeDisabled();
    expect(undo()).toBeDisabled();
    expect(screen.getByText(t('admin.settings.saved'))).toBeInTheDocument();
  });

  it('edits the fields and undoes them', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByLabelText(t('admin.settings.fields.appName'));

    await user.clear(field('appName'));
    await user.type(field('appName'), 'Aloca Travel');
    expect(screen.getByText(t('admin.settings.unsaved'))).toBeInTheDocument();
    expect(save()).toBeEnabled();

    await user.click(undo());

    expect(field('appName')).toHaveValue('Aloca');
    expect(save()).toBeDisabled();
  });

  it('is not "changed" any more once a value is put back', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByLabelText(t('admin.settings.fields.appName'));

    await user.type(field('hotline'), '1');
    expect(save()).toBeEnabled();
    await user.type(field('hotline'), '{Backspace}');

    expect(save()).toBeDisabled();
  });

  it('validates before saving', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByLabelText(t('admin.settings.fields.appName'));

    await user.clear(field('appName'));
    await user.clear(field('supportEmail'));
    await user.type(field('supportEmail'), 'nope');
    await user.clear(field('hotline'));
    await user.type(field('hotline'), 'abc');
    await user.click(save());

    expect(screen.getByText(t('admin.settings.errors.appName'))).toBeInTheDocument();
    expect(screen.getByText(t('admin.settings.errors.email'))).toBeInTheDocument();
    expect(screen.getByText(t('admin.settings.errors.hotline'))).toBeInTheDocument();
    expect(adminApi.putSettings).not.toHaveBeenCalled();
  });

  it('saves to the backend and shows the saved values', async () => {
    vi.mocked(adminApi.putSettings).mockResolvedValue({appName: 'Aloca Travel', supportEmail: 'help@aloca.vn', hotline: '1900'});
    const user = userEvent.setup();
    page();
    await screen.findByLabelText(t('admin.settings.fields.appName'));

    await user.clear(field('appName'));
    await user.type(field('appName'), ' Aloca Travel ');
    await user.clear(field('supportEmail'));
    await user.type(field('supportEmail'), 'help@aloca.vn');
    await user.clear(field('hotline'));
    await user.type(field('hotline'), '1900');
    await user.click(save());

    await waitFor(() =>
      expect(adminApi.putSettings).toHaveBeenCalledWith({appName: 'Aloca Travel', supportEmail: 'help@aloca.vn', hotline: '1900'}),
    );
    expect(await screen.findByText(t('admin.settings.savedToast'))).toBeInTheDocument();
    await waitFor(() => expect(save()).toBeDisabled());
  });

  it('shows the message of the backend when saving fails', async () => {
    vi.mocked(adminApi.putSettings).mockRejectedValue(httpError(400, {message: 'Invalid supportEmail'}));
    const user = userEvent.setup();
    page();
    await screen.findByLabelText(t('admin.settings.fields.appName'));

    await user.type(field('hotline'), '1');
    await user.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid supportEmail');
    // the form keeps the edited values
    expect(save()).toBeEnabled();
  });
});

describe('admin routes', () => {
  const open = (route: string) => renderWithProviders(<AdminRoutes />, {route, path: '/admin/*'});

  it.each([
    ['/admin/dashboard', 'admin.dashboard.title'],
    ['/admin/users', 'admin.users.title'],
    ['/admin/trips', 'admin.trips.title'],
    ['/admin/challenges', 'admin.challenges.title'],
    ['/admin/ai', 'admin.ai.title'],
    ['/admin/videos', 'admin.videos.title'],
    ['/admin/notifications', 'admin.notifications.title'],
    ['/admin/reports', 'admin.reports.title'],
    ['/admin/settings', 'admin.settings.title'],
    ['/admin/activity-logs', 'admin.activityLogs.title'],
    ['/admin/moderation', 'admin.moderation.title'],
    ['/admin/roles', 'admin.rolesPage.title'],
  ])('%s shows its page inside the admin layout', async (route, titleKey) => {
    open(route);

    expect(await screen.findByRole('heading', {level: 1, name: t(titleKey)})).toBeInTheDocument();
    expect(screen.getByRole('navigation', {name: t('admin.nav.label')})).toBeInTheDocument();
    expect(document.title).toContain(t('admin.title'));
  });

  it.each(['/admin', '/admin/no-such-page'])('%s opens the dashboard', async route => {
    open(route);

    expect(await screen.findByRole('heading', {level: 1, name: t('admin.dashboard.title')})).toBeInTheDocument();
  });
});
