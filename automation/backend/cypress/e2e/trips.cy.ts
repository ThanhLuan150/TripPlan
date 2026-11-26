import {FAR, NEAR, PLACE, call, del, get, post, put, saveTrip, signIn, stored} from '../support/api';

describe('trips', () => {
  it('saves a plan, lists it and returns its detail with days and challenges', () => {
    signIn().then(({token}) => {
      saveTrip(token, 'Da Nang weekend').then(({tripId}) => {
        get('/trip-plan/get-trip', token).then(list => {
          expect(list.status).to.eq(200);
          expect(list.body.dataTrip.map((t: any) => t.nameTrip)).to.deep.eq(['Da Nang weekend']);
        });

        get(`/trip-plan/get-trip/${tripId}`, token).then(detail => {
          expect(detail.status).to.eq(200);
          const trip = detail.body.tripDatas;
          expect(trip.location).to.eq('Đà Nẵng');
          expect(trip.transportCostTotal).to.eq(100000);
          expect(trip.foodCostTotal).to.eq(300000);
          expect(trip.otherCostTotal).to.eq(50000);
          expect(trip.dataTripDays).to.have.length(2);
          expect(trip.dataTripDays[0].challenges[0]).to.include({points: 40, completed: false});
          expect(trip.dataTripDays[1].challenges).to.deep.eq([]);
          expect(trip).not.to.have.property('userId');
        });
      });
    });
  });

  it('returns the first challenge of each day for the map', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        get(`/trip-plan/location/${tripId}`, token).then(res => {
          expect(res.status).to.eq(200);
          // coordinates are stored as strings
          expect(res.body.result).to.deep.eq([
            {day: 0, location: 'Cầu Rồng, Da Nang', latitude: String(PLACE.latitude), longitude: String(PLACE.longitude)},
          ]);
        });
      });
    });
  });

  it('refuses missing data and a duplicate name', () => {
    signIn().then(({token}) => {
      post('/trip-plan/save-trip', token, {nameTrip: 'x'}).its('status').should('eq', 400);
      saveTrip(token, 'Same name');
      post('/trip-plan/save-trip', token, {
        nameTrip: 'Same name', location: 'Huế', startDate: '2026-12-10', endDate: '2026-12-11', jsonTrip: [],
      }).its('status').should('eq', 400);
    });
  });

  it('soft-deletes a trip: it leaves the list and its detail is gone', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        del(`/trip-plan/${tripId}`, token).its('status').should('eq', 200);
        get('/trip-plan/get-trip', token).its('body.dataTrip').should('deep.eq', []);
        get(`/trip-plan/get-trip/${tripId}`, token).its('status').should('eq', 404);
      });
    });
  });

  it('hides a trip from every other user', () => {
    signIn().then(owner => {
      signIn().then(other => {
        saveTrip(owner.token).then(({tripId}) => {
          get(`/trip-plan/get-trip/${tripId}`, other.token).its('status').should('eq', 404);
          del(`/trip-plan/${tripId}`, other.token).its('status').should('eq', 404);
          get(`/trip-plan/location/${tripId}`, other.token).its('status').should('eq', 404);
          get('/trip-plan/get-trip', other.token).its('body.dataTrip').should('deep.eq', []);
          // still there for the owner
          get(`/trip-plan/get-trip/${tripId}`, owner.token).its('status').should('eq', 200);
        });
      });
    });
  });

  it('duplicates a trip: new id, same content, original untouched', () => {
    signIn().then(({token}) => {
      saveTrip(token, 'Original').then(({tripId}) => {
        post(`/trip-plan/${tripId}/duplicate`, token).then(res => {
          expect(res.status).to.eq(201);
          expect(res.body.tripId).not.to.eq(tripId);
          expect(res.body.nameTrip).to.eq('Original (bản sao)');
          get(`/trip-plan/get-trip/${res.body.tripId}`, token).then(copy => {
            get(`/trip-plan/get-trip/${tripId}`, token).then(orig => {
              const c = copy.body.tripDatas;
              const o = orig.body.tripDatas;
              expect(c.location).to.eq(o.location);
              expect(c.transportCostTotal).to.eq(o.transportCostTotal);
              expect(c.dataTripDays).to.have.length(o.dataTripDays.length);
              expect(c.dataTripDays[0]._id).not.to.eq(o.dataTripDays[0]._id);
              expect(c.dataTripDays[0].challenges[0]._id).not.to.eq(o.dataTripDays[0].challenges[0]._id);
              expect(c.dataTripDays[0].challenges[0]).to.include({completed: false});
            });
          });
          // deleting the copy leaves the original
          del(`/trip-plan/${res.body.tripId}`, token).its('status').should('eq', 200);
          get(`/trip-plan/get-trip/${tripId}`, token).its('status').should('eq', 200);
        });
      });
    });
  });

  it('duplicates a trip owned by someone else: 404, nothing created', () => {
    signIn().then(owner => {
      signIn().then(other => {
        saveTrip(owner.token).then(({tripId}) => {
          post(`/trip-plan/${tripId}/duplicate`, other.token).its('status').should('eq', 404);
          get('/trip-plan/get-trip', other.token).its('body.dataTrip').should('deep.eq', []);
        });
      });
    });
  });

  it('duplicate: 404 for unknown / invalid ids and 401 without a token', () => {
    signIn().then(({token}) => {
      post('/trip-plan/not-an-id/duplicate', token).its('status').should('eq', 404);
      post('/trip-plan/64b0000000000000000000aa/duplicate', token).its('status').should('eq', 404);
      post('/trip-plan/64b0000000000000000000aa/duplicate').its('status').should('eq', 401);
    });
  });

  it('favorites: add is idempotent (no duplicate), list is per user, remove works', () => {
    signIn().then(owner => {
      signIn().then(other => {
        saveTrip(owner.token, 'Fav').then(({tripId}) => {
          post(`/trip-plan/${tripId}/favorite`, owner.token).its('status').should('eq', 200);
          post(`/trip-plan/${tripId}/favorite`, owner.token).its('status').should('eq', 200);
          get('/trip-plan/favorites', owner.token).its('body.dataTrip').should('have.length', 1);
          // another account sees nothing and cannot touch the list of the owner
          get('/trip-plan/favorites', other.token).its('body.dataTrip').should('deep.eq', []);
          post(`/trip-plan/${tripId}/favorite`, other.token).its('status').should('eq', 404);
          del(`/trip-plan/${tripId}/favorite`, other.token).its('status').should('eq', 200);
          get('/trip-plan/favorites', owner.token).its('body.dataTrip').should('have.length', 1);
          del(`/trip-plan/${tripId}/favorite`, owner.token).its('status').should('eq', 200);
          get('/trip-plan/favorites', owner.token).its('body.dataTrip').should('deep.eq', []);
        });
      });
    });
  });

  it('favorites: a deleted trip leaves the favorites list', () => {
    signIn().then(({token}) => {
      saveTrip(token, 'Fav then delete').then(({tripId}) => {
        post(`/trip-plan/${tripId}/favorite`, token).its('status').should('eq', 200);
        del(`/trip-plan/${tripId}`, token).its('status').should('eq', 200);
        get('/trip-plan/favorites', token).its('body.dataTrip').should('deep.eq', []);
        post(`/trip-plan/${tripId}/favorite`, token).its('status').should('eq', 404);
        del(`/trip-plan/${tripId}/favorite`, token).its('status').should('eq', 200);
      });
    });
  });

  it('export PDF: the owner gets a PDF named after the trip, nothing is changed', () => {
    signIn().then(({token}) => {
      saveTrip(token, 'Da Nang: PDF/test').then(({tripId}) => {
        get(`/trip-plan/get-trip/${tripId}`, token).then(before => {
          get(`/trip-plan/${tripId}/export-pdf`, token, {lang: 'en'}).then(res => {
            expect(res.status).to.eq(200);
            expect(String(res.headers['content-type'])).to.contain('application/pdf');
            expect(String(res.headers['content-disposition'])).to.contain('attachment').and.to.contain('filename="Da Nang PDF test.pdf"');
            expect(String(res.body).startsWith('%PDF-')).to.eq(true);
          });
          // exporting is read only
          get(`/trip-plan/get-trip/${tripId}`, token).its('body').should('deep.eq', before.body);
        });
      });
    });
  });

  it('export PDF: a trip without any day still exports', () => {
    signIn().then(({token}) => {
      post('/trip-plan/save-trip', token, {
        nameTrip: 'Empty plan',
        location: 'Huế',
        startDate: '2026-12-01',
        endDate: '2026-12-02',
        jsonTrip: {},
      }).then(saved => {
        expect(saved.status).to.eq(200);
        get(`/trip-plan/${saved.body.tripId}/export-pdf`, token).then(res => {
          expect(res.status).to.eq(200);
          expect(String(res.body).startsWith('%PDF-')).to.eq(true);
        });
      });
    });
  });

  it('export PDF: someone else\'s or a deleted trip gives 404, no token 401', () => {
    signIn().then(owner => {
      signIn().then(other => {
        saveTrip(owner.token).then(({tripId}) => {
          get(`/trip-plan/${tripId}/export-pdf`, other.token).its('status').should('eq', 404);
          get(`/trip-plan/${tripId}/export-pdf`).its('status').should('eq', 401);
          del(`/trip-plan/${tripId}`, owner.token).its('status').should('eq', 200);
          get(`/trip-plan/${tripId}/export-pdf`, owner.token).its('status').should('eq', 404);
        });
      });
    });
    signIn().then(({token}) => {
      get('/trip-plan/not-an-id/export-pdf', token).its('status').should('eq', 404);
      get('/trip-plan/64b0000000000000000000aa/export-pdf', token).its('status').should('eq', 404);
    });
  });

  it('sharing: create a link, open it without signing in, revoke it', () => {
    signIn().then(({token}) => {
      saveTrip(token, 'Da Nang share').then(({tripId}) => {
        const share = `/trip-plan/${tripId}/share`;
        get(share, token).its('body.isShared').should('eq', false);

        post(share, token).then(on => {
          expect(on.status).to.eq(200);
          expect(on.body).to.include({isShared: true, permission: 'view'});
          expect(on.body.shareToken).to.match(/^[A-Za-z0-9_-]{43}$/);
          const link = `/shared/${on.body.shareToken}`;

          // asking again keeps the same link
          post(share, token).its('body.shareToken').should('eq', on.body.shareToken);

          // anyone can read it, with no token, and sees only the plan
          get(link).then(res => {
            expect(res.status).to.eq(200);
            expect(String(res.headers['cache-control'])).to.contain('no-store');
            const trip = res.body.tripDatas;
            expect(trip.nameTrip).to.eq('Da Nang share');
            expect(trip.dataTripDays).to.have.length(2);
            expect(trip.dataTripDays[0].challenges[0]).to.include({points: 40});
            const text = JSON.stringify(res.body);
            ['userId', 'shareToken', 'completed', 'imageUrl'].forEach(key => expect(text).not.to.contain(key));
          });

          // read only: nothing can be written through the link
          ['POST', 'PUT', 'PATCH', 'DELETE'].forEach(method => call(method, link).its('status').should('eq', 404));

          // revoke: the link stops working and sharing again gives a new one
          del(share, token).its('body.isShared').should('eq', false);
          get(link).its('status').should('eq', 404);
          post(share, token).then(again => {
            expect(again.body.shareToken).not.to.eq(on.body.shareToken);
            get(link).its('status').should('eq', 404);
            get(`/shared/${again.body.shareToken}`).its('status').should('eq', 200);
          });
        });
      });
    });
  });

  it('sharing: only the owner manages it, bad and deleted links give 404', () => {
    signIn().then(owner => {
      signIn().then(other => {
        saveTrip(owner.token).then(({tripId}) => {
          const share = `/trip-plan/${tripId}/share`;
          get(share, other.token).its('status').should('eq', 404);
          post(share, other.token).its('status').should('eq', 404);
          del(share, other.token).its('status').should('eq', 404);
          post(share).its('status').should('eq', 401);
          post('/trip-plan/not-an-id/share', owner.token).its('status').should('eq', 404);

          post(share, owner.token).then(on => {
            get('/shared/not-a-token').its('status').should('eq', 404);
            get(`/shared/${'A'.repeat(43)}`).its('status').should('eq', 404);
            // a deleted trip is no longer reachable by its link
            del(`/trip-plan/${tripId}`, owner.token).its('status').should('eq', 200);
            get(`/shared/${on.body.shareToken}`).its('status').should('eq', 404);
          });
        });
      });
    });
  });

  it('visibility: private by default, the owner makes it public and private again', () => {
    signIn().then(({token}) => {
      saveTrip(token, 'Da Nang visibility').then(({tripId}) => {
        const vis = `/trip-plan/${tripId}/visibility`;
        const open = `/public-trip/${tripId}`;
        get(vis, token).its('body.visibility').should('eq', 'private');
        get(open).its('status').should('eq', 404);

        put(vis, token, {visibility: 'public'}).its('body.visibility').should('eq', 'public');
        get(vis, token).its('body.visibility').should('eq', 'public');
        // anyone can read it without signing in, and sees only the plan
        get(open).then(res => {
          expect(res.status).to.eq(200);
          expect(String(res.headers['cache-control'])).to.contain('no-store');
          expect(res.body.tripDatas.nameTrip).to.eq('Da Nang visibility');
          expect(res.body.tripDatas.dataTripDays).to.have.length(2);
          const text = JSON.stringify(res.body);
          ['userId', 'shareToken', 'completed', 'imageUrl'].forEach(key => expect(text).not.to.contain(key));
        });
        // read only
        ['POST', 'PUT', 'PATCH', 'DELETE'].forEach(method => call(method, open).its('status').should('be.oneOf', [401, 404]));

        // back to private: closed at once
        put(vis, token, {visibility: 'private'}).its('body.visibility').should('eq', 'private');
        get(open).its('status').should('eq', 404);
      });
    });
  });

  it('visibility: only the owner changes it, public does not open the owner endpoints', () => {
    signIn().then(owner => {
      signIn().then(other => {
        saveTrip(owner.token).then(({tripId}) => {
          const vis = `/trip-plan/${tripId}/visibility`;
          put(vis, other.token, {visibility: 'public'}).its('status').should('eq', 404);
          get(vis, other.token).its('status').should('eq', 404);
          put(vis, undefined, {visibility: 'public'}).its('status').should('eq', 401);
          put('/trip-plan/not-an-id/visibility', owner.token, {visibility: 'public'}).its('status').should('eq', 404);
          get(`/public-trip/${tripId}`).its('status').should('eq', 404);

          ['secret', '', null, 1].forEach(value => put(vis, owner.token, {visibility: value}).its('status').should('eq', 400));
          get(vis, owner.token).its('body.visibility').should('eq', 'private');

          put(vis, owner.token, {visibility: 'public'}).its('status').should('eq', 200);
          get(`/trip-plan/get-trip/${tripId}`, other.token).its('status').should('eq', 404);
          del(`/trip-plan/${tripId}`, other.token).its('status').should('eq', 404);
          post(`/trip-plan/${tripId}/duplicate`, other.token).its('status').should('eq', 404);
          put(vis, other.token, {visibility: 'private'}).its('status').should('eq', 404);
          get(`/public-trip/${tripId}`).its('status').should('eq', 200);

          // a deleted trip is no longer public
          del(`/trip-plan/${tripId}`, owner.token).its('status').should('eq', 200);
          get(`/public-trip/${tripId}`).its('status').should('eq', 404);
          get('/public-trip/not-an-id').its('status').should('eq', 404);
        });
      });
    });
  });

  it('visibility: going private also revokes the share link', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        post(`/trip-plan/${tripId}/share`, token).then(on => {
          const link = `/shared/${on.body.shareToken}`;
          put(`/trip-plan/${tripId}/visibility`, token, {visibility: 'public'}).its('status').should('eq', 200);
          get(link).its('status').should('eq', 200);

          put(`/trip-plan/${tripId}/visibility`, token, {visibility: 'private'}).its('status').should('eq', 200);
          get(link).its('status').should('eq', 404);
          get(`/trip-plan/${tripId}/share`, token).its('body.isShared').should('eq', false);
        });
      });
    });
  });

  it('explore: public trips are listed for anyone and another user can keep a private copy', () => {
    signIn().then(owner => {
      signIn().then(reader => {
        saveTrip(owner.token, 'Explore public').then(({tripId}) => {
          saveTrip(owner.token, 'Explore private');
          put(`/trip-plan/${tripId}/visibility`, owner.token, {visibility: 'public'}).its('status').should('eq', 200);

          // listed without signing in: cards only, and only the public trip
          get('/public-trip').then(res => {
            expect(res.status).to.eq(200);
            expect(res.body).to.include({page: 1});
            const names = res.body.items.map((t: any) => t.nameTrip);
            expect(names).to.include('Explore public');
            expect(names).not.to.include('Explore private');
            expect(JSON.stringify(res.body)).not.to.contain('userId');
          });
          get('/public-trip', undefined, {page: 'abc', limit: '99999'}).its('body.limit').should('eq', 50);

          // keeping a copy needs a signed-in user
          post(`/public-trip/${tripId}/copy`).its('status').should('eq', 401);
          post(`/public-trip/${tripId}/copy`, reader.token).then(copy => {
            expect(copy.status).to.eq(201);
            expect(copy.body.nameTrip).to.eq('Explore public (bản sao)');
            // the copy is the reader's, private, with fresh progress
            get(`/trip-plan/get-trip/${copy.body.tripId}`, reader.token).then(detail => {
              expect(detail.status).to.eq(200);
              expect(detail.body.tripDatas.visibility).to.eq('private');
              expect(detail.body.tripDatas.dataTripDays[0].challenges[0]).to.include({completed: false});
            });
            get(`/public-trip/${copy.body.tripId}`).its('status').should('eq', 404);
            get(`/trip-plan/get-trip/${copy.body.tripId}`, owner.token).its('status').should('eq', 404);
          });

          // a private trip cannot be copied, and the original is untouched
          post(`/public-trip/not-an-id/copy`, reader.token).its('status').should('eq', 404);
          put(`/trip-plan/${tripId}/visibility`, owner.token, {visibility: 'private'}).its('status').should('eq', 200);
          post(`/public-trip/${tripId}/copy`, reader.token).its('status').should('eq', 404);
          get(`/trip-plan/get-trip/${tripId}`, owner.token).its('status').should('eq', 200);
        });
      });
    });
  });

  it('favorites: 404 for invalid ids and 401 without a token', () => {
    signIn().then(({token}) => {
      post('/trip-plan/not-an-id/favorite', token).its('status').should('eq', 404);
      del('/trip-plan/not-an-id/favorite', token).its('status').should('eq', 404);
      get('/trip-plan/favorites').its('status').should('eq', 401);
    });
  });

  it('answers 404 for an id that is not an ObjectId', () => {
    signIn().then(({token}) => get('/trip-plan/get-trip/not-an-id', token).its('status').should('eq', 404));
  });

  it('requires a signed-in user', () => {
    post('/trip-plan/save-trip', undefined, {}).its('status').should('eq', 401);
    del('/trip-plan/64b000000000000000000001').its('status').should('eq', 401);
  });
});

describe('challenges', () => {
  it('tells how far the user is from the place', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({chaId}) => {
        post('/challenge/checkProgress', token, {chaId, ...NEAR}).then(close => {
          expect(close.status).to.eq(200);
          expect(close.body.message).to.eq('Complete the challenge');
          expect(close.body.distance).to.be.lessThan(250);
        });
        post('/challenge/checkProgress', token, {chaId, ...FAR}).then(away => {
          expect(away.body.message).to.eq('Please complete the mission at the location provided');
          expect(away.body.distance).to.be.greaterThan(250);
        });
      });
    });
  });

  it('needs lat and lng', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({chaId}) => post('/challenge/checkProgress', token, {chaId}).its('status').should('eq', 400));
    });
  });

  it('awards the points once, then shows the user in the rankings', () => {
    signIn().then(({user, token}) => {
      saveTrip(token).then(({chaId, tripId}) => {
        post('/challenge/updateProgress', token, {chaId, imageUrl: '/files/abc'}).its('status').should('eq', 200);
        // a second completion must not give the points again
        post('/challenge/updateProgress', token, {chaId, imageUrl: '/files/abc'});

        get(`/trip-plan/get-trip/${tripId}`, token).then(detail => {
          expect(detail.body.tripDatas.dataTripDays[0].challenges[0]).to.include({completed: true, imageUrl: '/files/abc'});
        });
        stored(user.id).its('experience').should('eq', 40);

        ['weekly', 'monthly', 'rankingUserHighest'].forEach(path => {
          get(`/rankings/${path}`).then(res => {
            expect(res.status).to.eq(200);
            expect(res.body.dataRanks).to.be.an('array');
          });
        });
        get('/rankings/rankingUserHighest').then(res => {
          expect(res.body.dataRanks.some((r: any) => r.experience >= 40)).to.eq(true);
        });
      });
    });
  });

  it('only works on the user\'s own challenges', () => {
    signIn().then(owner => {
      signIn().then(other => {
        saveTrip(owner.token).then(({chaId}) => {
          const body = {chaId, imageUrl: '/files/x', ...NEAR};
          post('/challenge/checkProgress', other.token, body).its('status').should('eq', 404);
          post('/challenge/updateProgress', other.token, body).its('status').should('eq', 404);
          post('/challenge/updateProgress', owner.token, {chaId: 'nope'}).its('status').should('eq', 404);
        });
      });
    });
  });
});
