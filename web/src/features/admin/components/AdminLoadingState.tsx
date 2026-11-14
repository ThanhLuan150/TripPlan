import {useTranslation} from 'react-i18next';
import Spinner from '@/components/ui/Spinner';

const bar = 'animate-pulse rounded bg-slate-200/80';

// Placeholder while admin data loads: skeleton rows of a table, skeleton KPI
// cards, or a spinner for anything else.
export default function AdminLoadingState({variant = 'spinner'}: {variant?: 'table' | 'cards' | 'spinner'}) {
  const {t} = useTranslation();
  const label = <span className="sr-only">{t('admin.common.loading')}</span>;

  if (variant === 'table') {
    return (
      <div role="status" aria-live="polite" className="divide-y divide-slate-100">
        {label}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <div className={`size-8 shrink-0 rounded-full ${bar}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-3 w-1/3 ${bar}`} />
              <div className={`h-2.5 w-1/2 bg-slate-100 ${bar}`} />
            </div>
            <div className={`hidden h-5 w-16 rounded-full sm:block ${bar}`} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div role="status" aria-live="polite" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {label}
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
            <div className={`h-3 w-1/2 ${bar}`} />
            <div className={`h-6 w-2/3 ${bar}`} />
            <div className={`h-2.5 w-1/3 ${bar}`} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className="grid place-items-center py-14">
      <Spinner size={28} />
      {label}
    </div>
  );
}
