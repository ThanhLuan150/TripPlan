import {del, external, get, patch, post, prompts, signIn} from '../support/api';

const suggestion = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  province: 'Lâm Đồng',
  description: 'Mô tả ngắn',
  reason: 'Hợp với nhu cầu',
  ...extra,
});

const recommend = (token: string | undefined, body: unknown = {query: 'Nơi mát mẻ'}) => post('/destinations/recommend', token, body);

describe('AI destination recommendation', () => {
  it('requires sign-in', () => {
    recommend(undefined).its('status').should('eq', 401);
  });

  it('returns suggestions with a description and a reason, and sends the needs to the AI', () => {
    signIn().then(({token}) => {
      external({ai: {text: JSON.stringify({recommendations: [suggestion('Thung lũng Tình Yêu'), suggestion('Hồ Tuyền Lâm')]})}});

      recommend(token, {query: 'Nơi mát mẻ', interests: ['Lịch sử'], region: 'Lâm Đồng', budget: '3 triệu'}).then(res => {
        expect(res.status).to.eq(200);
        expect(res.body.recommendations).to.have.length(2);
        expect(res.body.recommendations[0]).to.include({name: 'Thung lũng Tình Yêu', description: 'Mô tả ngắn', reason: 'Hợp với nhu cầu'});
        // a place the app has no data for is never given invented data
        expect(res.body.recommendations[0].inApp).to.be.a('boolean');
        prompts().then(sent => {
          const last = sent[sent.length - 1];
          ['Nơi mát mẻ', 'Lịch sử', 'Lâm Đồng', '3 triệu'].forEach(text => expect(last).to.contain(text));
        });
      });
    });
  });

  it('answers 200 with an empty list when nothing suits', () => {
    signIn().then(({token}) => {
      external({ai: {text: JSON.stringify({recommendations: []})}});
      recommend(token).then(res => {
        expect(res.status).to.eq(200);
        expect(res.body.recommendations).to.deep.eq([]);
      });
    });
  });

  it('rejects an invalid request without calling the AI', () => {
    signIn().then(({token}) => {
      external({reset: true});
      [{}, {query: '   '}, {query: 'a'.repeat(501)}, {query: 'x', budget: -1}].forEach(body => recommend(token, body).its('status').should('eq', 400));
      prompts().should('have.length', 0);
    });
  });

  it('answers 502 when the AI answer cannot be read', () => {
    signIn().then(({token}) => {
      external({ai: {text: 'xin lỗi, không có JSON'}});
      recommend(token).then(res => {
        expect(res.status).to.eq(502);
        expect(res.body.code).to.eq('AI_INVALID_RESPONSE');
      });
    });
  });

  it('fails with a server error when the AI service is down', () => {
    signIn().then(({token}) => {
      external({ai: {error: 'down'}});
      recommend(token).its('status').should('be.gte', 500);
    });
  });

  describe('history of suggestions', () => {
    const ask = (token: string, query = 'Nơi mát mẻ') => {
      external({ai: {text: JSON.stringify({recommendations: [suggestion('Thung lũng Tình Yêu'), suggestion('Hồ Tuyền Lâm')]})}});
      return recommend(token, {query, interests: ['Lịch sử'], region: 'Lâm Đồng'});
    };

    it('requires sign-in', () => {
      get('/destinations/history').its('status').should('eq', 401);
    });

    it('keeps every answer, in two groups, and opens it again with its places', () => {
      signIn().then(({token}) => {
        ask(token).then(res => {
          expect(res.body.historyId).to.be.a('string');
          const id = res.body.historyId as string;

          get('/destinations/history', token).then(list => {
            expect(list.body.items).to.have.length(1);
            expect(list.body.items[0]).to.include({id, query: 'Nơi mát mẻ', region: 'Lâm Đồng', count: 2, status: 'draft'});
            expect(list.body.items[0].names).to.deep.eq(['Thung lũng Tình Yêu', 'Hồ Tuyền Lâm']);
          });
          get(`/destinations/history/${id}`, token).then(one => {
            expect(one.body.search.recommendations).to.have.length(2);
            expect(one.body.search.interests).to.deep.eq(['Lịch sử']);
          });
        });
      });
    });

    it('moves a suggestion to "created" and filters the two groups', () => {
      signIn().then(({token}) => {
        ask(token, 'một').then(first => {
          ask(token, 'hai');
          patch(`/destinations/history/${first.body.historyId}`, token, {status: 'created'}).its('status').should('eq', 200);

          get('/destinations/history?status=created', token).its('body.items').should('have.length', 1);
          get('/destinations/history?status=draft', token).its('body.items.0.query').should('eq', 'hai');
          get('/destinations/history?status=nope', token).its('status').should('eq', 400);
          patch(`/destinations/history/${first.body.historyId}`, token, {status: 'x'}).its('status').should('eq', 400);
        });
      });
    });

    it('does not keep an empty answer', () => {
      signIn().then(({token}) => {
        external({ai: {text: JSON.stringify({recommendations: []})}});
        recommend(token).its('body.historyId').should('eq', null);
        get('/destinations/history', token).its('body.items').should('have.length', 0);
      });
    });

    it('deletes a suggestion, and nobody can read, change or delete another user\'s', () => {
      signIn().then(({token}) => {
        ask(token).then(res => {
          const url = `/destinations/history/${res.body.historyId}`;
          signIn().then(({token: stranger}) => {
            get(url, stranger).its('status').should('eq', 404);
            patch(url, stranger, {status: 'created'}).its('status').should('eq', 404);
            del(url, stranger).its('status').should('eq', 404);
            get('/destinations/history', stranger).its('body.items').should('have.length', 0);
          });
          del(url, token).its('status').should('eq', 200);
          get(url, token).its('status').should('eq', 404);
        });
      });
    });
  });
});
