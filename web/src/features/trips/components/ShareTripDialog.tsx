import {useEffect, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {IoCheckmark, IoClose, IoCopyOutline, IoEyeOutline, IoLink} from 'react-icons/io5';
import {routes} from '@/app/routes';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import {connectionErrorKey} from '@/lib/apiClient';
import {tripsApi} from '../api/tripsApi';

const shareUrl = (token: string) => `${window.location.origin}${routes.SharedTrip(token)}`;

// Share a trip by link: turn sharing on/off, see the status, copy the link.
// Only the owner reaches this (the backend checks it); the link is read only.
export default function ShareTripDialog({tripId, onClose}: {tripId: string; onClose: () => void}) {
  const {t} = useTranslation();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const queryKey = ['tripShare', tripId];

  const status = useQuery({queryKey, queryFn: () => tripsApi.shareStatus(tripId)});
  const toggle = useMutation({
    mutationFn: (on: boolean) => (on ? tripsApi.enableShare(tripId) : tripsApi.disableShare(tripId)),
    onSuccess: data => {
      setCopied(false);
      queryClient.setQueryData(queryKey, data);
    },
    onError: error =>
      Toast.show({
        type: 'error',
        text1: t('common.failed'),
        text2: t(connectionErrorKey(error) ?? 'trips.share.failed'),
      }),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const data = status.data;
  const link = data?.isShared && data.shareToken ? shareUrl(data.shareToken) : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      Toast.show({type: 'error', text1: t('common.failed'), text2: t('trips.share.copyFailed')});
    }
  };

  return (
    <div className="fixed inset-0 z-[900] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={t('trips.share.title')}>
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
          <IoLink size={20} className="text-brand-600" />
          {t('trips.share.title')}
        </h2>

        {status.isLoading && (
          <div className="grid place-items-center py-8">
            <Spinner size={28} />
          </div>
        )}

        {status.isError && (
          <div className="mt-4 space-y-3 text-center">
            <p className="text-sm text-slate-600">{t('trips.share.loadFailed')}</p>
            <button type="button" className="btn btn-outline" onClick={() => status.refetch()}>
              {t('common.retry')}
            </button>
          </div>
        )}

        {data && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {t(data.isShared ? 'trips.share.statusOn' : 'trips.share.statusOff')}
                </p>
                <p className="text-xs text-slate-500">
                  {t(data.isShared ? 'trips.share.hintOn' : 'trips.share.hintOff')}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={data.isShared}
                aria-label={t('trips.share.toggle')}
                disabled={toggle.isPending}
                onClick={() => toggle.mutate(!data.isShared)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${
                  data.isShared ? 'bg-brand-500' : 'bg-slate-300'
                }`}>
                <span
                  className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform ${
                    data.isShared ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {data.isShared && (
              <>
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <IoEyeOutline size={14} />
                  {t('trips.share.permissionView')}
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    aria-label={t('trips.share.linkLabel')}
                    value={link}
                    onFocus={e => e.currentTarget.select()}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  />
                  <button type="button" className="btn btn-primary shrink-0" onClick={copy}>
                    {copied ? <IoCheckmark size={18} /> : <IoCopyOutline size={18} />}
                    {t(copied ? 'trips.share.copied' : 'trips.share.copy')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
