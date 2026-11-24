import {call, del, external, get, post, prompts, saveTrip, signIn} from '../support/api';

describe('chat with the assistant', () => {
  it('answers, creates a titled conversation and keeps the messages in order', () => {
    signIn().then(({token}) => {
      external({aiQueue: [{text: 'Go to Hội An in spring.'}, {text: 'Three days is enough.'}]});
      post('/chat', token, {message: 'Where should I go in March?'}).then(first => {
        expect(first.status).to.eq(200);
        expect(first.body.message).to.eq('Send message successfully');
        expect(first.body.data.ChatResponse).to.eq('Go to Hội An in spring.');
        const id = first.body.data.chatAi._id as string;

        post('/chat', token, {message: 'How many days?', idChat: id}).its('body.data.chatAi._id').should('eq', id);

        get('/chat', token).then(list => {
          expect(list.body.data).to.have.length(1);
          expect(list.body.data[0].title).to.eq('Where should I go in March?');
        });

        get(`/chat/${id}`, token).then(detail => {
          expect(detail.status).to.eq(200);
          expect(detail.body.messages.map((m: any) => [m.role, m.text])).to.deep.eq([
            ['user', 'Where should I go in March?'],
            ['model', 'Go to Hội An in spring.'],
            ['user', 'How many days?'],
            ['model', 'Three days is enough.'],
          ]);
          expect(detail.body.questions).to.have.length(2);
          expect(detail.body.responses).to.have.length(2);
        });
      });
    });
  });

  it('cuts a long first message into a short title', () => {
    signIn().then(({token}) => {
      post('/chat', token, {message: 'travel '.repeat(30)});
      get('/chat', token).then(list => {
        const title = list.body.data[0].title as string;
        expect(title.length).to.be.at.most(61);
        expect(title.endsWith('…')).to.eq(true);
      });
    });
  });

  it('does not save a conversation when the AI could not answer', () => {
    signIn().then(({token}) => {
      external({ai: {}});
      post('/chat', token, {message: 'hello'}).then(res => {
        expect(res.status).to.eq(200);
        expect(res.body.message).to.match(/lỗi/);
      });
      get('/chat', token).its('body.data').should('deep.eq', []);
    });
  });

  it('deletes a conversation with its messages', () => {
    signIn().then(({token}) => {
      post('/chat', token, {message: 'hi'}).then(res => {
        const id = res.body.data.chatAi._id as string;
        del(`/chat/${id}`, token).its('status').should('eq', 200);
        get(`/chat/${id}`, token).its('status').should('eq', 404);
        get('/chat', token).its('body.data').should('deep.eq', []);
      });
    });
  });

  it('keeps conversations private', () => {
    signIn().then(owner => {
      signIn().then(other => {
        post('/chat', owner.token, {message: 'secret'}).then(res => {
          const id = res.body.data.chatAi._id as string;
          get(`/chat/${id}`, other.token).its('status').should('eq', 404);
          del(`/chat/${id}`, other.token).its('status').should('eq', 404);
          get('/chat/not-an-id', owner.token).its('status').should('eq', 404);
          get('/chat', other.token).its('body.data').should('deep.eq', []);
          // another user's id starts a new conversation instead of writing into it
          post('/chat', other.token, {message: 'hi', idChat: id}).its('body.data.chatAi._id').should('not.eq', id);
        });
      });
    });
  });

  it('needs a token', () => {
    post('/chat', undefined, {message: 'x'}).its('status').should('eq', 401);
    get('/chat').its('status').should('eq', 401);
  });
});

describe('trip generation', () => {
  const body = {
    location: 'Đà Nẵng', numberOfPeople: 2, budget: '1000000', interest: ['Lịch sử'], numberOfDay: 2,
    startDate: '2027-03-01', endDate: '2027-03-02',
  };
  const plans = {plan1: {day1: {title: 'A', activities: [], transportCost: 1, foodCost: 1, otherCost: 1}}};

  it('returns the plans the AI wrote, even when wrapped in text', () => {
    signIn().then(({token}) => {
      external({ai: {text: `Here you go:\n\`\`\`json\n${JSON.stringify(plans)}\n\`\`\``}});
      post('/trip-plan', token, body).then(res => {
        expect(res.status).to.eq(200);
        expect(res.body.data).to.deep.eq(plans);
      });
      prompts().then(sent => expect(sent[0]).to.contain('Đà Nẵng'));
    });
  });

  it('puts the user\'s note in the prompt', () => {
    signIn().then(({token}) => {
      external({ai: {text: JSON.stringify(plans)}});
      post('/trip-plan', token, {...body, note: 'visit the Marble Mountains'});
      prompts().then(sent => expect(sent[0]).to.contain('Marble Mountains'));
    });
  });

  it('answers 502 when the AI sent no JSON, and reports a silent AI', () => {
    signIn().then(({token}) => {
      external({ai: {text: 'sorry, no plan'}});
      post('/trip-plan', token, body).its('status').should('eq', 502);
      external({ai: {text: '{ broken json'}});
      post('/trip-plan', token, body).its('status').should('eq', 502);
      external({ai: {}});
      post('/trip-plan', token, body).then(silent => {
        expect(silent.status).to.eq(200);
        expect(silent.body.data).to.eq(undefined);
      });
    });
  });

  it('refuses dates that overlap an existing trip', () => {
    signIn().then(({token}) => {
      external({ai: {text: JSON.stringify(plans)}});
      saveTrip(token); // 2026-12-01 .. 2026-12-02
      post('/trip-plan', token, {...body, startDate: '2026-12-02', endDate: '2026-12-04'}).then(res => {
        expect(res.status).to.eq(400);
        expect(res.body.message).to.match(/overlap/);
      });
      prompts().should('deep.eq', []);
    });
  });
});

describe('geo', () => {
  it('tells the province of a position', () => {
    external({province: 'Đà Nẵng'});
    get('/geo/reverse', undefined, {lat: 16.06, lng: 108.22}).then(res => {
      expect(res.status).to.eq(200);
      expect(res.body).to.deep.eq({province: 'Đà Nẵng'});
    });
    external({province: null});
    get('/geo/reverse', undefined, {lat: 0, lng: 0}).its('body').should('deep.eq', {province: null});
  });

  [{}, {lat: 'abc', lng: '1'}, {lat: '91', lng: '1'}, {lat: '1', lng: '181'}, {lat: '1'}].forEach(query => {
    it(`refuses bad coordinates ${JSON.stringify(query)}`, () => {
      get('/geo/reverse', undefined, query).its('status').should('eq', 400);
    });
  });

  const route = {fromLat: 16.06, fromLng: 108.22, toLat: 16.47, toLng: 107.59};

  it('returns the road route', () => {
    const found = {distance: 100000, duration: 5000, path: [[1, 2]], steps: []};
    external({route: found});
    get('/geo/route', undefined, route).then(res => {
      expect(res.status).to.eq(200);
      expect(res.body).to.deep.eq(found);
    });
  });

  it('refuses bad positions, answers 404 without a route and 503 when the service is down', () => {
    get('/geo/route', undefined, {...route, toLat: 'x'}).its('status').should('eq', 400);
    get('/geo/route').its('status').should('eq', 400);
    external({route: null});
    get('/geo/route', undefined, route).its('status').should('eq', 404);
    external({route: {error: 'HERE down'}});
    get('/geo/route', undefined, route).its('status').should('eq', 503);
    expect(call).to.be.a('function');
  });
});
