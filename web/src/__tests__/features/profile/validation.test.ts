import {describe, expect, it} from 'vitest';
import {profileSchema} from '@/features/profile/validation';
import {schemaErrors} from '@/lib/forms';

const valid = {fullname: 'Lan Nguyễn', email: 'lan@x.vn', phone: '0901234567', address: 'Hà Nội', image: 'http://img/lan.jpg'};
const errors = (change: Record<string, unknown>) => schemaErrors(profileSchema, {...valid, ...change});

describe('profileSchema', () => {
  it('accepts a complete profile', () => {
    expect(errors({})).toEqual({});
  });

  it.each([
    [{fullname: ' '}, {fullname: 'profile.errors.fullname'}],
    [{fullname: 'x'.repeat(101)}, {fullname: 'profile.errors.fullnameLong'}],
    [{phone: ''}, {phone: 'profile.errors.phone'}],
    [{phone: '090123'}, {phone: 'profile.invalidPhone'}],
    [{phone: '09012345678'}, {phone: 'profile.invalidPhone'}],
    [{phone: '09a1234567'}, {phone: 'profile.invalidPhone'}],
    [{address: ''}, {address: 'profile.errors.address'}],
    [{address: 'x'.repeat(201)}, {address: 'profile.errors.addressLong'}],
    [{image: ''}, {image: 'profile.errors.image'}],
  ])('refuses %j', (change, expected) => {
    expect(errors(change)).toEqual(expected);
  });

  it('reports every missing field at once', () => {
    expect(errors({fullname: '', phone: '', address: '', image: ''})).toEqual({
      fullname: 'profile.errors.fullname',
      phone: 'profile.errors.phone',
      address: 'profile.errors.address',
      image: 'profile.errors.image',
    });
  });
});
