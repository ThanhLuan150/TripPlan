import {useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Link, useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoArrowBack, IoCompassOutline, IoCreateOutline, IoLocationSharp, IoTrashOutline} from 'react-icons/io5';
import {routes} from '@/app/routes';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import {getUser} from '@/features/auth/store/session';
import {apiStatus, connectionErrorKey} from '@/lib/apiClient';
import {formatDate} from '@/lib/date';
import ReviewForm from '../components/ReviewForm';
import {StarDisplay} from '../components/StarRating';
import {reviewsApi, type Review} from '../reviews';

// Public page of a destination: the average rating, the reviews of travelers and, for a signed-in
// user, the form to write (or edit / delete) their own review. A destination that does not
// exist gives a "not found" page.
export default function DestinationPage() {
  const {t} = useTranslation();
  const {name = ''} = useParams();
  const queryClient = useQueryClient();
  const signedIn = !!getUser();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const queryKey = ['destinationReviews', name];

  const {data, isLoading, error, refetch} = useQuery({
    queryKey: [...queryKey, page, signedIn],
    queryFn: () => reviewsApi.list(name, page),
    placeholderData: previous => previous,
    retry: false,
  });

  const refresh = () => queryClient.invalidateQueries({queryKey});

  // 409: already reviewed (the server keeps one review per destination), 403: not the author
  const errorKey = (failure: unknown, fallback: string) => {
    const status = apiStatus(failure);
    return (
      connectionErrorKey(failure) ??
      (status === 409 ? 'reviews.duplicate' : status === 403 ? 'reviews.notAllowed' : status === 404 ? 'reviews.reviewGone' : fallback)
    );
  };

  const save = useMutation({
    mutationFn: ({rating, content}: {rating: number; content: string}) =>
      editing && data?.myReview
        ? reviewsApi.update(data.myReview._id, rating, content)
        : reviewsApi.create(name, rating, content),
    onSuccess: () => {
      Toast.show({type: 'success', text1: t(editing ? 'reviews.updated' : 'reviews.created')});
      setEditing(false);
      setFormError(null);
      setPage(1);
      refresh();
    },
    onError: failure => {
      const key = errorKey(failure, 'reviews.failed');
      setFormError(t(key));
      // somebody else's / vanished review: the page must show what is really there
      if (apiStatus(failure) === 409 || apiStatus(failure) === 404) {
        setEditing(false);
        refresh();
      }
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => reviewsApi.remove(id),
    onSuccess: () => {
      Toast.show({type: 'success', text1: t('reviews.deleted')});
      setEditing(false);
      refresh();
    },
    onError: failure => {
      Toast.show({type: 'error', text1: t('common.failed'), text2: t(errorKey(failure, 'reviews.deleteFailed'))});
      refresh();
    },
  });

  if (isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (error || !data) {
    const unavailable = apiStatus(error) === 404 || !name;
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 p-4">
        <div className="card flex max-w-md flex-col items-center gap-3 p-8 text-center">
          <IoLocationSharp size={36} className="text-slate-400" />
          <p className="font-semibold text-slate-900">{t(unavailable ? 'reviews.notFoundTitle' : 'reviews.loadFailed')}</p>
          {unavailable ? (
            <>
              <p className="text-sm text-slate-500">{t('reviews.notFoundText')}</p>
              <Link to={routes.Explore} className="btn btn-primary">
                {t('reviews.back')}
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-500">{t(connectionErrorKey(error) ?? 'reviews.loadFailed')}</p>
              <button type="button" className="btn btn-primary" onClick={() => refetch()}>
                {t('common.retry')}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const {summary, myReview} = data;
  const others = data.items.filter(item => item._id !== myReview?._id);
  const pages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div className="min-h-dvh bg-slate-50">
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 md:px-6">
        <Link to={routes.Explore} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-brand-700">
          <IoArrowBack size={16} />
          {t('reviews.back')}
        </Link>

        <section className="rounded-3xl bg-gradient-to-br from-brand-400 to-brand-800 p-6 text-white shadow-soft">
          <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
            <IoLocationSharp size={26} className="shrink-0" />
            {t('reviews.pageTitle', {place: data.destination})}
          </h1>
          <p className="mt-1 text-sm text-white/85">{t('reviews.subtitle')}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {summary.average === null ? (
              <p className="text-sm text-white/85">{t('reviews.noAverage')}</p>
            ) : (
              <>
                <p className="text-4xl leading-none font-bold" aria-label={t('reviews.average')}>
                  {summary.average}
                  <span className="text-base font-medium text-white/80"> / 5</span>
                </p>
                <span className="rounded-full bg-white/90 px-2 py-1">
                  <StarDisplay value={summary.average} />
                </span>
              </>
            )}
            <p className="text-sm text-white/85">{t('reviews.count', {count: summary.count})}</p>
          </div>
          <Link
            to={`${routes.Explore}?q=${encodeURIComponent(data.destination)}`}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/30">
            <IoCompassOutline size={18} />
            {t('reviews.plansLink', {place: data.destination})}
          </Link>
        </section>

        {!signedIn && (
          <Link to={routes.Login} state={{from: {pathname: routes.Destination(name)}}} className="btn btn-primary">
            {t('reviews.signIn')}
          </Link>
        )}

        {signedIn && myReview && !editing && (
          <section className="card space-y-2 border-brand-200 p-4" aria-label={t('reviews.yourReview')}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">{t('reviews.yourReview')}</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setFormError(null);
                    setEditing(true);
                  }}>
                  <IoCreateOutline size={16} />
                  {t('reviews.edit')}
                </button>
                <button type="button" className="btn btn-outline text-rose-600" disabled={remove.isPending} onClick={() => setDeleting(true)}>
                  <IoTrashOutline size={16} />
                  {t('reviews.delete')}
                </button>
              </div>
            </div>
            <ReviewBody review={myReview} />
          </section>
        )}

        {signedIn && (!myReview || editing) && (
          <ReviewForm
            key={editing ? myReview?._id : 'new'}
            initial={editing && myReview ? {rating: myReview.rating, content: myReview.content} : undefined}
            submitting={save.isPending}
            error={formError}
            onSubmit={(rating, content) => {
              setFormError(null);
              save.mutate({rating, content});
            }}
            onCancel={editing ? () => setEditing(false) : undefined}
          />
        )}

        {others.length === 0 && !myReview && <div className="card p-8 text-center text-sm text-slate-500">{t('reviews.empty')}</div>}

        {others.length > 0 && (
          <ul className="space-y-3">
            {others.map(review => (
              <li key={review._id} className="card space-y-2 p-4">
                <ReviewBody review={review} showAuthor />
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <nav aria-label={t('reviews.pagination')} className="flex items-center justify-center gap-3">
            <button type="button" className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              {t('reviews.prev')}
            </button>
            <span className="text-sm text-slate-600">{t('reviews.page', {page, pages})}</span>
            <button type="button" className="btn btn-outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              {t('reviews.next')}
            </button>
          </nav>
        )}
      </main>

      <ConfirmModal
        visible={deleting}
        danger
        title={t('reviews.deleteTitle')}
        confirmText={t('reviews.deleteAction')}
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          setDeleting(false);
          if (myReview) {
            remove.mutate(myReview._id);
          }
        }}>
        <p className="text-center text-sm text-slate-600">{t('reviews.deleteText')}</p>
      </ConfirmModal>
    </div>
  );
}

function ReviewBody({review, showAuthor = false}: {review: Review; showAuthor?: boolean}) {
  const {t} = useTranslation();
  const edited = review.updatedAt && review.createdAt && new Date(review.updatedAt).getTime() - new Date(review.createdAt).getTime() > 1000;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StarDisplay value={review.rating} size={16} />
        {showAuthor && review.author.username && <span className="text-sm font-semibold text-slate-800">{review.author.username}</span>}
        <span className="text-xs text-slate-400">
          {formatDate(review.createdAt)}
          {edited ? ` · ${t('reviews.edited')}` : ''}
        </span>
      </div>
      <p className="text-sm break-words whitespace-pre-line text-slate-700">{review.content}</p>
    </>
  );
}
