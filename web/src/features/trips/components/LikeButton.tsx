import {useEffect, useState} from 'react';
import {useMutation} from '@tanstack/react-query';
import {Link, useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoHeart, IoHeartOutline} from 'react-icons/io5';
import {routes} from '@/app/routes';
import Toast from '@/components/ui/Toast';
import {getUser} from '@/features/auth/store/session';
import {apiStatus, connectionErrorKey} from '@/lib/apiClient';
import {tripsApi} from '../api/tripsApi';

interface Props {
  // the post (public trip) being liked
  tripId: string;
  liked?: boolean;
  likesCount?: number;
  className?: string;
}

// Like / Unlike of a post with the total. The server answers with the real state, which is
// what is shown (the count is never worked out here). A visitor who is not signed in sees
// the total and a link to sign in.
export default function LikeButton({tripId, liked = false, likesCount = 0, className = ''}: Props) {
  const {t} = useTranslation();
  const location = useLocation();
  const [state, setState] = useState({liked, likesCount});
  // a refetch (or another page of the list) brings the latest state from the server
  useEffect(() => setState({liked, likesCount}), [liked, likesCount]);

  const toggle = useMutation({
    mutationFn: (like: boolean) => (like ? tripsApi.likePublic(tripId) : tripsApi.unlikePublic(tripId)),
    onSuccess: result => setState({liked: result.liked, likesCount: result.likesCount}),
    onError: error =>
      Toast.show({
        type: 'error',
        text1: t('common.failed'),
        text2: t(connectionErrorKey(error) ?? (apiStatus(error) === 404 ? 'trips.like.unavailable' : 'trips.like.failed')),
      }),
  });

  const base = `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${className}`;
  const count = <span data-testid="likes-count">{state.likesCount}</span>;

  if (!getUser()) {
    return (
      <Link
        to={routes.Login}
        state={{from: location}}
        aria-label={t('trips.like.signIn')}
        className={`${base} text-slate-600 hover:bg-slate-100`}>
        <IoHeartOutline size={18} />
        {count}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={state.liked}
      aria-label={t(state.liked ? 'trips.like.unlike' : 'trips.like.like')}
      disabled={toggle.isPending}
      onClick={() => toggle.mutate(!state.liked)}
      className={`${base} disabled:opacity-60 ${state.liked ? 'bg-rose-50 text-rose-600' : 'text-slate-600 hover:bg-slate-100'}`}>
      {state.liked ? <IoHeart size={18} /> : <IoHeartOutline size={18} />}
      {count}
    </button>
  );
}
