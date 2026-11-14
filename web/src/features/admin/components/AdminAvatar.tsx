// Photo of a person, or the first letter of the name.
export default function AdminAvatar({name, src, size = 'md'}: {name: string; src?: string; size?: 'sm' | 'md'}) {
  const box = size === 'sm' ? 'size-7 text-xs' : 'size-9 text-sm';
  if (src) {
    return <img src={src} alt="" className={`${box} shrink-0 rounded-full bg-slate-100 object-cover`} />;
  }
  return (
    <span
      aria-hidden
      className={`${box} grid shrink-0 place-items-center rounded-full bg-brand-50 font-semibold text-brand-800 ring-1 ring-brand-100`}>
      {name.charAt(0).toUpperCase() || 'A'}
    </span>
  );
}
