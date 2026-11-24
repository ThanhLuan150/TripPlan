import {PASSWORD, call, del, get, post, signIn, signInAdmin, stored} from '../support/api';

// 1x1 PNG
const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const pngBytes = () => Uint8Array.from(atob(PNG_BASE64), c => c.charCodeAt(0));

interface Part {
  name: string;
  type: string;
  data: Uint8Array | string;
}
interface Upload {
  status: number;
  body: any;
}

// multipart upload from the browser (cy.request cannot send files)
const upload = (token: string | undefined, ...parts: Part[]): Cypress.Chainable<Upload> =>
  cy.wrap(null).then(async () => {
    const form = new FormData();
    parts.forEach(p => form.append('image', new Blob([p.data], {type: p.type}), p.name));
    const res = await fetch(`${Cypress.config('baseUrl')}/upload/image`, {
      method: 'POST',
      headers: token ? {Authorization: `Bearer ${token}`} : {},
      body: form,
    });
    return {status: res.status, body: await res.json().catch(() => null)};
  });

describe('public content', () => {
  it('serves the home page content', () => {
    get('/home').then(res => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('banners');
      expect(res.body).to.have.property('suggestions');
    });
  });

  it('serves videos and the app settings', () => {
    get('/videos').then(res => {
      expect(res.status).to.eq(200);
      expect(res.body).to.be.an('array');
    });
    get('/settings').its('status').should('eq', 200);
  });

  it('lists announcements only for signed-in users', () => {
    get('/announcements').its('status').should('eq', 401);
    signIn().then(({token}) => {
      get('/announcements', token).then(res => {
        expect(res.status).to.eq(200);
        expect(res.body).to.be.an('array');
      });
    });
  });

  it('takes a report from a signed-in user only', () => {
    const body = {type: 'video', reason: 'spam', content: 'bad video'};
    post('/reports', undefined, body).its('status').should('eq', 401);
    signIn().then(({token}) => post('/reports', token, body).its('status').should('eq', 201));
  });

  it('rejects an invalid report', () => {
    signIn().then(({token}) => post('/reports', token, {}).its('status').should('eq', 400));
  });
});

describe('profile', () => {
  it('updates the user\'s own profile', () => {
    signIn().then(({user, token}) => {
      post('/user/profile', token, {fullname: 'Nguyen Van A', phone: '0901234567', address: 'Da Nang', image: '/files/x'})
        .its('status').should('eq', 200);
      stored(user.id).then(saved => {
        expect(saved.fullname).to.eq('Nguyen Van A');
        expect(saved.address).to.eq('Da Nang');
      });
    });
  });

  it('only changes the fields that were sent', () => {
    signIn({phone: '0900000000', address: 'Hue'}).then(({user, token}) => {
      post('/user/profile', token, {fullname: 'Only Name'});
      stored(user.id).then(saved => {
        expect(saved.fullname).to.eq('Only Name');
        expect(saved.phone).to.eq('0900000000');
        expect(saved.address).to.eq('Hue');
      });
    });
  });

  it('refuses an update with nothing to change, and needs a token', () => {
    signIn().then(({token}) => post('/user/profile', token, {}).its('status').should('eq', 400));
    post('/user/profile', undefined, {fullname: 'x'}).its('status').should('eq', 401);
  });

  it('soft-deletes the own account, which can no longer sign in', () => {
    signIn().then(({user, token}) => {
      post(`/user/${user.id}`, token).its('status').should('eq', 200);
      get('/trip-plan/get-trip', token).its('status').should('eq', 401);
      post('/auth/login', undefined, {username: user.username, password: PASSWORD}).its('status').should('eq', 400);
    });
  });

  it('ignores another account\'s id: a user can only delete their own', () => {
    signIn().then(victim => {
      signIn().then(attacker => {
        post(`/user/${victim.user.id}`, attacker.token).its('status').should('eq', 200);
        get('/trip-plan/get-trip', victim.token).its('status').should('eq', 200);
        get('/trip-plan/get-trip', attacker.token).its('status').should('eq', 401);
      });
    });
  });

  it('lets an admin delete any account by id', () => {
    signIn().then(victim => {
      signInAdmin().then(admin => {
        post(`/user/${victim.user.id}`, admin.token).its('status').should('eq', 200);
        get('/trip-plan/get-trip', victim.token).its('status').should('eq', 401);
        get('/trip-plan/get-trip', admin.token).its('status').should('eq', 200);
      });
    });
  });

  it('keeps the password hashed', () => {
    signIn().then(({user}) => {
      stored(user.id).then(saved => {
        expect(saved.password).not.to.eq(PASSWORD);
        expect(saved.password).to.match(/^\$2[aby]\$/);
      });
    });
  });
});

describe('image upload', () => {
  it('stores a picture and serves the same bytes back', () => {
    signIn().then(({token}) => {
      upload(token, {name: 'a.png', type: 'image/png', data: pngBytes()}).then(up => {
        expect(up.status).to.eq(201);
        expect(up.body.url).to.match(/\/files\/[0-9a-f]{24}$/);

        cy.wrap(null)
          .then(async () => {
            const res = await fetch(`${Cypress.config('baseUrl')}${new URL(up.body.url).pathname}`);
            return {
              status: res.status,
              type: res.headers.get('content-type'),
              nosniff: res.headers.get('x-content-type-options'),
              bytes: Array.from(new Uint8Array(await res.arrayBuffer())),
            };
          })
          .then(file => {
            expect(file.status).to.eq(200);
            expect(file.type).to.eq('image/png');
            expect(file.nosniff).to.eq('nosniff');
            expect(file.bytes).to.deep.eq(Array.from(pngBytes()));
          });
      });
    });
  });

  it('refuses a file that is not an image, whatever its name says', () => {
    signIn().then(({token}) => {
      upload(token, {name: 'a.png', type: 'image/png', data: '<script>alert(1)</script>'}).then(res => {
        expect(res.status).to.be.within(400, 499);
      });
    });
  });

  it('refuses a content type that is not an image', () => {
    signIn().then(({token}) => {
      upload(token, {name: 'a.txt', type: 'text/plain', data: 'hello'}).then(res => {
        expect(res.status).to.eq(400);
        expect(res.body.code).to.eq('IMAGE_TYPE');
      });
    });
  });

  it('refuses more than one file', () => {
    signIn().then(({token}) => {
      const part = {name: 'a.png', type: 'image/png', data: pngBytes()};
      upload(token, part, {...part, name: 'b.png'}).then(res => {
        expect(res.status).to.eq(400);
        expect(res.body.code).to.eq('UPLOAD_ERROR');
      });
    });
  });

  it('refuses a request without a file', () => {
    signIn().then(({token}) => post('/upload/image', token).its('status').should('eq', 400));
  });

  it('refuses a picture over MAX_IMAGE_MB', () => {
    signIn().then(({token}) => {
      const big = new Uint8Array(1024 * 1024 + 10);
      big.set(pngBytes());
      upload(token, {name: 'big.png', type: 'image/png', data: big}).its('status').should('eq', 413);
    });
  });

  it('needs a token to upload, and 404 for an unknown file', () => {
    upload(undefined, {name: 'a.png', type: 'image/png', data: pngBytes()}).its('status').should('eq', 401);
    get('/files/64b000000000000000000001').its('status').should('eq', 404);
    get('/files/not-an-id').its('status').should('be.oneOf', [400, 404]);
    expect(del).to.be.a('function');
    expect(call).to.be.a('function');
  });
});
