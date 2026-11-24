import {call, get, post} from '../support/api';

describe('error format', () => {
  it('answers a malformed JSON body with 400 and a message', () => {
    call('POST', '/auth/login', {body: '{ not json', headers: {'Content-Type': 'application/json'}}).then(res => {
      expect(res.status).to.eq(400);
      expect(res.body).to.deep.eq({message: 'Invalid JSON body'});
    });
  });

  it('names the route that does not exist', () => {
    call('DELETE', '/nope/123').then(res => {
      expect(res.status).to.eq(404);
      expect(res.body.message).to.eq('Not found: DELETE /nope/123');
    });
  });

  it('sends the CORS headers the web app needs', () => {
    call('GET', '/settings', {headers: {Origin: 'https://app.example.com'}}).then(res => {
      expect(res.headers['access-control-allow-origin']).to.eq('*');
      expect(String(res.headers['access-control-expose-headers'])).to.contain('Authorization');
    });
    call('OPTIONS', '/trip-plan/get-trip', {
      headers: {Origin: 'https://app.example.com', 'Access-Control-Request-Method': 'GET'},
    }).its('status').should('eq', 204);
  });
});

// Last: these take the database away and put it back.
describe('database down', () => {
  after(() => {
    post('/__test/db', undefined, {down: false});
  });

  it('answers 503 at once instead of hanging, and /health says so', () => {
    post('/__test/db', undefined, {down: true}).its('body.readyState').should('eq', 0);
    get('/health').then(health => {
      expect(health.status).to.eq(503);
      expect(health.body).to.deep.eq({status: 'degraded', db: 'disconnected'});
    });
    get('/settings').then(res => {
      expect(res.status).to.eq(503);
      expect(res.body.message).to.eq('Database unavailable');
    });
  });

  it('works again once the database is back', () => {
    post('/__test/db', undefined, {down: false}).its('body.readyState').should('eq', 1);
    get('/health').its('status').should('eq', 200);
  });
});
