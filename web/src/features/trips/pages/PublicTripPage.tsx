import {useMutation} from '@tanstack/react-query';
import {Link, useLocation, useNavigate, useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoBookmarkOutline, IoStarOutline} from 'react-icons/io5';
import {routes} from '@/app/routes';
import Toast from '@/components/ui/Toast';
import {getUser} from '@/features/auth/store/session';
import {connectionErrorKey} from '@/lib/apiClient';
import {tripsApi} from '../api/tripsApi';
import LikeButton from '../components/LikeButton';
import ReportPostButton from '../components/ReportPostButton';
import SaveButton from '../components/SaveButton';
import {ReadOnlyTripPage} from './SharedTripPage';

// Public, read only page of a trip its owner made public (no sign-in needed). A private,
// deleted or unknown trip gives the same "not available" answer. A signed-in visitor can
// keep a private copy; the original is never changed.
export default function PublicTripPage() {
  const {t} = useTranslation();
  const {id} = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const save = useMutation({
    mutationFn: () => tripsApi.copyPublic(id!),
    onSuccess: ({tripId}) => {
      Toast.show({type: 'success', text1: t('trips.publicTrip.saved')});
      navigate(routes.DetailTripScreen(tripId));
    },
    onError: error =>
      Toast.show({
        type: 'error',
        text1: t('common.failed'),
        text2: t(connectionErrorKey(error) ?? 'trips.publicTrip.saveFailed'),
      }),
  });

  const saveAction = getUser() ? (
    <button type="button" className="btn btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
      <IoBookmarkOutline size={18} />
      {t(save.isPending ? 'trips.publicTrip.saving' : 'trips.publicTrip.saveCopy')}
    </button>
  ) : (
    <Link to={routes.Login} state={{from: location}} className="btn btn-primary">
      {t('trips.publicTrip.signInToSave')}
    </Link>
  );

  return (
    <ReadOnlyTripPage
      queryKey={['publicTrip', id]}
      id={id}
      load={tripsApi.getPublic}
      actions={trip => (
        <>
          <LikeButton
            tripId={id!}
            liked={trip.liked}
            likesCount={trip.likesCount}
            className="bg-white/20 text-white hover:bg-white/30"
          />
          <SaveButton tripId={id!} saved={trip.saved} className="bg-white/20 text-white hover:bg-white/30" />
          {saveAction}
          {trip.location && (
            <Link
              to={routes.Destination(trip.location)}
              className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30">
              <IoStarOutline size={18} />
              {t('trips.publicTrip.reviewsLink', {place: trip.location})}
            </Link>
          )}
          <ReportPostButton tripId={id!} className="bg-white/20 text-white hover:bg-white/30" />
        </>
      )}
      textKeys={{
        readOnly: 'trips.publicTrip.readOnly',
        invalidTitle: 'trips.publicTrip.invalidTitle',
        invalidText: 'trips.publicTrip.invalidText',
      }}
    />
  );
}
