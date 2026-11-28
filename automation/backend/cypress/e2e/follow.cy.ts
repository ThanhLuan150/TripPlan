import {del, get, post, signIn, update} from '../support/api';

const profile = (id: string, token?: string) => get(`/user/${id}/profile`, token);
const follow = (id: string, token?: string) => post(`/user/${id}/follow`, token);
const unfollow = (id: string, token?: string) => del(`/user/${id}/follow`, token);
const MISSING = '64b0000000000000000000ff';

describe('Follow user', () => {
  it('requires sign-in', () => {
    signIn().then(({user}) => {
      profile(user.id).its('status').should('eq', 401);
      follow(user.id).its('status').should('eq', 401);
      unfollow(user.id).its('status').should('eq', 401);
    });
  });

  it('follows an account, shows Following and updates the followers count', () => {
    signIn().then(({token}) => {
      signIn().then(({user: target}) => {
        profile(target.id, token).then(res => {
          expect(res.status).to.eq(200);
          expect(res.body.user).to.include({following: false, followersCount: 0, isSelf: false});
          // nothing private is exposed
          expect(res.body.user).not.to.have.property('email');
        });

        follow(target.id, token).then(res => {
          expect(res.status).to.eq(200);
          expect(res.body).to.include({following: true, followersCount: 1});
        });
        profile(target.id, token).its('body.user').should('include', {following: true, followersCount: 1});
      });
    });
  });

  it('counts each follower once and keeps the relation per account', () => {
    signIn().then(({user: target}) => {
      signIn().then(({token: first}) => {
        signIn().then(({token: second}) => {
          follow(target.id, first);
          follow(target.id, second);
          profile(target.id, first).its('body.user.followersCount').should('eq', 2);
          // each follower sees only their own state
          unfollow(target.id, second);
          profile(target.id, first).its('body.user').should('include', {following: true, followersCount: 1});
          profile(target.id, second).its('body.user').should('include', {following: false, followersCount: 1});
        });
      });
    });
  });

  it('does not create a duplicate relation', () => {
    signIn().then(({token}) => {
      signIn().then(({user: target}) => {
        follow(target.id, token).its('status').should('eq', 200);
        follow(target.id, token).then(res => {
          expect(res.status).to.eq(200);
          expect(res.body.followersCount).to.eq(1);
        });
        profile(target.id, token).its('body.user.followersCount').should('eq', 1);
      });
    });
  });

  it('unfollows and updates the count (and unfollowing again is harmless)', () => {
    signIn().then(({token}) => {
      signIn().then(({user: target}) => {
        follow(target.id, token);
        unfollow(target.id, token).then(res => {
          expect(res.status).to.eq(200);
          expect(res.body).to.include({following: false, followersCount: 0});
        });
        unfollow(target.id, token).its('status').should('eq', 200);
        profile(target.id, token).its('body.user').should('include', {following: false, followersCount: 0});
      });
    });
  });

  it('returns your own profile with your followers at /user/me/profile', () => {
    signIn().then(({token, user}) => {
      signIn().then(({token: fan}) => {
        follow(user.id, fan);
        profile('me', token).its('body.user').should('include', {id: user.id, isSelf: true, followersCount: 1});
      });
    });
  });

  it('refuses to follow yourself', () => {
    signIn().then(({token, user}) => {
      follow(user.id, token).its('status').should('eq', 400);
      profile(user.id, token).its('body.user').should('include', {isSelf: true, followersCount: 0});
    });
  });

  it('answers 404 for accounts that do not exist or are deleted, and for a malformed id', () => {
    signIn().then(({token}) => {
      signIn().then(({user: gone}) => {
        update(gone.id, {isActive: 'delete'});
        [MISSING, gone.id, 'not-an-id'].forEach(id => {
          follow(id, token).its('status').should('eq', 404);
          profile(id, token).its('status').should('eq', 404);
        });
      });
    });
  });

  it('answers 403 for a suspended account and nothing is stored', () => {
    signIn().then(({token}) => {
      signIn().then(({user: blocked}) => {
        update(blocked.id, {isActive: 'suspended'});
        follow(blocked.id, token).its('status').should('eq', 403);
        profile(blocked.id, token).its('status').should('eq', 403);
        // once restored the account has no follower
        update(blocked.id, {isActive: 'active'});
        profile(blocked.id, token).its('body.user.followersCount').should('eq', 0);
      });
    });
  });

  it('always follows as the signed-in user, whatever the client sends', () => {
    signIn().then(({token: caller, user: callerUser}) => {
      signIn().then(({user: target}) => {
        signIn().then(({user: other}) => {
          post(`/user/${target.id}/follow`, caller, {followerId: other.id, userId: other.id}).its('status').should('eq', 200);
          profile(target.id, caller).its('body.user.following').should('eq', true);
          expect(callerUser.id).not.to.eq(other.id);
        });
      });
    });
  });
});
