import type {ReactNode} from 'react';
import AdminLoadingState from './AdminLoadingState';

export interface AdminColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  // hide the column on smaller screens (the table also scrolls sideways)
  hideBelow?: 'md' | 'lg' | 'xl';
  // stays at the right edge while the table scrolls sideways (row actions)
  pinned?: boolean;
}

const hidden = {md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell'};

const pinnedClass = 'sticky right-0 max-md:shadow-[-6px_0_6px_-6px_rgb(15_23_42/0.14)]';

const cellClass = <T,>({align, hideBelow, pinned}: AdminColumn<T>) =>
  `px-4 ${align === 'right' ? 'text-right' : 'text-left'} ${hideBelow ? hidden[hideBelow] : ''} ${pinned ? pinnedClass : ''}`;

// Data table of the admin lists: skeleton while loading, `empty` when there
// are no rows. `caption` names the table for screen readers.
export default function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  loading = false,
  empty,
  isSelected,
}: {
  columns: AdminColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  caption: string;
  loading?: boolean;
  empty: ReactNode;
  // highlighted rows (bulk selection)
  isSelected?: (row: T) => boolean;
}) {
  if (loading) {
    return <AdminLoadingState variant="table" />;
  }
  if (!rows.length) {
    return <>{empty}</>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-slate-200 bg-slate-50/70 text-xs text-slate-500">
          <tr>
            {columns.map(column => (
              <th key={column.key} scope="col" className={`${cellClass(column)} ${column.pinned ? 'bg-slate-50' : ''} py-2.5 font-medium whitespace-nowrap`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(row => {
            const selected = !!isSelected?.(row);
            return (
            <tr
              key={rowKey(row)}
              className={`group transition ${selected ? 'bg-brand-50/60 hover:bg-brand-50' : 'hover:bg-slate-50'}`}>
              {columns.map(column => (
                <td
                  key={column.key}
                  className={`${cellClass(column)} ${
                    column.pinned ? (selected ? 'bg-brand-50 group-hover:bg-brand-50' : 'bg-white group-hover:bg-slate-50') : ''
                  } py-3 text-slate-700`}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
