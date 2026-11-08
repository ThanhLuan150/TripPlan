import {useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {useNavigate, useParams} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {
  IoArrowBack,
  IoCalendarOutline,
  IoCamera,
  IoCheckmarkCircle,
  IoChevronDown,
  IoLocationOutline,
  IoMap,
  IoTimeOutline,
} from 'react-icons/io5';
import {routes} from '@/app/routes';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import {addCommas, formatDate} from '@/lib/date';
import {connectionErrorKey} from '@/lib/apiClient';
import {uploadErrorKey, uploadImage} from '@/lib/upload';
import {challengeApi} from '../api/tripsApi';
import ChallengeLocationDialog from '../components/ChallengeLocationDialog';
import {images} from '../data/provinceImages';
import {useTripDetail} from '../hooks/useTrips';
import type {Challenge} from '../types';

function Stat({label, value}: {label: string; value: string}) {
  return (
    <div className="card p-3 text-center">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Cost({label, value}: {label: string; value?: number}) {
  const {t} = useTranslation();
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{addCommas(value)} VND</p>
      <p className="text-[11px] text-slate-400">{t('trips.detail.perPerson')}</p>
    </div>
  );
}

export default function TripDetailPage() {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {idTrip} = useParams();
  const {data: result, isLoading, isError} = useTripDetail(idTrip);

  const [openDays, setOpenDays] = useState<string[]>(['1']);
  const [imageSource, setImageSource] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [retake, setRetake] = useState<Challenge | null>(null);
  // challenge whose "add photo" dialog is open (location check -> camera)
  const [locating, setLocating] = useState<Challenge | null>(null);
  const [heroError, setHeroError] = useState(false);

  const toggleDay = (day: string) =>
    setOpenDays(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]));

  // The dialog has already checked the user is at the place: upload the photo
  // and complete the challenge.
  const completeChallenge = async (challenge: Challenge, file: File) => {
    const chaId = challenge._id;
    setUploading(chaId);
    try {
      const url = await uploadImage(file);
      await challengeApi.complete(chaId, url);
      setImageSource(prev => ({...prev, [chaId]: url}));
      Toast.show({
        type: 'success',
        text1: t('common.success'),
        text2: t('trips.detail.earned', {points: challenge.points}),
      });
    } catch (error) {
      console.log(error);
      Toast.show({
        type: 'error',
        text1: t('common.failed'),
        text2: t(uploadErrorKey(error) ?? connectionErrorKey(error) ?? 'trips.detail.updateFailed'),
      });
    } finally {
      setUploading(null);
      queryClient.invalidateQueries({queryKey: ['trip', idTrip]});
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 pt-2 pb-6 md:px-6">
        <div className="h-56 animate-pulse rounded-3xl bg-slate-200 md:h-72" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
        {[0, 1].map(i => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    );
  }

  if (isError || !result) {
    return (
      <div className="px-4 pt-2 pb-6 md:px-6">
        <div className="card mx-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
          <p className="font-semibold text-slate-900">{t('trips.detail.loadFailed')}</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate(routes.AddNewTrip)}>
            {t('trips.detail.backToList')}
          </button>
        </div>
      </div>
    );
  }

  const challenges = result.dataTripDays.flatMap(d => d.challenges);
  const isDone = (c: Challenge) => c.completed || !!imageSource[c._id];
  const doneCount = challenges.filter(isDone).length;
  const earned = challenges.filter(isDone).reduce((s, c) => s + (c.points ?? 0), 0);
  const totalPoints = challenges.reduce((s, c) => s + (c.points ?? 0), 0);
  const cover = images[result.location];

  return (
    <div className="space-y-4 px-4 pt-2 pb-6 md:px-6">
      {/* hero */}
      <div className="relative h-56 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-400 to-brand-800 shadow-soft md:h-72">
        {cover && !heroError && (
          <img
            src={cover}
            alt=""
            onError={() => setHeroError(true)}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
        <div className="absolute inset-x-4 top-4 flex items-center justify-between">
          <button
            type="button"
            aria-label={t('trips.detail.backToList')}
            onClick={() => navigate(routes.AddNewTrip)}
            className="grid size-10 place-items-center rounded-full bg-white/90 text-slate-800 backdrop-blur transition hover:bg-white">
            <IoArrowBack size={20} />
          </button>
          <button
            type="button"
            onClick={() => navigate(routes.MapScreen(idTrip!))}
            className="flex h-10 items-center gap-2 rounded-full bg-white/90 px-4 text-sm font-semibold text-slate-800 backdrop-blur transition hover:bg-white">
            <IoMap size={18} className="text-brand-600" />
            {t('trips.detail.viewMap')}
          </button>
        </div>
        <div className="absolute inset-x-5 bottom-5 text-white">
          <p className="flex items-center gap-1.5 text-sm text-white/85">
            <IoCalendarOutline size={16} />
            {`${formatDate(result.startDate)} - ${formatDate(result.endDate)}`}
          </p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">{result.location}</h1>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('trips.detail.challenges')} value={`${doneCount}/${challenges.length}`} />
        <Stat label={t('trips.detail.pointsEarned')} value={`${earned}/${totalPoints}`} />
        <Stat label={t('trips.detail.days')} value={`${result.dataTripDays.length}`} />
      </div>
      {challenges.length > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-brand-500 transition-all"
            style={{width: `${(doneCount / challenges.length) * 100}%`}}
          />
        </div>
      )}

      {/* days */}
      {result.dataTripDays.map((day, i) => {
        const key = (i + 1).toString();
        const open = openDays.includes(key);
        return (
          <section key={key} className="card overflow-hidden">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => toggleDay(key)}
              className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-slate-50">
              <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <span className="text-[10px] font-medium uppercase">{t('trips.detail.dayLabel')}</span>
                <span className="text-lg leading-none font-bold">{key}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 font-semibold text-slate-900">{day.title}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <IoTimeOutline size={13} />
                  {formatDate(day.date)} ·{' '}
                  {t('trips.detail.challengeCount', {count: day.challenges.length})}
                </span>
              </span>
              <IoChevronDown
                size={20}
                className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
              />
            </button>

            {open && (
              <div className="space-y-3 border-t border-slate-100 p-4">
                {day.challenges.map(activity => {
                  const image = imageSource[activity._id] || activity.imageUrl;
                  const done = isDone(activity);
                  return (
                    <div key={activity._id} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{activity.challengeSummary}</p>
                        {activity.location && (
                          <p
                            className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"
                            title={activity.location}>
                            <IoLocationOutline size={13} className="shrink-0" />
                            <span className="truncate">{activity.location}</span>
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                            {done && <IoCheckmarkCircle size={13} />}
                            {done ? t('trips.detail.done') : t('trips.detail.todo')}
                          </span>
                          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                            {t('trips.detail.points', {count: activity.points})}
                          </span>
                        </div>
                      </div>
                      <div className="grid w-24 shrink-0 place-items-center md:w-28">
                        {uploading === activity._id ? (
                          <Spinner size={28} />
                        ) : image ? (
                          <button
                            type="button"
                            disabled={activity.completed}
                            title={activity.completed ? undefined : t('trips.detail.retake')}
                            onClick={() => setRetake(activity)}
                            className="h-20 w-full overflow-hidden rounded-lg disabled:cursor-default disabled:opacity-100">
                            <img src={image} alt={activity.challengeSummary} className="size-full object-cover" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-primary w-full px-2 py-2 text-xs"
                            onClick={() => setLocating(activity)}>
                            <IoCamera size={16} />
                            {t('trips.detail.addPhoto')}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className="grid gap-2 sm:grid-cols-3">
                  <Cost label={t('trips.detail.transport')} value={day.transportCost} />
                  <Cost label={t('trips.detail.food')} value={day.foodCost} />
                  {day.otherCost ? <Cost label={t('trips.detail.other')} value={day.otherCost} /> : null}
                </div>
              </div>
            )}
          </section>
        );
      })}

      <ConfirmModal
        visible={retake !== null}
        title={t('trips.detail.retakeTitle')}
        onCancel={() => setRetake(null)}
        onConfirm={() => {
          setLocating(retake);
          setRetake(null);
        }}
      />

      {locating && (
        <ChallengeLocationDialog
          challenge={locating}
          onClose={() => setLocating(null)}
          onPhoto={file => completeChallenge(locating, file)}
        />
      )}
    </div>
  );
}
