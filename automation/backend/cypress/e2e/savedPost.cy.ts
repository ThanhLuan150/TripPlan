import {del, get, post, put, saveTrip, signIn} from '../support/api';

const save = (id: string, token?: string) => post(`/public-trip/${id}/save`, token);
const unsave = (id: string, token?: string) => del(`/public-trip/${id}/save`, token);
const saved = (token?: string, query: Record<string, string> = {}) => get('/user/saved-posts', token, query);
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

const idsOf = (res: Cypress.Response<any>) => res.body.items.map((item: any) => item._id);

describe('Save post', () => {
  it('requires sign-in for save, unsave and the saved list', () => {
    signIn().then(({token}) => {
      publicPost(token, 'Save auth').then(id => {
        save(id).its('status').should('eq', 401);
        unsave(id).its('status').should('eq', 401);
        saved().its('status').should('eq', 401);
        save(id, 'not-a-token').its('status').should('eq', 401);
      });
    });
  });

  it('saves a post, lists it, shows the saved state, and unsaves it', () => {
    signIn().then(({token}) => {
      signIn().then(reader => {
        publicPost(token, 'Save basic').then(id => {
          detail(id, reader.token).its('body.saved').should('eq', false);
          saved(reader.token).its('body.items').should('have.length', 0);

          save(id, reader.token).then(res => {
            expect(res.status).to.eq(200);
            expect(res.body).to.include({saved: true});
          });
          detail(id, reader.token).its('body.saved').should('eq', true);
          saved(reader.token).then(res => {
            expect(idsOf(res)).to.deep.eq([id]);
            expect(res.body.items[0].saved).to.eq(true);
          });
          // a visitor who is not signed in never sees "saved"
          detail(id).its('body.saved').should('eq', false);

          unsave(id, reader.token).then(res => {
            expect(res.status).to.eq(200);
            expect(res.body).to.include({saved: false});
          });
          detail(id, reader.token).its('body.saved').should('eq', false);
          saved(reader.token).its('body.items').should('have.length', 0);
        });
      });
    });
  });

  it('never creates a duplicate save, and unsaving twice is harmless', () => {
    signIn().then(({token}) => {
      signIn().then(reader => {
        publicPost(token, 'Save duplicate').then(id => {
          save(id, reader.token).its('status').should('eq', 200);
          save(id, reader.token).its('status').should('eq', 200);
          saved(reader.token).then(res => {
            expect(idsOf(res)).to.deep.eq([id]);
            expect(res.body.total).to.eq(1);
          });
          unsave(id, reader.token).its('status').should('eq', 200);
          unsave(id, reader.token).then(res => {
            expect(res.status).to.eq(200);
            expect(res.body).to.include({saved: false});
          });
        });
      });
    });
  });

  it('keeps the saved list private to its owner', () => {
    signIn().then(({token}) => {
      signIn().then(owner => {
        signIn().then(other => {
          publicPost(token, 'Save private list').then(id => {
            save(id, owner.token).its('status').should('eq', 200);

            // someone else sees an empty list of their own, even when they ask for another user's
            saved(other.token).its('body.items').should('have.length', 0);
            saved(other.token, {userId: 'someone'}).its('body.items').should('have.length', 0);
            detail(id, other.token).its('body.saved').should('eq', false);

            // saving or unsaving never touches the owner's row
            save(id, other.token).its('status').should('eq', 200);
            unsave(id, other.token).its('status').should('eq', 200);
            saved(owner.token).then(res => expect(idsOf(res)).to.deep.eq([id]));
          });
        });
      });
    });
  });

  it('lists the newest save first and shows the state in the public list', () => {
    signIn().then(({token}) => {
      signIn().then(reader => {
        publicPost(token, 'Save order one').then(first => {
          publicPost(token, 'Save order two').then(second => {
            save(first, reader.token).its('status').should('eq', 200);
            save(second, reader.token).its('status').should('eq', 200);

            saved(reader.token).then(res => expect(idsOf(res)).to.deep.eq([second, first]));
            get('/public-trip', reader.token, {limit: '50'}).then(res => {
              const card = res.body.items.find((item: any) => item._id === first);
              expect(card.saved).to.eq(true);
            });
            get('/public-trip', undefined, {limit: '50'}).then(res => {
              const card = res.body.items.find((item: any) => item._id === first);
              expect(card.saved).to.eq(false);
            });
          });
        });
      });
    });
  });

  it('leaves out posts that are deleted or no longer public, and they come back when public again', () => {
    signIn().then(({token}) => {
      publicPost(token, 'Save hidden').then(hidden => {
        publicPost(token, 'Save deleted').then(deleted => {
          save(hidden, token).its('status').should('eq', 200);
          save(deleted, token).its('status').should('eq', 200);
          saved(token).then(res => expect(idsOf(res)).to.include.members([hidden, deleted]));

          put(`/trip-plan/${hidden}/visibility`, token, {visibility: 'private'}).its('status').should('eq', 200);
          del(`/trip-plan/${deleted}`, token).its('status').should('eq', 200);
          saved(token).then(res => {
            expect(idsOf(res)).not.to.include(hidden);
            expect(idsOf(res)).not.to.include(deleted);
          });

          put(`/trip-plan/${hidden}/visibility`, token, {visibility: 'public'}).its('status').should('eq', 200);
          saved(token).then(res => expect(idsOf(res)).to.include(hidden));
        });
      });
    });
  });

  it('answers 404 for a private, deleted, unknown or malformed post and stores nothing', () => {
    signIn().then(({token}) => {
      saveTrip(token, 'Save private post').then(({tripId}) => {
        // private by default
        save(tripId, token).its('status').should('eq', 404);
        unsave(tripId, token).its('status').should('eq', 404);
      });
      publicPost(token, 'Save deleted post').then(id => {
        save(id, token).its('status').should('eq', 200);
        del(`/trip-plan/${id}`, token).its('status').should('eq', 200);
        save(id, token).its('status').should('eq', 404);
        // a save on a deleted post can still be cleaned up
        unsave(id, token).its('status').should('eq', 404);
      });
      save(MISSING, token).its('status').should('eq', 404);
      save('not-an-id', token).its('status').should('eq', 404);
      unsave('not-an-id', token).its('status').should('eq', 404);
    });
  });

  it('pages the saved list', () => {
    signIn().then(({token}) => {
      signIn().then(reader => {
        publicPost(token, 'Save page one').then(first => {
          publicPost(token, 'Save page two').then(second => {
            save(first, reader.token);
            save(second, reader.token);

            saved(reader.token, {page: '1', limit: '1'}).then(res => {
              expect(res.body).to.include({page: 1, limit: 1, total: 2});
              expect(idsOf(res)).to.deep.eq([second]);
            });
            saved(reader.token, {page: '2', limit: '1'}).then(res => expect(idsOf(res)).to.deep.eq([first]));
          });
        });
      });
    });
  });
});
