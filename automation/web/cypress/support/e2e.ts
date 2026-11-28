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

// Chooses an option of the app's own dropdown (a <select> test used .select(value)): opens the list from
// its button, then clicks the option with this value.
Cypress.Commands.add('pick', {prevSubject: 'element'}, (subject, value: string) => {
  cy.wrap(subject).click();
  cy.wrap(subject)
    .invoke('attr', 'aria-controls')
    .then(listId => cy.get(`[id="${listId}"] button[data-value="${value}"]`).click());
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      pick(value: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}
