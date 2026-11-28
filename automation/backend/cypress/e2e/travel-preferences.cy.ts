import {del, external, get, post, prompts, put, signIn, stored} from '../support/api';

const url = '/user/preferences';
const form = {location: 'Lâm Đồng', numberOfPeople: 2, budget: '5.000.000 VND', interest: 'núi', numberOfDay: 2, userLocation: 'Hà Nội'};

describe('AI travel preferences', () => {
  it('requires sign-in', () => {
    get(url).its('status').should('eq', 401);
    put(url, undefined, {notes: 'x'}).its('status').should('eq', 401);
    del(url).its('status').should('eq', 401);
  });

  it('is empty until the user sets it (preferences are optional)', () => {
    signIn().then(({token}) => {
      get(url, token).then(res => {
        expect(res.status).to.eq(200);
        expect(res.body.preferences).to.deep.eq({categories: [], notes: '', updatedAt: null});
      });
    });
  });

  it('saves, reads back, updates and deletes the preferences of the account', () => {
    signIn().then(({token, user}) => {
      put(url, token, {categories: ['food', 'nature'], notes: '  quán địa phương '}).then(res => {
        expect(res.status).to.eq(200);
        expect(res.body.preferences).to.include({notes: 'quán địa phương'});
        expect(res.body.preferences.categories).to.deep.eq(['nature', 'food']);
      });
      stored(user.id).its('travelPreferences.categories').should('deep.eq', ['nature', 'food']);

      // an update keeps what was not sent
      put(url, token, {categories: ['culture']}).then(res => {
        expect(res.body.preferences.categories).to.deep.eq(['culture']);
        expect(res.body.preferences.notes).to.eq('quán địa phương');
      });
      get(url, token).its('body.preferences.categories').should('deep.eq', ['culture']);

      del(url, token).then(res => {
        expect(res.status).to.eq(200);
        expect(res.body.preferences).to.deep.eq({categories: [], notes: '', updatedAt: null});
      });
      get(url, token).its('body.preferences.categories').should('deep.eq', []);
    });
  });

  it('rejects invalid input and saves nothing', () => {
    signIn().then(({token}) => {
      [{}, {categories: ['beach']}, {categories: 'nature'}, {categories: [1]}, {notes: 5}, {notes: 'x'.repeat(301)}, {categories: []}].forEach(body =>
        put(url, token, body).its('status').should('eq', 400),
      );
      get(url, token).its('body.preferences.categories').should('deep.eq', []);
    });
  });

  it("only manages the caller's own preferences, whatever the client sends", () => {
    signIn().then(({token: tokenA}) => {
      signIn().then(({token: tokenB, user: userB}) => {
        put(url, tokenB, {categories: ['shopping']});
        put(url, tokenA, {categories: ['food'], userId: userB.id, _id: userB.id}).its('status').should('eq', 200);
        del(`${url}?userId=${userB.id}`, tokenA).its('status').should('eq', 200);
        // the other account is untouched
        get(url, tokenB).its('body.preferences.categories').should('deep.eq', ['shopping']);
      });
    });
  });

  it('are sent to the AI in itinerary generation and in destination recommendation', () => {
    signIn().then(({token}) => {
      put(url, token, {categories: ['nature', 'food'], notes: 'tránh nơi đông người'});

      external({ai: {text: '{}'}});
      post('/trip-plan', token, form).its('status').should('eq', 200);
      external({ai: {text: JSON.stringify({recommendations: []})}});
      post('/destinations/recommend', token, {query: 'nghỉ dưỡng'}).its('status').should('eq', 200);

      prompts().then(sent => {
        const [plan, recommend] = sent.slice(-2);
        [plan, recommend].forEach(prompt => {
          expect(prompt).to.contain('thiên nhiên');
          expect(prompt).to.contain('ẩm thực');
          expect(prompt).to.contain('tránh nơi đông người');
        });
      });
    });
  });

  it('the AI works the same without preferences', () => {
    signIn().then(({token}) => {
      external({ai: {text: JSON.stringify({recommendations: []})}});
      post('/destinations/recommend', token, {query: 'nghỉ dưỡng'}).its('status').should('eq', 200);
      prompts().then(sent => expect(sent[sent.length - 1]).not.to.contain('Sở thích du lịch đã lưu'));
    });
  });
});
