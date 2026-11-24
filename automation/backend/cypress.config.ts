import {defineConfig} from 'cypress';

// API tests: the real backend over HTTP (cy.request), no browser page. `npm test` starts the
// backend on an in-memory MongoDB (scripts/run.mjs) and runs every spec headless.
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5175',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: false,
    defaultCommandTimeout: 15_000,
    requestTimeout: 30_000,
    retries: {runMode: 1, openMode: 0},
    // nothing is visited: the specs only talk to the API
    testIsolation: false,
  },
});
