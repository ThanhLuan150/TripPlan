import {useTranslation} from 'react-i18next';

export interface BarPoint {
  label: string;
  value: number;
}

// 1840 -> 2000, 432 -> 500: a round top for the value axis
const niceCeil = (n: number) => {
  const step = 10 ** Math.floor(Math.log10(n));
  return Math.ceil(n / step) * step;
};

// Single-series column chart without a chart library: thin brand-colored bars
// on a recessive grid, a tooltip on hover, and the same numbers as a table
// ("Show as table") for keyboard and screen-reader users.
export default function AdminBarChart({
  data,
  title,
  format,
}: {
  data: BarPoint[];
  title: string;
  format: (n: number) => string;
}) {
  const {t} = useTranslation();
  const top = niceCeil(Math.max(1, ...data.map(d => d.value)));
  const ticks = [top, top / 2, 0];
  // at most 6 labels under the axis (each gets the room of several bars)
  const labelEvery = Math.ceil(data.length / 6);
  const y = (value: number) => `${(1 - value / top) * 100}%`;

  return (
    <figure>
      <div aria-hidden className="flex h-52 gap-2 sm:h-56">
        <div className="relative w-12 shrink-0 text-right text-[11px] text-slate-400 tabular-nums">
          {ticks.map(tick => (
            <span key={tick} className="absolute right-0 -translate-y-1/2" style={{top: y(tick)}}>
              {format(tick)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map(tick => (
            <div
              key={tick}
              className={`absolute inset-x-0 border-t ${tick ? 'border-dashed border-slate-100' : 'border-slate-200'}`}
              style={{top: y(tick)}}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-0.5">
            {data.map((point, i) => {
              const height = `${(point.value / top) * 100}%`;
              return (
                <div key={i} className="group relative flex h-full flex-1 items-end justify-center">
                  <div
                    className="w-3/5 max-w-7 min-w-1 rounded-t-[4px] bg-brand-600 transition-colors group-hover:bg-brand-800"
                    style={{height}}
                  />
                  <div
                    className="pointer-events-none absolute left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-center text-[11px] whitespace-nowrap text-white shadow-lg group-hover:block"
                    style={{bottom: height}}>
                    <span className="block text-slate-300">{point.label}</span>
                    <span className="font-semibold tabular-nums">{format(point.value)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div aria-hidden className="mt-2 ml-14 flex h-4 gap-0.5 text-[11px] text-slate-500">
        {data.map((point, i) => (
          <span key={i} className="relative flex-1">
            {i % labelEvery === 0 && (
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{point.label}</span>
            )}
          </span>
        ))}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-800">
          {t('admin.common.showTable')}
        </summary>
        <table className="mt-2 w-full text-left text-sm">
          <caption className="sr-only">{title}</caption>
          <tbody className="divide-y divide-slate-100">
            {data.map((point, i) => (
              <tr key={i}>
                <th scope="row" className="py-1.5 font-normal text-slate-500">
                  {point.label}
                </th>
                <td className="py-1.5 text-right font-medium text-slate-800 tabular-nums">{format(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
