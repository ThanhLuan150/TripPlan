# Backend automation (API tests)

Drives the **real backend** from the outside, over HTTP, with **Cypress** (`cy.request`, no browser
page): the Express app, the routes, the middleware, Mongoose and the models all run for real, on an
**in-memory MongoDB** (`mongodb-memory-server`). No `.env`, Atlas, Gemini or Gmail is needed.

This is different from `backend/__tests__` (unit tests with the database layer mocked) and from
[`../web`](../web/README.md) (a browser, with the backend mocked): here a register -> confirm -> login ->
save trip -> check in -> ranking flow goes through every layer of the API.

## How it works

`scripts/run.mjs` starts the backend on `http://localhost:5175`, runs Cypress against it and stops
everything. Two things are not real, because they leave the machine, and are answered by the stubs in
[`stubs/`](stubs): the e-mail sender, the AI (Gemini) and the place / route lookup (HERE). A module loader
hook (`scripts/hooks.mjs`) swaps just those four files; nothing else of `backend/src` is replaced.

A spec steers the stubs and does what a user cannot through test-only endpoints mounted in front of the
backend under `/__test` (`scripts/control.mjs`; they do not exist in the backend itself): create an account
or an administrator straight in the database, read what was stored (the e-mailed code), forge a token,
set the AI answer, switch the rate limits on, take the database away.

| Spec | Covers |
|---|---|
| `auth.cy.ts` | health, sign-up + e-mail code, login rules (unverified / suspended / deleted), password reset, tokens and their refresh |
| `trips.cy.ts` | save / list / detail / delete a trip, ownership between users, check-in distance, points awarded once, rankings |
| `content.cy.ts` | public content, reports, profile, account delete, image upload and download |
| `ai-geo.cy.ts` | chat with the assistant, trip generation, province / route lookup |
| `admin.cy.ts` | 401 / 403 / 200 per admin route, users (create, suspend, bulk, edit), trips, challenges, announcements, videos, settings, logs, moderation, showcase |
| `errors.cy.ts` | error format, CORS, the database going down |
| `limits.cy.ts` | the 429 rate limit of the sign-in routes |

## Run

```powershell
cd automation\backend
npm install          # once; also run `yarn install` in ..\..\backend: it is the app under test
npm test             # every spec headless + the coverage of backend/src (gate: see .c8rc.json)
npm run test:run     # the same without the coverage report
npm run test:open    # the Cypress window; the backend stays up while it is open
npm run typecheck
```

The first run downloads a MongoDB binary (~100 MB, cached afterwards). To use a MongoDB that is already
running instead, set `MONGO_URI` (everything goes to the database `aloca_automation`, dropped at the end):

```powershell
$env:MONGO_URI = "mongodb://127.0.0.1:27017"; npm test
```

## Write a test

```ts
import {get, saveTrip, signIn} from '../support/api';

it('lists my trips', () => {
  signIn().then(({token}) => {            // an account, signed in through the API
    saveTrip(token, 'Hue');               // a trip with one challenge
    get('/trip-plan/get-trip', token).then(res => {
      expect(res.body.dataTrip).to.have.length(1);
    });
  });
});
```

Helpers (`cypress/support/api.ts`, all return a Cypress chain): `get` / `post` / `patch` / `put` / `del` /
`call`, `makeUser`, `signIn`, `signInAdmin`, `stored` (the document in the database), `update`, `forge` (a
signed token), `external` / `prompts` (the stubs), `saveTrip`, `PLACE`, `NEAR` / `FAR`. Rate limits are off
(`NODE_ENV=test`) except in `limits.cy.ts`. The stubs are reset before every test.
