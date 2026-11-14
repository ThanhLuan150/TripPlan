// User management: the list (search, filters, sort, pages, bulk actions,
// dialogs, CSV), the profile page and the pure helpers behind them. The admin
// API module is mocked: nothing here reaches the network.
import {act, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import Toast from '@/components/ui/Toast';
import * as api from '@/features/admin/users/api';
import {usersToCsv, downloadUsersCsv} from '@/features/admin/users/exportCsv';
import {validateCreateForm, validateUserForm} from '@/features/admin/users/userForm';
import {
  applyUserFilters,
  defaultFilters,
  isFiltered,
  userCounts,
  type UserFilters,
} from '@/features/admin/users/userList';
import {canDelete, canEdit, canReactivate, canSelect, canSuspend, isSelf} from '@/features/admin/users/userRules';
import {mockTrips, mockUsers} from '@/__tests__/fixtures/admin/data';
import UserDetailsPage from '@/features/admin/pages/UserDetailsPage';
import UsersPage from '@/features/admin/pages/UsersPage';
import type {AdminUser, AdminUserDetail} from '@/features/admin/types';
import {saveSession} from '@/features/auth/store/session';
import {uploadImage} from '@/lib/upload';
import {currentPath, httpError, renderWithProviders, t} from '../../utils/render';

vi.mock('@/features/admin/users/api', () => ({
  fetchUsers: vi.fn(),
  fetchUser: vi.fn(),
  patchUser: vi.fn(),
  patchUsersStatus: vi.fn(),
  postUser: vi.fn(),
  fetchTrip: vi.fn(),
}));
vi.mock('@/lib/upload', () => ({uploadImage: vi.fn(), uploadErrorKey: () => null}));

const postUser = vi.mocked(api.postUser);
const fetchTrip = vi.mocked(api.fetchTrip);
const fetchUsers = vi.mocked(api.fetchUsers);
const fetchUser = vi.mocked(api.fetchUser);
const patchUser = vi.mocked(api.patchUser);
const patchUsersStatus = vi.mocked(api.patchUsersStatus);

// by position in the (newest first) list: 0 and 9 are admins, 4 is suspended,
// 5 is not verified, 8 is deleted
const [admin, , second, third, suspended, unverified, , , deleted] = mockUsers;
const at = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const user = (extra: Partial<AdminUser> = {}): AdminUser => ({...mockUsers[1], ...extra});

const rows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const rowOf = (name: string) => screen.getByText(name).closest('tr')!;
const summary = (from: number, to: number, total: number) =>
  screen.getByText(t('admin.pagination.summary', {from, to, total}));
// the KPI card holding this label (a label may also be a badge or an option elsewhere)
const stat = (label: string) =>
  screen
    .getAllByText(label)
    .map(element => element.closest<HTMLElement>('div.rounded-xl'))
    .find(Boolean)!;
const search = () => screen.getByRole('searchbox', {name: t('admin.users.search')});
const select = (label: string) => screen.getByLabelText(label);

beforeEach(() => {
  vi.resetAllMocks();
  window.localStorage.clear();
  fetchUsers.mockResolvedValue(mockUsers);
  act(() => Toast.hide());
});

describe('user list helpers', () => {
  const now = Date.now();
  const list: AdminUser[] = [
    user({id: 'a', fullname: 'Nguyễn Văn An', username: 'an', email: 'an@x.vn', role: 'admin', createdAt: at(2), lastActiveAt: at(0.5), totalTrips: 1, experience: 30}),
    user({id: 'b', fullname: 'Trần Bình', username: 'binh', email: 'binh@x.vn', role: 'user', status: 'suspended', createdAt: at(40), lastActiveAt: at(5), totalTrips: 9, experience: 10}),
    user({id: 'c', fullname: 'Lê Cường', username: 'cuong', email: 'cuong@y.vn', role: 'user', status: 'delete', createdAt: at(400), lastActiveAt: null, totalTrips: 0, experience: 99}),
    user({id: 'd', fullname: 'Đỗ Dung', username: 'dung', email: 'dung@y.vn', role: 'user', createdAt: at(100), lastActiveAt: at(60), totalTrips: 4, experience: 50}),
  ];
  const ids = (filters: Partial<UserFilters>) => applyUserFilters(list, {...defaultFilters, ...filters}, now).map(u => u.id);

  it('searches name and email without caring about case or accents', () => {
    expect(ids({query: 'nguyen van'})).toEqual(['a']);
    expect(ids({query: 'DUNG@Y'})).toEqual(['d']);
    expect(ids({query: 'do dung'})).toEqual(['d']);
    expect(ids({query: 'nobody'})).toEqual([]);
  });

  it('filters by role and status', () => {
    expect(ids({role: 'admin'})).toEqual(['a']);
    expect(ids({status: 'suspended'})).toEqual(['b']);
    expect(ids({role: 'user', status: 'active'})).toEqual(['d']);
  });

  it('filters by registration date and last activity', () => {
    expect(ids({registered: '7d'})).toEqual(['a']);
    expect(ids({registered: '90d'})).toEqual(['a', 'b']);
    expect(ids({registered: 'year'})).toEqual(['a', 'b', 'd']);
    expect(ids({lastActive: '24h'})).toEqual(['a']);
    expect(ids({lastActive: '7d'})).toEqual(['a', 'b']);
    expect(ids({lastActive: 'inactive'})).toEqual(['d']);
    expect(ids({lastActive: 'never'})).toEqual(['c']);
  });

  it('sorts', () => {
    expect(ids({sort: 'newest'})).toEqual(['a', 'b', 'd', 'c']);
    expect(ids({sort: 'oldest'})).toEqual(['c', 'd', 'b', 'a']);
    expect(ids({sort: 'mostTrips'})).toEqual(['b', 'd', 'a', 'c']);
    expect(ids({sort: 'recentlyActive'})).toEqual(['a', 'b', 'd', 'c']);
    expect(ids({sort: 'points'})).toEqual(['c', 'd', 'a', 'b']);
    const names = applyUserFilters(list, {...defaultFilters, sort: 'nameAsc'}, now).map(u => u.fullname);
    expect(names).toEqual([...names].sort((x, y) => x.localeCompare(y, 'vi')));
  });

  it('tells when a filter is on', () => {
    expect(isFiltered(defaultFilters)).toBe(false);
    expect(isFiltered({...defaultFilters, sort: 'oldest'})).toBe(true);
  });

  it('counts accounts for the stat cards, deleted ones left out', () => {
    expect(userCounts(list, now)).toEqual({total: 3, active: 2, created: 1, createdDelta: 0, suspended: 1});
    const more = [...list, user({id: 'e', createdAt: at(45)}), user({id: 'f', createdAt: at(50)})];
    expect(userCounts(more, now)).toMatchObject({created: 1, createdDelta: -2 / 3});
  });
});

describe('user rules', () => {
  it('follows the backend rules', () => {
    const active = user();
    expect(canEdit(active, false)).toBe(true);
    expect(canEdit(active, true)).toBe(false);
    expect(canEdit(user({status: 'delete'}), false)).toBe(false);
    expect(canSuspend(active, false)).toBe(true);
    expect(canSuspend(user({role: 'admin'}), false)).toBe(false);
    expect(canSuspend(user({status: 'suspended'}), false)).toBe(false);
    expect(canSuspend(user({status: 'notActive'}), false)).toBe(false);
    expect(canReactivate(user({status: 'suspended'}), false)).toBe(true);
    expect(canReactivate(user({status: 'delete'}), false)).toBe(true);
    expect(canReactivate(active, false)).toBe(false);
    expect(canDelete(user({role: 'admin'}), false)).toBe(false);
    expect(canDelete(active, true)).toBe(false);
    expect(canSelect(user({status: 'delete'}), false)).toBe(false);
    expect(canSelect(active, true)).toBe(false);
    expect(isSelf(active, active.username)).toBe(true);
    expect(isSelf(active, undefined)).toBe(false);
  });
});

describe('user form validation', () => {
  it('requires the name and a valid email, the phone is optional', () => {
    expect(validateUserForm({fullname: 'An', email: 'an@x.vn', phone: '', role: 'user'})).toEqual({});
    expect(validateUserForm({fullname: ' ', email: '', phone: '', role: 'user'})).toEqual({
      fullname: 'admin.users.errors.fullnameRequired',
      email: 'admin.users.errors.emailRequired',
    });
    expect(validateUserForm({fullname: 'An', email: 'nope', phone: 'abc', role: 'user'})).toEqual({
      email: 'admin.users.errors.emailInvalid',
      phone: 'admin.users.errors.phoneInvalid',
    });
    expect(validateUserForm({fullname: 'x'.repeat(101), email: 'a@b.co', phone: '0901 234 567', role: 'user'})).toEqual({
      fullname: 'admin.users.errors.fullnameLong',
    });
  });
});

describe('CSV export', () => {
  it('quotes cells and neutralises spreadsheet formulas', () => {
    const csv = usersToCsv([user({fullname: 'Lê, "Bình"', email: '=cmd@x.vn', lastActiveAt: null})]);
    const [header, line] = csv.split('\r\n');
    expect(header.split(',')[0]).toBe('id');
    expect(line).toContain('"Lê, ""Bình"""');
    expect(line).toContain("'=cmd@x.vn");
  });

  it('downloads a file', () => {
    const create = vi.fn(() => 'blob:users');
    const revoke = vi.fn();
    Object.assign(URL, {createObjectURL: create, revokeObjectURL: revoke});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    downloadUsersCsv([user()], 'users.csv');

    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:users');
    click.mockRestore();
  });
});

describe('UsersPage', () => {
  const page = () => renderWithProviders(<UsersPage />, {route: '/admin/users'});

  it('shows a skeleton, then the first page sorted by newest', async () => {
    page();
    expect(screen.getByRole('status')).toBeInTheDocument();

    expect(await screen.findByText(mockUsers[0].fullname)).toBeInTheDocument();
    expect(rows()).toHaveLength(10);
    expect(summary(1, 10, mockUsers.length)).toBeInTheDocument();
    expect(within(rowOf(mockUsers[0].fullname)).getByText(mockUsers[0].email)).toBeInTheDocument();
  });

  it('counts accounts in the stat cards', async () => {
    page();
    await screen.findByText(mockUsers[0].fullname);

    const live = mockUsers.filter(u => u.status !== 'delete');
    expect(stat(t('admin.users.stats.total'))).toHaveTextContent(String(live.length));
    expect(stat(t('admin.users.stats.active'))).toHaveTextContent(String(live.filter(u => u.status === 'active').length));
    expect(stat(t('admin.users.stats.suspended'))).toHaveTextContent(String(live.filter(u => u.status === 'suspended').length));
    expect(stat(t('admin.users.stats.new'))).toBeInTheDocument();
  });

  it('searches without caring about accents, and the box can be cleared', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    await user.type(search(), 'nguyen van an');
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(within(rows()[0]).getByText('Nguyễn Văn An')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: t('admin.common.clearSearch')}));
    await waitFor(() => expect(rows()).toHaveLength(10));
  });

  it('says so when nothing matches, and Reset filters brings everything back', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    await user.type(search(), 'zzzz');
    expect(await screen.findByText(t('admin.common.noResults'))).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', {name: t('admin.common.resetFilters')})[1]);

    await waitFor(() => expect(rows()).toHaveLength(10));
    expect(search()).toHaveValue('');
  });

  it('filters by role and status, then resets', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    await user.selectOptions(select(t('admin.users.columns.role')), 'admin');
    expect(rows()).toHaveLength(2);

    await user.selectOptions(select(t('admin.users.columns.role')), 'all');
    await user.selectOptions(select(t('admin.users.columns.status')), 'suspended');
    expect(rows()).toHaveLength(mockUsers.filter(u => u.status === 'suspended').length);

    await user.click(screen.getByRole('button', {name: t('admin.common.resetFilters')}));
    expect(rows()).toHaveLength(10);
    expect(select(t('admin.users.columns.status'))).toHaveValue('all');
  });

  it('filters by registration date and last activity, and sorts', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    await user.selectOptions(select(t('admin.users.registrationDate')), '30d');
    const recent = mockUsers.filter(u => Date.now() - new Date(u.createdAt).getTime() <= 30 * 86_400_000).length;
    expect(summary(1, Math.min(10, recent), recent)).toBeInTheDocument();

    await user.selectOptions(select(t('admin.users.registrationDate')), 'all');
    await user.selectOptions(select(t('admin.users.columns.lastActive')), 'never');
    expect(rows()).toHaveLength(mockUsers.filter(u => !u.lastActiveAt).length);

    await user.selectOptions(select(t('admin.users.columns.lastActive')), 'all');
    await user.selectOptions(select(t('admin.users.sortBy')), 'oldest');
    expect(within(rows()[0]).getByText(mockUsers[mockUsers.length - 1].fullname)).toBeInTheDocument();
  });

  it('pages through the users and changes the page size', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    await user.click(screen.getByRole('button', {name: t('admin.pagination.next')}));
    expect(summary(11, 20, mockUsers.length)).toBeInTheDocument();
    expect(within(rows()[0]).getByText(mockUsers[10].fullname)).toBeInTheDocument();

    await user.selectOptions(select(t('admin.users.pageSize')), '20');
    expect(rows()).toHaveLength(20);
    expect(summary(1, 20, mockUsers.length)).toBeInTheDocument();
  });

  it('opens the profile from the name', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    await user.click(screen.getByRole('link', {name: mockUsers[1].fullname}));
    expect(await currentPath()).toBe(`/admin/users/${mockUsers[1].id}`);
  });

  it('opens the profile from the row menu', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    await user.click(screen.getByRole('button', {name: t('admin.users.moreActions', {name: mockUsers[2].fullname})}));
    await user.click(screen.getByRole('menuitem', {name: t('admin.users.viewDetails')}));
    expect(await currentPath()).toBe(`/admin/users/${mockUsers[2].id}`);
  });

  it('selects users, shows the bulk bar and clears the selection', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);
    expect(screen.queryByRole('region', {name: t('admin.users.bulk.label')})).toBeNull();

    await user.click(screen.getByRole('checkbox', {name: t('admin.users.selectUser', {name: second.fullname})}));
    expect(screen.getByText(t('admin.users.bulk.selected', {count: 1}))).toBeInTheDocument();
    expect(rowOf(second.fullname).className).toContain('bg-brand-50');

    await user.click(screen.getByRole('checkbox', {name: t('admin.users.selectUser', {name: third.fullname})}));
    expect(screen.getByText(t('admin.users.bulk.selected', {count: 2}))).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: t('admin.users.bulk.clear')}));
    expect(screen.queryByRole('region', {name: t('admin.users.bulk.label')})).toBeNull();
  });

  it('selects the page, but never a deleted account', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    expect(screen.getByRole('checkbox', {name: t('admin.users.selectUser', {name: deleted.fullname})})).toBeDisabled();
    await user.click(screen.getByRole('checkbox', {name: t('admin.users.selectPage')}));
    expect(screen.getByText(t('admin.users.bulk.selected', {count: 9}))).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', {name: t('admin.users.selectPage')}));
    expect(screen.queryByRole('region', {name: t('admin.users.bulk.label')})).toBeNull();
  });

  it('cannot select, edit or delete the signed-in admin', async () => {
    saveSession({accessToken: 'token', data: {username: admin.username, role: 'admin'}});
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    expect(screen.getByRole('checkbox', {name: t('admin.users.selectUser', {name: admin.fullname})})).toBeDisabled();
    await user.click(screen.getByRole('button', {name: t('admin.users.moreActions', {name: admin.fullname})}));
    expect(screen.getByRole('menuitem', {name: t('admin.users.editUser')})).toBeDisabled();
    expect(screen.getByRole('menuitem', {name: t('admin.users.deleteAccount')})).toBeDisabled();
  });

  it('suspends the selection after asking for a reason', async () => {
    patchUsersStatus.mockResolvedValue({updated: [second.id, third.id], skipped: []});
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    // an administrator is selected too: it is left out of the suspension
    await user.click(screen.getByRole('checkbox', {name: t('admin.users.selectUser', {name: second.fullname})}));
    await user.click(screen.getByRole('checkbox', {name: t('admin.users.selectUser', {name: third.fullname})}));
    await user.click(screen.getByRole('checkbox', {name: t('admin.users.selectUser', {name: admin.fullname})}));
    await user.click(screen.getByRole('button', {name: t('admin.users.bulk.suspend')}));

    const dialog = screen.getByRole('alertdialog', {name: t('admin.users.dialogs.suspendMany', {count: 2})});
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.confirmSuspension')}));
    expect(within(dialog).getByText(t('admin.users.errors.reasonRequired'))).toBeInTheDocument();
    expect(patchUsersStatus).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(t('admin.users.dialogs.reason')), 'Spam');
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.confirmSuspension')}));

    await waitFor(() => expect(patchUsersStatus).toHaveBeenCalledWith([second.id, third.id], 'suspended', 'Spam'));
    expect(await screen.findByText(t('admin.users.toasts.suspended', {count: 2}))).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(fetchUsers).toHaveBeenCalledTimes(2);
  });

  it('reports the accounts the backend skipped', async () => {
    patchUsersStatus.mockResolvedValue({updated: [second.id], skipped: [third.id]});
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    await user.click(screen.getByRole('checkbox', {name: t('admin.users.selectUser', {name: second.fullname})}));
    await user.click(screen.getByRole('checkbox', {name: t('admin.users.selectUser', {name: third.fullname})}));
    await user.click(screen.getByRole('button', {name: t('admin.users.bulk.suspend')}));
    const dialog = screen.getByRole('alertdialog');
    await user.type(within(dialog).getByLabelText(t('admin.users.dialogs.reason')), 'Spam');
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.confirmSuspension')}));

    expect(await screen.findByText(t('admin.users.toasts.skipped', {count: 1}))).toBeInTheDocument();
  });

  it('reactivates a suspended account from its row menu', async () => {
    patchUser.mockResolvedValue({...suspended, status: 'active'});
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    await user.click(screen.getByRole('button', {name: t('admin.users.moreActions', {name: suspended.fullname})}));
    await user.click(screen.getByRole('menuitem', {name: t('admin.users.reactivateAccount')}));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(suspended.email)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.confirmReactivation')}));

    await waitFor(() => expect(patchUser).toHaveBeenCalledWith(suspended.id, {status: 'active', suspendReason: undefined}));
    expect(await screen.findByText(t('admin.users.toasts.reactivated', {count: 1}))).toBeInTheDocument();
  });

  it('suspends one account with a reason', async () => {
    patchUser.mockResolvedValue({...second, status: 'suspended'});
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    await user.click(screen.getByRole('button', {name: t('admin.users.moreActions', {name: second.fullname})}));
    await user.click(screen.getByRole('menuitem', {name: t('admin.users.suspendAccount')}));
    const dialog = screen.getByRole('alertdialog', {name: t('admin.users.suspendAccount')});
    await user.type(within(dialog).getByLabelText(t('admin.users.dialogs.reason')), '  Vi phạm  ');
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.confirmSuspension')}));

    await waitFor(() => expect(patchUser).toHaveBeenCalledWith(second.id, {status: 'suspended', suspendReason: 'Vi phạm'}));
  });

  it('deletes an account after the warning, and keeps the dialog open on an error', async () => {
    patchUser.mockRejectedValueOnce(httpError(409, {message: 'Change the role first'}));
    patchUser.mockResolvedValueOnce({...second, status: 'delete'});
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    await user.click(screen.getByRole('button', {name: t('admin.users.moreActions', {name: second.fullname})}));
    await user.click(screen.getByRole('menuitem', {name: t('admin.users.deleteAccount')}));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(t('admin.users.dialogs.deleteWarning'))).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', {name: t('admin.users.deleteAccount')}));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Change the role first');

    await user.click(within(dialog).getByRole('button', {name: t('admin.users.deleteAccount')}));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(patchUser).toHaveBeenLastCalledWith(second.id, {status: 'delete', suspendReason: undefined});
  });

  it('cancels a dialog with Cancel and with Escape', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    await user.click(screen.getByRole('button', {name: t('admin.users.moreActions', {name: second.fullname})}));
    await user.click(screen.getByRole('menuitem', {name: t('admin.users.deleteAccount')}));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: t('common.cancel')}));
    expect(screen.queryByRole('alertdialog')).toBeNull();

    await user.click(screen.getByRole('button', {name: t('admin.users.moreActions', {name: second.fullname})}));
    await user.click(screen.getByRole('menuitem', {name: t('admin.users.deleteAccount')}));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(patchUser).not.toHaveBeenCalled();
  });

  it('validates the edit form and sends only what changed', async () => {
    patchUser.mockResolvedValue({...second, fullname: 'Tên mới'});
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    await user.click(screen.getByRole('button', {name: t('admin.users.moreActions', {name: second.fullname})}));
    await user.click(screen.getByRole('menuitem', {name: t('admin.users.editUser')}));
    const dialog = screen.getByRole('dialog', {name: t('admin.users.editUser')});

    const name = within(dialog).getByLabelText(t('admin.users.fields.fullname'));
    const email = within(dialog).getByLabelText(t('admin.users.fields.email'));
    await user.clear(name);
    await user.clear(email);
    await user.type(email, 'not-an-email');
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.saveChanges')}));

    expect(within(dialog).getByText(t('admin.users.errors.fullnameRequired'))).toBeInTheDocument();
    expect(within(dialog).getByText(t('admin.users.errors.emailInvalid'))).toBeInTheDocument();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(patchUser).not.toHaveBeenCalled();

    await user.type(name, 'Tên mới');
    await user.clear(email);
    await user.type(email, second.email);
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.saveChanges')}));

    await waitFor(() => expect(patchUser).toHaveBeenCalledWith(second.id, {fullname: 'Tên mới'}));
    expect(await screen.findByText(t('admin.users.toasts.updated'))).toBeInTheDocument();
  });

  it('changes the role', async () => {
    patchUser.mockResolvedValue({...second, role: 'admin'});
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    await user.click(screen.getByRole('button', {name: t('admin.users.moreActions', {name: second.fullname})}));
    await user.click(screen.getByRole('menuitem', {name: t('admin.users.changeRole')}));
    const dialog = screen.getByRole('dialog', {name: t('admin.users.changeRole')});
    expect(within(dialog).getByText(t('admin.users.dialogs.roleImpact.admin'))).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.confirmRole')}));

    await waitFor(() => expect(patchUser).toHaveBeenCalledWith(second.id, {role: 'admin'}));
    expect(await screen.findByText(t('admin.users.toasts.roleChanged'))).toBeInTheDocument();
  });

  it('exports the filtered list and the selection as CSV', async () => {
    const create = vi.fn(() => 'blob:users');
    Object.assign(URL, {createObjectURL: create, revokeObjectURL: vi.fn()});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);

    await user.click(screen.getByRole('button', {name: t('admin.users.exportUsers')}));
    expect(create).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(t('admin.users.toasts.exported', {count: mockUsers.length}))).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', {name: t('admin.users.selectUser', {name: second.fullname})}));
    await user.click(screen.getByRole('button', {name: t('admin.users.bulk.export')}));
    expect(create).toHaveBeenCalledTimes(2);
    expect(await screen.findByText(t('admin.users.toasts.exported', {count: 1}))).toBeInTheDocument();
    click.mockRestore();
  });

  it('offers a retry when the users cannot be loaded', async () => {
    fetchUsers.mockRejectedValueOnce(httpError(500));
    const user = userEvent.setup();
    page();

    expect(await screen.findByText(t('admin.users.errors.loadFailed'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: t('admin.common.refresh')}));
    expect(await screen.findByText(mockUsers[0].fullname)).toBeInTheDocument();
  });
});

describe('UserDetailsPage', () => {
  const detail = (extra: Partial<AdminUserDetail> = {}, who: AdminUser = second): AdminUserDetail => ({
    user: who,
    aiConversations: 4,
    trips: [{...mockTrips[0], imageUrl: ''}],
    challenges: [
      {id: 'c1', name: 'Hồ Gươm', location: 'Hà Nội', points: 50, completed: true, joinedAt: at(5), completedAt: at(2)},
      {id: 'c2', name: 'Sa Pa', location: 'Lào Cai', points: 80, completed: false, joinedAt: at(1), completedAt: null},
    ],
    activity: [{id: 'l1', at: at(1), action: 'login', target: '', level: 'info'}],
    ...extra,
  });
  const page = (who: AdminUser = second) =>
    renderWithProviders(<UserDetailsPage />, {route: `/admin/users/${who.id}`, path: '/admin/users/:id'});

  it('shows the profile header and the statistics', async () => {
    fetchUser.mockResolvedValue(detail());
    page();

    expect(await screen.findByRole('heading', {level: 1, name: second.fullname})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: t('admin.users.backToUsers')})).toHaveAttribute('href', '/admin/users');
    expect(fetchUser).toHaveBeenCalledWith(second.id);

    const stats = within(screen.getByRole('region', {name: t('admin.users.statistics')}));
    expect(stats.getByText(t('admin.users.stats.totalTrips')).closest('div.rounded-xl')).toHaveTextContent(String(second.totalTrips));
    expect(stats.getByText(t('admin.users.stats.aiConversations')).closest('div.rounded-xl')).toHaveTextContent('4');
    expect(stats.getByText(t('admin.users.stats.points'))).toBeInTheDocument();
  });

  it('switches between the four tabs', async () => {
    fetchUser.mockResolvedValue(detail());
    const user = userEvent.setup();
    page();
    await screen.findByRole('heading', {level: 1, name: second.fullname});

    const tab = (name: string) => screen.getByRole('tab', {name});
    expect(tab(t('admin.users.tabs.overview'))).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(t('admin.users.basicInfo'))).toBeInTheDocument();
    expect(screen.getByText(t('admin.users.activity.signup'))).toBeInTheDocument();

    await user.click(tab(t('admin.users.tabs.trips')));
    expect(screen.getByText(mockTrips[0].nameTrip)).toBeInTheDocument();

    await user.click(tab(t('admin.users.tabs.challenges')));
    expect(screen.getByText('Hồ Gươm')).toBeInTheDocument();
    expect(screen.getByText(t('admin.users.challenges.statusActive'))).toBeInTheDocument();

    await user.click(tab(t('admin.users.tabs.activity')));
    expect(screen.getByText(t('admin.activityLogs.actions.login'))).toBeInTheDocument();

    // arrow keys move between the tabs
    await user.keyboard('{ArrowRight}');
    expect(tab(t('admin.users.tabs.overview'))).toHaveAttribute('aria-selected', 'true');
  });

  it('shows empty states for a user without trips or challenges', async () => {
    fetchUser.mockResolvedValue(detail({trips: [], challenges: []}));
    const user = userEvent.setup();
    page();
    await screen.findByRole('heading', {level: 1, name: second.fullname});

    await user.click(screen.getByRole('tab', {name: t('admin.users.tabs.trips')}));
    expect(screen.getByText(t('admin.users.trips.empty'))).toBeInTheDocument();
    await user.click(screen.getByRole('tab', {name: t('admin.users.tabs.challenges')}));
    expect(screen.getByText(t('admin.users.challenges.empty'))).toBeInTheDocument();
  });

  it('shows why an account is suspended and reactivates it', async () => {
    const blocked = {...suspended, suspendReason: 'Spam links', suspendedAt: at(2)};
    fetchUser.mockResolvedValue(detail({}, blocked));
    patchUser.mockResolvedValue({...blocked, status: 'active'});
    const user = userEvent.setup();
    page(blocked);

    expect(await screen.findByText('Spam links', {exact: false})).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: t('admin.users.reactivateAccount')}));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: t('admin.users.dialogs.confirmReactivation')}));

    await waitFor(() => expect(patchUser).toHaveBeenCalledWith(blocked.id, {status: 'active', suspendReason: undefined}));
  });

  it('goes back to the list after the account is deleted', async () => {
    fetchUser.mockResolvedValue(detail());
    patchUser.mockResolvedValue({...second, status: 'delete'});
    const user = userEvent.setup();
    page();
    await screen.findByRole('heading', {level: 1, name: second.fullname});

    await user.click(screen.getByRole('button', {name: t('admin.users.moreActions', {name: second.fullname})}));
    await user.click(screen.getByRole('menuitem', {name: t('admin.users.deleteAccount')}));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: t('admin.users.deleteAccount')}));

    expect(await currentPath()).toBe('/admin/users');
  });

  it('says when the user does not exist', async () => {
    fetchUser.mockRejectedValue(httpError(404, {message: 'User not found'}));
    page();

    expect(await screen.findByText(t('admin.users.notFound'))).toBeInTheDocument();
    expect(screen.getByRole('link', {name: t('admin.users.backToUsers')})).toBeInTheDocument();
  });

  it('offers a retry on another error', async () => {
    fetchUser.mockRejectedValueOnce(httpError(500));
    fetchUser.mockResolvedValue(detail());
    const user = userEvent.setup();
    page();

    await user.click(await screen.findByRole('button', {name: t('admin.common.refresh')}));
    expect(await screen.findByRole('heading', {level: 1, name: second.fullname})).toBeInTheDocument();
  });

  it('lists users without a name clash: unverified accounts cannot be suspended', () => {
    expect(canSuspend(unverified, false)).toBe(false);
  });
});

describe('add user', () => {
  const page = () => renderWithProviders(<UsersPage />, {route: '/admin/users'});
  const open = async () => {
    const user = userEvent.setup();
    page();
    await screen.findByText(mockUsers[0].fullname);
    await user.click(screen.getByRole('button', {name: t('admin.users.add')}));
    return {user, dialog: screen.getByRole('dialog', {name: t('admin.users.add')})};
  };
  const fill = async (user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) => {
    await user.type(within(dialog).getByLabelText(t('admin.users.fields.fullname')), 'Người Mới');
    await user.type(within(dialog).getByLabelText(t('admin.users.fields.username')), 'nguoimoi');
    await user.type(within(dialog).getByLabelText(t('admin.users.fields.email')), 'moi@example.com');
    await user.type(within(dialog).getByLabelText(t('admin.users.fields.password')), 'matkhau123');
  };

  it('validates the form', async () => {
    const {user, dialog} = await open();
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.createAccount')}));

    expect(within(dialog).getByText(t('admin.users.errors.fullnameRequired'))).toBeInTheDocument();
    expect(within(dialog).getByText(t('admin.users.errors.usernameInvalid'))).toBeInTheDocument();
    expect(within(dialog).getByText(t('admin.users.errors.passwordShort'))).toBeInTheDocument();
    expect(postUser).not.toHaveBeenCalled();
    expect(validateCreateForm({fullname: 'A', username: 'a_b.c', email: 'a@b.co', phone: '', password: '12345678', role: 'user'})).toEqual({});
  });

  it('creates the account and opens its profile', async () => {
    postUser.mockResolvedValue({...second, id: 'newid'});
    const {user, dialog} = await open();
    await fill(user, dialog);
    await user.selectOptions(within(dialog).getByLabelText(t('admin.users.columns.role')), 'admin');
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.createAccount')}));

    await waitFor(() =>
      expect(postUser).toHaveBeenCalledWith({fullname: 'Người Mới', username: 'nguoimoi', email: 'moi@example.com', phone: '', role: 'admin', password: 'matkhau123'}),
    );
    expect(await currentPath()).toBe('/admin/users/newid');
  });

  it('shows a taken username next to its field', async () => {
    postUser.mockRejectedValue(httpError(409, {message: 'Username already in use', field: 'username'}));
    const {user, dialog} = await open();
    await fill(user, dialog);
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.createAccount')}));

    expect(await within(dialog).findByText(t('admin.users.errors.usernameTaken'))).toBeInTheDocument();
  });
});

describe('edit photo and trip details', () => {
  it('uploads a new photo and saves its URL', async () => {
    vi.mocked(uploadImage).mockResolvedValue('https://cdn.example.com/new.jpg');
    patchUser.mockResolvedValue({...second, image: 'https://cdn.example.com/new.jpg'});
    const user = userEvent.setup();
    renderWithProviders(<UsersPage />, {route: '/admin/users'});
    await screen.findByText(mockUsers[0].fullname);

    await user.click(screen.getByRole('button', {name: t('admin.users.moreActions', {name: second.fullname})}));
    await user.click(screen.getByRole('menuitem', {name: t('admin.users.editUser')}));
    const dialog = screen.getByRole('dialog', {name: t('admin.users.editUser')});
    await user.upload(within(dialog).getByLabelText(t('admin.users.dialogs.changePhoto'), {selector: 'input'}), new File(['x'], 'a.png', {type: 'image/png'}));
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.saveChanges')}));

    await waitFor(() => expect(patchUser).toHaveBeenCalledWith(second.id, {image: 'https://cdn.example.com/new.jpg'}));
  });

  it('opens the details of a trip from the Trip plans tab', async () => {
    const trip = {...mockTrips[0], imageUrl: '', createdAt: at(10), phase: 'completed' as const};
    fetchUser.mockResolvedValue({user: second, aiConversations: 0, trips: [trip], challenges: [], activity: []});
    fetchTrip.mockResolvedValue({
      ...trip,
      ownerId: second.id,
      plan: [{id: 'd1', day: 1, date: at(9), title: 'Dạo hồ', imageUrl: '', cost: 120000}],
    });
    const user = userEvent.setup();
    renderWithProviders(<UserDetailsPage />, {route: `/admin/users/${second.id}`, path: '/admin/users/:id'});
    await screen.findByRole('heading', {level: 1, name: second.fullname});

    await user.click(screen.getByRole('tab', {name: t('admin.users.tabs.trips')}));
    expect(screen.getByText(t('admin.users.trips.phase.completed'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: t('admin.common.viewItem', {name: trip.nameTrip})}));

    const dialog = await screen.findByRole('dialog', {name: trip.nameTrip});
    expect(await within(dialog).findByText('Dạo hồ')).toBeInTheDocument();
    expect(fetchTrip).toHaveBeenCalledWith(trip.id);
    await user.click(within(dialog).getAllByRole('button', {name: t('common.close')})[0]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
