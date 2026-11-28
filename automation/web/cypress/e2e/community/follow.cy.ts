import {ranking} from '../../support/fixtures';
import {expectCall, expectNoCall, mockApi, reply, signIn, t, visit} from '../../support/helpers';

const profile = (extra: Record<string, unknown> = {}) => ({
  user: {id: 'u2', fullname: 'Cúc', image: 'http://img.e2e/2', experience: 640, isSelf: false, following: false, followersCount: 4, followingCount: 1, ...extra},
});
const followersCount = () => cy.findByTestId('followers-count');

describe('follow a user', () => {
  beforeEach(() => {
    signIn();
  });

  it('is reached from the ranking', () => {
    mockApi({'GET /rankings/rankingUserHighest': {dataRanks: ranking}, 'GET /user/u2/profile': profile()});
    visit('/ranking');

    cy.findAllByRole('link', {name: 'Cúc'}).last().click();

    cy.location('pathname').should('eq', '/user/u2');
    followersCount().should('contain.text', '4');
  });

  it('opens the profile from the avatar too', () => {
    mockApi({'GET /rankings/rankingUserHighest': {dataRanks: ranking}, 'GET /user/u2/profile': profile()});
    visit('/ranking');

    cy.findAllByRole('link', {name: 'Cúc'}).first().click();

    cy.location('pathname').should('eq', '/user/u2');
  });

  it('follows, shows Following and updates the followers count', () => {
    const calls = mockApi({
      'GET /user/u2/profile': profile(),
      'POST /user/u2/follow': {message: 'Followed', following: true, followersCount: 5, followingCount: 1},
    });
    visit('/user/u2');

    cy.findByRole('button', {name: t('community.follow')}).click();

    expectCall(calls, 'POST', '/user/u2/follow');
    cy.findByRole('button', {name: t('community.unfollow')}).should('be.visible');
    cy.findByRole('button', {name: t('community.follow')}).should('not.exist');
    followersCount().should('contain.text', '5');
  });

  it('unfollows an account that is already followed', () => {
    const calls = mockApi({
      'GET /user/u2/profile': profile({following: true, followersCount: 5}),
      'DELETE /user/u2/follow': {message: 'Unfollowed', following: false, followersCount: 4, followingCount: 1},
    });
    visit('/user/u2');

    cy.findByRole('button', {name: t('community.unfollow')}).click();

    expectCall(calls, 'DELETE', '/user/u2/follow');
    cy.findByRole('button', {name: t('community.follow')}).should('be.visible');
    followersCount().should('contain.text', '4');
  });

  it('opens your own Profile page, with your followers, when the profile is yours', () => {
    const calls = mockApi({'GET /user/u2/profile': profile({isSelf: true}), 'GET /user/me/profile': profile({isSelf: true, followersCount: 9})});
    visit('/user/u2');

    cy.location('pathname').should('eq', '/profile');
    followersCount().should('contain.text', '9');
    cy.findByRole('button', {name: t('community.follow')}).should('not.exist');
    expectNoCall(calls, 'POST');
  });

  it('keeps the Follow button and explains a blocked account', () => {
    mockApi({
      'GET /user/u2/profile': profile(),
      'POST /user/u2/follow': reply(403, {message: 'This account is suspended'}),
    });
    visit('/user/u2');

    cy.findByRole('button', {name: t('community.follow')}).click();

    cy.findByText(t('community.blocked')).should('be.visible');
    cy.findByRole('button', {name: t('community.follow')}).should('be.visible');
    followersCount().should('contain.text', '4');
  });

  it('says so when the account does not exist', () => {
    mockApi({'GET /user/u2/profile': reply(404, {message: 'User not found'})});
    visit('/user/u2');

    cy.findByText(t('community.notFound')).should('be.visible');
    cy.findByRole('button', {name: t('community.follow')}).should('not.exist');
  });
});
