import type {IconType} from 'react-icons';
import {useTranslation} from 'react-i18next';
import {IoArrowDown, IoArrowUp, IoRemove} from 'react-icons/io5';
import {useAdminFormat} from '../hooks/useAdminFormat';

type Direction = 'up' | 'down';

// KPI tile: label, value, change against the previous period.
// `goodWhen="down"` for metrics where less is better (errors, response time).
export default function AdminStatCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  goodWhen = 'up',
}: {
  label: string;
  value: string;
  icon: IconType;
  // ratio: 0.12 = +12 %
  delta?: number;
  // "so với tháng trước"
  deltaLabel?: string;
  goodWhen?: Direction;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="hidden size-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-100 sm:grid">
          <Icon size={18} aria-hidden />
        </span>
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
      {delta !== undefined && <Delta delta={delta} label={deltaLabel} goodWhen={goodWhen} />}
    </div>
  );
}

const trends = {
  up: {icon: IoArrowUp, labelKey: 'admin.common.increase'},
  down: {icon: IoArrowDown, labelKey: 'admin.common.decrease'},
  flat: {icon: IoRemove, labelKey: 'admin.common.noChange'},
};

function Delta({delta, label, goodWhen}: {delta: number; label?: string; goodWhen: Direction}) {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const {icon: Icon, labelKey} = trends[direction];
  const tone = direction === 'flat' ? 'text-slate-500' : direction === goodWhen ? 'text-emerald-700' : 'text-rose-700';

  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs">
      <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${tone}`}>
        <Icon size={12} aria-hidden />
        <span className="sr-only">{t(labelKey)}</span>
        {format.percent(Math.abs(delta))}
      </span>
      {label && <span className="text-slate-500">{label}</span>}
    </p>
  );
}
