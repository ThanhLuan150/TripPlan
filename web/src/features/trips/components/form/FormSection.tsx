import {ReactNode} from 'react';
import FieldError from '@/components/ui/FieldError';

// A titled block of the trip form: icon, label, hint, the control and its error.
export default function FormSection({
  icon,
  title,
  hint,
  children,
  labelFor,
  error,
  errorId,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  children: ReactNode;
  labelFor?: string;
  error?: string;
  errorId?: string;
}) {
  return (
    <section>
      <label htmlFor={labelFor} className="mb-2.5 flex items-center gap-2 font-semibold text-slate-900">
        <span className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600">{icon}</span>
        {title}
        {hint && <span className="text-sm font-normal text-slate-400">{hint}</span>}
      </label>
      {children}
      <FieldError id={errorId} role="alert" className="mt-2">
        {error}
      </FieldError>
    </section>
  );
}
