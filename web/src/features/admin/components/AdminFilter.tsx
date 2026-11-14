import {useId} from 'react';
import {IoChevronDown, IoFunnelOutline} from 'react-icons/io5';
import {adminInput} from './styles';

export interface AdminFilterOption {
  value: string;
  label: string;
}

// Drop-down filter of a list toolbar (native <select>: keyboard and mobile
// friendly). `label` names it for screen readers; the first option usually
// reads "All ...".
export default function AdminFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: AdminFilterOption[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="relative w-full sm:w-auto">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <IoFunnelOutline
        size={14}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
      />
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${adminInput} cursor-pointer appearance-none pr-8 pl-8 sm:min-w-40`}>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <IoChevronDown
        size={14}
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}
