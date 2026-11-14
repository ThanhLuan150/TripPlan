import type {ReactNode} from 'react';
import type {AdminTone} from '../types';

const tones: Record<AdminTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  danger: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  brand: 'bg-brand-50 text-brand-800 ring-brand-600/25',
};

const dots: Record<AdminTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  neutral: 'bg-slate-400',
  brand: 'bg-brand-500',
};

// Status / role pill. The label always carries the meaning, never the color alone.
export default function AdminStatusBadge({tone, children}: {tone: AdminTone; children: ReactNode}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${tones[tone]}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${dots[tone]}`} />
      {children}
    </span>
  );
}
