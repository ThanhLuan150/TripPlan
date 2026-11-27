import {external, get, post, put, prompts, saveTrip, signIn} from '../support/api';

const cat = (key: string, amount: number | string) => ({key, amount, note: ''});
const answer = (extra: Record<string, unknown> = {}) => ({
  categories: [cat('accommodation', 1000), cat('food', 500), cat('transport', 300), cat('activities', 200), cat('other', 100)],
  assumptions: ['Khách sạn 3 sao'],
  ...extra,
});

const url = (tripId: string) => `/trip-plan/${tripId}/budget-estimate`;
const detail = (token: string, tripId: string) => get(`/trip-plan/get-trip/${tripId}`, token).its('body.tripDatas');

describe('AI budget estimation', () => {
  it('returns an estimate by category whose total matches, marked as an estimate, and keeps it', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        get(url(tripId), token).its('body.estimate').should('eq', null);

        external({ai: {text: JSON.stringify(answer({total: 1}))}});
        post(url(tripId), token, {travelers: 3, spendingLevel: 'premium'}).then(res => {
          expect(res.status).to.eq(200);
          const {estimate} = res.body;
          expect(estimate.isEstimate).to.eq(true);
          expect(estimate.categories.map((c: any) => c.key)).to.deep.eq(['accommodation', 'food', 'transport', 'activities', 'other']);
          // the total is computed from the categories, the AI's own total is ignored
          expect(estimate.total).to.eq(2100);
          expect(estimate.travelers).to.eq(3);
          expect(estimate.assumptions).to.deep.eq(['Khách sạn 3 sao']);
          prompts().then(sent => expect(sent[sent.length - 1]).to.contain('Số người: 3'));
        });

        get(url(tripId), token).its('body.estimate').should('include', {isEstimate: true, total: 2100, spendingLevel: 'premium'});
      });
    });
  });

  it('is never an expense: the costs of the trip stay as they were', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        detail(token, tripId).then(before => {
          external({ai: {text: JSON.stringify(answer())}});
          post(url(tripId), token, {}).its('status').should('eq', 200);
          detail(token, tripId).should('deep.eq', before);
        });
      });
    });
  });

  it('lets the user adjust amounts, recomputes the total and marks it as adjusted', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        external({ai: {text: JSON.stringify(answer())}});
        post(url(tripId), token, {}).its('status').should('eq', 200);

        put(url(tripId), token, {categories: [{key: 'food', amount: 1500}]}).then(res => {
          expect(res.status).to.eq(200);
          expect(res.body.estimate.total).to.eq(3100);
          expect(res.body.estimate.source).to.eq('manual');
          expect(res.body.estimate.isEstimate).to.eq(true);
        });
        put(url(tripId), token, {categories: [{key: 'food', amount: -1}]}).its('status').should('eq', 400);
        put(url(tripId), token, {categories: [{key: 'shopping', amount: 1}]}).its('status').should('eq', 400);
        get(url(tripId), token).its('body.estimate.total').should('eq', 3100);
      });
    });
  });

  it('refuses bad inputs and updating before any estimate', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        post(url(tripId), token, {travelers: 0}).its('status').should('eq', 400);
        post(url(tripId), token, {travelers: 1001}).its('status').should('eq', 400);
        post(url(tripId), token, {spendingLevel: 'luxury'}).its('status').should('eq', 400);
        put(url(tripId), token, {categories: []}).its('status').should('eq', 404);
      });
    });
  });

  it('keeps the previous estimate when the AI fails or answers with something invalid', () => {
    signIn().then(({token}) => {
      saveTrip(token).then(({tripId}) => {
        external({ai: {text: JSON.stringify(answer())}});
        post(url(tripId), token, {}).its('status').should('eq', 200);

        external({ai: {error: 'boom'}});
        post(url(tripId), token, {}).its('status').should('be.gte', 500);

        external({ai: {text: 'sorry, no JSON here'}});
        post(url(tripId), token, {}).then(res => {
          expect(res.status).to.eq(502);
          expect(res.body.code).to.eq('AI_INVALID_RESPONSE');
        });
        // a missing category, a negative amount, an amount that is not a number, no assumptions
        const invalid = [
          {categories: answer().categories.slice(1), assumptions: ['x']},
          answer({categories: [cat('accommodation', -1), ...answer().categories.slice(1)]}),
          answer({categories: [cat('accommodation', 'abc'), ...answer().categories.slice(1)]}),
          {categories: answer().categories},
        ];
        invalid.forEach(body => {
          external({ai: {text: JSON.stringify(body)}});
          post(url(tripId), token, {}).its('status').should('eq', 502);
        });

        get(url(tripId), token).its('body.estimate.total').should('eq', 2100);
      });
    });
  });

  it('is only for the owner of the trip', () => {
    signIn().then(owner => {
      signIn().then(other => {
        saveTrip(owner.token).then(({tripId}) => {
          get(url(tripId)).its('status').should('eq', 401);
          get(url(tripId), other.token).its('status').should('eq', 404);
          post(url(tripId), other.token, {}).its('status').should('eq', 404);
          put(url(tripId), other.token, {categories: []}).its('status').should('eq', 404);
        });
      });
    });
  });
});
