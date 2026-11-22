import {ReactNode} from 'react';
import FieldError from './FieldError';

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
    <div data-invalid={!!error}>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {aside}
      </div>
      {children}
      <FieldError>{error}</FieldError>
    </div>
  );
}
