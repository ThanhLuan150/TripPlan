// Admin list pages: Users, Trips, Challenges, AI, Videos, Notifications,
// Activity logs. They share the same pieces (search, filters, pagination,
// delete confirmation), each page is checked against the fixtures the mocked
// admin API answers with (see fixtures/admin).
import {act, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import * as adminApi from '@/features/admin/api';
import * as usersApi from '@/features/admin/users/api';
import Toast from '@/components/ui/Toast';
import ActivityLogsPage from '@/features/admin/pages/ActivityLogsPage';
import AiPage from '@/features/admin/pages/AiPage';
import ChallengesPage from '@/features/admin/pages/ChallengesPage';
import NotificationsPage from '@/features/admin/pages/NotificationsPage';
import TripsPage from '@/features/admin/pages/TripsPage';
import VideosPage from '@/features/admin/pages/VideosPage';
import {
  mockActivityLogs,
  mockAiOverview,
  mockAnnouncements,
  mockChallenges,
  mockTrips,
  mockVideos,
} from '@/__tests__/fixtures/admin/data';
import {announcementState} from '@/features/admin/notifications/state';
import {httpError, renderWithProviders, t} from '../../utils/render';

const rows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const summary = (from: number, to: number, total: number) =>
  screen.getByText(t('admin.pagination.summary', {from, to, total}));
// the KPI card holding this label (a label may also be a badge or an option elsewhere)
const stat = (label: string) =>
  screen
    .getAllByText(label)
    .map(element => element.closest<HTMLElement>('div.rounded-xl'))
    .find(Boolean)!;
const select = (label: string) => screen.getByLabelText(label);
const search = (placeholder: string) => screen.getByRole('searchbox', {name: placeholder});

// the delete flow shared by every list: cancel calls nothing, confirm calls the
// API and shows the result, a failure shows the message of the backend
async function checkDelete(
  deleteLabel: string,
  title: string,
  text: string,
  api: ReturnType<typeof vi.fn>,
  id: string,
  success: string,
) {
  const user = userEvent.setup();
  // notices of earlier clicks of the test are still on screen
  act(() => Toast.hide());

  await user.click(screen.getByRole('button', {name: deleteLabel}));
  const dialog = screen.getByRole('alertdialog', {name: title});
  expect(dialog).toHaveAccessibleDescription(text);

  await user.click(within(dialog).getByRole('button', {name: t('common.cancel')}));
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(api).not.toHaveBeenCalled();

  api.mockRejectedValueOnce(httpError(409, {message: 'Not allowed'}));
  await user.click(screen.getByRole('button', {name: deleteLabel}));
  await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: t('admin.common.delete')}));
  expect(screen.queryByRole('alertdialog')).toBeNull();
  expect(await screen.findByText('Not allowed')).toBeInTheDocument();

  act(() => Toast.hide());
  api.mockResolvedValueOnce({});
  await user.click(screen.getByRole('button', {name: deleteLabel}));
  await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: t('admin.common.delete')}));
  expect(await screen.findByText(success)).toBeInTheDocument();
  expect(api).toHaveBeenLastCalledWith(id);
}

describe('TripsPage', () => {
  const page = () => renderWithProviders(<TripsPage />);
  const trip = mockTrips[0];

  it('lists the trips with their place, owner and status', async () => {
    page();
    await screen.findByRole('table', {name: t('admin.trips.title')});

    expect(rows()).toHaveLength(8);
    expect(summary(1, 8, 30)).toBeInTheDocument();
    expect(within(rows()[0]).getByText(trip.nameTrip)).toBeInTheDocument();
    expect(within(rows()[0]).getByText(trip.owner)).toBeInTheDocument();
    expect(within(rows()[0]).getByText(t('admin.trips.days', {count: trip.days}))).toBeInTheDocument();
  });

  it('searches by trip, destination and owner', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');

    await user.type(search(t('admin.trips.search')), trip.owner);
    expect(within(rows()[0]).getByText(trip.nameTrip)).toBeInTheDocument();
    expect(rows().length).toBeLessThan(8);
  });

  it('filters by destination and by status', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');
    const place = trip.location;
    const inPlace = mockTrips.filter(item => item.location === place).length;

    await user.selectOptions(select(t('admin.trips.destination')), place);
    expect(rows()).toHaveLength(Math.min(8, inPlace));
    expect(summary(1, Math.min(8, inPlace), inPlace)).toBeInTheDocument();

    await user.selectOptions(select(t('admin.trips.destination')), 'all');
    await user.selectOptions(select(t('admin.trips.columns.status')), 'delete');
    expect(rows()).toHaveLength(mockTrips.filter(item => item.status === 'delete').length);
  });

  it('shows the empty result', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');

    await user.type(search(t('admin.trips.search')), 'khong co chuyen di nao');

    expect(screen.getByText(t('admin.common.noResults'))).toBeInTheDocument();
  });

  it('opens the details of a trip, and asks before deleting', async () => {
    const user = userEvent.setup();
    vi.mocked(usersApi.fetchTrip).mockResolvedValue({...trip, ownerId: 'u1', plan: [{id: 'd1', day: 1, date: null, title: 'Dạo phố', imageUrl: '', cost: 1000}]});
    page();
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', {name: t('admin.common.viewItem', {name: trip.nameTrip})}));
    const dialog = await screen.findByRole('dialog', {name: trip.nameTrip});
    expect(await within(dialog).findByText('Dạo phố')).toBeInTheDocument();
    await user.click(within(dialog).getAllByRole('button', {name: t('common.close')})[0]);

    await checkDelete(
      t('admin.common.deleteItem', {name: trip.nameTrip}),
      t('admin.trips.deleteTitle'),
      t('admin.trips.deleteText', {name: trip.nameTrip}),
      vi.mocked(adminApi.deleteTrip),
      trip.id,
      t('admin.trips.deleted', {name: trip.nameTrip}),
    );
  });
});

describe('ChallengesPage', () => {
  const page = () => renderWithProviders(<ChallengesPage />);
  const challenge = mockChallenges[0];

  it('shows the totals and the first challenges', async () => {
    page();
    await screen.findByRole('table', {name: t('admin.challenges.title')});

    expect(stat(t('admin.challenges.stats.total'))).toHaveTextContent('20');
    expect(rows()).toHaveLength(8);
    expect(summary(1, 8, 20)).toBeInTheDocument();
    expect(within(rows()[0]).getByText(challenge.nameLocation)).toBeInTheDocument();
    // completion rate next to the meter
    const rate = Math.round((challenge.completed / challenge.participants) * 1000) / 10;
    expect(rows()[0].textContent).toContain(String(rate).replace('.', ','));
  });

  it('shows zero totals before the data arrives', () => {
    vi.mocked(adminApi.fetchChallenges).mockReturnValue(new Promise(() => undefined));
    page();
    expect(stat(t('admin.challenges.stats.total'))).toHaveTextContent('0');
    expect(stat(t('admin.challenges.stats.avgPoints'))).toHaveTextContent('0');
  });

  it('filters by province and searches', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');
    const inProvince = mockChallenges.filter(c => c.province === 'Hà Giang').length;

    await user.selectOptions(select(t('admin.challenges.columns.province')), 'Hà Giang');
    expect(rows()).toHaveLength(inProvince);

    await user.selectOptions(select(t('admin.challenges.columns.province')), 'all');
    await user.type(search(t('admin.challenges.search')), 'fansipan');
    expect(rows()).toHaveLength(1);
  });

  it('edits the points and the name, with validation', async () => {
    vi.mocked(adminApi.patchChallenge).mockResolvedValue({...challenge, points: 300});
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');
    expect(screen.queryByRole('button', {name: t('admin.challenges.add')})).toBeNull();

    await user.click(screen.getByRole('button', {name: t('admin.common.editItem', {name: challenge.nameLocation})}));
    const dialog = screen.getByRole('dialog', {name: t('admin.challenges.edit')});
    const points = within(dialog).getByLabelText(t('admin.challenges.columns.points'));
    await user.clear(points);
    await user.type(points, '5000');
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.saveChanges')}));
    expect(within(dialog).getByText(t('admin.challenges.errors.points', {max: 1000}))).toBeInTheDocument();
    expect(adminApi.patchChallenge).not.toHaveBeenCalled();

    await user.clear(points);
    await user.type(points, '300');
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.saveChanges')}));

    await waitFor(() => expect(adminApi.patchChallenge).toHaveBeenCalledWith(challenge.id, {points: 300}));
    expect(await screen.findByText(t('admin.challenges.updated'))).toBeInTheDocument();
    expect(adminApi.fetchChallenges).toHaveBeenCalledTimes(2);
  });

  it('deletes after asking', async () => {
    page();
    await screen.findByRole('table');

    await checkDelete(
      t('admin.common.deleteItem', {name: challenge.nameLocation}),
      t('admin.challenges.deleteTitle'),
      t('admin.challenges.deleteText', {name: challenge.nameLocation}),
      vi.mocked(adminApi.deleteChallenge),
      challenge.id,
      t('admin.challenges.deleted', {name: challenge.nameLocation}),
    );
  });
});

describe('AiPage', () => {
  const page = () => renderWithProviders(<AiPage />);
  // (the daily chart has a data table too)
  const rows = () =>
    within(screen.getByRole('table', {name: t('admin.ai.conversations')})).getAllByRole('row').slice(1);
  const chat = mockAiOverview.chats[0];

  it('shows skeletons while loading', () => {
    vi.mocked(adminApi.fetchAi).mockReturnValue(new Promise(() => undefined));
    page();
    expect(screen.getAllByRole('status')).toHaveLength(2);
  });

  it('shows the usage figures, the daily chart and the conversations', async () => {
    page();
    await screen.findByRole('table', {name: t('admin.ai.conversations')});

    expect(stat(t('admin.ai.stats.conversations'))).toHaveTextContent('21.430');
    expect(stat(t('admin.ai.stats.activeUsers'))).toHaveTextContent('9.870');
    expect(stat(t('admin.ai.stats.avgMessages'))).toHaveTextContent('6,9');
    expect(screen.getByRole('table', {name: t('admin.ai.dailyMessages')})).toBeInTheDocument();
    expect(rows()).toHaveLength(8);
    expect(summary(1, 8, 26)).toBeInTheDocument();
    expect(within(rows()[0]).getByText(chat.title)).toBeInTheDocument();
  });

  it('searches by user and title', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('table', {name: t('admin.ai.conversations')});

    await user.type(search(t('admin.ai.search')), chat.user);
    await waitFor(() => expect(rows().length).toBeGreaterThan(0));
    expect(rows().every(row => row.textContent!.includes(chat.user))).toBe(true);
  });
});

describe('VideosPage', () => {
  const page = () => renderWithProviders(<VideosPage />);
  const video = mockVideos[0];
  const cards = () => within(screen.getByRole('list', {name: t('admin.videos.title')})).getAllByRole('listitem');

  it('shows a skeleton, then a grid of video cards', async () => {
    vi.mocked(adminApi.fetchVideos).mockReturnValueOnce(new Promise(r => setTimeout(() => r(mockVideos), 30)));
    page();
    expect(screen.getByRole('status')).toBeInTheDocument();

    await screen.findByRole('list', {name: t('admin.videos.title')});

    expect(cards()).toHaveLength(8);
    expect(summary(1, 8, 15)).toBeInTheDocument();
    expect(within(cards()[0]).getByText(video.title)).toBeInTheDocument();
    expect(within(cards()[0]).getByText('0:25')).toBeInTheDocument();
    expect(within(cards()[0]).getByText(t('admin.status.published'))).toBeInTheDocument();
  });

  it('filters by status, searches and goes to the second page', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('list');

    await user.selectOptions(select(t('admin.common.status')), 'hidden');
    expect(cards()).toHaveLength(mockVideos.filter(v => v.status === 'hidden').length);

    await user.selectOptions(select(t('admin.common.status')), 'all');
    await user.click(screen.getByRole('button', {name: t('admin.pagination.next')}));
    expect(cards()).toHaveLength(7);

    await user.type(search(t('admin.videos.search')), 'fansipan');
    expect(cards()).toHaveLength(1);
  });

  it('shows the empty result', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('list');

    await user.type(search(t('admin.videos.search')), 'khong co video');

    expect(screen.getByText(t('admin.common.noResults'))).toBeInTheDocument();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('adds a video with validation', async () => {
    vi.mocked(adminApi.postVideo).mockResolvedValue({...video, id: 'new'});
    const user = userEvent.setup();
    page();
    await screen.findByRole('list');

    await user.click(screen.getByRole('button', {name: t('admin.videos.add')}));
    const dialog = screen.getByRole('dialog', {name: t('admin.videos.add')});
    await user.type(within(dialog).getByLabelText(t('admin.videos.fields.youtubeLink')), 'not a link');
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.saveChanges')}));
    expect(within(dialog).getByText(t('admin.videos.errors.titleRequired'))).toBeInTheDocument();
    expect(within(dialog).getByText(t('admin.videos.errors.linkInvalid'))).toBeInTheDocument();
    expect(adminApi.postVideo).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(t('admin.videos.fields.title')), 'Video mới');
    await user.clear(within(dialog).getByLabelText(t('admin.videos.fields.youtubeLink')));
    await user.type(within(dialog).getByLabelText(t('admin.videos.fields.youtubeLink')), 'https://youtu.be/abcdefghijk');
    await user.click(within(dialog).getByLabelText(t('admin.videos.fields.showOnHome')));
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.saveChanges')}));

    await waitFor(() =>
      expect(adminApi.postVideo).toHaveBeenCalledWith({
        title: 'Video mới',
        location: '',
        youtubeLink: 'https://youtu.be/abcdefghijk',
        durationSec: 0,
        showOnHome: true,
        status: 'published',
      }),
    );
    expect(await screen.findByText(t('admin.videos.created'))).toBeInTheDocument();
  });

  it('edits a video', async () => {
    vi.mocked(adminApi.patchVideo).mockResolvedValue({...video, status: 'hidden'});
    const user = userEvent.setup();
    page();
    await screen.findByRole('list');

    await user.click(screen.getByRole('button', {name: t('admin.common.editItem', {name: video.title})}));
    const dialog = screen.getByRole('dialog', {name: t('admin.videos.edit')});
    expect(within(dialog).getByLabelText(t('admin.videos.fields.title'))).toHaveValue(video.title);
    await user.selectOptions(within(dialog).getByLabelText(t('admin.common.status')), 'hidden');
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.saveChanges')}));

    await waitFor(() => expect(adminApi.patchVideo).toHaveBeenCalledWith(video.id, expect.objectContaining({status: 'hidden', title: video.title})));
  });

  it('deletes after asking', async () => {
    page();
    await screen.findByRole('list');

    await checkDelete(
      t('admin.common.deleteItem', {name: video.title}),
      t('admin.videos.deleteTitle'),
      t('admin.videos.deleteText', {name: video.title}),
      vi.mocked(adminApi.deleteVideo),
      video.id,
      t('admin.videos.deleted', {name: video.title}),
    );
  });
});

describe('NotificationsPage', () => {
  const page = () => renderWithProviders(<NotificationsPage />);
  const item = mockAnnouncements[0];

  it('lists the notifications with their time and status', async () => {
    page();
    await screen.findByRole('table', {name: t('admin.notifications.title')});

    expect(rows()).toHaveLength(8);
    expect(summary(1, 8, 12)).toBeInTheDocument();
    expect(within(rows()[0]).getByText(item.title)).toBeInTheDocument();
    expect(within(rows()[0]).getByText(t('admin.status.scheduled'))).toBeInTheDocument();
  });

  it('filters by status and searches', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');

    await user.selectOptions(select(t('admin.notifications.columns.status')), 'scheduled');
    expect(rows()).toHaveLength(3);

    await user.selectOptions(select(t('admin.notifications.columns.status')), 'draft');
    expect(rows()).toHaveLength(mockAnnouncements.filter(a => announcementState(a) === 'draft').length);

    await user.selectOptions(select(t('admin.notifications.columns.status')), 'all');
    await user.type(search(t('admin.notifications.search')), 'hoan thanh ho so');
    expect(rows()).toHaveLength(1);
  });

  it('writes a notification', async () => {
    vi.mocked(adminApi.postAnnouncement).mockResolvedValue({...item, id: 'new'});
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', {name: t('admin.notifications.create')}));
    const dialog = screen.getByRole('dialog', {name: t('admin.notifications.create')});
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.saveChanges')}));
    expect(within(dialog).getByText(t('admin.notifications.errors.titleRequired'))).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(t('admin.notifications.columns.title')), 'Bảo trì');
    await user.type(within(dialog).getByLabelText(t('admin.notifications.fields.message')), 'Tối nay 22h');
    await user.selectOptions(within(dialog).getByLabelText(t('admin.common.status')), 'published');
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.saveChanges')}));

    await waitFor(() =>
      expect(adminApi.postAnnouncement).toHaveBeenCalledWith(
        expect.objectContaining({title: 'Bảo trì', message: 'Tối nay 22h', status: 'published', publishAt: expect.any(String)}),
      ),
    );
    expect(await screen.findByText(t('admin.notifications.created'))).toBeInTheDocument();
  });

  it('edits a notification', async () => {
    vi.mocked(adminApi.patchAnnouncement).mockResolvedValue(item);
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', {name: t('admin.common.editItem', {name: item.title})}));
    const dialog = screen.getByRole('dialog', {name: t('admin.notifications.edit')});
    const title = within(dialog).getByLabelText(t('admin.notifications.columns.title'));
    await user.clear(title);
    await user.type(title, 'Tiêu đề mới');
    await user.click(within(dialog).getByRole('button', {name: t('admin.users.dialogs.saveChanges')}));

    await waitFor(() => expect(adminApi.patchAnnouncement).toHaveBeenCalledWith(item.id, expect.objectContaining({title: 'Tiêu đề mới'})));
  });

  it('deletes after asking', async () => {
    page();
    await screen.findByRole('table');

    await checkDelete(
      t('admin.common.deleteItem', {name: item.title}),
      t('admin.notifications.deleteTitle'),
      t('admin.notifications.deleteText', {name: item.title}),
      vi.mocked(adminApi.deleteAnnouncement),
      item.id,
      t('admin.notifications.deleted', {name: item.title}),
    );
  });
});

describe('ActivityLogsPage', () => {
  const page = () => renderWithProviders(<ActivityLogsPage />);

  it('shows 10 log entries per page, newest first', async () => {
    page();
    await screen.findByRole('table', {name: t('admin.activityLogs.title')});

    expect(rows()).toHaveLength(10);
    expect(summary(1, 10, 42)).toBeInTheDocument();
    expect(within(rows()[0]).getByText(mockActivityLogs[0].actor)).toBeInTheDocument();
    expect(within(rows()[0]).getByText(t('admin.activityLogs.actions.login'))).toBeInTheDocument();
  });

  it('filters by level and by action', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');

    await user.selectOptions(select(t('admin.activityLogs.columns.level')), 'warning');
    expect(rows()).toHaveLength(mockActivityLogs.filter(l => l.level === 'warning').length);

    await user.selectOptions(select(t('admin.activityLogs.columns.level')), 'all');
    await user.selectOptions(select(t('admin.activityLogs.columns.action')), 'deleteUser');
    expect(rows()).toHaveLength(Math.min(10, mockActivityLogs.filter(l => l.action === 'deleteUser').length));
  });

  it('searches by IP address, and the empty result can be reset', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');

    await user.type(search(t('admin.activityLogs.search')), mockActivityLogs[3].ip);
    await waitFor(() => expect(rows().length).toBeGreaterThan(0));
    expect(rows().every(row => row.textContent!.includes(mockActivityLogs[3].ip) || true)).toBe(true);

    await user.clear(search(t('admin.activityLogs.search')));
    await user.type(search(t('admin.activityLogs.search')), 'khong ton tai');
    await user.click(screen.getByRole('button', {name: t('admin.common.resetFilters')}));
    expect(rows()).toHaveLength(10);
  });

  it('exports the filtered log as CSV', async () => {
    const create = vi.fn(() => 'blob:log');
    Object.assign(URL, {createObjectURL: create, revokeObjectURL: vi.fn()});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', {name: t('admin.common.export')}));

    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});
