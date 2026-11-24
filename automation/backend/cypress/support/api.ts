// Helpers of the specs. Everything returns a Cypress chain: use .then() to read the value.

export const PASSWORD = 'secret123';
// where the stubbed place lookup puts every challenge (the Han river bridge, Da Nang)
export const PLACE = {latitude: 16.0611, longitude: 108.2278};

export interface Res {
  status: number;
  body: any;
  headers: Record<string, string | string[]>;
}
export interface Options {
  token?: string;
  body?: unknown;
  qs?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export const call = (method: string, url: string, o: Options = {}): Cypress.Chainable<Res> =>
  cy
    .request({
      method,
      url,
      body: o.body as Cypress.RequestBody,
      qs: o.qs,
      headers: {
        ...(o.token === undefined ? {} : {Authorization: `Bearer ${o.token}`}),
        ...o.headers,
      },
      failOnStatusCode: false,
    })
    .then(r => ({
      status: r.status,
      body: r.body,
      headers: r.headers as Res['headers'],
    }));

export const get = (url: string, token?: string, qs?: Options['qs']) => call('GET', url, {token, qs});
export const post = (url: string, token?: string, body?: unknown) => call('POST', url, {token, body});
export const patch = (url: string, token: string | undefined, body?: unknown) => call('PATCH', url, {token, body});
export const put = (url: string, token: string | undefined, body?: unknown) => call('PUT', url, {token, body});
export const del = (url: string, token?: string) => call('DELETE', url, {token});

// ---- accounts (the /__test endpoints of scripts/control.mjs) --------------------------------

export interface TestUser {
  id: string;
  username: string;
  email: string;
}

// An account straight in the database (active, password "secret123"), without the e-mail step.
export const makeUser = (fields: Record<string, unknown> = {}): Cypress.Chainable<TestUser> =>
  call('POST', '/__test/users', {body: fields}).then(r => r.body as TestUser);

// An account, signed in through the API.
export const signIn = (fields: Record<string, unknown> = {}): Cypress.Chainable<{user: TestUser; token: string}> =>
  makeUser(fields).then(user =>
    post('/auth/login', undefined, {username: user.username, password: PASSWORD}).then(res => {
      expect(res.status, 'sign-in').to.eq(200);
      return {user, token: res.body.accessToken as string};
    }),
  );

export const signInAdmin = (fields: Record<string, unknown> = {}) => signIn({role: 'admin', ...fields});

export const stored = (key: string): Cypress.Chainable<any> => get(`/__test/users/${key}`).then(r => r.body);
export const update = (id: string, fields: Record<string, unknown>) => patch(`/__test/users/${id}`, undefined, fields);

export const forge = (which: 'access' | 'refresh' | 'other', payload: unknown, expiresIn: string | number = '1h') =>
  post('/__test/token', undefined, {which, payload, expiresIn}).then(r => r.body.token as string);

// ---- the stubs ----------------------------------------------------------------------------

export const external = (fields: Record<string, unknown>) => post('/__test/external', undefined, fields);
export const resetExternal = () => external({reset: true});
export const prompts = () => get('/__test/external').then(r => r.body.prompts as string[]);

// ---- trips ----------------------------------------------------------------------------------

let counter = 0;

// A saved trip with one challenge (through the API, as the app does): { tripId, chaId }
export const saveTrip = (token: string, nameTrip = `Trip ${Date.now()}-${counter++}`) =>
  post('/trip-plan/save-trip', token, {
    nameTrip,
    location: 'Đà Nẵng',
    startDate: '2026-12-01',
    endDate: '2026-12-02',
    jsonTrip: [
      {
        title: 'Day 1',
        transportCost: 100000,
        foodCost: 200000,
        otherCost: 50000,
        activities: [{challenge_summary: 'Cầu Rồng', name_location: 'Cầu Rồng', province: 'Đà Nẵng', level_of_difficult: 40}],
      },
      {title: 'Day 2', transportCost: 0, foodCost: 100000, otherCost: 0, activities: []},
    ],
  }).then(res => {
    expect(res.status, 'save-trip').to.eq(200);
    const tripId = res.body.tripId as string;
    return get(`/trip-plan/get-trip/${tripId}`, token).then(detail => ({
      tripId,
      chaId: detail.body.tripDatas.dataTripDays[0].challenges[0]._id as string,
    }));
  });

// ---- misc -------------------------------------------------------------------------------

export const idOf = (item: any): string => item.id ?? item._id;

// a distance in degrees of latitude: 0.00009 is ~10 m, 0.01 is ~1.1 km
export const NEAR = {lat: PLACE.latitude + 0.00009, lng: PLACE.longitude};
export const FAR = {lat: PLACE.latitude + 0.01, lng: PLACE.longitude};
