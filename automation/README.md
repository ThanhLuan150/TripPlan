# Automation tests

Tests that drive the **finished product** from the outside (unlike the unit tests, which live next
to each project in `web/src/__tests__`, `backend/__tests__` and `mobile/__tests__`).

Each folder is a self-contained project with its own `package.json` and tools, so the apps stay free
of test-runner dependencies.

| Folder | What it tests | Tool | Status |
|---|---|---|---|
| [`web/`](web/README.md) | the web app, in a browser, with the backend mocked | Cypress | done: every screen and feature |
| [`backend/`](backend/README.md) | the REST API, over HTTP, on an in-memory MongoDB (e-mail, AI and place lookups stubbed) | Cypress (`cy.request`) | done: auth, trips, challenges, content, upload, chat, geo, admin |
| `mobile/` | the React Native app | to be chosen (Maestro / Detox) | not started (unit tests: `mobile/__tests__`) |

## Run the web tests

```powershell
cd automation\web
npm install            # once (also run `npm install` in ..\..\web: it is the app that gets tested)
npm run cypress:run            # build the app, serve it, run every spec headless
```

See [`web/README.md`](web/README.md) for every command, how the tests are organised and how to write one.

## Adding a new project (backend, mobile)

1. Create `automation/<name>/` with its own `package.json` and a `README.md` (how to run it).
2. Keep what is shared out of the apps: data the tests send lives in the project, not in the app.
3. Add a job for it in `.github/workflows/ci.yml` next to `e2e` (working directory `automation/<name>`).
4. Add a row to the table above.
