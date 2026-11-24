import {PASSWORD, del, get, idOf, makeUser, patch, post, put, saveTrip, signIn, signInAdmin, stored} from '../support/api';

describe('admin access', () => {
  const pages = [
    '/admin/dashboard', '/admin/users', '/admin/trips', '/admin/challenges', '/admin/roles', '/admin/logs', '/admin/settings',
    '/admin/alerts', '/admin/ai', '/admin/reports', '/admin/reports?period=7d', '/admin/reports?period=90d',
    '/admin/moderation', '/admin/videos', '/admin/showcase', '/admin/announcements',
  ];

  pages.forEach(path => {
    it(`GET ${path}: 401 without a token, 403 for a user, 200 for an admin`, () => {
      signIn().then(user => {
        signInAdmin().then(admin => {
          get(path).its('status').should('eq', 401);
          get(path, user.token).its('status').should('eq', 403);
          get(path, admin.token).its('status').should('eq', 200);
        });
      });
    });
  });

  it('blocks a user from every write', () => {
    signIn().then(({token}) => {
      const id = '64b000000000000000000001';
      post('/admin/users', token, {}).its('status').should('eq', 403);
      patch(`/admin/users/${id}`, token, {}).its('status').should('eq', 403);
      del(`/admin/users/${id}`, token).its('status').should('eq', 403);
      del(`/admin/trips/${id}`, token).its('status').should('eq', 403);
      put('/admin/settings', token, {}).its('status').should('eq', 403);
      post('/admin/videos', token, {}).its('status').should('eq', 403);
    });
  });
});

describe('admin: users', () => {
  it('creates an account that can sign in, and lists it', () => {
    signInAdmin().then(admin => {
      const body = {fullname: 'New Member', username: 'member.one', email: 'member.one@example.com', password: 'longenough1'};
      post('/admin/users', admin.token, body).then(res => {
        expect(res.status).to.eq(200);
        expect(JSON.stringify(res.body)).not.to.contain('longenough1');
      });
      post('/auth/login', undefined, {username: 'member.one', password: 'longenough1'}).its('status').should('eq', 200);
      get('/admin/users', admin.token).then(list => expect(JSON.stringify(list.body)).to.contain('member.one@example.com'));
    });
  });

  it('validates the new account and refuses duplicates', () => {
    signInAdmin().then(admin => {
      const send = (body: object) => post('/admin/users', admin.token, body);
      const ok = {fullname: 'A B', username: 'dup.user', email: 'dup.user@example.com', password: 'longenough1'};
      send({...ok, password: 'short'}).its('status').should('eq', 400);
      send({...ok, email: 'not-an-email'}).its('status').should('eq', 400);
      send({...ok, username: 'x'}).its('status').should('eq', 400);
      send({...ok, role: 'owner'}).its('status').should('eq', 400);
      send(ok).its('status').should('eq', 200);
      send(ok).its('status').should('eq', 409);
    });
  });

  it('suspends an account (it can no longer sign in) and restores it', () => {
    signInAdmin().then(admin => {
      makeUser().then(target => {
        const change = (body: object) => patch(`/admin/users/${target.id}`, admin.token, body);
        change({status: 'suspended', suspendReason: 'spam'}).its('status').should('eq', 200);
        post('/auth/login', undefined, {username: target.username, password: PASSWORD}).then(blocked => {
          expect(blocked.status).to.eq(403);
          expect(blocked.body.reason).to.eq('spam');
        });
        change({status: 'active'}).its('status').should('eq', 200);
        post('/auth/login', undefined, {username: target.username, password: PASSWORD}).its('status').should('eq', 200);
      });
    });
  });

  it('does not let an admin change their own account', () => {
    signInAdmin().then(admin => {
      patch(`/admin/users/${admin.user.id}`, admin.token, {role: 'user'}).its('status').should('eq', 400);
    });
  });

  it('bulk-suspends, skipping the admin\'s own account and other admins', () => {
    signInAdmin().then(admin => {
      signInAdmin().then(other => {
        makeUser().then(a => {
          makeUser().then(b => {
            post('/admin/users/bulk-status', admin.token, {
              ids: [a.id, b.id, admin.user.id, other.user.id], status: 'suspended', suspendReason: 'spam',
            }).then(res => {
              expect(res.status).to.eq(200);
              expect([...res.body.updated].sort()).to.deep.eq([a.id, b.id].sort());
              expect([...res.body.skipped].sort()).to.deep.eq([admin.user.id, other.user.id].sort());
            });
            post('/admin/users/bulk-status', admin.token, {ids: [], status: 'active'}).its('status').should('eq', 400);
            post('/admin/users/bulk-status', admin.token, {ids: [a.id], status: 'weird'}).its('status').should('eq', 400);
          });
        });
      });
    });
  });

  it('soft-deletes an account', () => {
    signInAdmin().then(admin => {
      makeUser().then(target => {
        del(`/admin/users/${target.id}`, admin.token).its('status').should('eq', 200);
        post('/auth/login', undefined, {username: target.username, password: PASSWORD}).its('status').should('eq', 400);
      });
    });
  });

  it('answers 404 for an unknown user or an id that is not an id', () => {
    signInAdmin().then(admin => {
      get('/admin/users/64b000000000000000000001', admin.token).its('status').should('eq', 404);
      get('/admin/users/not-an-id', admin.token).its('status').should('eq', 404);
      patch('/admin/users/not-an-id', admin.token, {fullname: 'x'}).its('status').should('eq', 404);
    });
  });

  it('shows an account with its trips', () => {
    signInAdmin().then(admin => {
      signIn().then(user => {
        saveTrip(user.token, 'Detail trip');
        get(`/admin/users/${user.user.id}`, admin.token).then(detail => {
          expect(detail.status).to.eq(200);
          expect(JSON.stringify(detail.body)).to.contain('Detail trip');
        });
      });
    });
  });

  it('edits the profile fields of an account', () => {
    signInAdmin().then(admin => {
      signIn().then(user => {
        const change = (body: object) => patch(`/admin/users/${user.user.id}`, admin.token, body);
        change({fullname: 'Edited Name', phone: '0912345678', role: 'admin'}).its('status').should('eq', 200);
        change({fullname: ''}).its('status').should('eq', 400);
        change({email: 'nope'}).its('status').should('eq', 400);
        change({role: 'root'}).its('status').should('eq', 400);
        stored(user.user.id).its('fullname').should('eq', 'Edited Name');
      });
    });
  });
});

describe('admin: trips and challenges', () => {
  it('sees a user\'s trip and deleting it removes it from the user\'s list', () => {
    signInAdmin().then(admin => {
      signIn().then(user => {
        saveTrip(user.token, 'Seen by admin').then(({tripId, chaId}) => {
          get('/admin/trips', admin.token).then(trips => expect(JSON.stringify(trips.body)).to.contain('Seen by admin'));
          get(`/admin/trips/${tripId}`, admin.token).its('status').should('eq', 200);
          get('/admin/challenges', admin.token).then(res => expect(JSON.stringify(res.body)).to.contain(chaId));
          del(`/admin/trips/${tripId}`, admin.token).its('status').should('eq', 200);
          get('/trip-plan/get-trip', user.token).its('body.dataTrip').should('deep.eq', []);
        });
      });
    });
  });

  it('edits and deletes a challenge', () => {
    signInAdmin().then(admin => {
      signIn().then(user => {
        saveTrip(user.token).then(({chaId}) => {
          patch(`/admin/challenges/${chaId}`, admin.token, {points: 99}).its('status').should('eq', 200);
          del(`/admin/challenges/${chaId}`, admin.token).its('status').should('eq', 200);
          post('/challenge/checkProgress', user.token, {chaId, lat: 1, lng: 1}).its('status').should('eq', 404);
        });
      });
    });
  });

  it('answers 404 for an unknown id', () => {
    signInAdmin().then(admin => {
      const id = '64b000000000000000000001';
      del(`/admin/trips/${id}`, admin.token).its('status').should('eq', 404);
      del(`/admin/challenges/${id}`, admin.token).its('status').should('eq', 404);
    });
  });

  it('the dashboard counts what the users did and the roles list their members', () => {
    signInAdmin().then(admin => {
      signIn().then(user => {
        saveTrip(user.token);
        get('/admin/dashboard', admin.token).then(res => expect(JSON.stringify(res.body)).to.match(/trip/i));
        get('/admin/roles', admin.token).then(res => {
          expect(res.body.members).not.to.eq(undefined);
          expect(res.body.permissions).not.to.eq(undefined);
        });
      });
    });
  });
});

describe('admin: announcements, settings, videos', () => {
  it('manages announcements, which signed-in users then see', () => {
    signInAdmin().then(admin => {
      signIn().then(user => {
        post('/admin/announcements', admin.token, {title: 'Maintenance', message: 'Tonight at 22:00', status: 'published'}).then(created => {
          expect(created.status).to.eq(200);
          get('/announcements', user.token).then(seen => expect(JSON.stringify(seen.body)).to.contain('Maintenance'));
          del(`/admin/announcements/${idOf(created.body)}`, admin.token).its('status').should('eq', 200);
          get('/announcements', user.token).then(seen => expect(JSON.stringify(seen.body)).not.to.contain('Maintenance'));
        });
      });
    });
  });

  it('saves the app settings, which are then public', () => {
    signInAdmin().then(admin => {
      put('/admin/settings', admin.token, {appName: 'ALOCA QA', supportEmail: 'qa@example.com', hotline: '1900 1234'}).its('status').should('eq', 200);
      get('/settings').then(res => expect(JSON.stringify(res.body)).to.contain('ALOCA QA'));
    });
  });

  it('manages videos shown on the public list, and hides a hidden one', () => {
    signInAdmin().then(admin => {
      post('/admin/videos', admin.token, {
        title: 'Hoi An at night', location: 'Quảng Nam', youtubeLink: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', status: 'published',
      }).then(created => {
        expect(created.status).to.eq(200);
        const id = idOf(created.body);
        get('/videos').then(res => expect(JSON.stringify(res.body)).to.contain('Hoi An at night'));
        patch(`/admin/videos/${id}`, admin.token, {status: 'hidden'}).its('status').should('eq', 200);
        get('/videos').then(res => expect(JSON.stringify(res.body)).not.to.contain('Hoi An at night'));
        del(`/admin/videos/${id}`, admin.token).its('status').should('eq', 200);
        del(`/admin/videos/${id}`, admin.token).its('status').should('eq', 404);
      });
      post('/admin/videos', admin.token, {title: 'x', location: 'y', youtubeLink: 'not a link'}).its('status').should('eq', 400);
    });
  });

  it('records activity in the log', () => {
    signInAdmin().then(admin => {
      post('/admin/users', admin.token, {fullname: 'Logged', username: 'logged.user', email: 'logged.user@example.com', password: 'longenough1'});
      get('/admin/logs', admin.token).then(logs => expect(JSON.stringify(logs.body)).to.contain('createUser'));
    });
  });
});

describe('admin: moderation of reported content', () => {
  it('a user\'s report waits for an admin, who can approve or reject it', () => {
    signInAdmin().then(admin => {
      signIn().then(user => {
        post('/reports', user.token, {type: 'video', reason: 'spam', content: 'buy now!!!', authorName: 'Bot'}).its('status').should('eq', 201);
        get('/admin/moderation', admin.token).then(list => {
          const item = (list.body as any[]).find(r => JSON.stringify(r).includes('buy now!!!'));
          expect(item, 'the report').to.exist;
          const id = idOf(item);
          patch(`/admin/moderation/${id}`, admin.token, {status: 'maybe'}).its('status').should('eq', 400);
          patch(`/admin/moderation/${id}`, admin.token, {status: 'rejected'}).its('status').should('eq', 200);
          patch(`/admin/moderation/${id}`, user.token, {status: 'approved'}).its('status').should('eq', 403);
          patch('/admin/moderation/not-an-id', admin.token, {status: 'approved'}).its('status').should('eq', 404);
        });
      });
    });
  });

  it('validates what a user reports', () => {
    signIn().then(({token}) => {
      const send = (body: object) => post('/reports', token, body);
      send({type: 'nonsense', reason: 'spam', content: 'x'}).its('status').should('eq', 400);
      send({type: 'video', reason: 'nonsense', content: 'x'}).its('status').should('eq', 400);
      send({type: 'video', reason: 'spam', content: ''}).its('status').should('eq', 400);
      send({type: 'video', reason: 'spam', content: 'x'.repeat(501)}).its('status').should('eq', 400);
    });
  });
});

describe('admin: showcase (home page pictures)', () => {
  it('creates, edits and deletes a banner, which the public home page then shows', () => {
    signInAdmin().then(admin => {
      post('/admin/showcase', admin.token, {
        kind: 'banner', imageUrl: 'https://example.com/banner.jpg', title: 'Summer sale', status: 'published', sortOrder: 1,
      }).then(created => {
        expect(created.status).to.eq(200);
        const id = idOf(created.body);
        get('/home').then(home => expect(JSON.stringify(home.body)).to.contain('banner.jpg'));
        patch(`/admin/showcase/${id}`, admin.token, {title: 'Winter sale'}).its('status').should('eq', 200);
        get('/admin/showcase', admin.token).then(list => expect(JSON.stringify(list.body)).to.contain('Winter sale'));
        del(`/admin/showcase/${id}`, admin.token).its('status').should('eq', 200);
        get('/home').then(home => expect(JSON.stringify(home.body)).not.to.contain('banner.jpg'));
      });
    });
  });

  it('refuses an invalid picture and answers 404 for an unknown one', () => {
    signInAdmin().then(admin => {
      post('/admin/showcase', admin.token, {kind: 'poster', imageUrl: ''}).its('status').should('eq', 400);
      patch('/admin/showcase/64b000000000000000000001', admin.token, {title: 'x'}).its('status').should('eq', 404);
    });
  });
});
