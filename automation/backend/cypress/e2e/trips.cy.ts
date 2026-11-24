import {FAR, NEAR, PLACE, del, get, post, saveTrip, signIn, stored} from '../support/api';

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
