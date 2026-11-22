import {IoAlertCircle} from 'react-icons/io5';

// The error line under a form control, the same in every form: a red alert
// icon and the message. (The control itself turns red through aria-invalid.)
export default function FieldError({
  children,
  id,
  role,
  className = '',
}: {
  children?: string | false;
  id?: string;
  role?: 'alert';
  className?: string;
}) {
  if (!children) {
    return null;
  }
  return (
    <p id={id} role={role} className={`mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-rose-600 ${className}`}>
      <IoAlertCircle size={15} className="mt-px shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
