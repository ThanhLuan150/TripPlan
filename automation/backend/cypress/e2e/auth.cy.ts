import {PASSWORD, forge, get, makeUser, post, signIn, stored, update} from '../support/api';

const newAccount = () => {
  const n = Math.random().toString(36).slice(2, 10);
  return {username: `New${n}`, email: `new${n}@example.com`, password: PASSWORD, confirmPassword: PASSWORD};
};

describe('health', () => {
  it('reports the database as connected', () => {
    get('/health').then(res => {
      expect(res.status).to.eq(200);
      expect(res.body).to.deep.eq({status: 'ok', db: 'connected'});
    });
  });

  it('answers unknown routes with a JSON 404', () => {
    get('/nope').then(res => {
      expect(res.status).to.eq(404);
      expect(res.body.message).to.be.a('string').and.not.be.empty;
    });
  });
});

describe('register -> confirm -> login', () => {
  it('completes the whole sign-up', () => {
    const body = newAccount();
    post('/auth/register', undefined, body).then(reg => {
      expect(reg.status).to.eq(200);
      expect(reg.body.email).to.eq(body.email);
    });

    // not usable before the code is confirmed
    post('/auth/login', undefined, {username: body.username, password: PASSWORD}).then(early => {
      expect(early.status).to.eq(404);
      expect(early.body.message).to.eq('Unverified account');
    });

    stored(body.email.toLowerCase()).then(user => {
      expect(user.code).to.match(/^\d{6}$/);
      // the code was "e-mailed" (the stub keeps it)
      get('/__test/external').its('body.mails').should('deep.include', {email: body.email, code: user.code});
      post('/auth/confirm-account', undefined, {email: body.email, code: '000000'}).its('status').should('eq', 401);
      post('/auth/confirm-account', undefined, {email: body.email, code: user.code}).its('status').should('eq', 200);
    });

    post('/auth/login', undefined, {username: body.username.toLowerCase(), password: PASSWORD}).then(login => {
      expect(login.status).to.eq(200);
      expect(login.body.accessToken).to.be.a('string');
      expect(login.body.data.email).to.eq(body.email.toLowerCase());
    });
  });

  it('never sends private fields back', () => {
    makeUser().then(user => {
      post('/auth/login', undefined, {username: user.username, password: PASSWORD}).then(res => {
        ['password', 'refreshToken', 'code', '_id', 'isActive'].forEach(key => expect(res.body.data).not.to.have.property(key));
      });
    });
  });

  it('rejects missing fields and a mismatched confirmation', () => {
    post('/auth/register', undefined, {username: 'x'}).its('status').should('eq', 401);
    post('/auth/register', undefined, {...newAccount(), confirmPassword: 'different'}).its('status').should('eq', 401);
  });

  it('rejects a taken username or email', () => {
    makeUser().then(taken => {
      post('/auth/register', undefined, {...newAccount(), email: taken.email}).then(res => {
        expect(res.status).to.eq(401);
        expect(res.body.field).to.eq('email');
      });
      post('/auth/register', undefined, {...newAccount(), username: taken.username}).then(res => {
        expect(res.status).to.eq(401);
        expect(res.body.field).to.eq('username');
      });
    });
  });

  it('lets an unconfirmed account register again and sends a new code', () => {
    const body = newAccount();
    post('/auth/register', undefined, body).its('status').should('eq', 200);
    post('/auth/register', undefined, body).its('status').should('eq', 200);
    stored(body.email.toLowerCase()).its('code').should('match', /^\d{6}$/);
  });

  it('sends a fresh code on request, and 401 for an unknown e-mail', () => {
    const body = newAccount();
    post('/auth/register', undefined, body);
    post('/auth/refresh-verification', undefined, {email: body.email}).its('status').should('eq', 200);
    post('/auth/refresh-verification', undefined, {email: 'ghost@example.com'}).its('status').should('eq', 401);
  });
});

describe('login', () => {
  it('rejects an unknown user and a wrong password', () => {
    post('/auth/login', undefined, {username: 'ghost', password: PASSWORD}).its('status').should('eq', 404);
    makeUser().then(user => {
      post('/auth/login', undefined, {username: user.username, password: 'wrong-password'}).then(res => {
        expect(res.status).to.eq(401);
        expect(res.body.message).to.eq('Incorrect password');
      });
    });
  });

  it('blocks suspended and deleted accounts', () => {
    makeUser({isActive: 'suspended', suspendReason: 'spam'}).then(user => {
      post('/auth/login', undefined, {username: user.username, password: PASSWORD}).then(res => {
        expect(res.status).to.eq(403);
        expect(res.body.reason).to.eq('spam');
      });
    });
    makeUser({isActive: 'delete'}).then(user => {
      post('/auth/login', undefined, {username: user.username, password: PASSWORD}).its('status').should('eq', 400);
    });
  });
});

describe('password reset', () => {
  it('verifies the code, then sets the new password', () => {
    signIn().then(({user}) => {
      post('/auth/forgot-password', undefined, {email: user.email}).its('status').should('eq', 200);

      // the reset window is not open before the code is verified
      post('/auth/reset-password/', undefined, {email: user.email, password: 'newpass99', confirmPassword: 'newpass99'}).its('status').should('eq', 401);
      post('/auth/reset-password/111111', undefined, {email: user.email}).its('status').should('eq', 401);

      stored(user.id).then(({code}) => {
        post(`/auth/reset-password/${code}`, undefined, {email: user.email}).its('status').should('eq', 200);
      });

      post('/auth/reset-password/', undefined, {email: user.email, password: 'newpass99', confirmPassword: 'other'}).its('status').should('eq', 401);
      post('/auth/reset-password/', undefined, {email: user.email, password: 'newpass99', confirmPassword: 'newpass99'}).its('status').should('eq', 200);

      post('/auth/login', undefined, {username: user.username, password: PASSWORD}).its('status').should('eq', 401);
      post('/auth/login', undefined, {username: user.username, password: 'newpass99'}).its('status').should('eq', 200);
    });
  });

  it('refuses unknown and inactive accounts', () => {
    post('/auth/forgot-password', undefined, {email: 'ghost@example.com'}).its('status').should('eq', 401);
    makeUser({isActive: 'notActive'}).then(u => post('/auth/forgot-password', undefined, {email: u.email}).its('status').should('eq', 401));
    makeUser({isActive: 'suspended'}).then(u => post('/auth/forgot-password', undefined, {email: u.email}).its('status').should('eq', 403));
    makeUser({isActive: 'delete'}).then(u => post('/auth/forgot-password', undefined, {email: u.email}).its('status').should('eq', 401));
  });
});

describe('tokens', () => {
  it('rejects a missing, malformed or forged token', () => {
    get('/trip-plan/get-trip').its('status').should('eq', 401);
    get('/trip-plan/get-trip', 'nonsense').its('status').should('eq', 401);
    get('/trip-plan/get-trip', '').its('status').should('eq', 401);
    forge('other', {userId: '64b000000000000000000001'}).then(token => get('/trip-plan/get-trip', token).its('status').should('eq', 401));
  });

  it('refuses a valid token of an account that does not exist, or has no user id', () => {
    forge('access', {userId: '64b000000000000000000001'}).then(token => {
      get('/trip-plan/get-trip', token).then(res => {
        expect(res.status).to.eq(401);
        expect(res.body.message).to.eq('User not found');
      });
    });
    forge('access', {other: 1}).then(token => get('/trip-plan/get-trip', token).its('body.message').should('eq', 'Invalid token'));
  });

  it('stops a deleted account\'s token from working', () => {
    signIn().then(({user, token}) => {
      get('/trip-plan/get-trip', token).its('status').should('eq', 200);
      update(user.id, {isActive: 'delete'});
      get('/trip-plan/get-trip', token).its('status').should('eq', 401);
    });
  });

  it('rotates an expired access token while the refresh token is valid', () => {
    signIn().then(({user}) => {
      forge('access', {userId: user.id}, -10).then(expired => {
        post(`/auth/refresh-token/${expired}`).then(res => {
          expect(res.status).to.eq(200);
          // the new token works
          get('/trip-plan/get-trip', res.body.accessToken).its('status').should('eq', 200);
        });
      });
    });
  });

  it('answers 400 without a token', () => {
    post('/auth/refresh-token').its('status').should('eq', 400);
  });

  it('hands a new token to the client when it sends an expired one', () => {
    signIn().then(({user}) => {
      forge('access', {userId: user.id}, -10).then(expired => {
        get('/trip-plan/get-trip', expired).then(res => {
          expect(res.status).to.eq(200);
          expect(res.headers.authorization).to.match(/^Bearer /);
        });
      });
    });
  });

  it('ends a session whose refresh token has expired', () => {
    signIn().then(({user}) => {
      forge('refresh', {userId: user.id}, -10).then(refresh => update(user.id, {refreshToken: refresh}));
      forge('access', {userId: user.id}, -10).then(expired => {
        get('/trip-plan/get-trip', expired).then(res => {
          expect(res.status).to.eq(401);
          expect(res.body.message).to.match(/expired/);
        });
        // the refresh endpoint refuses it too
        post(`/auth/refresh-token/${expired}`).its('status').should('eq', 401);
      });
    });
  });
});
