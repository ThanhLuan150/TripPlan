import type {CyHttpMessages} from 'cypress/types/net-stubbing';
import vi from '@/locales/vi.json';

// ---------------------------------------------------------------------------
// Texts: the tests run in Vietnamese. t('auth.login.submit') reads the same
// translation file as the app, so a reworded text does not break a test.
// ---------------------------------------------------------------------------
export const t = (key: string, vars: Record<string, string | number> = {}): string => {
  const value = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], vi);
  if (typeof value !== 'string') {
    throw new Error(`No translation for ${key}`);
  }
  return value.replace(/\{\{(\w+)\}\}/g, (_, name) => String(vars[name] ?? ''));
};

// border of an invalid field (rose-400)
export const RED_BORDER = 'rgb(251, 113, 133)';

// ---------------------------------------------------------------------------
// The mocked backend
// ---------------------------------------------------------------------------
// The app is built with VITE_API_URL=<origin>/api-e2e (see package.json), so
// the API is on the same origin as the page: no CORS, one cy.intercept.
export const API_PREFIX = '/api-e2e';

export interface Call {
  method: string;
  path: string;
  body: unknown;
  query: Record<string, string>;
}

// An error answer: reply(401, {message: 'Wrong password'})
export const reply = (status: number, body: unknown = {}) => ({__reply: true as const, status, body});
const isReply = (value: unknown): value is ReturnType<typeof reply> =>
  typeof value === 'object' && value !== null && (value as {__reply?: boolean}).__reply === true;

type Handler = (call: Call) => unknown;

// Answers the API calls of the page. `routes` maps "METHOD /path" to the JSON to
// send (or a function of the request). Anything else gets an empty list.
// Returns the list of every request the app made (method, path, body, query).
export const mockApi = (routes: Record<string, unknown> = {}): Call[] => {
  const calls: Call[] = [];
  cy.intercept(`**${API_PREFIX}/**`, (req: CyHttpMessages.IncomingHttpRequest) => {
    const url = new URL(req.url);
    const isJson = String(req.headers['content-type'] ?? '').includes('json');
    const call: Call = {
      method: req.method,
      path: url.pathname.slice(API_PREFIX.length),
      // a file upload (multipart) has no JSON body
      body: isJson ? req.body : null,
      query: Object.fromEntries(url.searchParams.entries()),
    };
    calls.push(call);
    const handler = routes[`${call.method} ${call.path}`];
    const result = typeof handler === 'function' ? (handler as Handler)(call) : handler;
    req.reply({
      statusCode: isReply(result) ? result.status : 200,
      body: isReply(result) ? result.body : (result ?? []),
    });
  });
  return calls;
};

export const callsTo = (calls: Call[], method: string, path: string) =>
  calls.filter(call => call.method === method && call.path === path);

// Waits until the app has made this call, then yields it: expectCall(calls, 'POST', '/chat').its('body').should(...)
export const expectCall = (calls: Call[], method: string, path: string, count = 1) =>
  cy
    .wrap(calls, {log: false})
    .should(list => expect(callsTo(list, method, path).length, `${method} ${path} calls`).to.be.at.least(count))
    .then(list => cy.wrap(callsTo(list, method, path)[count - 1]));

// Checks the app did not make this call (after something else has shown the UI settled).
export const expectNoCall = (calls: Call[], method: string, path?: string) =>
  cy
    .wrap(calls, {log: false})
    .should(list =>
      expect(
        list.filter(call => call.method === method && (path === undefined || call.path === path)),
        `${method} ${path ?? '*'} calls`,
      ).to.have.length(0),
    );

// ---------------------------------------------------------------------------
// The user
// ---------------------------------------------------------------------------
interface Session {
  accessToken: string;
  data: Record<string, unknown>;
}

// The session is kept on globalThis: the support file and every spec are bundled
// separately (each has its own copy of this module) but run in the same window.
interface State {
  session: Session | null;
  seeded: boolean;
}
const state = (): State => {
  const holder = globalThis as unknown as {__e2e?: State};
  return (holder.__e2e ??= {session: null, seeded: false});
};

export const resetSession = () => {
  Object.assign(state(), {session: null, seeded: false});
};

// Starts the next visit() already signed in (the session lives in localStorage).
// `data` replaces the details of the user (profile page, greeting...).
export const signIn = (role: 'user' | 'admin' = 'user', data: Record<string, unknown> = {}) => {
  Object.assign(state(), {
    session: {
      accessToken: 'e2e-token',
      data: {username: role === 'admin' ? 'admin1' : 'lan123', fullname: 'Lan Nguyễn', email: 'lan@x.vn', role, ...data},
    },
    seeded: false,
  });
};

// Opens a page. The session of signIn() is seeded once per test: after a
// logout a new visit stays signed out.
export const visit = (path: string, options: Partial<Cypress.VisitOptions> = {}) =>
  cy.visit(path, {
    ...options,
    onBeforeLoad(win) {
      const {session, seeded} = state();
      if (session && !seeded) {
        state().seeded = true;
        win.localStorage.setItem('user', JSON.stringify(session));
        win.localStorage.setItem('AccessToken', session.accessToken);
      }
      options.onBeforeLoad?.(win);
    },
  });

// Fixes the date of the page (timers keep running): the calendars and
// "too late today" become predictable. Call it before visit().
export const fixDate = (date: Date) => cy.clock(date.getTime(), ['Date']);

// ---------------------------------------------------------------------------
// Downloads: records the file names the app saves (a CSV export) instead of
// really downloading them.
// ---------------------------------------------------------------------------
export const stubDownloads = () => {
  const names: string[] = [];
  cy.window({log: false}).then(win => {
    cy.stub(win.URL, 'createObjectURL').returns('blob:e2e');
    cy.stub(win.URL, 'revokeObjectURL');
    cy.stub(win.HTMLAnchorElement.prototype, 'click').callsFake(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
  });
  return names;
};
