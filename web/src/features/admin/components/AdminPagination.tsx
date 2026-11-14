import {useTranslation} from 'react-i18next';
import {IoChevronBack, IoChevronForward} from 'react-icons/io5';
import {adminIconButton} from './styles';

// 1 … 4 5 6 … 10
const pageItems = (page: number, count: number): (number | 'gap')[] => {
  const pages = [...new Set([1, page - 1, page, page + 1, count])]
    .filter(p => p >= 1 && p <= count)
    .sort((a, b) => a - b);
  return pages.flatMap((p, i) => (i > 0 && p - pages[i - 1] > 1 ? ['gap' as const, p] : [p]));
};

// "Showing 1–8 of 32" + page buttons (page numbers from the sm breakpoint).
export default function AdminPagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const {t} = useTranslation();
  if (!total) {
    return null;
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav
      aria-label={t('admin.pagination.label')}
      className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500 tabular-nums">{t('admin.pagination.summary', {from, to, total})}</p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`${adminIconButton} border border-slate-200`}
          disabled={page <= 1}
          aria-label={t('admin.pagination.previous')}
          onClick={() => onPageChange(page - 1)}>
          <IoChevronBack size={16} aria-hidden />
        </button>
        <span className="px-2 text-sm text-slate-600 tabular-nums sm:hidden">
          {t('admin.pagination.pageOf', {page, pages: pageCount})}
        </span>
        {pageItems(page, pageCount).map((item, i) =>
          item === 'gap' ? (
            <span key={`gap-${i}`} aria-hidden className="hidden w-6 text-center text-slate-400 sm:inline">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={t('admin.pagination.page', {page: item})}
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPageChange(item)}
              className={`hidden h-8 min-w-8 place-items-center rounded-lg px-2 text-sm font-medium tabular-nums transition sm:inline-grid ${
                item === page ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}>
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          className={`${adminIconButton} border border-slate-200`}
          disabled={page >= pageCount}
          aria-label={t('admin.pagination.next')}
          onClick={() => onPageChange(page + 1)}>
          <IoChevronForward size={16} aria-hidden />
        </button>
      </div>
    </nav>
  );
}
