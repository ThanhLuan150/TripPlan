import {useEffect, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoClose, IoEarthOutline, IoOpenOutline} from 'react-icons/io5';
import {routes} from '@/app/routes';
import ConfirmModal from '@/components/ui/ConfirmModal';
import FieldError from '@/components/ui/FieldError';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import {apiMessage, apiStatus, connectionErrorKey} from '@/lib/apiClient';
import {tripsApi} from '../api/tripsApi';
import {MAX_POST_LENGTH} from '../types';

// Share a plan as a post of the Travel Community: write an introduction and publish. The post
// IS the plan made public (view only), so nothing of the plan is copied. Removing the post
// makes the plan private again. Only the owner reaches this (the backend checks it).
export default function SharePostDialog({tripId, onClose}: {tripId: string; onClose: () => void}) {
  const {t} = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = ['tripPost', tripId];
  // null: the user did not type yet, so the saved introduction is shown
  const [draft, setDraft] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const status = useQuery({queryKey, queryFn: () => tripsApi.postStatus(tripId)});
  const data = status.data;
  const content = draft ?? data?.content ?? '';
  const tooLong = content.trim().length > MAX_POST_LENGTH;

  const refreshAround = () => {
    // the visibility badge, the share link and the public lists follow the post
    queryClient.invalidateQueries({queryKey: ['tripVisibility', tripId]});
    queryClient.invalidateQueries({queryKey: ['tripShare', tripId]});
    queryClient.invalidateQueries({queryKey: ['publicTrips']});
  };

  const share = useMutation({
    mutationFn: () => tripsApi.sharePost(tripId, content.trim()),
    onSuccess: result => {
      queryClient.setQueryData(queryKey, result);
      setDraft(null);
      refreshAround();
      Toast.show({type: 'success', text1: t(data?.isPosted ? 'trips.post.updated' : 'trips.post.shared')});
    },
    onError: error =>
      Toast.show({
        type: 'error',
        text1: t('common.failed'),
        text2: t(
          connectionErrorKey(error) ??
            (apiStatus(error) === 400 && /at least one day/i.test(apiMessage(error) ?? '') ? 'trips.post.noDays' : 'trips.post.failed'),
        ),
      }),
  });

  const remove = useMutation({
    mutationFn: () => tripsApi.removePost(tripId),
    onSuccess: result => {
      queryClient.setQueryData(queryKey, result);
      setDraft(null);
      refreshAround();
      Toast.show({type: 'success', text1: t('trips.post.removed')});
    },
    onError: error =>
      Toast.show({
        type: 'error',
        text1: t('common.failed'),
        text2: t(connectionErrorKey(error) ?? 'trips.post.removeFailed'),
      }),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !removing && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, removing]);

  return (
    <div className="fixed inset-0 z-[900] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={t('trips.post.title')}>
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-pop-in rounded-3xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
          <IoClose size={20} />
        </button>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <IoEarthOutline size={20} className="text-brand-600" />
          {t('trips.post.title')}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{t('trips.post.subtitle')}</p>

        {status.isLoading && (
          <div className="grid place-items-center py-8">
            <Spinner size={28} />
          </div>
        )}

        {status.isError && (
          <div className="mt-4 space-y-3 text-center">
            <p className="text-sm text-slate-600">{t('trips.post.loadFailed')}</p>
            <button type="button" className="btn btn-outline" onClick={() => status.refetch()}>
              {t('common.retry')}
            </button>
          </div>
        )}

        {data && (
          <form
            className="mt-4 space-y-3"
            onSubmit={event => {
              event.preventDefault();
              if (!tooLong) {
                share.mutate();
              }
            }}>
            <p className={`rounded-2xl p-3 text-sm ${data.isPosted ? 'bg-brand-50 text-brand-800' : 'bg-slate-50 text-slate-600'}`}>
              {t(data.isPosted ? 'trips.post.posted' : 'trips.post.notPosted')}
            </p>

            <div>
              <label htmlFor="post-content" className="mb-1 block text-sm font-medium text-slate-700">
                {t('trips.post.contentLabel')}
              </label>
              <textarea
                id="post-content"
                rows={4}
                value={content}
                placeholder={t('trips.post.contentPlaceholder')}
                aria-invalid={tooLong ? true : undefined}
                onChange={event => setDraft(event.target.value)}
                className="field w-full resize-y"
              />
              <div className="flex items-start justify-between gap-3">
                <FieldError role="alert">{tooLong ? t('trips.post.tooLong', {max: MAX_POST_LENGTH}) : undefined}</FieldError>
                <span className="mt-1.5 ml-auto text-xs text-slate-400">
                  {t('trips.post.counter', {count: content.trim().length, max: MAX_POST_LENGTH})}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500">{t('trips.post.notice')}</p>

            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" className="btn btn-primary" disabled={share.isPending || tooLong}>
                {t(share.isPending ? 'trips.post.saving' : data.isPosted ? 'trips.post.update' : 'trips.post.share')}
              </button>
              {data.isPosted && (
                <>
                  <Link to={routes.PublicTrip(tripId)} className="btn btn-outline">
                    <IoOpenOutline size={16} />
                    {t('trips.post.viewPost')}
                  </Link>
                  <button type="button" className="btn btn-outline text-rose-600" disabled={remove.isPending} onClick={() => setRemoving(true)}>
                    {t(remove.isPending ? 'trips.post.removing' : 'trips.post.remove')}
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>

      <ConfirmModal
        visible={removing}
        danger
        title={t('trips.post.removeTitle')}
        confirmText={t('trips.post.removeAction')}
        onCancel={() => setRemoving(false)}
        onConfirm={() => {
          setRemoving(false);
          remove.mutate();
        }}>
        <p className="text-center text-sm text-slate-600">{t('trips.post.removeText')}</p>
      </ConfirmModal>
    </div>
  );
}
