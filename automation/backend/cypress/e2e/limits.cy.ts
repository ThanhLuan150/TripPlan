import {get, post} from '../support/api';

// The limiters skip themselves when NODE_ENV is "test": this spec runs the app as in production.
describe('rate limits', () => {
  const LIMIT = 40; // RATE_LIMIT_AUTH_MAX, the default

  before(() => {
    post('/__test/mode', undefined, {production: true});
  });
  after(() => {
    post('/__test/mode', undefined, {production: false});
  });

  it('stops guessing on the sign-in routes with a 429 and the standard headers', () => {
    for (let i = 0; i < LIMIT; i++) {
      post('/auth/login', undefined, {username: 'ghost', password: 'x'}).its('status').should('eq', 404);
    }
    post('/auth/login', undefined, {username: 'ghost', password: 'x'}).then(blocked => {
      expect(blocked.status).to.eq(429);
      expect(blocked.body.message).to.eq('Too many requests, please try again later');
      expect(blocked.headers['ratelimit'] ?? blocked.headers['ratelimit-policy']).to.exist;
    });
    // other auth routes share the same counter
    post('/auth/forgot-password', undefined, {email: 'a@b.co'}).its('status').should('eq', 429);
    // routes outside /auth are not affected
    get('/settings').its('status').should('eq', 200);
  });
});
