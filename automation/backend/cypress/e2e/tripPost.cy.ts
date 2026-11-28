import {del, get, post, put, saveTrip, signIn} from '../support/api';

const share = (id: string, token?: string, body: Record<string, unknown> = {content: 'Our trip'}) => post(`/trip-plan/${id}/post`, token, body);
const status = (id: string, token?: string) => get(`/trip-plan/${id}/post`, token);
const remove = (id: string, token?: string) => del(`/trip-plan/${id}/post`, token);
const publicView = (id: string) => get(`/public-trip/${id}`);

describe('Share a trip as a post', () => {
  it('requires sign-in', () => {
    signIn().then(({token}) => {
      saveTrip(token, 'Post auth').then(({tripId}) => {
        share(tripId).its('status').should('eq', 401);
        status(tripId).its('status').should('eq', 401);
        remove(tripId).its('status').should('eq', 401);
        share(tripId, 'not-a-token').its('status').should('eq', 401);
      });
    });
  });

  it('a trip is private and not a post until its owner shares it', () => {
    signIn().then(({token}) => {
      saveTrip(token, 'Not yet').then(({tripId}) => {
        status(tripId, token).then(res => {
          expect(res.status).to.eq(200);
          expect(res.body).to.include({isPosted: false, visibility: 'private', content: ''});
        });
        publicView(tripId).its('status').should('eq', 404);
      });
    });
  });

  it('shares the trip with an introduction: it becomes a public post with the plan and the text', () => {
    signIn().then(({token, user}) => {
      saveTrip(token, 'Shared post').then(({tripId}) => {
        share(tripId, token, {content: '  Three days of food  '}).then(res => {
          expect(res.status).to.eq(200);
          expect(res.body).to.include({isPosted: true, visibility: 'public', content: 'Three days of food'});
          expect(res.body.postedAt).to.be.a('string');
        });
        status(tripId, token).its('body').should('include', {isPosted: true, content: 'Three days of food'});

        publicView(tripId).then(res => {
          expect(res.status).to.eq(200);
          expect(res.body.tripDatas).to.include({nameTrip: 'Shared post', postContent: 'Three days of food'});
          expect(res.body.tripDatas.dataTripDays.length).to.be.greaterThan(0);
          // nothing of the owner or of their progress
          expect(JSON.stringify(res.body)).to.not.contain(user.id);
          expect(JSON.stringify(res.body)).to.not.contain(user.email);
        });
        get('/public-trip', undefined, {q: 'Shared post'}).then(res => {
          const found = res.body.items.find((item: any) => item._id === tripId);
          expect(found).to.include({postContent: 'Three days of food'});
        });
      });
    });
  });

  it('sharing again only changes the introduction, and the introduction is optional', () => {
    signIn().then(({token}) => {
      saveTrip(token, 'Edit post').then(({tripId}) => {
        share(tripId, token, {}).its('body.content').should('eq', '');
        share(tripId, token, {content: 'one'}).then(first => {
          share(tripId, token, {content: 'two'}).then(second => {
            expect(second.body).to.include({content: 'two', message: 'Post updated'});
            expect(second.body.postedAt).to.eq(first.body.postedAt);
          });
        });
      });
    });
  });

  it('validates the introduction', () => {
    signIn().then(({token}) => {
      saveTrip(token, 'Bad intro').then(({tripId}) => {
        share(tripId, token, {content: 5}).its('status').should('eq', 400);
        share(tripId, token, {content: 'a'.repeat(1001)}).its('status').should('eq', 400);
        publicView(tripId).its('status').should('eq', 404);
        share(tripId, token, {content: 'a'.repeat(1000)}).its('status').should('eq', 200);
      });
    });
  });

  it('only the owner can read, share or remove the post of a trip (404 for anybody else)', () => {
    signIn().then(owner => {
      signIn().then(stranger => {
        saveTrip(owner.token, 'Owner only').then(({tripId}) => {
          status(tripId, stranger.token).its('status').should('eq', 404);
          share(tripId, stranger.token).its('status').should('eq', 404);
          remove(tripId, stranger.token).its('status').should('eq', 404);
          publicView(tripId).its('status').should('eq', 404);
          // and the owner's post is not touched by the attempts
          share(tripId, owner.token).its('status').should('eq', 200);
          remove(tripId, stranger.token).its('status').should('eq', 404);
          publicView(tripId).its('status').should('eq', 200);
        });
      });
    });
  });

  it('a deleted or unknown trip cannot be shared', () => {
    signIn().then(({token}) => {
      saveTrip(token, 'Gone').then(({tripId}) => {
        del(`/trip-plan/${tripId}`, token).its('status').should('eq', 200);
        share(tripId, token).its('status').should('eq', 404);
      });
      share('64b0000000000000000000ff', token).its('status').should('eq', 404);
      share('not-an-id', token).its('status').should('eq', 404);
    });
  });

  it('removing the post takes the trip back to private and keeps the trip', () => {
    signIn().then(({token}) => {
      saveTrip(token, 'Remove post').then(({tripId}) => {
        share(tripId, token).its('status').should('eq', 200);
        publicView(tripId).its('status').should('eq', 200);

        remove(tripId, token).then(res => {
          expect(res.status).to.eq(200);
          expect(res.body).to.include({isPosted: false, visibility: 'private', content: ''});
        });
        publicView(tripId).its('status').should('eq', 404);
        // the trip still belongs to its owner
        get(`/trip-plan/get-trip/${tripId}`, token).its('status').should('eq', 200);
        // removing again is harmless
        remove(tripId, token).its('status').should('eq', 200);
        // and the introduction does not come back when it is made public again
        put(`/trip-plan/${tripId}/visibility`, token, {visibility: 'public'}).its('status').should('eq', 200);
        publicView(tripId).its('body.tripDatas.postContent').should('not.exist');
      });
    });
  });

  it('removing the post also turns off the share link', () => {
    signIn().then(({token}) => {
      saveTrip(token, 'Link off').then(({tripId}) => {
        share(tripId, token).its('status').should('eq', 200);
        post(`/trip-plan/${tripId}/share`, token).then(res => {
          const shareToken = res.body.shareToken as string;
          get(`/shared/${shareToken}`).its('status').should('eq', 200);
          remove(tripId, token).its('status').should('eq', 200);
          get(`/shared/${shareToken}`).its('status').should('eq', 404);
        });
      });
    });
  });
});
