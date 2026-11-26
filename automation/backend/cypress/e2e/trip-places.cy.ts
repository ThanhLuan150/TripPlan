import {get, post, saveTrip, signIn} from '../support/api';

const detail = (token: string, tripId: string) => get(`/trip-plan/get-trip/${tripId}`, token).its('body.tripDatas');
const addPlace = (token: string | undefined, tripId: string, body: unknown) => post(`/trip-plan/${tripId}/places`, token, body);
const dayIds = (token: string, tripId: string) => detail(token, tripId).then(trip => trip.dataTripDays.map((day: any) => day._id as string));

describe('Add a place to an existing trip', () => {
  it('requires sign-in and ownership', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        dayIds(token, tripId).then(([day1]) => {
          addPlace(undefined, tripId, {name: 'Bà Nà Hills', dayId: day1}).its('status').should('eq', 401);
          signIn().then(({token: stranger}) => {
            addPlace(stranger, tripId, {name: 'Bà Nà Hills', dayId: day1}).its('status').should('eq', 404);
          });
        });
      });
    });
  });

  it('adds the place to the chosen day, located, with its own progress', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        dayIds(token, tripId).then(([, day2]) => {
          addPlace(token, tripId, {name: 'Bà Nà Hills', dayId: day2, province: 'Đà Nẵng', summary: 'Cầu Vàng'}).then(res => {
            expect(res.status).to.eq(201);
            expect(res.body.located).to.eq(true);
            expect(res.body.day.id).to.eq(day2);
          });
          detail(token, tripId).then(trip => {
            expect(trip.dataTripDays[0].challenges).to.have.length(1);
            const [added] = trip.dataTripDays[1].challenges;
            expect(added).to.include({nameLocation: 'Bà Nà Hills', challengeSummary: 'Cầu Vàng', completed: false});
            expect(added.latitude).to.exist;
          });
        });
      });
    });
  });

  it('refuses a place the trip already has (any day, any case)', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        dayIds(token, tripId).then(([, day2]) => {
          addPlace(token, tripId, {name: '  cầu rồng ', dayId: day2}).then(res => {
            expect(res.status).to.eq(409);
            expect(res.body.code).to.eq('PLACE_ALREADY_IN_TRIP');
          });
          detail(token, tripId).its('dataTripDays.1.challenges').should('have.length', 0);
        });
      });
    });
  });

  it('refuses a day that is full', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        dayIds(token, tripId).then(([day1]) => {
          for (let i = 0; i < 9; i++) {
            addPlace(token, tripId, {name: `Nơi ${i}`, dayId: day1}).its('status').should('eq', 201);
          }
          addPlace(token, tripId, {name: 'Nơi thứ mười một', dayId: day1}).then(res => {
            expect(res.status).to.eq(409);
            expect(res.body.code).to.eq('DAY_FULL');
          });
        });
      });
    });
  });

  it('rejects an invalid request and a day of another trip', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        dayIds(token, tripId).then(([day1]) => {
          [{}, {name: '  ', dayId: day1}, {name: 'Nơi X'}, {name: 'Nơi X', dayId: 'abc'}].forEach(body => {
            addPlace(token, tripId, body).its('status').should('eq', 400);
          });
          saveTrip(token).then(other => {
            dayIds(token, other.tripId).then(([otherDay]) => {
              addPlace(token, tripId, {name: 'Nơi X', dayId: otherDay}).its('status').should('eq', 404);
            });
          });
        });
      });
    });
  });
});
