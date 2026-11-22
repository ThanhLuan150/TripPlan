import * as Yup from 'yup';
import {provices} from './provinces';

// Messages are i18n keys; forms show them with t(error).

const username = Yup.string()
  .min(5, 'validation.usernameMin')
  .max(12, 'validation.usernameMax')
  .required('validation.usernameRequired');

const password = Yup.string()
  .min(6, 'validation.passwordMin')
  .max(20, 'validation.passwordMax')
  .required('validation.passwordRequired');

const confirmPassword = Yup.string()
  .min(6, 'validation.passwordMin')
  .max(20, 'validation.passwordMax')
  .required('validation.confirmRequired');

const email = Yup.string()
  .email('validation.emailInvalid')
  .required('validation.emailRequired');

export const loginSchema = Yup.object().shape({username, password});

export const registerSchema = Yup.object().shape({
  username,
  email,
  password,
  confirmPassword,
});

export const forgotPasswordSchema = Yup.object().shape({email});

export const newPasswordSchema = Yup.object().shape({
  password,
  confirmPassword,
});

export const OTP_LENGTH = 6;

// the six boxes of the code: every one holds a digit
export const otpSchema = Yup.object({
  otp: Yup.array(Yup.string())
    .length(OTP_LENGTH, 'auth.verify.incomplete')
    .test(
      'digits',
      'auth.verify.incomplete',
      value => !!value && value.every(digit => /^\d$/.test(digit ?? '')),
    ),
});

export const profileSchema = Yup.object({
  fullname: Yup.string()
    .trim()
    .required('profile.errors.fullname')
    .max(100, 'profile.errors.fullnameLong'),
  phone: Yup.string()
    .required('profile.errors.phone')
    .matches(/^\d{10}$/, 'profile.invalidPhone'),
  address: Yup.string()
    .trim()
    .required('profile.errors.address')
    .max(200, 'profile.errors.addressLong'),
});

export const MAX_PLAN_NAME = 35;

export const planNameSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required('trips.generate.nameRequired')
    .max(MAX_PLAN_NAME, 'trips.generate.nameLong'),
});

export const MAX_TRIP_DAYS = 7;
// a trip cannot start today after this hour
export const LAST_START_HOUR = 18;
const DAY_MS = 24 * 60 * 60 * 1000;
const dayStart = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// whole days from `start` to `end`, both included
export const countDays = (start: Date, end: Date) =>
  Math.round((dayStart(end) - dayStart(start)) / DAY_MS) + 1;

export const createTripSchema = Yup.object({
  location: Yup.string()
    .required('trips.create.errorProvince')
    .oneOf(provices, 'trips.create.errorProvince'),
  startDate: Yup.date()
    .required('trips.create.errorPickDates')
    .test(
      'not-past',
      'trips.create.errorPastDate',
      value => !value || dayStart(value) >= dayStart(new Date()),
    )
    .test('not-too-late', 'trips.create.errorTooLate', value => {
      const now = new Date();
      return (
        !value ||
        dayStart(value) !== dayStart(now) ||
        now.getHours() < LAST_START_HOUR
      );
    }),
  endDate: Yup.date()
    .required('trips.create.errorPickDates')
    .test('after-start', 'trips.create.errorEndBeforeStart', function (value) {
      const {startDate} = this.parent as {startDate?: Date};
      return !value || !startDate || countDays(startDate, value) >= 1;
    })
    .test('max-days', 'trips.create.errorMaxDays', function (value) {
      const {startDate} = this.parent as {startDate?: Date};
      return (
        !value || !startDate || countDays(startDate, value) <= MAX_TRIP_DAYS
      );
    }),
  quantity: Yup.number()
    .integer('trips.create.errorPeople')
    .min(1, 'trips.create.errorPeople')
    .max(10, 'trips.create.errorPeople')
    .required('trips.create.errorPeople'),
  budget: Yup.string().required('trips.create.errorMissing'),
  // at least one kind of place
  areaTypes: Yup.array(Yup.string().required())
    .min(1, 'trips.create.errorInterests')
    .required('trips.create.errorInterests'),
});
