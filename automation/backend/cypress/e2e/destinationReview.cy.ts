import {del, get, post, put, signIn} from '../support/api';

const reviews = (destination: unknown, token?: string, query: Record<string, unknown> = {}) =>
  get('/destination-reviews', token, {destination, ...query});
const create = (token: string | undefined, body: Record<string, unknown>) => post('/destination-reviews', token, body);

// each test uses its own province, so reviews of other tests never mix in
let n = 0;
const PROVINCES = ['Hà Giang', 'Cao Bằng', 'Lào Cai', 'Sơn La', 'Điện Biên', 'Lai Châu', 'Yên Bái', 'Phú Thọ', 'Tuyên Quang'];
const province = () => PROVINCES[n++ % PROVINCES.length];

describe('Destination reviews', () => {
  it('anyone reads the reviews of a destination without signing in', () => {
    const dest = province();
    reviews(dest).then(res => {
      expect(res.status).to.eq(200);
      expect(res.body).to.include({destination: dest, page: 1});
      expect(res.body.myReview).to.eq(null);
      expect(res.headers['cache-control']).to.contain('no-store');
    });
  });

  it('requires signing in to write, edit or delete', () => {
    const dest = province();
    create(undefined, {destination: dest, rating: 5, content: 'x'}).its('status').should('eq', 401);
    put('/destination-reviews/64b0000000000000000000ff', undefined, {rating: 1}).its('status').should('eq', 401);
    del('/destination-reviews/64b0000000000000000000ff').its('status').should('eq', 401);
  });

  it('creates a review, lists it with the average, and keeps one review per destination', () => {
    const dest = province();
    signIn().then(({token, user}) => {
      create(token, {destination: dest, rating: 4, content: '  Amazing  '}).then(res => {
        expect(res.status).to.eq(201);
        expect(res.body.review).to.include({destination: dest, rating: 4, content: 'Amazing', mine: true});
        expect(res.body.summary).to.deep.eq({average: 4, count: 1});
      });
      create(token, {destination: dest, rating: 1, content: 'again'}).its('status').should('eq', 409);

      reviews(dest, token).then(res => {
        expect(res.body.total).to.eq(1);
        expect(res.body.summary).to.deep.eq({average: 4, count: 1});
        expect(res.body.myReview).to.include({content: 'Amazing', mine: true});
        expect(res.body.items[0].author.username).to.eq(user.username);
        // nothing private of the author
        expect(JSON.stringify(res.body)).to.not.contain(user.email);
      });
      // a visitor sees it, but it is not theirs
      reviews(dest).then(res => {
        expect(res.body.items[0].mine).to.eq(false);
        expect(res.body.myReview).to.eq(null);
      });
    });
  });

  it('computes the average of all the reviews and follows every change', () => {
    const dest = province();
    signIn().then(a => {
      signIn().then(b => {
        signIn().then(c => {
          create(a.token, {destination: dest, rating: 5, content: 'a'}).its('body.summary.average').should('eq', 5);
          create(b.token, {destination: dest, rating: 4, content: 'b'}).its('body.summary.average').should('eq', 4.5);
          create(c.token, {destination: dest, rating: 4, content: 'c'}).then(res => {
            // 13 / 3 = 4.333... shown with one decimal
            expect(res.body.summary).to.deep.eq({average: 4.3, count: 3});
          });
          reviews(dest).its('body.summary').should('deep.eq', {average: 4.3, count: 3});

          // the author edits: the average moves
          reviews(dest, c.token).then(res => {
            put(`/destination-reviews/${res.body.myReview._id}`, c.token, {rating: 1}).then(edit => {
              expect(edit.status).to.eq(200);
              expect(edit.body.summary).to.deep.eq({average: 3.3, count: 3});
            });
          });
          // and deletes: back to two reviews
          reviews(dest, b.token).then(res => {
            del(`/destination-reviews/${res.body.myReview._id}`, b.token).then(removed => {
              expect(removed.status).to.eq(200);
              expect(removed.body.summary).to.deep.eq({average: 3, count: 2});
            });
          });
        });
      });
    });
  });

  it('only the author can edit or delete a review, and nothing changes for anybody else', () => {
    const dest = province();
    signIn().then(author => {
      signIn().then(other => {
        create(author.token, {destination: dest, rating: 5, content: 'mine'}).then(res => {
          const id = res.body.review._id as string;
          put(`/destination-reviews/${id}`, other.token, {rating: 1, content: 'hijacked'}).its('status').should('eq', 403);
          del(`/destination-reviews/${id}`, other.token).its('status').should('eq', 403);
          reviews(dest).then(list => {
            expect(list.body.total).to.eq(1);
            expect(list.body.items[0]).to.include({rating: 5, content: 'mine'});
          });
          // the destination and the author cannot be changed through an edit
          put(`/destination-reviews/${id}`, author.token, {rating: 3, destination: 'Hà Nội', userId: other.user.id}).then(edit => {
            expect(edit.status).to.eq(200);
            expect(edit.body.review).to.include({destination: dest, rating: 3, mine: true});
          });
        });
      });
    });
  });

  it('validates the rating (1-5 whole stars) and the comment', () => {
    const dest = province();
    signIn().then(({token}) => {
      for (const rating of [0, 6, 4.5, 'abc', null]) {
        create(token, {destination: dest, rating, content: 'x'}).its('status').should('eq', 400);
      }
      for (const content of ['', '   ', undefined, 'a'.repeat(1001)]) {
        create(token, {destination: dest, rating: 4, content}).its('status').should('eq', 400);
      }
      reviews(dest).its('body.total').should('eq', 0);
      create(token, {destination: dest, rating: 5, content: 'a'.repeat(1000)}).its('status').should('eq', 201);
    });
  });

  it('answers 404 for a destination that does not exist', () => {
    signIn().then(({token}) => {
      reviews('Atlantis').its('status').should('eq', 404);
      reviews(undefined).its('status').should('eq', 404);
      create(token, {destination: 'Atlantis', rating: 4, content: 'x'}).its('status').should('eq', 404);
      create(token, {rating: 4, content: 'x'}).its('status').should('eq', 404);
    });
  });

  it('answers 404 for an unknown or malformed review id', () => {
    signIn().then(({token}) => {
      put('/destination-reviews/64b0000000000000000000ff', token, {rating: 1}).its('status').should('eq', 404);
      put('/destination-reviews/not-an-id', token, {rating: 1}).its('status').should('eq', 404);
      del('/destination-reviews/not-an-id', token).its('status').should('eq', 404);
    });
  });

  it('pages the reviews, newest first', () => {
    const dest = province();
    signIn().then(a => {
      signIn().then(b => {
        create(a.token, {destination: dest, rating: 5, content: 'first'});
        create(b.token, {destination: dest, rating: 3, content: 'second'});

        reviews(dest, undefined, {limit: 1}).then(res => {
          expect(res.body).to.include({total: 2, limit: 1});
          expect(res.body.items.map((i: any) => i.content)).to.deep.eq(['second']);
        });
        reviews(dest, undefined, {limit: 1, page: 2}).then(res => {
          expect(res.body.items.map((i: any) => i.content)).to.deep.eq(['first']);
        });
      });
    });
  });
});
