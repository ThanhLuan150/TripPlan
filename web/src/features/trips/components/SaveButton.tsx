import {useEffect, useState} from 'react';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {Link, useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoBookmark, IoBookmarkOutline} from 'react-icons/io5';
import {routes} from '@/app/routes';
import Toast from '@/components/ui/Toast';
import {getUser} from '@/features/auth/store/session';
import {apiStatus, connectionErrorKey} from '@/lib/apiClient';
import {tripsApi} from '../api/tripsApi';

interface Props {
  // the post (public trip) being saved
  tripId: string;
  saved?: boolean;
  className?: string;
}

// Save / Unsave of a post to read later. The server answers with the real state, which is what
// is shown. A visitor who is not signed in gets a link to sign in instead of a button.
export default function SaveButton({tripId, saved = false, className = ''}: Props) {
  const {t} = useTranslation();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [state, setState] = useState(saved);
  // a refetch (or another page of the list) brings the latest state from the server
  useEffect(() => setState(saved), [saved]);

  const toggle = useMutation({
    mutationFn: (save: boolean) => (save ? tripsApi.savePost(tripId) : tripsApi.unsavePost(tripId)),
    onSuccess: result => {
      setState(result.saved);
      // the Saved posts area must show the change at once
      queryClient.invalidateQueries({queryKey: ['savedPosts']});
    },
    onError: error =>
      Toast.show({
        type: 'error',
        text1: t('common.failed'),
        text2: t(connectionErrorKey(error) ?? (apiStatus(error) === 404 ? 'trips.savePost.unavailable' : 'trips.savePost.failed')),
      }),
  });

  const base = `inline-flex items-center rounded-full p-2 text-sm font-medium transition ${className}`;

  if (!getUser()) {
    return (
      <Link
        to={routes.Login}
        state={{from: location}}
        aria-label={t('trips.savePost.signIn')}
        className={`${base} text-slate-600 hover:bg-slate-100`}>
        <IoBookmarkOutline size={18} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={state}
      aria-label={t(state ? 'trips.savePost.unsave' : 'trips.savePost.save')}
      disabled={toggle.isPending}
      onClick={() => toggle.mutate(!state)}
      className={`${base} disabled:opacity-60 ${state ? 'bg-amber-50 text-amber-600' : 'text-slate-600 hover:bg-slate-100'}`}>
      {state ? <IoBookmark size={18} /> : <IoBookmarkOutline size={18} />}
    </button>
  );
}
