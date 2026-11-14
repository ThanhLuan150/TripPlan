// Thin progress bar (share of a whole). Decorative: print the value next to it.
export default function AdminMeter({ratio}: {ratio: number}) {
  return (
    <div aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-brand-100">
      <div className="h-full rounded-full bg-brand-600" style={{width: `${Math.min(1, ratio) * 100}%`}} />
    </div>
  );
}
