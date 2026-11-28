import {get, post, put, saveTrip, signIn} from '../support/api';

const search = (q: unknown, extra: Record<string, unknown> = {}) => get('/public-trip', undefined, {q, ...extra});
const names = (res: Cypress.Response<any> | {body: any}) => res.body.items.map((item: any) => item.nameTrip);

// a public trip is the post of the community
const publish = (token: string, name: string) =>
  saveTrip(token, name).then(({tripId}) =>
    put(`/trip-plan/${tripId}/visibility`, token, {visibility: 'public'}).then(res => {
      expect(res.status).to.eq(200);
      return tripId;
    }),
  );

describe('Search posts', () => {
  it('finds public posts by a word of the name, ignoring case', () => {
    signIn().then(({token}) => {
      const tag = `Zenith${Date.now()}`;
      publish(token, `${tag} Hue 3 days`);
      publish(token, `${tag} Sapa trek`);
      publish(token, 'Unrelated plan');

      search(tag.toLowerCase()).then(res => {
        expect(res.status).to.eq(200);
        expect(res.body).to.include({q: tag.toLowerCase(), total: 2});
        expect(names(res)).to.have.members([`${tag} Hue 3 days`, `${tag} Sapa trek`]);
      });
      search(`${tag} sapa`).then(res => expect(names(res)).to.deep.eq([`${tag} Sapa trek`]));
    });
  });

  it('finds a post by its destination, with or without accents', () => {
    signIn().then(({token}) => {
      const tag = `Place${Date.now()}`;
      publish(token, `${tag} by the river`);

      search('da nang').then(res => expect(names(res)).to.include(`${tag} by the river`));
      search('Đà Nẵng').then(res => expect(names(res)).to.include(`${tag} by the river`));
    });
  });

  it('finds a post by the introduction of its author', () => {
    signIn().then(({token}) => {
      const word = `uniqueintro${Date.now()}`;
      saveTrip(token, 'Intro search').then(({tripId}) =>
        post(`/trip-plan/${tripId}/post`, token, {content: `A week of ${word} and coffee`}).its('status').should('eq', 200),
      );

      search(word).then(res => {
        expect(res.body.total).to.eq(1);
        expect(res.body.items[0].postContent).to.contain(word);
      });
    });
  });

  it('never returns a private trip, a deleted trip or one that went private again', () => {
    signIn().then(({token}) => {
      const tag = `Hidden${Date.now()}`;
      saveTrip(token, `${tag} private`);
      publish(token, `${tag} public`);
      publish(token, `${tag} back to private`).then(id => put(`/trip-plan/${id}/visibility`, token, {visibility: 'private'}));
      publish(token, `${tag} deleted`).then(id => cy.request({method: 'DELETE', url: `/trip-plan/${id}`, headers: {Authorization: `Bearer ${token}`}}));

      search(tag).then(res => expect(names(res)).to.deep.eq([`${tag} public`]));
    });
  });

  it('pages the results and answers an empty page when nothing matches', () => {
    signIn().then(({token}) => {
      const tag = `Paged${Date.now()}`;
      publish(token, `${tag} one`);
      publish(token, `${tag} two`);
      publish(token, `${tag} three`);

      search(tag, {limit: 2}).then(res => {
        expect(res.body).to.include({total: 3, page: 1, limit: 2});
        expect(res.body.items).to.have.length(2);
      });
      search(tag, {limit: 2, page: 2}).then(res => {
        expect(res.body.items).to.have.length(1);
        expect(res.body.page).to.eq(2);
      });
      search(tag, {limit: 2, page: 9}).then(res => expect(res.body.items).to.have.length(0));
      search(`nothing-${Date.now()}-matches`).then(res => {
        expect(res.status).to.eq(200);
        expect(res.body).to.include({total: 0});
        expect(res.body.items).to.deep.eq([]);
      });
    });
  });

  it('treats regular expression characters as plain text', () => {
    signIn().then(({token}) => {
      const tag = `Regex${Date.now()}`;
      publish(token, `${tag} plan`);

      search('.*').then(res => expect(names(res)).to.not.include(`${tag} plan`));
      search('(').then(res => expect(res.status).to.eq(200));
      search('[a-').then(res => expect(res.status).to.eq(200));
    });
  });

  it('limits the keyword: 100 characters are fine, 101 or a non-text value are a 400', () => {
    search('a'.repeat(100)).its('status').should('eq', 200);
    search('a'.repeat(101)).its('status').should('eq', 400);
    get('/public-trip?q=a&q=b').its('status').should('eq', 400);
    get('/public-trip?q[$ne]=x').its('status').should('eq', 400);
  });

  it('a blank keyword is the plain list', () => {
    search('   ').then(res => {
      expect(res.status).to.eq(200);
      expect(res.body.q).to.eq('');
    });
  });
});
