import {ReactNode} from 'react';

// Label + control + error message
export default function Field({
  label,
  htmlFor,
  error,
  children,
  aside,
}: {
  label: ReactNode;
  htmlFor?: string;
  error?: string | false;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error && (
        <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>
      )}
    </div>
  );
}
