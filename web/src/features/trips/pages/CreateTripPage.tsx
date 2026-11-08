import {ReactNode, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {
  IoAdd,
  IoArrowBack,
  IoCalendarOutline,
  IoChatbubbles,
  IoCheckmark,
  IoCreateOutline,
  IoChevronDown,
  IoHeartOutline,
  IoLocationOutline,
  IoPeopleOutline,
  IoRemove,
  IoSparkles,
  IoWalletOutline,
} from 'react-icons/io5';
import {routes} from '@/app/routes';
import Toast from '@/components/ui/Toast';
import {useClickOutside} from '@/hooks/useClickOutside';
import {addCommas, DAY_MS, fromInputDate, startOfDay, toInputDate} from '@/lib/date';
import {storage, StorageKeys} from '@/lib/storage';
import {removeVietnameseTones} from '@/lib/text';
import {areaTypes} from '../data/areaTypes';
import {provices} from '../data/provinces';
import type {BudgetTier, GenerateTripParams, TripFormPrefill} from '../types';

const searchProvinces = (text: string) =>
  provices.filter(
    value =>
      removeVietnameseTones(value.toLowerCase()).includes(text.toLowerCase()) ||
      value.toLowerCase().includes(text.toLowerCase()),
  );

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

function FormSection({
  icon,
  title,
  hint,
  children,
  labelFor,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  children: ReactNode;
  labelFor?: string;
}) {
  return (
    <section>
      <label htmlFor={labelFor} className="mb-2.5 flex items-center gap-2 font-semibold text-slate-900">
        <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
          {icon}
        </span>
        {title}
        {hint && <span className="text-sm font-normal text-slate-400">{hint}</span>}
      </label>
      {children}
    </section>
  );
}

export default function CreateTripPage() {
  const {t} = useTranslation();
  const navigate = useNavigate();
  // pre-filled from the home page search box or from an AI chat suggestion
  const prefill = (useLocation().state as TripFormPrefill | null) ?? {};
  const prefillIsProvince = !!prefill.location && provices.includes(prefill.location);

  const [proviceShow, setProviceShow] = useState(!!prefill.location && !prefillIsProvince);
  const [location, setLocation] = useState(prefill.location ?? '');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(() => {
    const end = new Date();
    end.setDate(end.getDate() + Math.max(0, (prefill.days ?? 1) - 1));
    return end;
  });
  const [quantity, setQuantity] = useState(prefill.people ?? 1);
  const [quantityText, setQuantityText] = useState(String(prefill.people ?? 1));
  const [budgetTier, setBudgetTier] = useState<BudgetTier | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [note, setNote] = useState(prefill.note ?? '');

  const provinceRef = useClickOutside(() => setProviceShow(false));
  const provinceFilter = searchProvinces(location);
  const budgets = budgetOptions(quantity);
  const budget = budgets.find(b => b.tier === budgetTier);
  const dayCount = Math.round((startOfDay(endDate) - startOfDay(startDate)) / DAY_MS) + 1;

  const fail = (key: string) =>
    Toast.show({type: 'error', text1: t('common.failed'), text2: t(key)});

  const toggleInterest = (item: string) =>
    setInterests(prev => (prev.includes(item) ? prev.filter(a => a !== item) : [...prev, item]));

  const handleStartDate = (value: string) => {
    if (!value) {
      return;
    }
    const selected = fromInputDate(value);
    const today = new Date();
    if (startOfDay(selected) < startOfDay(today)) {
      fail('trips.create.errorPastDate');
    } else if (startOfDay(selected) === startOfDay(today) && today.getHours() >= 18) {
      fail('trips.create.errorTooLate');
    } else {
      setStartDate(selected);
      if (startOfDay(endDate) < startOfDay(selected)) {
        setEndDate(selected);
      }
    }
  };

  const handleEndDate = (value: string) => {
    if (!value) {
      return;
    }
    const selected = fromInputDate(value);
    if (startOfDay(selected) >= startOfDay(startDate)) {
      setEndDate(selected);
    } else {
      fail('trips.create.errorEndBeforeStart');
    }
  };

  const updateQuantity = (value: number) => {
    const clamped = Math.max(1, Math.min(10, Math.floor(value)));
    setQuantity(clamped);
    setQuantityText(clamped.toString());
  };

  const handleQuantityInput = (text: string) => {
    setQuantityText(text);
    const n = parseInt(text, 10);
    if (!isNaN(n)) {
      setQuantity(Math.max(1, Math.min(10, n)));
    }
  };

  const handleReset = () => {
    setLocation('');
    setStartDate(new Date());
    setEndDate(new Date());
    updateQuantity(1);
    setBudgetTier(null);
    setInterests([]);
    setNote('');
  };

  const handleNext = () => {
    if (startOfDay(startDate) > startOfDay(endDate)) {
      fail('trips.create.errorPickDates');
      return;
    }
    if (dayCount > 7) {
      fail('trips.create.errorMaxDays');
      return;
    }
    if (!provices.includes(location)) {
      fail('trips.create.errorProvince');
      return;
    }
    if (!budget) {
      fail('trips.create.errorMissing');
      return;
    }
    const params: GenerateTripParams = {
      location,
      quantity,
      budget: budget.value,
      budgetTier: budget.tier,
      areaTypes: interests,
      userLocation: storage.getItem(StorageKeys.userLocation),
      days: dayCount,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      note: note.trim() || undefined,
    };
    navigate(routes.GenerateTripsScreen, {state: params});
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

        <div className="card space-y-7 p-5 md:p-7">
          {/* destination */}
          <FormSection
            icon={<IoLocationOutline size={18} />}
            title={t('trips.create.destination')}
            labelFor="province">
            <div className="relative" ref={provinceRef}>
              <input
                id="province"
                className="field pr-11"
                placeholder={t('trips.create.destinationPlaceholder')}
                autoComplete="off"
                value={location}
                onChange={e => {
                  setLocation(e.target.value);
                  setProviceShow(true);
                }}
                onFocus={() => setProviceShow(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && provinceFilter.length > 0) {
                    e.preventDefault();
                    setLocation(provinceFilter[0]);
                    setProviceShow(false);
                  } else if (e.key === 'Escape') {
                    setProviceShow(false);
                  }
                }}
              />
              <button
                type="button"
                aria-label={t('trips.create.provinceList')}
                onClick={() => {
                  setProviceShow(!proviceShow);
                  setLocation('');
                }}
                className="absolute top-1 right-1 grid size-10 place-items-center rounded-lg text-slate-400 hover:text-slate-600">
                <IoChevronDown size={18} className={`transition ${proviceShow ? 'rotate-180' : ''}`} />
              </button>
              {proviceShow && provinceFilter.length > 0 && (
                <ul
                  role="listbox"
                  className="absolute inset-x-0 z-20 mt-2 max-h-64 animate-fade-in overflow-y-auto rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-100">
                  {provinceFilter.map(item => (
                    <li key={item}>
                      <button
                        type="button"
                        onClick={() => {
                          setLocation(item);
                          setProviceShow(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-brand-50 ${
                          item === location ? 'font-semibold text-brand-700' : 'text-slate-700'
                        }`}>
                        {item}
                        {item === location && <IoCheckmark size={16} />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FormSection>

          {/* dates */}
          <FormSection
            icon={<IoCalendarOutline size={18} />}
            title={t('trips.create.dates')}
            hint={t('trips.create.daysHint', {count: dayCount})}>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  {t('trips.create.startDate')}
                </span>
                <input
                  type="date"
                  className="field"
                  value={toInputDate(startDate)}
                  min={toInputDate(new Date())}
                  onChange={e => handleStartDate(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-500">
                  {t('trips.create.endDate')}
                </span>
                <input
                  type="date"
                  className="field"
                  value={toInputDate(endDate)}
                  min={toInputDate(startDate)}
                  onChange={e => handleEndDate(e.target.value)}
                />
              </label>
            </div>
          </FormSection>

          {/* people */}
          <FormSection
            icon={<IoPeopleOutline size={18} />}
            title={t('trips.create.people')}
            hint={t('trips.create.peopleHint')}
            labelFor="quantity">
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                aria-label={t('trips.create.decrease')}
                disabled={quantity <= 1}
                onClick={() => updateQuantity(quantity - 1)}
                className="grid size-12 place-items-center text-slate-600 transition hover:text-brand-600 disabled:text-slate-300">
                <IoRemove size={20} />
              </button>
              <input
                id="quantity"
                inputMode="numeric"
                value={quantityText}
                onChange={e => handleQuantityInput(e.target.value)}
                onBlur={() => updateQuantity(quantity)}
                className="h-12 w-14 border-x border-slate-200 text-center text-lg font-semibold outline-none focus:bg-brand-50"
              />
              <button
                type="button"
                aria-label={t('trips.create.increase')}
                disabled={quantity >= 10}
                onClick={() => updateQuantity(quantity + 1)}
                className="grid size-12 place-items-center text-slate-600 transition hover:text-brand-600 disabled:text-slate-300">
                <IoAdd size={20} />
              </button>
            </div>
          </FormSection>

          {/* budget */}
          <FormSection icon={<IoWalletOutline size={18} />} title={t('trips.create.budget')}>
            <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
              {budgets.map(option => {
                const selected = budgetTier === option.tier;
                return (
                  <button
                    key={option.tier}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setBudgetTier(option.tier)}
                    className={`rounded-xl border p-3 text-left transition ${
                      selected
                        ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100'
                        : 'border-slate-200 hover:border-brand-300'
                    }`}>
                    <span
                      className={`flex items-center justify-between text-sm font-semibold ${
                        selected ? 'text-brand-700' : 'text-slate-900'
                      }`}>
                      {t(option.labelKey)}
                      {selected && <IoCheckmark size={16} />}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {t(option.key, option.vars)}
                    </span>
                  </button>
                );
              })}
            </div>
          </FormSection>

          {/* interests */}
          <FormSection icon={<IoHeartOutline size={18} />} title={t('trips.create.interests')}>
            <div className="flex flex-wrap gap-2">
              {areaTypes.map(({value, labelKey}) => {
                const selected = interests.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleInterest(value)}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selected
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50'
                    }`}>
                    {selected && <IoCheckmark size={15} />}
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>
          </FormSection>

          {/* note for the AI (filled with the chat answer when coming from the chat) */}
          <FormSection
            icon={<IoCreateOutline size={18} />}
            title={t('trips.create.note')}
            hint={t('trips.create.noteHint')}
            labelFor="note">
            <textarea
              id="note"
              rows={note ? 6 : 3}
              maxLength={1500}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={t('trips.create.notePlaceholder')}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 transition outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            />
          </FormSection>

          <div className="flex gap-3 border-t border-slate-100 pt-5">
            <button type="button" className="btn btn-outline h-12 flex-1" onClick={handleReset}>
              {t('trips.create.reset')}
            </button>
            <button type="button" className="btn btn-primary h-12 flex-[2] text-base" onClick={handleNext}>
              <IoSparkles size={18} />
              {t('trips.create.submit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
