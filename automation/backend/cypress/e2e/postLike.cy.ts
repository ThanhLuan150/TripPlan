import {del, get, post, put, saveTrip, signIn} from '../support/api';

const like = (id: string, token?: string) => post(`/public-trip/${id}/like`, token);
const unlike = (id: string, token?: string) => del(`/public-trip/${id}/like`, token);
const detail = (id: string, token?: string) => get(`/public-trip/${id}`, token);
const MISSING = '64b0000000000000000000ff';

// a public trip is the post of the community
const publicPost = (token: string, name: string) =>
  saveTrip(token, name).then(({tripId}) =>
    put(`/trip-plan/${tripId}/visibility`, token, {visibility: 'public'}).then(res => {
      expect(res.status).to.eq(200);
      return tripId;
    }),
  );

describe('Like post', () => {
  it('requires sign-in', () => {
    signIn().then(({token}) => {
      publicPost(token, 'Like auth').then(id => {
        like(id).its('status').should('eq', 401);
        unlike(id).its('status').should('eq', 401);
        detail(id).its('body.likesCount').should('eq', 0);
      });
    });
  });

  it('likes a post, shows Liked and the total, and unlikes it', () => {
    signIn().then(({token}) => {
      signIn().then(reader => {
        publicPost(token, 'Like basic').then(id => {
          detail(id, reader.token).its('body').should('include', {liked: false, likesCount: 0});

          like(id, reader.token).then(res => {
            expect(res.status).to.eq(200);
            expect(res.body).to.include({liked: true, likesCount: 1});
          });
          detail(id, reader.token).its('body').should('include', {liked: true, likesCount: 1});
          // a visitor who is not signed in sees the total but never "liked"
          detail(id).its('body').should('include', {liked: false, likesCount: 1});

          unlike(id, reader.token).then(res => {
            expect(res.status).to.eq(200);
            expect(res.body).to.include({liked: false, likesCount: 0});
          });
          detail(id, reader.token).its('body').should('include', {liked: false, likesCount: 0});
        });
      });
    });
  });

  it('never creates a duplicate like, and unliking twice is harmless', () => {
    signIn().then(({token}) => {
      signIn().then(reader => {
        publicPost(token, 'Like duplicate').then(id => {
          like(id, reader.token).its('status').should('eq', 200);
          like(id, reader.token).then(res => {
            expect(res.status).to.eq(200);
            expect(res.body.likesCount).to.eq(1);
          });
          unlike(id, reader.token).its('status').should('eq', 200);
          unlike(id, reader.token).then(res => {
            expect(res.status).to.eq(200);
            expect(res.body).to.include({liked: false, likesCount: 0});
          });
        });
      });
    });
  });

  it('counts each user once and keeps the state per user', () => {
    signIn().then(({token}) => {
      signIn().then(first => {
        signIn().then(second => {
          publicPost(token, 'Like per user').then(id => {
            like(id, first.token);
            like(id, second.token).its('body.likesCount').should('eq', 2);
            unlike(id, second.token);
            detail(id, first.token).its('body').should('include', {liked: true, likesCount: 1});
            detail(id, second.token).its('body').should('include', {liked: false, likesCount: 1});
          });
        });
      });
    });
  });

  it('shows the like state in the public list', () => {
    signIn().then(({token}) => {
      signIn().then(reader => {
        publicPost(token, 'Like in list').then(id => {
          like(id, reader.token);
          get('/public-trip', reader.token, {limit: '50'}).then(res => {
            const card = res.body.items.find((item: any) => item._id === id);
            expect(card).to.include({liked: true, likesCount: 1});
          });
          get('/public-trip', undefined, {limit: '50'}).then(res => {
            const card = res.body.items.find((item: any) => item._id === id);
            expect(card).to.include({liked: false, likesCount: 1});
          });
        });
      });
    });
  });

  it('handles several requests at the same moment with a single like', () => {
    signIn().then(({token}) => {
      signIn().then(reader => {
        publicPost(token, 'Like parallel').then(id => {
          for (let i = 0; i < 5; i++) {
            like(id, reader.token).its('status').should('eq', 200);
          }
          detail(id, reader.token).its('body.likesCount').should('eq', 1);
        });
      });
    });
  });

  it('answers 404 for a private, deleted, unknown or malformed post', () => {
    signIn().then(({token}) => {
      saveTrip(token, 'Like private').then(({tripId}) => {
        // private by default
        like(tripId, token).its('status').should('eq', 404);
        unlike(tripId, token).its('status').should('eq', 404);
      });
      publicPost(token, 'Like deleted').then(id => {
        like(id, token).its('status').should('eq', 200);
        del(`/trip-plan/${id}`, token).its('status').should('eq', 200);
        like(id, token).its('status').should('eq', 404);
        // a like on a deleted post can still be cleaned up
        unlike(id, token).its('status').should('eq', 404);
      });
      like(MISSING, token).its('status').should('eq', 404);
      like('not-an-id', token).its('status').should('eq', 404);
      unlike('not-an-id', token).its('status').should('eq', 404);
    });
  });
});
