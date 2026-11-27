import {del, external, get, post, signIn} from '../support/api';

// the stubbed place lookup puts every place at the same spot: the distances come from the stubbed routing service
const matrix = (m: number[][]) => ({routeMatrix: {distances: m, durations: m.map(row => row.map(v => v * 2))}});
const MATRIX = [
  [0, 30, 10, 20],
  [30, 0, 20, 10],
  [10, 20, 0, 5],
  [20, 10, 5, 0],
];

const activity = (name: string) => ({challenge_summary: name, name_location: name, province: 'Đà Nẵng', level_of_difficult: 30});

// a trip whose first day has the given places (in that order) and an empty second day
const trip = (token: string, names = ['A', 'B', 'C', 'D']) =>
  post('/trip-plan/save-trip', token, {
    nameTrip: `Route ${Date.now()}`,
    location: 'Đà Nẵng',
    startDate: '2026-12-01',
    endDate: '2026-12-02',
    jsonTrip: [
      {title: 'Day 1', transportCost: 1, foodCost: 1, otherCost: 1, activities: names.map(activity)},
      {title: 'Day 2', transportCost: 0, foodCost: 0, otherCost: 0, activities: []},
    ],
  }).then(res => {
    expect(res.status, 'save-trip').to.eq(200);
    const tripId = res.body.tripId as string;
    return get(`/trip-plan/get-trip/${tripId}`, token).then(detail => ({tripId, dayId: detail.body.tripDatas.dataTripDays[0]._id as string}));
  });

const names = (token: string, tripId: string) =>
  get(`/trip-plan/get-trip/${tripId}`, token).then(res => res.body.tripDatas.dataTripDays[0].challenges.map((c: any) => c.nameLocation));
const url = (tripId: string) => `/trip-plan/${tripId}/route-optimization`;

describe('AI route optimization', () => {
  beforeEach(() => {
    external({reset: true});
  });

  it('proposes a shorter order with real distances, and changes nothing until Accept', () => {
    signIn().then(({token}) => {
      trip(token).then(({tripId, dayId}) => {
        external(matrix(MATRIX));

        post(url(tripId), token, {dayId}).then(res => {
          expect(res.status).to.eq(200);
          expect(res.body.source).to.eq('road');
          expect(res.body.currentOrder.map((p: any) => p.name)).to.deep.eq(['A', 'B', 'C', 'D']);
          expect(res.body.proposedOrder.map((p: any) => p.name)).to.deep.eq(['A', 'C', 'D', 'B']);
          expect(res.body.current.distance).to.eq(55);
          expect(res.body.proposed.distance).to.eq(25);
          expect(res.body.proposed.duration).to.eq(50);
          expect(res.body.improved).to.eq(true);
        });
        names(token, tripId).should('deep.eq', ['A', 'B', 'C', 'D']);
      });
    });
  });

  it('saves the stored order only on Accept and keeps every place', () => {
    signIn().then(({token}) => {
      trip(token).then(({tripId, dayId}) => {
        external(matrix(MATRIX));
        post(url(tripId), token, {dayId}).then(res => {
          post(`${url(tripId)}/apply`, token, {proposalId: res.body.proposalId, order: ['D', 'C', 'B', 'A']}).its('status').should('eq', 200);
        });
        names(token, tripId).should('deep.eq', ['A', 'C', 'D', 'B']);
      });
    });
  });

  it('Reject forgets the proposal: the itinerary stays and the proposal can no longer be accepted', () => {
    signIn().then(({token}) => {
      trip(token).then(({tripId, dayId}) => {
        external(matrix(MATRIX));
        post(url(tripId), token, {dayId}).then(res => {
          del(`${url(tripId)}/${res.body.proposalId}`, token).its('status').should('eq', 200);
          post(`${url(tripId)}/apply`, token, {proposalId: res.body.proposalId}).its('status').should('eq', 404);
        });
        names(token, tripId).should('deep.eq', ['A', 'B', 'C', 'D']);
      });
    });
  });

  it('says so when the current order is already the shortest, and stores no proposal', () => {
    signIn().then(({token}) => {
      trip(token, ['A', 'B', 'C']).then(({tripId, dayId}) => {
        external(matrix([[0, 1, 2], [1, 0, 1], [2, 1, 0]]));
        post(url(tripId), token, {dayId}).then(res => {
          expect(res.status).to.eq(200);
          expect(res.body.improved).to.eq(false);
          expect(res.body.proposalId).to.eq(null);
        });
      });
    });
  });

  it('falls back to straight-line distances without any travel time when the routing service is down', () => {
    signIn().then(({token}) => {
      trip(token).then(({tripId, dayId}) => {
        external({routeMatrix: {error: 'down'}});
        post(url(tripId), token, {dayId}).then(res => {
          expect(res.status).to.eq(200);
          expect(res.body.source).to.eq('straight-line');
          expect(res.body.current.duration).to.eq(null);
        });
      });
    });
  });

  it('refuses a day with fewer than 3 places, another day and another user', () => {
    signIn().then(({token}) => {
      trip(token, ['A', 'B']).then(({tripId, dayId}) => {
        post(url(tripId), token, {dayId}).then(res => {
          expect(res.status).to.eq(400);
          expect(res.body.code).to.eq('ROUTE_NOT_ENOUGH_COORDINATES');
        });
        post(url(tripId), token, {dayId: '64b0000000000000000000ff'}).its('status').should('eq', 404);
        signIn().then(({token: stranger}) => {
          post(url(tripId), stranger, {dayId}).its('status').should('eq', 404);
        });
        post(url(tripId), undefined, {dayId}).its('status').should('eq', 401);
      });
    });
  });
});
