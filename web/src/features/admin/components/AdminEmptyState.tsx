import type {ReactNode} from 'react';
import type {IconType} from 'react-icons';
import {IoFileTrayOutline} from 'react-icons/io5';

// Shown instead of a list with nothing to show (no data, or no search result).
export default function AdminEmptyState({
  icon: Icon = IoFileTrayOutline,
  title,
  description,
  action,
}: {
  icon?: IconType;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400">
        <Icon size={24} aria-hidden />
      </span>
      <p className="mt-4 text-sm font-semibold text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
