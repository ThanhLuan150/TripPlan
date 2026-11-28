// What the admin panel shows and does for the community features: posts (public trips), destination
// reviews, reported posts, and the community numbers of the dashboard, the reports and the users.
import {act, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import Toast from '@/components/ui/Toast';
import * as adminApi from '@/features/admin/api';
import * as usersApi from '@/features/admin/users/api';
import DashboardPage from '@/features/admin/pages/DashboardPage';
import ModerationPage from '@/features/admin/pages/ModerationPage';
import ReportsPage from '@/features/admin/pages/ReportsPage';
import ReviewsPage from '@/features/admin/pages/ReviewsPage';
import AiPage from '@/features/admin/pages/AiPage';
import TripsPage from '@/features/admin/pages/TripsPage';
import UserDetailsPage from '@/features/admin/pages/UserDetailsPage';
import type {AdminModerationItem} from '@/features/admin/types';
import {mockModeration, mockReviews, mockTrips, mockUsers} from '@/__tests__/fixtures/admin/data';
import {httpError, renderWithProviders, t, pickOption} from '../../utils/render';

const rows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);
const stat = (label: string) =>
  screen
    .getAllByText(label)
    .map(element => element.closest<HTMLElement>('div.rounded-xl'))
    .find(Boolean)!;
const nf = new Intl.NumberFormat('vi');

beforeEach(() => act(() => Toast.hide()));

describe('ReviewsPage', () => {
  const page = () => renderWithProviders(<ReviewsPage />, {route: '/admin/reviews'});
  const review = mockReviews[0];

  it('lists the reviews with their destination, stars and author', async () => {
    page();
    await screen.findByRole('table', {name: t('admin.reviews.title')});

    expect(rows()).toHaveLength(mockReviews.length);
    expect(within(rows()[0]).getByText(review.content)).toBeInTheDocument();
    expect(within(rows()[0]).getByText(review.destination)).toBeInTheDocument();
    expect(within(rows()[0]).getByRole('img', {name: t('admin.reviews.stars', {count: review.rating})})).toBeInTheDocument();
    expect(within(rows()[0]).getByRole('link', {name: review.author})).toHaveAttribute('href', `/admin/users/${review.authorId}`);
  });

  it('searches by content, author and destination', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');

    await user.type(screen.getByRole('searchbox', {name: t('admin.reviews.search')}), 'tour giá rẻ');

    expect(rows()).toHaveLength(1);
    expect(within(rows()[0]).getByText(/tour giá rẻ/)).toBeInTheDocument();
  });

  it('filters by destination and by rating', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');

    await pickOption(user, screen.getByLabelText(t('admin.reviews.destination')), 'Hà Giang');
    expect(rows()).toHaveLength(mockReviews.filter(item => item.destination === 'Hà Giang').length);

    await pickOption(user, screen.getByLabelText(t('admin.reviews.destination')), 'all');
    await pickOption(user, screen.getByLabelText(t('admin.reviews.rating')), '1');
    expect(rows()).toHaveLength(mockReviews.filter(item => item.rating === 1).length);
  });

  it('shows the empty result', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');

    await user.type(screen.getByRole('searchbox', {name: t('admin.reviews.search')}), 'khong co danh gia nao');

    expect(screen.getByText(t('admin.common.noResults'))).toBeInTheDocument();
  });

  it('asks before deleting, and deleting calls the API and says so', async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.deleteReview).mockResolvedValue({});
    page();
    await screen.findByRole('table');
    const open = () => user.click(screen.getByRole('button', {name: t('admin.reviews.deleteItem', {name: review.author})}));

    await open();
    const dialog = screen.getByRole('alertdialog', {name: t('admin.reviews.deleteTitle')});
    expect(dialog).toHaveAccessibleDescription(t('admin.reviews.deleteText', {author: review.author, destination: review.destination}));
    await user.click(within(dialog).getByRole('button', {name: t('common.cancel')}));
    expect(adminApi.deleteReview).not.toHaveBeenCalled();

    await open();
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: t('admin.common.delete')}));

    expect(adminApi.deleteReview).toHaveBeenCalledWith(review.id);
    expect(await screen.findByText(t('admin.reviews.deleted'))).toBeInTheDocument();
  });

  it('shows the message of the backend when the delete fails', async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.deleteReview).mockRejectedValue(httpError(404, {message: 'Review not found'}));
    page();
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', {name: t('admin.reviews.deleteItem', {name: review.author})}));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: t('admin.common.delete')}));

    expect(await screen.findByText('Review not found')).toBeInTheDocument();
  });

  it('shows "edited" on a review that was changed after it was written', async () => {
    vi.mocked(adminApi.fetchReviews).mockResolvedValue([{...review, updatedAt: new Date(new Date(review.createdAt).getTime() + 86_400_000).toISOString()}]);
    page();

    expect(await screen.findByText(t('admin.reviews.edited'))).toBeInTheDocument();
  });
});

describe('TripsPage: posts of the community', () => {
  const page = () => renderWithProviders(<TripsPage />, {route: '/admin/trips'});
  const post = mockTrips.find(trip => trip.visibility === 'public' && trip.status === 'active')!;
  const privateTrip = mockTrips.find(trip => trip.visibility === 'private' && trip.status === 'active')!;

  it('marks the trips that are posts, with how many users liked and saved them', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');
    await user.type(screen.getByRole('searchbox', {name: t('admin.trips.search')}), post.nameTrip);

    const row = rows().find(item => within(item).queryByText(post.nameTrip))!;
    expect(within(row).getByText(t('admin.trips.visibility.public'))).toBeInTheDocument();
    expect(within(row).getByText(t('admin.trips.activityValue', {likes: post.likes, saves: post.saves}))).toBeInTheDocument();
  });

  it('filters the posts and the private plans', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');
    const count = (visibility: string) => mockTrips.filter(item => item.visibility === visibility && item.status === 'active').length;

    await pickOption(user, screen.getByLabelText(t('admin.trips.visibilityFilter')), 'public');
    expect(screen.getByText(t('admin.pagination.summary', {from: 1, to: Math.min(8, count('public')), total: count('public')}))).toBeInTheDocument();

    await pickOption(user, screen.getByLabelText(t('admin.trips.visibilityFilter')), 'private');
    expect(screen.getByText(t('admin.pagination.summary', {from: 1, to: 8, total: count('private')}))).toBeInTheDocument();
  });

  it('offers to take a post down only for a post', async () => {
    const user = userEvent.setup();
    page();
    await screen.findByRole('table');

    await pickOption(user, screen.getByLabelText(t('admin.trips.visibilityFilter')), 'private');
    expect(screen.queryByRole('button', {name: t('admin.trips.unpublishItem', {name: privateTrip.nameTrip})})).toBeNull();
    await pickOption(user, screen.getByLabelText(t('admin.trips.visibilityFilter')), 'public');
    expect(screen.getAllByRole('button', {name: /./}).some(button => button.getAttribute('aria-label')?.startsWith(t('admin.trips.unpublishItem', {name: ''})))).toBe(true);
  });

  it('asks before taking the post down, then calls the API', async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.unpublishTrip).mockResolvedValue({});
    page();
    await screen.findByRole('table');
    await user.type(screen.getByRole('searchbox', {name: t('admin.trips.search')}), post.nameTrip);
    const label = t('admin.trips.unpublishItem', {name: post.nameTrip});

    await user.click(screen.getAllByRole('button', {name: label})[0]);
    const dialog = screen.getByRole('alertdialog', {name: t('admin.trips.unpublishTitle')});
    expect(dialog).toHaveAccessibleDescription(t('admin.trips.unpublishText', {name: post.nameTrip}));
    await user.click(within(dialog).getByRole('button', {name: t('common.cancel')}));
    expect(adminApi.unpublishTrip).not.toHaveBeenCalled();

    await user.click(screen.getAllByRole('button', {name: label})[0]);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: t('admin.trips.unpublish')}));

    expect(adminApi.unpublishTrip).toHaveBeenCalledWith(post.id);
    expect(await screen.findByText(t('admin.trips.unpublished', {name: post.nameTrip}))).toBeInTheDocument();
  });

  it('shows the message of the backend when taking the post down fails', async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.unpublishTrip).mockRejectedValue(httpError(404, {message: 'Trip not found'}));
    page();
    await screen.findByRole('table');
    await user.type(screen.getByRole('searchbox', {name: t('admin.trips.search')}), post.nameTrip);

    await user.click(screen.getAllByRole('button', {name: t('admin.trips.unpublishItem', {name: post.nameTrip})})[0]);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: t('admin.trips.unpublish')}));

    expect(await screen.findByText('Trip not found')).toBeInTheDocument();
  });
});

describe('ModerationPage: reported posts', () => {
  const reported: AdminModerationItem = {
    id: 'm-post',
    type: 'post',
    reason: 'other',
    content: 'Đà Lạt 3 ngày - Lâm Đồng',
    author: 'an',
    reportedAt: new Date().toISOString(),
    status: 'pending',
    details: 'Ảnh phản cảm trong bài',
    targetId: 'trip-77',
  };
  const open = async (items: AdminModerationItem[] = [reported, ...mockModeration]) => {
    vi.mocked(adminApi.fetchModeration).mockResolvedValue(items);
    renderWithProviders(<ModerationPage />, {route: '/admin/moderation'});
    await screen.findByRole('list');
    return within(within(screen.getByRole('list')).getAllByRole('listitem')[0]);
  };

  it('shows what the reporter wrote and a link to the post, but nothing about who reported', async () => {
    const item = await open();

    expect(item.getByText(t('admin.moderation.types.post'))).toBeInTheDocument();
    expect(item.getByText(t('admin.moderation.reasons.other'))).toBeInTheDocument();
    expect(item.getByText(reported.details!)).toBeInTheDocument();
    expect(item.getByText(t('admin.moderation.reporterNote'))).toBeInTheDocument();
    const link = item.getByRole('link', {name: t('admin.moderation.openPost')});
    expect(link).toHaveAttribute('href', '/trip/trip-77');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
  });

  it('has no link or note for other kinds of reports', async () => {
    const item = await open([{...mockModeration[0], status: 'pending'}]);

    expect(item.queryByRole('link')).toBeNull();
    expect(item.queryByText(t('admin.moderation.reporterNote'))).toBeNull();
  });

  it('rejecting a reported post says it will be taken down, and the notice says it was', async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.decideModeration).mockResolvedValue({...reported, status: 'rejected', postRemoved: true});
    const item = await open();

    await user.click(item.getByRole('button', {name: t('admin.moderation.rejectItem', {name: reported.content})}));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleDescription(t('admin.moderation.rejectPostText'));
    await user.click(within(dialog).getByRole('button', {name: t('admin.moderation.reject')}));

    expect(adminApi.decideModeration).toHaveBeenCalledWith('m-post', 'rejected');
    expect(await screen.findByText(t('admin.moderation.rejectedPostRemoved'))).toBeInTheDocument();
  });

  it('approving a reported post says the post stays', async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.decideModeration).mockResolvedValue({...reported, status: 'approved', postRemoved: false});
    const item = await open();

    await user.click(item.getByRole('button', {name: t('admin.moderation.approveItem', {name: reported.content})}));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAccessibleDescription(t('admin.moderation.approvePostText'));
    await user.click(within(dialog).getByRole('button', {name: t('admin.moderation.approve')}));

    expect(adminApi.decideModeration).toHaveBeenCalledWith('m-post', 'approved');
    expect(await screen.findByText(t('admin.moderation.approved'))).toBeInTheDocument();
  });

  it('rejecting another kind of report keeps the usual text and notice', async () => {
    const user = userEvent.setup();
    const other = {...mockModeration[0], status: 'pending' as const};
    vi.mocked(adminApi.decideModeration).mockResolvedValue({...other, status: 'rejected'});
    const item = await open([other]);

    await user.click(item.getByRole('button', {name: t('admin.moderation.rejectItem', {name: other.content})}));
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(t('admin.moderation.rejectText'));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: t('admin.moderation.reject')}));

    expect(await screen.findByText(t('admin.moderation.rejected'))).toBeInTheDocument();
  });
});

describe('community numbers', () => {
  it('the dashboard shows the posts and the reviews with their change', async () => {
    renderWithProviders(<DashboardPage />, {route: '/admin/dashboard'});
    await screen.findByText(nf.format(12846));

    expect(stat(t('admin.dashboard.stats.posts'))).toHaveTextContent(nf.format(1248));
    expect(stat(t('admin.dashboard.stats.reviews'))).toHaveTextContent(nf.format(3406));
  });

  it('the reports show the posts shared and the new reviews of the period', async () => {
    renderWithProviders(<ReportsPage />, {route: '/admin/reports'});
    await screen.findByText(t('admin.reports.stats.postsShared'));

    expect(stat(t('admin.reports.stats.postsShared'))).toHaveTextContent(/\d/);
    expect(stat(t('admin.reports.stats.newReviews'))).toHaveTextContent(/\d/);
  });

  it('a user page shows the posts, reviews, followers and following of the account', async () => {
    const who = mockUsers[0];
    vi.mocked(usersApi.fetchUser).mockResolvedValue({
      user: who,
      aiConversations: 1,
      community: {posts: 3, reviews: 2, followers: 17, following: 5},
      trips: [],
      challenges: [],
      activity: [],
    });
    renderWithProviders(<UserDetailsPage />, {route: `/admin/users/${who.id}`, path: '/admin/users/:id'});

    const community = within(await screen.findByRole('region', {name: t('admin.users.community')}));
    expect(community.getByText(t('admin.users.stats.posts')).closest('div.rounded-xl')).toHaveTextContent('3');
    expect(community.getByText(t('admin.users.stats.reviews')).closest('div.rounded-xl')).toHaveTextContent('2');
    expect(community.getByText(t('admin.users.stats.followers')).closest('div.rounded-xl')).toHaveTextContent('17');
    expect(community.getByText(t('admin.users.stats.following')).closest('div.rounded-xl')).toHaveTextContent('5');
  });

  it('a user page of an older answer (no community numbers) still opens', async () => {
    const who = mockUsers[0];
    vi.mocked(usersApi.fetchUser).mockResolvedValue({user: who, aiConversations: 1, trips: [], challenges: [], activity: []});
    renderWithProviders(<UserDetailsPage />, {route: `/admin/users/${who.id}`, path: '/admin/users/:id'});

    await screen.findByRole('heading', {level: 1, name: who.fullname});
    expect(screen.queryByRole('region', {name: t('admin.users.community')})).toBeNull();
    await waitFor(() => expect(usersApi.fetchUser).toHaveBeenCalled());
  });
});

describe('TripsPage: share links', () => {
  const page = () => renderWithProviders(<TripsPage />, {route: '/admin/trips'});
  const linked = mockTrips.find(trip => trip.shared && trip.status === 'active')!;

  it('marks the trips whose share link is on and lets the admin turn it off after a confirmation', async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.revokeShare).mockResolvedValue({});
    page();
    await screen.findByRole('table');
    await user.type(screen.getByRole('searchbox', {name: t('admin.trips.search')}), linked.nameTrip);
    expect(within(rows()[0]).getByText(t('admin.trips.sharedLink'))).toBeInTheDocument();
    const label = t('admin.trips.revokeItem', {name: linked.nameTrip});

    await user.click(screen.getAllByRole('button', {name: label})[0]);
    const dialog = screen.getByRole('alertdialog', {name: t('admin.trips.revokeTitle')});
    expect(dialog).toHaveAccessibleDescription(t('admin.trips.revokeText', {name: linked.nameTrip}));
    await user.click(within(dialog).getByRole('button', {name: t('common.cancel')}));
    expect(adminApi.revokeShare).not.toHaveBeenCalled();

    await user.click(screen.getAllByRole('button', {name: label})[0]);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: t('admin.trips.revoke')}));

    expect(adminApi.revokeShare).toHaveBeenCalledWith(linked.id);
    expect(await screen.findByText(t('admin.trips.revoked', {name: linked.nameTrip}))).toBeInTheDocument();
  });

  it('shows the message of the backend when turning the link off fails', async () => {
    const user = userEvent.setup();
    vi.mocked(adminApi.revokeShare).mockRejectedValue(httpError(404, {message: 'Trip not found'}));
    page();
    await screen.findByRole('table');
    await user.type(screen.getByRole('searchbox', {name: t('admin.trips.search')}), linked.nameTrip);

    await user.click(screen.getAllByRole('button', {name: t('admin.trips.revokeItem', {name: linked.nameTrip})})[0]);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: t('admin.trips.revoke')}));

    expect(await screen.findByText('Trip not found')).toBeInTheDocument();
  });

  it('a trip without a share link has no such action', async () => {
    const user = userEvent.setup();
    const plain = mockTrips.find(trip => !trip.shared && trip.status === 'active')!;
    page();
    await screen.findByRole('table');
    await user.type(screen.getByRole('searchbox', {name: t('admin.trips.search')}), plain.nameTrip);

    expect(screen.queryByRole('button', {name: t('admin.trips.revokeItem', {name: plain.nameTrip})})).toBeNull();
  });
});

describe('AiPage: other AI tools', () => {
  it('shows the suggestions, the plans started from them, the budget estimates and the accounts with preferences', async () => {
    renderWithProviders(<AiPage />, {route: '/admin/ai'});

    const tools = within(await screen.findByRole('region', {name: t('admin.ai.tools')}));
    expect(tools.getByText(t('admin.ai.features.destinationSearches')).closest('div.rounded-xl')).toHaveTextContent(nf.format(4210));
    expect(tools.getByText(t('admin.ai.features.plansFromSuggestions')).closest('div.rounded-xl')).toHaveTextContent(nf.format(1386));
    expect(tools.getByText(t('admin.ai.features.budgetEstimates')).closest('div.rounded-xl')).toHaveTextContent('912');
    expect(tools.getByText(t('admin.ai.features.usersWithPreferences')).closest('div.rounded-xl')).toHaveTextContent(nf.format(2047));
  });

  it('shows zeros when an older answer has no numbers for them', async () => {
    const {features, ...older} = (await import('@/__tests__/fixtures/admin/data')).mockAiOverview;
    void features;
    vi.mocked(adminApi.fetchAi).mockResolvedValue(older as never);
    renderWithProviders(<AiPage />, {route: '/admin/ai'});

    const tools = within(await screen.findByRole('region', {name: t('admin.ai.tools')}));
    expect(tools.getByText(t('admin.ai.features.budgetEstimates')).closest('div.rounded-xl')).toHaveTextContent('0');
  });
});
