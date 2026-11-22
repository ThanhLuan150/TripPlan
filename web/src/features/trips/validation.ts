import * as Yup from 'yup';
import {DAY_MS, fromInputDate, startOfDay} from '@/lib/date';
import {provices} from './data/provinces';

// Yup schemas of the trip forms. Messages are i18n keys: forms show them with
// t(error).

export const MAX_TRIP_DAYS = 7;
export const MAX_PEOPLE = 10;
export const MAX_PLAN_NAME = 35;
export const MAX_NOTE = 1500;
// a trip cannot start today after this hour
export const LAST_START_HOUR = 18;

// whole days from `start` to `end`, both included (yyyy-mm-dd)
export const countDays = (start: string, end: string) =>
  Math.round((startOfDay(fromInputDate(end)) - startOfDay(fromInputDate(start))) / DAY_MS) + 1;

const dateInput = Yup.string().required('trips.create.errorPickDates');

export const createTripSchema = Yup.object({
  location: Yup.string().required('trips.create.errorProvince').oneOf(provices, 'trips.create.errorProvince'),
  startDate: dateInput
    .test('not-past', 'trips.create.errorPastDate', value => {
      return !value || startOfDay(fromInputDate(value)) >= startOfDay(new Date());
    })
    .test('not-too-late', 'trips.create.errorTooLate', value => {
      const today = new Date();
      return !value || startOfDay(fromInputDate(value)) !== startOfDay(today) || today.getHours() < LAST_START_HOUR;
    }),
  endDate: dateInput
    .test('after-start', 'trips.create.errorEndBeforeStart', function (value) {
      const {startDate} = this.parent as {startDate?: string};
      return !value || !startDate || countDays(startDate, value) >= 1;
    })
    .test('max-days', 'trips.create.errorMaxDays', function (value) {
      const {startDate} = this.parent as {startDate?: string};
      return !value || !startDate || countDays(startDate, value) <= MAX_TRIP_DAYS;
    }),
  quantity: Yup.number()
    .typeError('trips.create.errorPeople')
    .integer('trips.create.errorPeople')
    .min(1, 'trips.create.errorPeople')
    .max(MAX_PEOPLE, 'trips.create.errorPeople')
    .required('trips.create.errorPeople'),
  budgetTier: Yup.string().oneOf(['low', 'mid', 'high'], 'trips.create.errorMissing').required('trips.create.errorMissing'),
  // at least one kind of place
  interests: Yup.array(Yup.string().required()).min(1, 'trips.create.errorInterests').required('trips.create.errorInterests'),
  note: Yup.string().max(MAX_NOTE, 'trips.create.errorNoteLong'),
});

export const planNameSchema = Yup.object({
  name: Yup.string()
    .trim()
    .required('trips.generate.nameRequired')
    .max(MAX_PLAN_NAME, 'trips.generate.nameLong'),
});
