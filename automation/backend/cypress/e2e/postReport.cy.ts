import {get, post, put, saveTrip, signIn, signInAdmin} from '../support/api';

const report = (id: string, token?: string, body: Record<string, unknown> = {reason: 'spam'}) =>
  post(`/public-trip/${id}/report`, token, body);
const MISSING = '64b0000000000000000000ff';

// a public trip is the post of the community
const publicPost = (token: string, name: string) =>
  saveTrip(token, name).then(({tripId}) =>
    put(`/trip-plan/${tripId}/visibility`, token, {visibility: 'public'}).then(res => {
      expect(res.status).to.eq(200);
      return tripId;
    }),
  );

describe('Report a post', () => {
  it('requires sign-in', () => {
    signIn().then(({token}) => {
      publicPost(token, 'Report auth').then(id => {
        report(id).its('status').should('eq', 401);
        report(id, 'not-a-token').its('status').should('eq', 401);
      });
    });
  });

  it('stores a valid report and answers only a message', () => {
    signIn().then(author => {
      signIn().then(reporter => {
        publicPost(author.token, 'Report basic').then(id => {
          report(id, reporter.token, {reason: 'inappropriate', description: 'Rude photos'}).then(res => {
            expect(res.status).to.eq(201);
            expect(res.body).to.deep.eq({message: 'Report sent successfully'});
          });
        });
      });
    });
  });

  it('shows the admin the report with the reason, and never anything of the reporter to the author', () => {
    signIn().then(author => {
      signIn().then(reporter => {
        signInAdmin().then(admin => {
          publicPost(author.token, 'Report visible').then(id => {
            report(id, reporter.token, {reason: 'copyright', description: 'Stolen photos'}).its('status').should('eq', 201);

            // the admins see it in the moderation list (what they do with it is another ticket)
            get('/admin/moderation', admin.token).then(res => {
              expect(res.status).to.eq(200);
              const item = res.body.find((entry: any) => entry.type === 'post' && entry.content.includes('Report visible'));
              expect(item, 'the report').to.include({reason: 'copyright', status: 'pending'});
              expect(item).to.not.have.property('reporterId');
            });
            // the author's own views of the post never carry reports
            get(`/public-trip/${id}`, author.token).then(res => {
              expect(JSON.stringify(res.body)).to.not.contain(reporter.user.id);
              expect(JSON.stringify(res.body)).to.not.contain(reporter.user.username);
              expect(res.body).to.not.have.property('reports');
            });
          });
        });
      });
    });
  });

  it('accepts every reason of the list and rejects any other', () => {
    signIn().then(author => {
      const reasons = ['spam', 'inappropriate', 'wrongLocation', 'copyright', 'misinformation'];
      reasons.forEach(reason => {
        signIn().then(reporter => {
          publicPost(author.token, `Report ${reason}`).then(id => {
            report(id, reporter.token, {reason}).its('status').should('eq', 201);
          });
        });
      });
      signIn().then(reporter => {
        publicPost(author.token, 'Report bad reason').then(id => {
          for (const reason of ['boring', '', null, 5, undefined]) {
            report(id, reporter.token, {reason}).its('status').should('eq', 400);
          }
        });
      });
    });
  });

  it('the reason "other" needs a description, and a description has a limit', () => {
    signIn().then(author => {
      signIn().then(reporter => {
        publicPost(author.token, 'Report other').then(id => {
          report(id, reporter.token, {reason: 'other'}).its('status').should('eq', 400);
          report(id, reporter.token, {reason: 'other', description: '   '}).its('status').should('eq', 400);
          report(id, reporter.token, {reason: 'spam', description: 'a'.repeat(501)}).its('status').should('eq', 400);
          report(id, reporter.token, {reason: 'spam', description: 5}).its('status').should('eq', 400);
          report(id, reporter.token, {reason: 'other', description: 'Something else'}).its('status').should('eq', 201);
        });
      });
    });
  });

  it('refuses a second report of the same post by the same user, but another user may report it', () => {
    signIn().then(author => {
      signIn().then(first => {
        signIn().then(second => {
          publicPost(author.token, 'Report duplicate').then(id => {
            report(id, first.token).its('status').should('eq', 201);
            report(id, first.token, {reason: 'copyright'}).its('status').should('eq', 409);
            report(id, second.token).its('status').should('eq', 201);
          });
        });
      });
    });
  });

  it('the author cannot report their own post', () => {
    signIn().then(author => {
      publicPost(author.token, 'Report own').then(id => {
        report(id, author.token).its('status').should('eq', 400);
      });
    });
  });

  it('answers 404 for a post that does not exist, is private, was deleted or has a malformed id', () => {
    signIn().then(author => {
      signIn().then(reporter => {
        report(MISSING, reporter.token).its('status').should('eq', 404);
        report('not-an-id', reporter.token).its('status').should('eq', 404);
        saveTrip(author.token, 'Report private').then(({tripId}) => {
          report(tripId, reporter.token).its('status').should('eq', 404);
        });
        publicPost(author.token, 'Report deleted').then(id => {
          cy.request({method: 'DELETE', url: `/trip-plan/${id}`, headers: {Authorization: `Bearer ${author.token}`}});
          report(id, reporter.token).its('status').should('eq', 404);
        });
      });
    });
  });

  it('the generic report route does not take the post type (posts have their own route)', () => {
    signIn().then(({token}) => {
      post('/reports', token, {type: 'post', reason: 'spam', content: 'x'}).its('status').should('eq', 400);
    });
  });
});
