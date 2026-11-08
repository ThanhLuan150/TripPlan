import {useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoStar, IoTrophy} from 'react-icons/io5';
import {rankTitleKey, useRanking} from '../hooks/useRanking';
import type {RankingPeriod} from '../types';

const periods: {key: RankingPeriod; labelKey: string}[] = [
  {key: 'weekly', labelKey: 'ranking.weekly'},
  {key: 'monthly', labelKey: 'ranking.monthly'},
  {key: 'highest', labelKey: 'ranking.highest'},
];

const medal = ['text-amber-500', 'text-slate-400', 'text-orange-400'];

function Avatar({src, className}: {src?: string; className: string}) {
  return src ? (
    <img src={src} alt="" className={`rounded-full bg-white object-cover ${className}`} />
  ) : (
    <span className={`block rounded-full bg-white/30 ${className}`} />
  );
}

export default function RankingPage() {
  const {t} = useTranslation();
  const [period, setPeriod] = useState<RankingPeriod>('highest');
  const {data: ranks = [], isLoading} = useRanking(period);

  // Top 3 shown on the podium in the order 2nd - 1st - 3rd
  const podium = useMemo(() => {
    const top = [...ranks].sort((a, b) => b.experience - a.experience).slice(0, 3);
    return [
      {item: top[1], rank: 2, height: 'h-16', size: 'size-16'},
      {item: top[0], rank: 1, height: 'h-24', size: 'size-20'},
      {item: top[2], rank: 3, height: 'h-12', size: 'size-16'},
    ];
  }, [ranks]);

  return (
    <div className="space-y-5 px-4 py-5 md:px-6 md:py-8">
      {/* podium */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-400 via-brand-600 to-brand-800 px-4 pt-6 text-white shadow-lift">
        <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-white/10" />
        <div className="relative text-center">
          <h1 className="text-xl font-bold md:text-2xl">{t('ranking.title')}</h1>
          <p className="mt-1 text-sm text-white/80">{t('ranking.subtitle')}</p>
        </div>
        <div className="relative mx-auto mt-6 grid max-w-md grid-cols-3 items-end gap-3">
          {podium.map(({item, rank, height, size}) => (
            <div key={rank} className="flex min-w-0 flex-col items-center">
              <div className="relative">
                {rank === 1 && (
                  <IoTrophy
                    size={26}
                    className="absolute -top-7 left-1/2 -translate-x-1/2 text-amber-300 drop-shadow"
                  />
                )}
                <Avatar
                  src={item?.image}
                  className={`${size} ring-4 ${rank === 1 ? 'ring-amber-300' : 'ring-white/60'}`}
                />
              </div>
              <p className="mt-2 w-full truncate text-center text-sm font-semibold">
                {item?.fullname ?? '—'}
              </p>
              <p className="text-xs text-white/80">
                {item ? t('ranking.points', {count: item.experience}) : ''}
              </p>
              <div
                className={`mt-2 grid w-full place-items-center rounded-t-2xl bg-white/20 text-2xl font-extrabold backdrop-blur ${height}`}>
                {rank}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* filter */}
      <div className="flex justify-center">
        <div
          role="tablist"
          className="inline-flex rounded-full bg-white p-1 shadow-soft ring-1 ring-slate-100">
          {periods.map(p => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={period === p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap transition sm:px-4 ${
                period === p.key
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}>
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* list */}
      <ul className="space-y-2">
        {isLoading &&
          [0, 1, 2, 3].map(i => (
            <li key={i} className="card flex animate-pulse items-center gap-3 p-3">
              <div className="h-4 w-6 rounded bg-slate-200" />
              <div className="size-12 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-slate-200" />
                <div className="h-3 w-1/4 rounded bg-slate-100" />
              </div>
            </li>
          ))}
        {!isLoading && ranks.length === 0 && (
          <li className="card p-8 text-center text-slate-500">{t('ranking.empty')}</li>
        )}
        {ranks.map((item, index) => {
          const titleKey = rankTitleKey(item.experience);
          return (
            <li
              key={item._id ?? index}
              className="card flex items-center gap-3 p-3 transition hover:shadow-md">
              <span
                className={`w-7 text-center text-lg font-bold ${medal[index] ?? 'text-slate-400'}`}>
                {index + 1}
              </span>
              <img
                src={item.image}
                alt=""
                className="size-12 shrink-0 rounded-full bg-slate-100 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-900">{item.fullname}</p>
                {titleKey && (
                  <span className="mt-0.5 inline-block max-w-full truncate rounded-full bg-brand-50 px-2 py-0.5 align-top text-xs font-medium text-brand-700">
                    {t(titleKey)}
                  </span>
                )}
              </div>
              <span className="flex shrink-0 items-center gap-1 font-bold text-slate-900">
                <IoStar size={14} className="text-amber-400" />
                {item.experience}
                <span className="text-xs font-medium text-slate-400">
                  {t('ranking.pointsUnit')}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
