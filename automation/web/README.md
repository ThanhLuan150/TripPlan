# Automation · web (Cypress end-to-end tests)

These tests open the **real web app in a real browser** and use it like a person: type, click,
press keys, read what is on the screen. The backend is **mocked** (`cy.intercept`), so no server,
database or internet is needed and every run gives the same result.

## How to run

All commands run in this folder (`automation/web`).

```powershell
npm install        # once here, and once in ../../web (the app that is tested). Cypress downloads its runner the first time (~250 MB)
npm run cypress:run        # builds the app, serves it, runs every spec headless (Electron)
```

| Command | What it does |
|---|---|
| `npm run cypress:run` | all specs, headless, on a desktop-sized screen |
| `npm run cypress:mobile` | the form specs again on a phone-sized screen (412 × 915) |
| `npm run cypress:open` | the **Cypress app**: pick a spec, watch it run step by step, time-travel through the DOM |
| `npx cypress run --browser edge` | use the installed Microsoft Edge (or `chrome`) instead of Electron |
| `npx cypress run --spec "cypress/e2e/auth/**"` | only a folder (a feature) |
| `npx cypress run --spec cypress/e2e/trips/create.cy.ts` | only a file (a screen) |

`npm run cypress:run` starts `app:serve` and, once the app answers on port 5174, runs `cy:desktop` (`cypress run`),
tied together by `start-server-and-test`. `app:serve` (`scripts/serve-app.mjs`) builds the web app from `../../web`
in its **test mode** (`web/.env.e2e`: the API is on the same origin, `/api-e2e`) into a **new folder in the system temp
directory** every time, then serves it with `vite preview`. A new folder each run means a folder Windows still has
locked from an earlier run can never make the build fail.

To run **one spec many times** while writing it, start the server once and keep it running:

```powershell
npm run app:serve          # builds the app and serves it: leave it running in a terminal
npx cypress run --spec cypress/e2e/trips/create.cy.ts      # in another terminal
```

A failed test saves a screenshot in `cypress/screenshots/` (it is ignored by git).

## Where things are

```
package.json            its own dependencies (Cypress...): the web app stays free of them
cypress.config.ts       Cypress settings (base URL, waits, retries)
vite.config.ts          bundling of the specs (the "@/" alias points to ../../web/src)
cypress/
  support/
    e2e.ts              runs before every test (blocks the internet, resets the session)
    helpers.ts          t(), mockApi(), signIn(), visit(), reply(), fixDate(), stubDownloads()...
    admin.ts            openAdmin() + the fixtures the admin API sends
    fixtures.ts         data the mocked API sends (user, trips, videos, ranking...)
  e2e/
    guard.cy.ts         who may open which part of the app
    home / ranking / videos / about .cy.ts
    auth/               landing, login, register, password-reset (forgot / code / new password)
    trips/              list, create (form + calendar), generate (AI suggestions), detail
    assistant/          chat.cy.ts (AI chat and its history)
    profile/            profile, edit-profile, notifications
    admin/              one file per admin screen: dashboard, reports, users, user-details, trips,
                        challenges, ai + notifications + activity log, videos, home-content,
                        moderation, roles + settings, layout (sidebar, header, menus)
```

One **spec file = one screen** (or a few small ones of a feature), one **`describe` = one feature**.

## Writing a test

```ts
import {callsTo, expectCall, mockApi, reply, signIn, t, visit} from '../../support/helpers';

describe('trip list', () => {
  beforeEach(() => signIn());                                   // start signed in (signIn('admin') for the panel)

  it('deletes a trip after confirmation', () => {
    const calls = mockApi({                                     // what the backend answers
      'GET /trip-plan/get-trip': {dataTrip: trips},
      'DELETE /trip-plan/t1': {message: 'ok'},                  // reply(500) for an error answer
    });
    visit('/assistant/trips');                                  // instead of cy.visit: it seeds the session

    cy.findByRole('button', {name: t('trips.list.delete')}).click();

    cy.findByText(t('trips.list.deleted')).should('be.visible');
    expectCall(calls, 'DELETE', '/trip-plan/t1');               // what the app sent
  });
});
```

- **Find things like a user does**: `cy.findByRole`, `cy.findByLabelText`, `cy.findByText`
  (Testing Library). Avoid CSS selectors. `cy.findAllBy…` + `.first()` when several match.
- **Texts come from the translation file**: `t('some.key')` reads `src/locales/vi.json` (the app is
  Vietnamese by default), so a reworded text does not break a test.
- `mockApi({'METHOD /path': answer})` answers the API. The answer can be a function of the request
  (`call.body`, `call.query`). Unknown calls get `[]`. It returns the list of every request the app made.
  `expectCall(calls, 'POST', '/chat').its('body').should(...)` waits for a call and checks it;
  `expectNoCall(calls, 'POST', '/x')` checks it was not made.
- `signIn(role, data)` puts a session in the browser before the page loads (`visit` does it once per test).
- `fixDate(new Date(2026, 2, 2, 9, 0))` fixes today's date (timers keep running); call it before `visit`.
- `stubDownloads()` records the files the app saves (CSV exports) instead of downloading them.
- Assert with `.should(...)`: Cypress retries until it passes (or 10 s). Do not use `cy.wait(ms)`.

## Rules the setup enforces

1. **Nothing leaves the machine.** Requests to other hosts are blocked (pictures get a 1×1 image).
2. **A crash fails the test.** Cypress fails a test when the page throws an uncaught error
   (`Cannot read properties of undefined…`), even if the assertions passed.

## Tips

- `findBy…` found several elements: make it more precise (`.first()`, `.within(...)`, a longer name).
- The app retries a failing request 3 times before showing its error state (≈ 7 s): an error test that
  waits for that state needs `{timeout: 20_000}`, or an API mock that fails 4 times.
- A test that passes alone but fails with the others: a leftover from the previous test. The session
  and the API mock are reset before each test (`support/e2e.ts`); keep other state inside the test.
- `Cypress.env()` no longer exists in Cypress 16; shared state lives on `globalThis` (see `helpers.ts`).

## Specs read the web app's files

A spec can import from the app with the `@/` alias (`web/src`), e.g. the admin fixtures
(`@/__tests__/fixtures/admin/data`) and the translations (`@/locales/vi.json`), so the data the tests
send is the data the unit tests use.
