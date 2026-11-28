import {useTranslation} from 'react-i18next';
import {IoStar, IoStarOutline} from 'react-icons/io5';
import {MAX_STARS} from '../reviews';

const stars = Array.from({length: MAX_STARS}, (_, i) => i + 1);

// Read only stars: the value is rounded to the nearest whole star for the picture; the exact
// number is shown next to it by the caller.
export function StarDisplay({value, size = 18}: {value: number; size?: number}) {
  const {t} = useTranslation();
  const filled = Math.round(value);
  return (
    <span role="img" aria-label={t('reviews.starsOf', {count: value})} className="inline-flex items-center gap-0.5 text-amber-500">
      {stars.map(n => (n <= filled ? <IoStar key={n} size={size} /> : <IoStarOutline key={n} size={size} />))}
    </span>
  );
}

// Choose 1-5 stars: a group of radio buttons (arrow keys move between them).
export function StarInput({value, onChange, invalid}: {value: number; onChange: (rating: number) => void; invalid?: boolean}) {
  const {t} = useTranslation();
  return (
    <div
      role="radiogroup"
      aria-label={t('reviews.ratingLabel')}
      aria-invalid={invalid ? true : undefined}
      className="inline-flex items-center gap-1">
      {stars.map(n => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={t('reviews.star', {count: n})}
          tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
          onClick={() => onChange(n)}
          onKeyDown={event => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
              event.preventDefault();
              onChange(Math.min(MAX_STARS, (value || 0) + 1));
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
              event.preventDefault();
              onChange(Math.max(1, (value || 2) - 1));
            }
          }}
          className={`rounded p-0.5 transition hover:scale-110 ${n <= value ? 'text-amber-500' : 'text-slate-300 hover:text-amber-300'}`}>
          {n <= value ? <IoStar size={28} /> : <IoStarOutline size={28} />}
        </button>
      ))}
    </div>
  );
}
