import '@testing-library/cypress/add-commands';
import {resetSession} from './helpers';

// A picture of another site (photos, avatars) is answered with a 1x1 SVG and
// anything else is blocked: the tests never touch the internet.
const PIXEL = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';

beforeEach(() => {
  resetSession();
  cy.intercept({url: /^https?:\/\/(?!localhost)/}, req => {
    if (String(req.headers.accept ?? '').includes('image')) {
      req.reply({headers: {'content-type': 'image/svg+xml'}, body: PIXEL});
    } else {
      req.destroy();
    }
  });
});

// (Cypress already fails a test when the page throws an uncaught error, like
// "Cannot read properties of undefined": that is a bug even when the
// assertions pass.)
