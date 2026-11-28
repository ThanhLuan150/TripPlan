import {useId, useState} from 'react';
import {IoCheckmark, IoChevronDown} from 'react-icons/io5';
import {useClickOutside} from '@/hooks/useClickOutside';
import {adminInput} from './styles';

export interface AdminSelectOption {
  value: string;
  label: string;
}

// The admin panel's own dropdown (use it instead of the browser's <select>): a button shows the chosen
// option and a list of options opens below it. Escape or a click outside closes it. The button is
// labelled by a <label htmlFor={id}> or by `ariaLabel`; `data-value` carries the chosen value.
export default function AdminSelect({
  id,
  value,
  options,
  onChange,
  ariaLabel,
  className = '',
  invalid,
  describedBy,
}: {
  id?: string;
  value: string;
  options: AdminSelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const own = useId();
  const buttonId = id ?? own;
  const listId = `${buttonId}-list`;
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const current = options.find(option => option.value === value);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        id={buttonId}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        data-value={value}
        onClick={() => setOpen(!open)}
        onKeyDown={e => e.key === 'Escape' && setOpen(false)}
        className={`${adminInput} flex cursor-pointer items-center justify-between gap-2 text-left`}>
        <span className="truncate">{current?.label ?? ''}</span>
        <IoChevronDown size={14} aria-hidden className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={buttonId}
          className="absolute inset-x-0 z-30 mt-1 max-h-64 min-w-max animate-fade-in overflow-y-auto rounded-lg bg-white p-1 shadow-xl ring-1 ring-slate-200">
          {options.map(option => (
            <li key={option.value} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                data-value={option.value}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition hover:bg-brand-50 ${
                  option.value === value ? 'font-semibold text-brand-700' : 'text-slate-700'
                }`}>
                {option.label}
                {option.value === value && <IoCheckmark size={14} aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
