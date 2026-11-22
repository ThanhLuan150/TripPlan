import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoCalendarOutline, IoChevronBack, IoChevronForward} from 'react-icons/io5';
import {useClickOutside} from '@/hooks/useClickOutside';
import {toInputDate} from '@/lib/date';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;
const parse = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return {year, month: month - 1, day};
};
// dd/mm/yyyy
const display = (value: string) => {
  const {year, month, day} = parse(value);
  return `${pad(day)}/${pad(month + 1)}/${year}`;
};

// A date field with its own calendar (not the browser's date input): a button
// showing the date opens a month grid. Days before `min` cannot be picked, and
// the days between `rangeStart` and `rangeEnd` are tinted (the trip's days).
// Values are yyyy-mm-dd.
export default function DatePicker({
  value,
  min,
  rangeStart,
  rangeEnd,
  invalid,
  name,
  labelledBy,
  align = 'left',
  onChange,
  onBlur,
}: {
  value: string;
  min?: string;
  rangeStart?: string;
  rangeEnd?: string;
  invalid?: boolean;
  name?: string;
  // id of the element that names the field
  labelledBy?: string;
  align?: 'left' | 'right';
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  const {t, i18n} = useTranslation();
  const [open, setOpen] = useState(false);
  // month on display: {year, month 0-11}
  const [view, setView] = useState(() => parse(value));
  const ref = useClickOutside(() => {
    if (open) {
      setOpen(false);
      onBlur?.();
    }
  });

  const locale = i18n.language === 'en' ? 'en-US' : 'vi-VN';
  const title = new Intl.DateTimeFormat(locale, {month: 'long', year: 'numeric'}).format(new Date(view.year, view.month, 1));
  // Monday first (1 Jan 2024 is a Monday)
  const weekdays = Array.from({length: 7}, (_, i) =>
    new Intl.DateTimeFormat(locale, {weekday: 'short'}).format(new Date(2024, 0, 1 + i)),
  );
  const offset = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
  const total = new Date(view.year, view.month + 1, 0).getDate();
  const today = toInputDate(new Date());

  const shift = (months: number) => {
    const next = new Date(view.year, view.month + months, 1);
    setView({year: next.getFullYear(), month: next.getMonth(), day: 1});
  };
  const toggle = () => {
    if (!open) {
      setView(parse(value));
    }
    setOpen(!open);
  };
  const close = () => {
    setOpen(false);
    onBlur?.();
  };
  const pick = (date: string) => {
    onChange(date);
    close();
  };

  // the first month the calendar can show is the one of `min`
  const canGoBack = !min || new Date(view.year, view.month, 0) >= new Date(parse(min).year, parse(min).month, 1);

  return (
    <div
      ref={ref}
      className="relative"
      onKeyDown={e => {
        if (e.key === 'Escape' && open) {
          close();
        }
      }}>
      <button
        type="button"
        name={name}
        aria-labelledby={labelledBy}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-invalid={!!invalid}
        onClick={toggle}
        className={`field flex items-center gap-2.5 text-left shadow-sm ${open ? 'border-brand-400 ring-4 ring-brand-100' : ''}`}>
        <IoCalendarOutline size={17} className="shrink-0 text-slate-400" />
        <span className="font-medium">{display(value)}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={title}
          className={`absolute z-30 mt-2 w-[19rem] max-w-[calc(100vw-2rem)] animate-fade-in rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}>
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label={t('common.previousMonth')}
              disabled={!canGoBack}
              onClick={() => shift(-1)}
              className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent">
              <IoChevronBack size={18} />
            </button>
            <p className="text-sm font-semibold text-slate-900 capitalize" aria-live="polite">
              {title}
            </p>
            <button
              type="button"
              aria-label={t('common.nextMonth')}
              onClick={() => shift(1)}
              className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100">
              <IoChevronForward size={18} />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-400">
            {weekdays.map(day => (
              <span key={day} className="py-1.5">
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({length: offset}, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({length: total}, (_, i) => {
              const day = i + 1;
              const date = iso(view.year, view.month, day);
              const selected = date === value;
              const inRange = !!rangeStart && !!rangeEnd && date > rangeStart && date < rangeEnd;
              const disabled = !!min && date < min;
              return (
                <button
                  key={date}
                  type="button"
                  data-date={date}
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-current={date === today ? 'date' : undefined}
                  onClick={() => pick(date)}
                  className={`mx-auto grid size-9 place-items-center rounded-full text-sm transition ${
                    selected
                      ? 'bg-brand-500 font-semibold text-white shadow-sm'
                      : disabled
                        ? 'text-slate-300'
                        : `${inRange ? 'bg-brand-50 text-brand-700' : 'text-slate-700'} hover:bg-brand-100`
                  } ${date === today && !selected ? 'font-semibold ring-1 ring-brand-300' : ''}`}>
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
