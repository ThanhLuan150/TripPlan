import {useFormik} from 'formik';
import {useLocation, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoArrowBack, IoChatbubbles, IoSparkles} from 'react-icons/io5';
import {routes} from '@/app/routes';
import {addCommas, fromInputDate, startOfDay, toInputDate} from '@/lib/date';
import {fieldError} from '@/lib/forms';
import {storage, StorageKeys} from '@/lib/storage';
import BudgetField from '../components/form/BudgetField';
import DateRangeField from '../components/form/DateRangeField';
import InterestsField from '../components/form/InterestsField';
import NoteField from '../components/form/NoteField';
import ProvinceField from '../components/form/ProvinceField';
import QuantityField from '../components/form/QuantityField';
import type {BudgetTier, GenerateTripParams, TripFormPrefill} from '../types';
import {countDays, createTripSchema, MAX_NOTE, MAX_PEOPLE} from '../validation';

// Budget ranges per person. `value` (Vietnamese) is sent to the AI prompt.
const budgetOptions = (people: number) => {
  const m1 = addCommas(1000000 * people);
  const m5 = addCommas(5000000 * people);
  const m15 = addCommas(15000000 * people);
  return [
    {tier: 'low' as BudgetTier, value: `Dưới ${m1} VND`, labelKey: 'trips.create.budgetLow', key: 'trips.create.budgetUnder', vars: {max: m1}},
    {tier: 'mid' as BudgetTier, value: `${m1} VND - ${m5} VND`, labelKey: 'trips.create.budgetMid', key: 'trips.create.budgetRange', vars: {min: m1, max: m5}},
    {tier: 'high' as BudgetTier, value: `${m5} VND - ${m15} VND`, labelKey: 'trips.create.budgetHigh', key: 'trips.create.budgetRange', vars: {min: m5, max: m15}},
  ];
};

export default function CreateTripPage() {
  const {t} = useTranslation();
  const navigate = useNavigate();
  // pre-filled from the home page search box or from an AI chat suggestion
  const prefill = (useLocation().state as TripFormPrefill | null) ?? {};
  const today = toInputDate(new Date());

  const formik = useFormik({
    initialValues: {
      location: prefill.location ?? '',
      startDate: today,
      endDate: (() => {
        const end = new Date();
        end.setDate(end.getDate() + Math.max(0, (prefill.days ?? 1) - 1));
        return toInputDate(end);
      })(),
      quantity: prefill.people ?? 1,
      budgetTier: '' as BudgetTier | '',
      interests: [] as string[],
      note: prefill.note ?? '',
    },
    validationSchema: createTripSchema,
    onSubmit: values => {
      const budget = budgetOptions(values.quantity).find(b => b.tier === values.budgetTier)!;
      const params: GenerateTripParams = {
        location: values.location,
        quantity: values.quantity,
        budget: budget.value,
        budgetTier: budget.tier,
        areaTypes: values.interests,
        userLocation: storage.getItem(StorageKeys.userLocation),
        days: countDays(values.startDate, values.endDate),
        startDate: fromInputDate(values.startDate).toISOString(),
        endDate: fromInputDate(values.endDate).toISOString(),
        note: values.note.trim() || undefined,
      };
      navigate(routes.GenerateTripsScreen, {state: params});
    },
  });
  const {values, setFieldValue} = formik;

  // an error shows once its field was touched, or when the form is submitted
  const shown = (field: keyof typeof values) => {
    const message = fieldError(formik, field);
    return message ? t(message) : undefined;
  };
  // a date shows its error as soon as it is changed
  const dateError = (field: 'startDate' | 'endDate') => {
    const message = formik.errors[field];
    return message ? t(message) : undefined;
  };

  // an empty date field is ignored; a later start date moves the end date
  const handleStartDate = (value: string) => {
    if (!value) {
      return;
    }
    const endDate = startOfDay(fromInputDate(values.endDate)) < startOfDay(fromInputDate(value)) ? value : values.endDate;
    // one update: two setFieldValue calls would validate each against stale values
    formik.setValues({...values, startDate: value, endDate});
  };

  const handleReset = () => {
    formik.resetForm({values: {...formik.initialValues, location: '', endDate: today, quantity: 1, note: ''}});
  };

  return (
    <div className="px-4 pt-2 pb-6 md:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            aria-label={t('common.back')}
            onClick={() => navigate(routes.AddNewTrip)}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-slate-700 shadow-soft ring-1 ring-slate-100 transition hover:bg-slate-50">
            <IoArrowBack size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{t('trips.create.title')}</h1>
            <p className="text-sm text-slate-500">{t('trips.create.subtitle')}</p>
          </div>
        </div>

        {prefill.fromChat && (
          <div className="mb-4 flex items-start gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-800 ring-1 ring-brand-100">
            <IoChatbubbles size={20} className="mt-0.5 shrink-0 text-brand-600" />
            <p>
              {t('trips.create.fromChat')}
              {!prefill.location && ` ${t('trips.create.fromChatNoPlace')}`}
            </p>
          </div>
        )}

        <form className="card space-y-7 p-5 md:p-7" onSubmit={formik.handleSubmit} noValidate>
          <ProvinceField
            value={values.location}
            onChange={value => setFieldValue('location', value)}
            onBlur={() => formik.setFieldTouched('location', true)}
            error={shown('location')}
          />

          <DateRangeField
            startDate={values.startDate}
            endDate={values.endDate}
            minStart={today}
            days={countDays(values.startDate, values.endDate)}
            startError={dateError('startDate')}
            endError={dateError('endDate')}
            onStart={handleStartDate}
            onEnd={value => value && setFieldValue('endDate', value)}
          />

          <QuantityField
            value={values.quantity}
            max={MAX_PEOPLE}
            onChange={value => setFieldValue('quantity', value)}
            error={shown('quantity')}
          />

          <BudgetField
            value={values.budgetTier}
            options={budgetOptions(values.quantity)}
            onChange={tier => setFieldValue('budgetTier', tier)}
            error={shown('budgetTier')}
          />

          <InterestsField
            value={values.interests}
            onChange={value => {
              setFieldValue('interests', value);
              formik.setFieldTouched('interests', true, false);
            }}
            error={shown('interests')}
          />

          <NoteField
            value={values.note}
            max={MAX_NOTE}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={shown('note')}
          />

          <div className="flex gap-3 border-t border-slate-100 pt-5">
            <button type="button" className="btn btn-outline h-12 flex-1" onClick={handleReset}>
              {t('trips.create.reset')}
            </button>
            <button type="submit" className="btn btn-primary h-12 flex-[2] text-base">
              <IoSparkles size={18} />
              {t('trips.create.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
