import {useState} from 'react';
import {removeVietnameseTones} from '@/lib/text';

// Value of a filter that keeps every row
export const ALL = 'all';

// accent-insensitive: "da lat" finds "Đà Lạt"
const normalize = (text: string) => removeVietnameseTones(text).toLowerCase();

interface Options<T> {
  // text the search box looks in
  searchText: (row: T) => string;
  // filter name -> does the row match the selected value
  filters?: Record<string, (row: T, value: string) => boolean>;
  pageSize?: number;
}

// Search + filters + pagination of a list, all on the client (mock data).
export function useTableState<T>(rows: T[] | undefined, {searchText, filters = {}, pageSize = 8}: Options<T>) {
  const [query, setQueryValue] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const q = normalize(query);
  const filtered = (rows ?? []).filter(
    row =>
      normalize(searchText(row)).includes(q) &&
      Object.entries(values).every(([name, value]) => value === ALL || filters[name](row, value)),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);

  return {
    query,
    setQuery: (value: string) => {
      setQueryValue(value);
      setPage(1);
    },
    filter: (name: string) => values[name] ?? ALL,
    setFilter: (name: string, value: string) => {
      setValues(v => ({...v, [name]: value}));
      setPage(1);
    },
    reset: () => {
      setQueryValue('');
      setValues({});
      setPage(1);
    },
    page: current,
    setPage,
    pageCount,
    pageSize,
    all: filtered,
    total: filtered.length,
    rows: filtered.slice((current - 1) * pageSize, current * pageSize),
  };
}

export type TableState = ReturnType<typeof useTableState>;
