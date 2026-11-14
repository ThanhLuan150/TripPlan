// Class names shared by the admin components: compact controls (36px high),
// a single accent (brand-700 keeps white text above 4.5:1 contrast).

const button =
  'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium whitespace-nowrap transition select-none disabled:pointer-events-none disabled:opacity-50';

export const adminButton = {
  primary: `${button} bg-brand-700 text-white hover:bg-brand-800`,
  secondary: `${button} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900`,
  danger: `${button} bg-rose-600 text-white hover:bg-rose-700`,
};

export const adminIconButton =
  'inline-grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40';

export const adminInput =
  'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 transition outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 focus-visible:outline-none';

// row above a table: search + filters
export const adminToolbar =
  'flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:flex-wrap sm:items-center';

export const adminLink = 'text-sm font-medium text-brand-700 transition hover:text-brand-800';
