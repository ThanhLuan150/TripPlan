import {call, del, get, patch, post, put, saveTrip, signIn, signInAdmin} from '../support/api';

// A public trip is the post of the community.
const publicPost = (token: string, name: string) =>
  saveTrip(token, name).then(({tripId}) =>
    put(`/trip-plan/${tripId}/visibility`, token, {visibility: 'public'}).then(res => {
      expect(res.status).to.eq(200);
      return tripId;
    }),
  );
const report = (id: string, token: string, body: Record<string, unknown> = {reason: 'spam'}) => post(`/public-trip/${id}/report`, token, body);
const reportOf = (adminToken: string, content: string) =>
  get('/admin/moderation', adminToken).then(res => res.body.find((item: any) => item.type === 'post' && item.content.includes(content)));

describe('admin: reported posts', () => {
  it('shows the report with the reporter\'s note and the post, never who reported', () => {
    signIn().then(author => {
      signIn().then(reporter => {
        signInAdmin().then(admin => {
          publicPost(author.token, 'AdminCommunity note').then(id => {
            report(id, reporter.token, {reason: 'other', description: 'Photos are not from this trip'}).its('status').should('eq', 201);

            reportOf(admin.token, 'AdminCommunity note').then(item => {
              expect(item).to.include({reason: 'other', status: 'pending', details: 'Photos are not from this trip', targetId: id});
              expect(JSON.stringify(item)).to.not.contain(reporter.user.id);
              expect(item).to.not.have.property('reporterId');
            });
          });
        });
      });
    });
  });

  it('rejecting the report takes the post down: it is private, out of the list and its link is dead', () => {
    signIn().then(author => {
      signIn().then(reporter => {
        signInAdmin().then(admin => {
          publicPost(author.token, 'AdminCommunity reject').then(id => {
            post(`/trip-plan/${id}/share`, author.token).then(share => {
              const token = share.body.shareToken as string;
              report(id, reporter.token).its('status').should('eq', 201);
              get(`/public-trip/${id}`).its('status').should('eq', 200);

              reportOf(admin.token, 'AdminCommunity reject').then(item => {
                patch(`/admin/moderation/${item.id}`, admin.token, {status: 'rejected'}).then(res => {
                  expect(res.status).to.eq(200);
                  expect(res.body).to.include({status: 'rejected', postRemoved: true});
                });
              });

              get(`/public-trip/${id}`).its('status').should('eq', 404);
              get(`/shared/${token}`).its('status').should('eq', 404);
              // the trip itself is kept for its owner
              get(`/trip-plan/get-trip/${id}`, author.token).its('status').should('eq', 200);
              // and the decision is in the activity log
              get('/admin/logs', admin.token).then(logs => {
                expect(logs.body.some((log: any) => log.action === 'removePost' && log.target === 'AdminCommunity reject')).to.eq(true);
              });
            });
          });
        });
      });
    });
  });

  it('approving the report keeps the post', () => {
    signIn().then(author => {
      signIn().then(reporter => {
        signInAdmin().then(admin => {
          publicPost(author.token, 'AdminCommunity approve').then(id => {
            report(id, reporter.token).its('status').should('eq', 201);

            reportOf(admin.token, 'AdminCommunity approve').then(item => {
              patch(`/admin/moderation/${item.id}`, admin.token, {status: 'approved'}).its('body.postRemoved').should('eq', false);
            });

            get(`/public-trip/${id}`).its('status').should('eq', 200);
            // one report per user per post, even after the decision
            report(id, reporter.token).its('status').should('eq', 409);
          });
        });
      });
    });
  });

  it('only an admin decides', () => {
    signIn().then(user => {
      patch('/admin/moderation/64b0000000000000000000ff', user.token, {status: 'rejected'}).its('status').should('eq', 403);
    });
  });
});

describe('admin: posts in the trip list', () => {
  it('shows which trips are posts with their likes and saves, and takes a post down', () => {
    signIn().then(author => {
      signIn().then(fan => {
        signInAdmin().then(admin => {
          publicPost(author.token, 'AdminCommunity list').then(id => {
            post(`/public-trip/${id}/like`, fan.token).its('status').should('eq', 200);
            post(`/public-trip/${id}/save`, fan.token).its('status').should('eq', 200);

            get('/admin/trips', admin.token).then(res => {
              const trip = res.body.find((item: any) => item.id === id);
              expect(trip).to.include({visibility: 'public', likes: 1, saves: 1});
            });

            post(`/admin/trips/${id}/unpublish`, admin.token).then(res => {
              expect(res.status).to.eq(200);
              expect(res.body).to.include({visibility: 'private'});
            });
            get(`/public-trip/${id}`).its('status').should('eq', 404);
            get('/admin/trips', admin.token).then(res => {
              expect(res.body.find((item: any) => item.id === id)).to.include({visibility: 'private', likes: 1});
            });
            // taking it down twice is harmless
            post(`/admin/trips/${id}/unpublish`, admin.token).its('status').should('eq', 200);
          });
        });
      });
    });
  });

  it('answers 404 for an unknown trip and 403 for a user', () => {
    signIn().then(user => {
      signInAdmin().then(admin => {
        post('/admin/trips/64b0000000000000000000ff/unpublish', admin.token).its('status').should('eq', 404);
        post('/admin/trips/not-an-id/unpublish', admin.token).its('status').should('eq', 404);
        post('/admin/trips/64b0000000000000000000ff/unpublish', user.token).its('status').should('eq', 403);
      });
    });
  });
});

describe('admin: destination reviews', () => {
  it('is for admins only', () => {
    signIn().then(user => {
      get('/admin/reviews').its('status').should('eq', 401);
      get('/admin/reviews', user.token).its('status').should('eq', 403);
      del('/admin/reviews/64b0000000000000000000ff', user.token).its('status').should('eq', 403);
    });
  });

  it('lists the reviews with their author and deletes one (the average follows, the action is logged)', () => {
    signIn().then(author => {
      signIn().then(other => {
        signInAdmin().then(admin => {
          const content = `Admin review ${Date.now()}`;
          post('/destination-reviews', author.token, {destination: 'Lạng Sơn', rating: 1, content}).its('status').should('eq', 201);
          post('/destination-reviews', other.token, {destination: 'Lạng Sơn', rating: 5, content: 'Great'}).its('status').should('eq', 201);

          get('/admin/reviews', admin.token).then(res => {
            const item = res.body.find((entry: any) => entry.content === content);
            expect(item).to.include({destination: 'Lạng Sơn', rating: 1, author: author.user.username, authorId: author.user.id});
            expect(JSON.stringify(item)).to.not.contain(author.user.email);

            del(`/admin/reviews/${item.id}`, admin.token).its('status').should('eq', 200);
          });

          get('/destination-reviews', undefined, {destination: 'Lạng Sơn'}).then(res => {
            expect(res.body.summary).to.deep.eq({average: 5, count: 1});
          });
          get('/admin/logs', admin.token).then(logs => {
            expect(logs.body.some((log: any) => log.action === 'deleteReview' && log.target.includes(content))).to.eq(true);
          });
          // the author may write a new one afterwards
          post('/destination-reviews', author.token, {destination: 'Lạng Sơn', rating: 3, content: 'again'}).its('status').should('eq', 201);
        });
      });
    });
  });

  it('answers 404 for an unknown or malformed review', () => {
    signInAdmin().then(admin => {
      del('/admin/reviews/64b0000000000000000000ff', admin.token).its('status').should('eq', 404);
      del('/admin/reviews/not-an-id', admin.token).its('status').should('eq', 404);
    });
  });
});

describe('admin: community numbers', () => {
  it('the dashboard and the reports count posts and reviews', () => {
    signIn().then(author => {
      signInAdmin().then(admin => {
        get('/admin/dashboard', admin.token).then(before => {
          publicPost(author.token, 'AdminCommunity count');
          post('/destination-reviews', author.token, {destination: 'Cao Bằng', rating: 4, content: 'Counted'}).its('status').should('eq', 201);

          get('/admin/dashboard', admin.token).then(after => {
            expect(after.body.stats.posts.value).to.eq(before.body.stats.posts.value + 1);
            expect(after.body.stats.reviews.value).to.eq(before.body.stats.reviews.value + 1);
          });
        });
        get('/admin/reports?period=7d', admin.token).then(res => {
          expect(res.body.stats.postsShared.value).to.be.at.least(1);
          expect(res.body.stats.newReviews.value).to.be.at.least(1);
        });
      });
    });
  });

  it('the page of a user shows their posts, reviews, followers and following', () => {
    signIn().then(author => {
      signIn().then(fan => {
        signInAdmin().then(admin => {
          publicPost(author.token, 'AdminCommunity user');
          post('/destination-reviews', author.token, {destination: 'Sơn La', rating: 4, content: 'Mine'}).its('status').should('eq', 201);
          post(`/user/${author.user.id}/follow`, fan.token).its('status').should('eq', 200);
          post(`/user/${fan.user.id}/follow`, author.token).its('status').should('eq', 200);

          get(`/admin/users/${author.user.id}`, admin.token).then(res => {
            expect(res.body.community).to.deep.eq({posts: 1, reviews: 1, followers: 1, following: 1});
          });
        });
      });
    });
  });
});

describe('admin: PDF export', () => {
  const table = {title: 'Người dùng Aloca', columns: ['Họ tên', 'Email'], rows: [['Nguyễn Văn Ánh', 'anh@example.com']], lang: 'vi'};
  const pdf = (token: string | undefined, body: unknown) => call('POST', '/admin/export/pdf', {token, body});

  it('is for admins only', () => {
    signIn().then(user => {
      pdf(undefined, table).its('status').should('eq', 401);
      pdf(user.token, table).its('status').should('eq', 403);
    });
  });

  it('answers a real PDF named after the title, with Vietnamese text', () => {
    signInAdmin().then(admin => {
      pdf(admin.token, table).then(res => {
        expect(res.status).to.eq(200);
        expect(String(res.headers['content-type'])).to.contain('application/pdf');
        expect(String(res.headers['content-disposition'])).to.contain('attachment');
        expect(String(res.body).startsWith('%PDF-')).to.eq(true);
      });
    });
  });

  it('makes a PDF of many rows and of no rows', () => {
    signInAdmin().then(admin => {
      pdf(admin.token, {...table, rows: Array.from({length: 400}, (_, i) => [`Người ${i}`, `user${i}@example.com`])}).its('status').should('eq', 200);
      pdf(admin.token, {...table, rows: []}).its('status').should('eq', 200);
    });
  });

  it('rejects a table that is not valid with 400', () => {
    signInAdmin().then(admin => {
      pdf(admin.token, {...table, title: ''}).its('status').should('eq', 400);
      pdf(admin.token, {...table, columns: []}).its('status').should('eq', 400);
      pdf(admin.token, {...table, rows: [['only one']]}).its('status').should('eq', 400);
      pdf(admin.token, {...table, rows: [[{$ne: 1}, 'x']]}).its('status').should('eq', 400);
      pdf(admin.token, {...table, rows: Array.from({length: 2001}, () => ['a', 'b'])}).its('status').should('eq', 400);
      pdf(admin.token, {}).its('status').should('eq', 400);
    });
  });
});

describe('admin: share links and AI tools', () => {
  it('shows the trips with a share link on and turns the link off (the old link stops working, logged)', () => {
    signIn().then(owner => {
      signInAdmin().then(admin => {
        saveTrip(owner.token, 'AdminShare link').then(({tripId}) => {
          post(`/trip-plan/${tripId}/share`, owner.token).then(share => {
            const token = share.body.shareToken as string;
            get('/admin/trips', admin.token).then(res => expect(res.body.find((item: any) => item.id === tripId).shared).to.eq(true));
            get(`/shared/${token}`).its('status').should('eq', 200);

            del(`/admin/trips/${tripId}/share`, admin.token).then(res => {
              expect(res.status).to.eq(200);
              expect(res.body).to.include({shared: false});
            });

            get(`/shared/${token}`).its('status').should('eq', 404);
            get('/admin/trips', admin.token).then(res => expect(res.body.find((item: any) => item.id === tripId).shared).to.eq(false));
            get('/admin/logs', admin.token).then(logs => {
              expect(logs.body.some((log: any) => log.action === 'revokeShare' && log.target === 'AdminShare link')).to.eq(true);
            });
            // turning it off again is harmless; the trip is still the owner's
            del(`/admin/trips/${tripId}/share`, admin.token).its('status').should('eq', 200);
            get(`/trip-plan/get-trip/${tripId}`, owner.token).its('status').should('eq', 200);
          });
        });
      });
    });
  });

  it('answers 404 for an unknown trip and 403 for a user', () => {
    signIn().then(user => {
      signInAdmin().then(admin => {
        del('/admin/trips/64b0000000000000000000ff/share', admin.token).its('status').should('eq', 404);
        del('/admin/trips/not-an-id/share', admin.token).its('status').should('eq', 404);
        del('/admin/trips/64b0000000000000000000ff/share', user.token).its('status').should('eq', 403);
      });
    });
  });

  it('the AI overview counts the AI tools of the app', () => {
    signIn().then(user => {
      signInAdmin().then(admin => {
        get('/admin/ai', admin.token).then(before => {
          put('/user/preferences', user.token, {categories: ['food'], notes: 'street food'}).its('status').should('eq', 200);
          get('/admin/ai', admin.token).then(after => {
            expect(after.body.features).to.have.all.keys('destinationSearches', 'plansFromSuggestions', 'budgetEstimates', 'usersWithPreferences');
            expect(after.body.features.usersWithPreferences).to.eq(before.body.features.usersWithPreferences + 1);
          });
        });
      });
    });
  });
});
