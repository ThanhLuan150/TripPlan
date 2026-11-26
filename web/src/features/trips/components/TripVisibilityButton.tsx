import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoCopyOutline, IoGlobeOutline, IoLockClosedOutline} from 'react-icons/io5';
import {routes} from '@/app/routes';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Toast from '@/components/ui/Toast';
import {connectionErrorKey} from '@/lib/apiClient';
import {tripsApi} from '../api/tripsApi';

// Shows whether the trip is public or private and lets the owner switch it.
// Only the owner reaches this page; the backend enforces the rule on every request.
export default function TripVisibilityButton({tripId}: {tripId: string}) {
  const {t} = useTranslation();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const queryKey = ['tripVisibility', tripId];

  const status = useQuery({
    queryKey,
    queryFn: () => tripsApi.visibility(tripId),
  });
  const change = useMutation({
    mutationFn: (visibility: 'public' | 'private') => tripsApi.setVisibility(tripId, visibility),
    onSuccess: data => {
      queryClient.setQueryData(queryKey, data);
      // going private also turns the share link off
      queryClient.invalidateQueries({queryKey: ['tripShare', tripId]});
    },
    onError: error =>
      Toast.show({
        type: 'error',
        text1: t('common.failed'),
        text2: t(connectionErrorKey(error) ?? 'trips.visibility.failed'),
      }),
  });

  if (!status.data) {
    return null;
  }
  const isPublic = status.data.visibility === 'public';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${routes.PublicTrip(tripId)}`);
      Toast.show({type: 'success', text1: t('trips.visibility.linkCopied')});
    } catch {
      Toast.show({type: 'error', text1: t('common.failed'), text2: t('trips.visibility.copyFailed')});
    }
  };

  // going public asks first (it exposes the plan); going private does not
  const toggle = () => (isPublic ? change.mutate('private') : setConfirming(true));

  return (
    <>
      <button
        type="button"
        aria-label={t('trips.visibility.change')}
        title={t(isPublic ? 'trips.visibility.hintPublic' : 'trips.visibility.hintPrivate')}
        disabled={change.isPending}
        onClick={toggle}
        className="flex h-10 items-center gap-2 rounded-full bg-white/90 px-3 text-sm font-semibold text-slate-800 backdrop-blur transition hover:bg-white disabled:opacity-60 md:px-4">
        {isPublic ? (
          <IoGlobeOutline size={18} className="text-brand-600" />
        ) : (
          <IoLockClosedOutline size={18} className="text-slate-600" />
        )}
        <span className="hidden sm:inline">{t(isPublic ? 'trips.visibility.public' : 'trips.visibility.private')}</span>
      </button>
      {isPublic && (
        <button
          type="button"
          aria-label={t('trips.visibility.copyLink')}
          title={t('trips.visibility.copyLink')}
          onClick={copyLink}
          className="grid size-10 place-items-center rounded-full bg-white/90 text-slate-800 backdrop-blur transition hover:bg-white">
          <IoCopyOutline size={18} />
        </button>
      )}
      <ConfirmModal
        visible={confirming}
        title={t('trips.visibility.confirmPublicTitle')}
        confirmText={t('trips.visibility.confirmPublicAction')}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          change.mutate('public');
        }}>
        <p className="text-center text-sm text-slate-600">{t('trips.visibility.confirmPublicText')}</p>
      </ConfirmModal>
    </>
  );
}
