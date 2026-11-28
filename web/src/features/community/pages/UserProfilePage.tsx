import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {IoPersonAddOutline, IoPersonRemoveOutline, IoStar} from 'react-icons/io5';
import {IoArrowBack} from 'react-icons/io5';
import {Navigate, useNavigate, useParams} from 'react-router-dom';
import {routes} from '@/app/routes';
import Toast from '@/components/ui/Toast';
import {apiStatus, connectionErrorKey} from '@/lib/apiClient';
import {communityApi} from '../api/communityApi';
import type {CommunityUser, FollowState} from '../types';

// i18n key of the message for a failed request
const errorKeyOf = (error: unknown, fallback: string) => {
  const status = apiStatus(error);
  if (status === 403) {
    return 'community.blocked';
  }
  if (status === 404) {
    return 'community.notFound';
  }
  return connectionErrorKey(error) ?? fallback;
};

// Public profile of another account with a Follow / Following button and the followers count.
export default function UserProfilePage() {
  const {t} = useTranslation();
  const {id = ''} = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const key = ['community-user', id];
  const query = useQuery({queryKey: key, queryFn: () => communityApi.profile(id), retry: false});
  const user = query.data;

  const apply = (state: FollowState) => {
    queryClient.setQueryData<CommunityUser>(
      key,
      current => current && {...current, following: state.following, followersCount: state.followersCount},
    );
    // your own Following count (Profile page) changed too
    queryClient.invalidateQueries({queryKey: ['community-user', 'me']});
  };
  const failed = (error: unknown) =>
    Toast.show({type: 'error', text1: t('common.failed'), text2: t(errorKeyOf(error, 'community.failed'))});
  const follow = useMutation({mutationFn: () => communityApi.follow(id), onSuccess: apply, onError: failed});
  const unfollow = useMutation({mutationFn: () => communityApi.unfollow(id), onSuccess: apply, onError: failed});
  const busy = follow.isPending || unfollow.isPending;
  const loadErrorKey = query.error ? errorKeyOf(query.error, 'community.loadFailed') : null;

  // your own profile is the Profile page (with your followers), not this one
  if (user?.isSelf) {
    return <Navigate to={routes.Profile} replace />;
  }

  return (
    <div className="space-y-5 px-4 py-5 md:px-6 md:py-8">
      <button
        type="button"
        aria-label={t('common.back')}
        onClick={() => navigate(-1)}
        className="grid size-10 place-items-center rounded-full text-slate-700 transition hover:bg-slate-100">
        <IoArrowBack size={22} />
      </button>
      {query.isLoading && <p className="text-sm text-slate-500">{t('common.loading')}</p>}
      {loadErrorKey && (
        <div className="card p-6 text-center text-slate-600">
          <p>{t(loadErrorKey)}</p>
          {loadErrorKey === 'community.loadFailed' && (
            <button type="button" className="btn btn-outline mt-3" onClick={() => query.refetch()}>
              {t('common.retry')}
            </button>
          )}
        </div>
      )}

      {user && (
        <section className="card overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-700 md:h-32" />
          <div className="-mt-12 flex flex-col items-center gap-3 px-5 pb-5 sm:flex-row sm:items-end sm:gap-5 md:-mt-14">
            {user.image ? (
              <img
                src={user.image}
                alt=""
                className="size-24 rounded-full bg-slate-100 object-cover ring-4 ring-white md:size-28"
              />
            ) : (
              <span className="grid size-24 place-items-center rounded-full bg-brand-100 text-3xl font-bold text-brand-700 ring-4 ring-white md:size-28">
                {user.fullname.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1 text-center sm:pb-1 sm:text-left">
              <h1 className="truncate text-xl font-bold text-slate-900 md:text-2xl">{user.fullname}</h1>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                <IoStar size={12} />
                {t('profile.points', {count: user.experience})}
              </span>
              <p className="mt-2 flex justify-center gap-4 text-sm text-slate-600 sm:justify-start">
                <span data-testid="followers-count">
                  <strong className="text-slate-900">{user.followersCount}</strong> {t('community.followers')}
                </span>
                <span>
                  <strong className="text-slate-900">{user.followingCount}</strong> {t('community.following')}
                </span>
              </p>
            </div>
            {user.following ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  aria-pressed="true"
                  disabled={busy}
                  onClick={() => unfollow.mutate()}>
                  <IoPersonRemoveOutline size={18} />
                  {t('community.unfollow')}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  aria-pressed="false"
                  disabled={busy}
                  onClick={() => follow.mutate()}>
                  <IoPersonAddOutline size={18} />
                  {t('community.follow')}
                </button>
              )}
          </div>
        </section>
      )}
    </div>
  );
}
