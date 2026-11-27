import {useState} from 'react';
import {IoCheckmark, IoChevronDown} from 'react-icons/io5';
import {useClickOutside} from '@/hooks/useClickOutside';

export interface DropdownOption {
  value: string;
  label: string;
}

// The app's own dropdown (same look as the province list): use it instead of the browser's <select>.
// A button shows the chosen option, a list of options opens below it; Escape or a click outside closes it.
export default function DropdownSelect({
  value,
  options,
  onChange,
  label,
  className = '',
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  // accessible name of the button
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const current = options.find(option => option.value === value);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={e => e.key === 'Escape' && setOpen(false)}
        className="field flex w-full items-center justify-between gap-2 text-left">
        <span className="truncate">{current?.label ?? ''}</span>
        <IoChevronDown size={18} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute inset-x-0 z-20 mt-2 max-h-64 animate-fade-in overflow-y-auto rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-100">
          {options.map(option => (
            <li key={option.value} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-brand-50 ${
                  option.value === value ? 'font-semibold text-brand-700' : 'text-slate-700'
                }`}>
                {option.label}
                {option.value === value && <IoCheckmark size={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
