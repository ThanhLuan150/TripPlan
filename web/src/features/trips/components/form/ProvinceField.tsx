import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoChevronDown, IoCheckmark, IoClose, IoLocationOutline} from 'react-icons/io5';
import {useClickOutside} from '@/hooks/useClickOutside';
import {removeVietnameseTones} from '@/lib/text';
import {provices} from '../../data/provinces';
import FormSection from './FormSection';
import {controlClass} from './styles';

const search = (text: string) =>
  provices.filter(
    value =>
      removeVietnameseTones(value.toLowerCase()).includes(text.toLowerCase()) ||
      value.toLowerCase().includes(text.toLowerCase()),
  );

// Destination: type to filter the provinces, pick one from the list. Only a
// province of the list is valid (the error comes from the form).
export default function ProvinceField({
  value,
  onChange,
  onBlur,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
}) {
  const {t} = useTranslation();
  // a destination from the chat that is not a province opens the suggestions
  const [open, setOpen] = useState(!!value && !provices.includes(value));
  const ref = useClickOutside(() => setOpen(false));
  const matches = search(value);
  const valid = provices.includes(value);

  return (
    <FormSection
      icon={<IoLocationOutline size={18} />}
      title={t('trips.create.destination')}
      labelFor="province"
      error={error}
      errorId="province-error">
      <div className="relative" ref={ref}>
        <IoLocationOutline size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" />
        <input
          id="province"
          name="location"
          className={`${controlClass(!!error)} h-12 pr-20 pl-10`}
          placeholder={t('trips.create.destinationPlaceholder')}
          autoComplete="off"
          value={value}
          aria-invalid={!!error}
          aria-describedby={error ? 'province-error' : undefined}
          onBlur={onBlur}
          onChange={e => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' && matches.length > 0) {
              e.preventDefault();
              onChange(matches[0]);
              setOpen(false);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
        />
        <div className="absolute top-1 right-1 flex items-center">
          {valid && <IoCheckmark size={18} className="mr-1 text-brand-500" aria-hidden />}
          {value && !valid && (
            <button
              type="button"
              aria-label={t('common.clear')}
              onClick={() => onChange('')}
              className="grid size-10 place-items-center rounded-lg text-slate-400 hover:text-slate-600">
              <IoClose size={18} />
            </button>
          )}
          <button
            type="button"
            aria-label={t('trips.create.provinceList')}
            onClick={() => {
              setOpen(!open);
              onChange('');
            }}
            className="grid size-10 place-items-center rounded-lg text-slate-400 hover:text-slate-600">
            <IoChevronDown size={18} className={`transition ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {open && matches.length > 0 && (
          <ul
            role="listbox"
            className="absolute inset-x-0 z-20 mt-2 max-h-64 animate-fade-in overflow-y-auto rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-100">
            {matches.map(item => (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-brand-50 ${
                    item === value ? 'font-semibold text-brand-700' : 'text-slate-700'
                  }`}>
                  {item}
                  {item === value && <IoCheckmark size={16} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </FormSection>
  );
}
