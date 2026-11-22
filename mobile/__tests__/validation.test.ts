import {afterEach, beforeEach, describe, expect, it, jest} from '@jest/globals';
import {
  countDays,
  createTripSchema,
  forgotPasswordSchema,
  loginSchema,
  newPasswordSchema,
  otpSchema,
  planNameSchema,
  profileSchema,
  registerSchema,
} from '../src/lib/validation';
import en from '../src/i18n/en.json';
import vi from '../src/i18n/vi.json';

// i18n key of the first error, or null when valid
const firstError = (
  schema: {validateSync: (v: unknown) => unknown},
  value: unknown,
) => {
  try {
    schema.validateSync(value);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
};

const translated = (dict: object, key: string) =>
  key.split('.').reduce<any>((o, k) => o?.[k], dict);

describe('auth schemas', () => {
  it('login', () => {
    expect(
      firstError(loginSchema, {username: 'traveler', password: 'secret1'}),
    ).toBeNull();
    expect(
      firstError(loginSchema, {username: 'abc', password: 'secret1'}),
    ).toBe('validation.usernameMin');
    expect(
      firstError(loginSchema, {username: 'traveler', password: '123'}),
    ).toBe('validation.passwordMin');
  });

  it('register, forgot and new password', () => {
    expect(
      firstError(registerSchema, {
        username: 'traveler',
        email: 'a@b.co',
        password: 'secret1',
        confirmPassword: 'secret1',
      }),
    ).toBeNull();
    expect(
      firstError(registerSchema, {
        username: 'traveler',
        email: 'nope',
        password: 'secret1',
        confirmPassword: 'secret1',
      }),
    ).toBe('validation.emailInvalid');
    expect(firstError(forgotPasswordSchema, {})).toBe(
      'validation.emailRequired',
    );
    expect(firstError(newPasswordSchema, {password: 'secret1'})).toBe(
      'validation.confirmRequired',
    );
  });
});

describe('otpSchema', () => {
  it('accepts six digits', () => {
    expect(
      firstError(otpSchema, {otp: ['1', '2', '3', '4', '5', '6']}),
    ).toBeNull();
  });

  it.each([
    [['1', '2', '3', '4', '5', '']],
    [['1', '2', '3', '4', '5']],
    [['1', '2', '3', '4', '5', '6', '7']],
    [['1', '2', '3', '4', '5', 'a']],
  ])('refuses %j', otp => {
    expect(firstError(otpSchema, {otp})).toBe('auth.verify.incomplete');
  });
});

describe('profileSchema', () => {
  const valid = {
    fullname: 'Lan Nguyễn',
    phone: '0901234567',
    address: 'Hà Nội',
  };

  it('accepts a complete profile', () => {
    expect(firstError(profileSchema, valid)).toBeNull();
  });

  it.each([
    [{fullname: ' '}, 'profile.errors.fullname'],
    [{fullname: 'x'.repeat(101)}, 'profile.errors.fullnameLong'],
    [{phone: ''}, 'profile.errors.phone'],
    [{phone: '090123'}, 'profile.invalidPhone'],
    [{phone: '09a1234567'}, 'profile.invalidPhone'],
    [{address: ''}, 'profile.errors.address'],
    [{address: 'x'.repeat(201)}, 'profile.errors.addressLong'],
  ])('refuses %j', (change, message) => {
    expect(firstError(profileSchema, {...valid, ...change})).toBe(message);
  });
});

describe('planNameSchema', () => {
  it('accepts a name of up to 35 characters', () => {
    expect(firstError(planNameSchema, {name: 'Đà Lạt 3 ngày'})).toBeNull();
    expect(firstError(planNameSchema, {name: 'x'.repeat(35)})).toBeNull();
  });

  it.each(['', '   '])('needs a name (%j)', name => {
    expect(firstError(planNameSchema, {name})).toBe(
      'trips.generate.nameRequired',
    );
  });

  it('limits the name', () => {
    expect(firstError(planNameSchema, {name: 'x'.repeat(36)})).toBe(
      'trips.generate.nameLong',
    );
  });
});

describe('createTripSchema', () => {
  // Monday 2 March 2026, 9:00
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 2, 9));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const day = (d: number) => new Date(2026, 2, d, 9);
  const valid = {
    location: 'Lâm Đồng',
    startDate: day(2),
    endDate: day(4),
    quantity: 2,
    budget: '1 - 5',
    areaTypes: ['history'] as string[],
  };

  it('counts both the first and the last day', () => {
    expect(countDays(day(2), day(2))).toBe(1);
    expect(countDays(day(2), day(8))).toBe(7);
  });

  it('accepts a trip of up to 7 days', () => {
    expect(firstError(createTripSchema, valid)).toBeNull();
    expect(
      firstError(createTripSchema, {...valid, endDate: day(8)}),
    ).toBeNull();
  });

  it('refuses a trip of more than 7 days', () => {
    expect(firstError(createTripSchema, {...valid, endDate: day(9)})).toBe(
      'trips.create.errorMaxDays',
    );
  });

  it('refuses an end date before the start', () => {
    expect(
      firstError(createTripSchema, {
        ...valid,
        startDate: day(5),
        endDate: day(3),
      }),
    ).toBe('trips.create.errorEndBeforeStart');
  });

  it('refuses a start date in the past', () => {
    const past = new Date();
    past.setDate(past.getDate() - 2);
    expect(
      firstError(createTripSchema, {...valid, startDate: past, endDate: past}),
    ).toBe('trips.create.errorPastDate');
  });

  it('refuses today once it is 18:00, accepts it before', () => {
    const today = new Date();
    const at = (hour: number) => {
      jest
        .useFakeTimers()
        .setSystemTime(
          new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            hour,
          ),
        );
      return firstError(createTripSchema, {
        ...valid,
        startDate: new Date(),
        endDate: new Date(),
      });
    };
    expect(at(18)).toBe('trips.create.errorTooLate');
    expect(at(17)).toBeNull();
  });

  it.each(['', 'Sài Gòn'])('needs a province of the list (%j)', location => {
    expect(firstError(createTripSchema, {...valid, location})).toBe(
      'trips.create.errorProvince',
    );
  });

  it('needs at least one kind of place', () => {
    expect(firstError(createTripSchema, {...valid, areaTypes: []})).toBe(
      'trips.create.errorInterests',
    );
    expect(
      firstError(createTripSchema, {
        ...valid,
        areaTypes: ['history', 'outdoor'],
      }),
    ).toBeNull();
  });

  it('needs a budget', () => {
    expect(firstError(createTripSchema, {...valid, budget: ''})).toBe(
      'trips.create.errorMissing',
    );
  });

  it.each([0, 11, 1.5])('keeps the people between 1 and 10 (%j)', quantity => {
    expect(firstError(createTripSchema, {...valid, quantity})).toBe(
      'trips.create.errorPeople',
    );
  });
});

describe('error keys', () => {
  it('all exist in both translations', () => {
    const keys = [
      'validation.usernameMin',
      'validation.passwordMin',
      'validation.emailInvalid',
      'validation.confirmRequired',
      'auth.verify.incomplete',
      'profile.invalidPhone',
      'profile.errors.fullname',
      'profile.errors.fullnameLong',
      'profile.errors.phone',
      'profile.errors.address',
      'profile.errors.addressLong',
      'trips.generate.nameRequired',
      'trips.generate.nameLong',
      'trips.create.errorProvince',
      'trips.create.errorMaxDays',
      'trips.create.errorMissing',
      'trips.create.errorPeople',
      'trips.create.errorInterests',
      'trips.create.errorEndBeforeStart',
      'trips.create.errorPastDate',
      'trips.create.errorTooLate',
    ];
    for (const key of keys) {
      expect(translated(en, key)).toEqual(expect.any(String));
      expect(translated(vi, key)).toEqual(expect.any(String));
    }
  });
});
