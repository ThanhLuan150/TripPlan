import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import FieldError from '@/components/ui/FieldError';
import {MAX_REVIEW_LENGTH} from '../reviews';
import {StarInput} from './StarRating';

interface Props {
  // editing: the review being changed
  initial?: {rating: number; content: string};
  submitting: boolean;
  // answer of the server (shown under the form), e.g. "you already reviewed this place"
  error?: string | null;
  onSubmit: (rating: number, content: string) => void;
  onCancel?: () => void;
}

// Rating (1-5 stars) and comment of a review. The same rules as the server run here first, so a
// mistake is shown at once; the server checks again.
export default function ReviewForm({initial, submitting, error, onSubmit, onCancel}: Props) {
  const {t} = useTranslation();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [content, setContent] = useState(initial?.content ?? '');
  const [submitted, setSubmitted] = useState(false);

  const length = content.trim().length;
  const ratingError = rating < 1 ? 'reviews.errRating' : undefined;
  const contentError = length === 0 ? 'reviews.errContent' : length > MAX_REVIEW_LENGTH ? 'reviews.errContentLong' : undefined;
  const editing = !!initial;

  return (
    <form
      aria-label={t(editing ? 'reviews.editTitle' : 'reviews.formTitle')}
      className="card space-y-3 p-4"
      onSubmit={event => {
        event.preventDefault();
        setSubmitted(true);
        if (!ratingError && !contentError) {
          onSubmit(rating, content.trim());
        }
      }}>
      <h2 className="font-semibold text-slate-900">{t(editing ? 'reviews.editTitle' : 'reviews.formTitle')}</h2>

      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">{t('reviews.ratingLabel')}</p>
        <StarInput value={rating} onChange={setRating} invalid={submitted && !!ratingError} />
        <FieldError role="alert">{submitted && ratingError ? t(ratingError) : undefined}</FieldError>
      </div>

      <div>
        <label htmlFor="review-content" className="mb-1 block text-sm font-medium text-slate-700">
          {t('reviews.commentLabel')}
        </label>
        <textarea
          id="review-content"
          rows={4}
          value={content}
          placeholder={t('reviews.commentPlaceholder')}
          aria-invalid={submitted && contentError ? true : undefined}
          onChange={event => setContent(event.target.value)}
          className="field w-full resize-y"
        />
        <div className="flex items-start justify-between gap-3">
          <FieldError role="alert">
            {submitted && contentError ? t(contentError, {max: MAX_REVIEW_LENGTH}) : undefined}
          </FieldError>
          <span className="mt-1.5 ml-auto text-xs text-slate-400">{t('reviews.counter', {count: length, max: MAX_REVIEW_LENGTH})}</span>
        </div>
      </div>

      <FieldError role="alert">{error ?? undefined}</FieldError>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {t(submitting ? 'reviews.saving' : editing ? 'reviews.update' : 'reviews.submit')}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            {t('reviews.cancel')}
          </button>
        )}
      </div>
    </form>
  );
}
