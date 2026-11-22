import {defineConfig} from 'cypress';
import vitePreprocessor from 'cypress-vite';

// The browser of the tests shows dates in the same zone as the developers.
process.env.TZ = 'Asia/Ho_Chi_Minh';

// End-to-end tests: the real app in a real browser, with the backend mocked
// (cy.intercept, see cypress/support/helpers.ts). `npm run e2e` builds the app,
// serves it with `vite preview` and runs every spec headless.
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5174',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10_000,
    retries: {runMode: 1, openMode: 0},
    setupNodeEvents(on) {
      // the specs import the app's own files with the "@/" alias: bundle them with Vite
      on('file:preprocessor', vitePreprocessor('vite.config.ts'));
    },
  },
});
