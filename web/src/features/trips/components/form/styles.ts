// Shared look of the trip form controls: a soft border, a teal focus ring,
// and a rose border + ring while the value is invalid.
export const controlClass = (invalid?: boolean) =>
  `w-full rounded-xl border bg-white text-slate-800 shadow-sm transition outline-none placeholder:text-slate-400 ${
    invalid
      ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-100'
      : 'border-slate-200 hover:border-slate-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-100'
  }`;

// card of a choice (budget tier)
export const choiceClass = (selected: boolean, invalid?: boolean) =>
  `rounded-xl border p-3 text-left transition ${
    selected
      ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100'
      : invalid
        ? 'border-rose-300 hover:border-brand-300'
        : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
  }`;
