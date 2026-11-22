import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoAdd, IoPeopleOutline, IoRemove} from 'react-icons/io5';
import FormSection from './FormSection';

// Number of people: - / + buttons and a typed number, kept between `min` and
// `max` (the typed text is clamped when the field is left).
export default function QuantityField({
  value,
  min = 1,
  max,
  onChange,
  error,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  error?: string;
}) {
  const {t} = useTranslation();
  const [text, setText] = useState(String(value));
  const clamp = (n: number) => Math.max(min, Math.min(max, Math.floor(n)));
  const set = (n: number) => {
    const next = clamp(n);
    onChange(next);
    setText(String(next));
  };
  // the form changed the value (reset): show it, but keep what is being typed
  useEffect(() => {
    if (clamp(parseInt(text, 10) || min) !== value) {
      setText(String(value));
    }
    // only when the value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const step = 'grid size-12 place-items-center text-slate-600 transition hover:text-brand-600 disabled:text-slate-300';

  return (
    <FormSection
      icon={<IoPeopleOutline size={18} />}
      title={t('trips.create.people')}
      hint={t('trips.create.peopleHint')}
      labelFor="quantity"
      error={error}>
      <div
        className={`inline-flex items-center overflow-hidden rounded-xl border bg-white shadow-sm transition focus-within:ring-4 ${
          error ? 'border-rose-400 focus-within:ring-rose-100' : 'border-slate-200 focus-within:border-brand-400 focus-within:ring-brand-100'
        }`}>
        <button type="button" aria-label={t('trips.create.decrease')} disabled={value <= min} onClick={() => set(value - 1)} className={step}>
          <IoRemove size={20} />
        </button>
        <input
          id="quantity"
          inputMode="numeric"
          value={text}
          aria-invalid={!!error}
          onChange={e => {
            setText(e.target.value);
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n)) {
              onChange(clamp(n));
            }
          }}
          onBlur={() => set(value)}
          className="h-12 w-14 border-x border-slate-200 text-center text-lg font-semibold outline-none focus:bg-brand-50"
        />
        <button type="button" aria-label={t('trips.create.increase')} disabled={value >= max} onClick={() => set(value + 1)} className={step}>
          <IoAdd size={20} />
        </button>
      </div>
    </FormSection>
  );
}
