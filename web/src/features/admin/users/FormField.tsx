import {type ReactNode, useId} from 'react';

// Label + control + error message of a dialog form; `children` gets the
// props that link the control to its label and error.
export default function FormField({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: (props: {id: string; 'aria-invalid': boolean; 'aria-describedby'?: string}) => ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children({id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : undefined})}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}
