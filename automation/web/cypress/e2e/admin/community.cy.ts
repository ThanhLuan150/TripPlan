import {mockReviews, mockTrips} from '@/__tests__/fixtures/admin/data';
import type {AdminModerationItem} from '@/features/admin/types';
import {bodyRows, openAdmin} from '../../support/admin';
import {expectCall, expectNoCall, reply, t} from '../../support/helpers';

const post = mockTrips.find(trip => trip.visibility === 'public' && trip.status === 'active')!;
const review = mockReviews[0];
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
const items = () => cy.findByRole('main').findAllByRole('listitem');

describe('admin: reviews', () => {
  it('lists the destination reviews with their stars and author', () => {
    openAdmin('/admin/reviews');

    cy.findByRole('table', {name: t('admin.reviews.title')}).should('be.visible');
    bodyRows().should('have.length', mockReviews.length);
    bodyRows().first().should('contain.text', review.content).and('contain.text', review.destination);
    cy.findByRole('link', {name: new RegExp(review.author)}).should('have.attr', 'href', `/admin/users/${review.authorId}`);
  });

  it('searches, filters by destination and by rating, and says when nothing matches', () => {
    openAdmin('/admin/reviews');
    bodyRows().should('have.length', mockReviews.length);

    cy.findByLabelText(t('admin.reviews.rating')).pick('1');
    bodyRows().should('have.length', mockReviews.filter(item => item.rating === 1).length);
    cy.findByLabelText(t('admin.reviews.rating')).pick('all');
    cy.findByLabelText(t('admin.reviews.destination')).pick('Hà Giang');
    bodyRows().should('have.length', mockReviews.filter(item => item.destination === 'Hà Giang').length);

    cy.findByRole('searchbox', {name: t('admin.reviews.search')}).type('khong co danh gia nao');
    cy.findByText(t('admin.common.noResults')).should('be.visible');
  });

  it('asks before deleting a review, then deletes it', () => {
    const calls = openAdmin('/admin/reviews', {[`DELETE /admin/reviews/${review.id}`]: {message: 'Delete review successfully'}});
    const open = () => cy.findByRole('button', {name: t('admin.reviews.deleteItem', {name: review.author})});

    open().click();
    cy.findByRole('alertdialog', {name: t('admin.reviews.deleteTitle')}).findByRole('button', {name: t('common.cancel')}).click();
    expectNoCall(calls, 'DELETE');

    open().click();
    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.common.delete')}).click();

    cy.findByText(t('admin.reviews.deleted')).should('be.visible');
    expectCall(calls, 'DELETE', `/admin/reviews/${review.id}`);
  });

  it('shows the message of the backend when the delete fails', () => {
    openAdmin('/admin/reviews', {[`DELETE /admin/reviews/${review.id}`]: reply(404, {message: 'Review not found'})});

    cy.findByRole('button', {name: t('admin.reviews.deleteItem', {name: review.author})}).click();
    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.common.delete')}).click();

    cy.findByText('Review not found').should('be.visible');
  });

  it('has its entry in the menu', () => {
    openAdmin('/admin/dashboard');

    cy.findByRole('navigation', {name: t('admin.nav.label')}).findByRole('link', {name: t('admin.nav.reviews')}).click();

    cy.location('pathname').should('eq', '/admin/reviews');
  });
});

describe('admin: posts of the community', () => {
  it('marks the posts in the trip list with their likes and saves, and filters them', () => {
    openAdmin('/admin/trips');
    cy.findByRole('searchbox', {name: t('admin.trips.search')}).type(post.nameTrip);

    bodyRows().first().should('contain.text', t('admin.trips.visibility.public')).and('contain.text', t('admin.trips.activityValue', {likes: post.likes ?? 0, saves: post.saves ?? 0}));
    cy.findByRole('searchbox', {name: t('admin.trips.search')}).clear();
    cy.findByLabelText(t('admin.trips.visibilityFilter')).pick('public');
    const total = mockTrips.filter(trip => trip.visibility === 'public').length;
    cy.findByText(t('admin.pagination.summary', {from: 1, to: Math.min(8, total), total})).should('be.visible');
  });

  it('asks before taking a post down, then takes it down', () => {
    const calls = openAdmin('/admin/trips', {[`POST /admin/trips/${post.id}/unpublish`]: {message: 'Post removed'}});
    cy.findByRole('searchbox', {name: t('admin.trips.search')}).type(post.nameTrip);
    const open = () => cy.findAllByRole('button', {name: t('admin.trips.unpublishItem', {name: post.nameTrip})}).first();

    open().click();
    cy.findByRole('alertdialog', {name: t('admin.trips.unpublishTitle')}).findByRole('button', {name: t('common.cancel')}).click();
    expectNoCall(calls, 'POST', `/admin/trips/${post.id}/unpublish`);

    open().click();
    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.trips.unpublish')}).click();

    cy.findByText(t('admin.trips.unpublished', {name: post.nameTrip})).should('be.visible');
    expectCall(calls, 'POST', `/admin/trips/${post.id}/unpublish`);
  });

  it('shows a reported post with the reporter\'s note and a link, and rejecting it says the post was taken down', () => {
    const calls = openAdmin('/admin/moderation', {
      'GET /admin/moderation': [reported],
      'PATCH /admin/moderation/m-post': {...reported, status: 'rejected', postRemoved: true},
    });

    items().first().should('contain.text', t('admin.moderation.types.post')).and('contain.text', reported.details!);
    items().first().findByRole('link', {name: t('admin.moderation.openPost')}).should('have.attr', 'href', '/trip/trip-77').and('have.attr', 'target', '_blank');
    cy.findByRole('button', {name: t('admin.moderation.rejectItem', {name: reported.content})}).click();
    cy.findByRole('alertdialog').should('contain.text', t('admin.moderation.rejectPostText')).findByRole('button', {name: t('admin.moderation.reject')}).click();

    cy.findByText(t('admin.moderation.rejectedPostRemoved')).should('be.visible');
    expectCall(calls, 'PATCH', '/admin/moderation/m-post').its('body').should('deep.equal', {status: 'rejected'});
  });

  it('approving a reported post says it stays', () => {
    openAdmin('/admin/moderation', {
      'GET /admin/moderation': [reported],
      'PATCH /admin/moderation/m-post': {...reported, status: 'approved', postRemoved: false},
    });

    cy.findByRole('button', {name: t('admin.moderation.approveItem', {name: reported.content})}).click();
    cy.findByRole('alertdialog').should('contain.text', t('admin.moderation.approvePostText')).findByRole('button', {name: t('admin.moderation.approve')}).click();

    cy.findByText(t('admin.moderation.approved')).should('be.visible');
  });
});

describe('admin: community numbers', () => {
  it('the dashboard shows the posts and the reviews', () => {
    openAdmin('/admin/dashboard');

    cy.findByText(t('admin.dashboard.stats.posts')).should('be.visible');
    cy.findByText(t('admin.dashboard.stats.reviews')).should('be.visible');
  });

  it('the reports show the posts shared and the new reviews', () => {
    openAdmin('/admin/reports');

    cy.findByText(t('admin.reports.stats.postsShared')).should('be.visible');
    cy.findByText(t('admin.reports.stats.newReviews')).should('be.visible');
  });
});

describe('admin: share links and AI tools', () => {
  const linked = mockTrips.find(trip => trip.shared && trip.status === 'active')!;

  it('marks the trips with a share link on and turns the link off after a confirmation', () => {
    const calls = openAdmin('/admin/trips', {[`DELETE /admin/trips/${linked.id}/share`]: {message: 'Sharing turned off'}});
    cy.findByRole('searchbox', {name: t('admin.trips.search')}).type(linked.nameTrip);
    bodyRows().first().should('contain.text', t('admin.trips.sharedLink'));
    const open = () => cy.findAllByRole('button', {name: t('admin.trips.revokeItem', {name: linked.nameTrip})}).first();

    open().click();
    cy.findByRole('alertdialog', {name: t('admin.trips.revokeTitle')}).findByRole('button', {name: t('common.cancel')}).click();
    expectNoCall(calls, 'DELETE');

    open().click();
    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.trips.revoke')}).click();

    cy.findByText(t('admin.trips.revoked', {name: linked.nameTrip})).should('be.visible');
    expectCall(calls, 'DELETE', `/admin/trips/${linked.id}/share`);
  });

  it('the AI page shows the other AI tools', () => {
    openAdmin('/admin/ai');

    cy.findByRole('region', {name: t('admin.ai.tools')}).should('be.visible').and('contain.text', t('admin.ai.features.budgetEstimates'));
  });
});
