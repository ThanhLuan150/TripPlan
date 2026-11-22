import {describe, expect, it} from 'vitest';
import {
  announcementSchema,
  challengeSchema,
  createUserSchema,
  MAX_ORDER,
  MAX_POINTS,
  settingsSchema,
  showcaseSchema,
  userSchema,
  videoSchema,
} from '@/features/admin/validation';
import {schemaErrors} from '@/lib/forms';
import type {AnyObject, ObjectSchema} from 'yup';

const errors = (schema: ObjectSchema<AnyObject>, values: AnyObject) => schemaErrors(schema, values);

describe('userSchema', () => {
  const valid = {fullname: 'An', email: 'an@x.vn', phone: '', role: 'user'};

  it('accepts a valid user, with or without a phone', () => {
    expect(errors(userSchema, valid)).toEqual({});
    expect(errors(userSchema, {...valid, phone: '0901 234 567'})).toEqual({});
  });

  it.each([
    [{fullname: ' '}, {fullname: 'admin.users.errors.fullnameRequired'}],
    [{fullname: 'x'.repeat(101)}, {fullname: 'admin.users.errors.fullnameLong'}],
    [{email: ''}, {email: 'admin.users.errors.emailRequired'}],
    [{email: 'nope'}, {email: 'admin.users.errors.emailInvalid'}],
    [{email: 'a b@x.vn'}, {email: 'admin.users.errors.emailInvalid'}],
    [{phone: 'abc'}, {phone: 'admin.users.errors.phoneInvalid'}],
    [{phone: '12345'}, {phone: 'admin.users.errors.phoneInvalid'}],
  ])('refuses %j', (change, expected) => {
    expect(errors(userSchema, {...valid, ...change})).toEqual(expected);
  });

  it('trims the values before checking them', () => {
    expect(errors(userSchema, {...valid, fullname: '  An  ', email: ' an@x.vn '})).toEqual({});
  });
});

describe('createUserSchema', () => {
  const valid = {fullname: 'An', username: 'an_1.x', email: 'an@x.vn', phone: '', password: '12345678', role: 'user'};

  it('accepts a valid account', () => {
    expect(errors(createUserSchema, valid)).toEqual({});
  });

  it.each([
    [{username: ''}, 'admin.users.errors.usernameInvalid'],
    [{username: 'ab'}, 'admin.users.errors.usernameInvalid'],
    [{username: 'a b c'}, 'admin.users.errors.usernameInvalid'],
    [{username: 'x'.repeat(31)}, 'admin.users.errors.usernameInvalid'],
  ])('refuses the username %j', (change, message) => {
    expect(errors(createUserSchema, {...valid, ...change})).toEqual({username: message});
  });

  it.each(['', '1234567'])('refuses the password "%s"', password => {
    expect(errors(createUserSchema, {...valid, password})).toEqual({password: 'admin.users.errors.passwordShort'});
  });

  it('also checks the profile fields', () => {
    expect(errors(createUserSchema, {...valid, email: 'x'})).toEqual({email: 'admin.users.errors.emailInvalid'});
  });
});

describe('challengeSchema', () => {
  const valid = {name: 'Hồ Gươm', summary: '', points: '50'};

  it('accepts the limits of the points', () => {
    expect(errors(challengeSchema, {...valid, points: '0'})).toEqual({});
    expect(errors(challengeSchema, {...valid, points: String(MAX_POINTS)})).toEqual({});
  });

  it('needs a name', () => {
    expect(errors(challengeSchema, {...valid, name: '  '})).toEqual({name: 'admin.challenges.errors.nameRequired'});
  });

  it.each(['', 'abc', '-1', '1.5', String(MAX_POINTS + 1)])('refuses %j points', points => {
    expect(errors(challengeSchema, {...valid, points})).toEqual({points: 'admin.challenges.errors.points'});
  });
});

describe('announcementSchema', () => {
  const valid = {title: 'Hello', message: '', status: 'draft', publishAt: '2026-03-02T09:00'};

  it('accepts a valid announcement', () => {
    expect(errors(announcementSchema, valid)).toEqual({});
  });

  it('needs a title', () => {
    expect(errors(announcementSchema, {...valid, title: ' '})).toEqual({
      title: 'admin.notifications.errors.titleRequired',
    });
  });

  it.each(['', 'soon'])('refuses the date "%s"', publishAt => {
    expect(errors(announcementSchema, {...valid, publishAt})).toEqual({
      publishAt: 'admin.notifications.errors.dateInvalid',
    });
  });

  it('only knows draft and published', () => {
    expect(errors(announcementSchema, {...valid, status: 'archived'})).toHaveProperty('status');
  });
});

describe('videoSchema', () => {
  const valid = {title: 'Hạ Long', location: '', youtubeLink: '', duration: '90', status: 'published', showOnHome: false};

  it('accepts a video without a link', () => {
    expect(errors(videoSchema, valid)).toEqual({});
    expect(errors(videoSchema, {...valid, youtubeLink: 'https://youtu.be/abc'})).toEqual({});
  });

  it('needs a title', () => {
    expect(errors(videoSchema, {...valid, title: ''})).toEqual({title: 'admin.videos.errors.titleRequired'});
  });

  it.each(['youtube.com/x', 'ftp://x.vn/a', 'https://a b'])('refuses the link %j', youtubeLink => {
    expect(errors(videoSchema, {...valid, youtubeLink})).toEqual({youtubeLink: 'admin.videos.errors.linkInvalid'});
  });

  it.each(['', '-1', '1.5', 'abc'])('refuses the duration %j', duration => {
    expect(errors(videoSchema, {...valid, duration})).toEqual({duration: 'admin.videos.errors.duration'});
  });
});

describe('showcaseSchema', () => {
  const valid = {imageUrl: 'http://img/a.jpg', title: '', location: '', sortOrder: '0', status: 'published'};

  it('accepts the limits of the order', () => {
    expect(errors(showcaseSchema, valid)).toEqual({});
    expect(errors(showcaseSchema, {...valid, sortOrder: String(MAX_ORDER)})).toEqual({});
  });

  it('needs an image', () => {
    expect(errors(showcaseSchema, {...valid, imageUrl: ''})).toEqual({imageUrl: 'admin.showcase.errors.imageRequired'});
  });

  it.each(['', '-1', '1.5', String(MAX_ORDER + 1)])('refuses the order %j', sortOrder => {
    expect(errors(showcaseSchema, {...valid, sortOrder})).toEqual({sortOrder: 'admin.showcase.errors.order'});
  });

  it('limits the title and the place to 200 characters', () => {
    expect(errors(showcaseSchema, {...valid, title: 'x'.repeat(201), location: 'y'.repeat(201)})).toEqual(
      expect.objectContaining({title: expect.any(String), location: expect.any(String)}),
    );
  });
});

describe('settingsSchema', () => {
  const valid = {appName: 'Aloca', supportEmail: 'help@aloca.vn', hotline: '+84 (28) 1234-5678'};

  it('accepts valid settings, the e-mail and the hotline are optional', () => {
    expect(errors(settingsSchema, valid)).toEqual({});
    expect(errors(settingsSchema, {...valid, supportEmail: '', hotline: ''})).toEqual({});
  });

  it('needs the name of the app', () => {
    expect(errors(settingsSchema, {...valid, appName: ' '})).toEqual({appName: 'admin.settings.errors.appName'});
  });

  it('checks the e-mail and the hotline', () => {
    expect(errors(settingsSchema, {...valid, supportEmail: 'x', hotline: 'call me'})).toEqual({
      supportEmail: 'admin.settings.errors.email',
      hotline: 'admin.settings.errors.hotline',
    });
  });
});
