import {useId} from 'react';
import {IoFunnelOutline} from 'react-icons/io5';
import AdminSelect from './AdminSelect';

export interface AdminFilterOption {
  value: string;
  label: string;
}

// Drop-down filter of a list toolbar (the admin dropdown, not a native <select>).
// `label` names it for screen readers; the first option usually reads "All ...".
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
      <AdminSelect id={id} value={value} options={options} onChange={onChange} className="sm:min-w-40 [&>button]:pl-8" />
    </div>
  );
}
