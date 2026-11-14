import {ChangeEvent, ReactNode, useCallback, useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  IoCamera,
  IoCheckmarkCircle,
  IoClose,
  IoLocate,
  IoLocationOutline,
  IoNavigate,
  IoRefresh,
  IoWarning,
} from 'react-icons/io5';
import Spinner from '@/components/ui/Spinner';
import {apiMessage, connectionErrorKey} from '@/lib/apiClient';
import {
  Coords,
  formatDistance,
  getCurrentPosition,
  getLocationPermission,
  isLocationError,
  LocationErrorReason,
  saveUserLocation,
  watchLocationPermission,
} from '@/lib/location';
import {challengeApi} from '../api/tripsApi';
import type {Challenge} from '../types';
import LocationSteps from './LocationSteps';

const MAX_DISTANCE = 250; // meters, same rule as the backend

type State =
  | {kind: 'starting'}
  | {kind: 'explain'} // the browser prompt was closed without choosing
  | {kind: 'locating'}
  | {kind: 'problem'; reason: LocationErrorReason}
  | {kind: 'apiError'; messageKey: string}
  | {kind: 'far' | 'near'; distance: number; coords: Coords};

// "Add photo" for a challenge: ask for the location (explaining why), check the
// user is within 250 m of the place, then open the camera. When the location
// is blocked it explains how to re-enable it for the user's browser.
export default function ChallengeLocationDialog({
  challenge,
  onClose,
  onPhoto,
}: {
  challenge: Challenge;
  onClose: () => void;
  onPhoto: (file: File) => void;
}) {
  const {t, i18n} = useTranslation();
  const [state, setState] = useState<State>({kind: 'starting'});
  const stateRef = useRef(state);
  stateRef.current = state;
  const fileInput = useRef<HTMLInputElement>(null);

  const locate = useCallback(async () => {
    setState({kind: 'locating'});
    try {
      const coords = await getCurrentPosition({maximumAge: 10000});
      saveUserLocation(coords).catch(() => undefined);
      const {distance} = await challengeApi.checkProgress(challenge._id, coords.latitude, coords.longitude);
      setState({kind: distance < MAX_DISTANCE ? 'near' : 'far', distance, coords});
    } catch (error) {
      if (isLocationError(error)) {
        // closing the browser prompt also reports "denied", but then the site
        // may still ask again: offer the button instead of the unblock steps
        const dismissed = error.reason === 'denied' && (await getLocationPermission()) === 'prompt';
        setState(dismissed ? {kind: 'explain'} : {kind: 'problem', reason: error.reason});
      } else {
        // the backend has no coordinates for this place
        const noLocation = apiMessage(error) === 'This challenge has no location';
        setState({
          kind: 'apiError',
          messageKey: connectionErrorKey(error) ?? (noLocation ? 'trips.detail.challengeNoLocation' : 'trips.detail.updateFailed'),
        });
      }
    }
  }, [challenge._id]);

  // On open: locate right away, so the browser shows its own "Allow / Block"
  // prompt if it has not asked yet. Only a blocked location needs our help.
  useEffect(() => {
    let cancelled = false;
    if (!window.isSecureContext) {
      setState({kind: 'problem', reason: 'insecure'});
      return;
    }
    getLocationPermission().then(permission => {
      if (cancelled) {
        return;
      }
      if (permission === 'denied' || permission === 'unsupported') {
        setState({kind: 'problem', reason: permission});
      } else {
        locate();
      }
    });
    // the user re-allowed location in the browser settings: continue by itself
    const unwatch = watchLocationPermission(permission => {
      const current = stateRef.current;
      if (permission === 'granted' && (current.kind === 'explain' || current.kind === 'problem')) {
        locate();
      } else if (permission === 'denied' && current.kind !== 'locating') {
        setState({kind: 'problem', reason: 'denied'});
      }
    });
    return () => {
      cancelled = true;
      unwatch();
    };
  }, [locate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      onPhoto(file);
      onClose();
    }
  };

  const distanceText = (m: number) => formatDistance(m, i18n.resolvedLanguage);
  const lat = parseFloat(challenge.latitude ?? '');
  const lng = parseFloat(challenge.longitude ?? '');
  const directionsUrl =
    !isNaN(lat) && !isNaN(lng)
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : null;

  let icon: ReactNode = <IoLocate size={28} />;
  let tone = 'bg-brand-50 text-brand-600';
  let title = t('location.title');
  let body: ReactNode = null;
  let actions: ReactNode = null;

  switch (state.kind) {
    case 'starting':
    case 'locating':
      icon = <Spinner size={28} />;
      title = t('location.checking');
      body = <p>{t('location.checkingText')}</p>;
      break;
    case 'explain':
      body = <p>{t('location.explain')}</p>;
      actions = (
        <button type="button" className="btn btn-primary h-11 w-full" onClick={locate}>
          <IoLocate size={18} />
          {t('location.allow')}
        </button>
      );
      break;
    case 'problem': {
      icon = <IoWarning size={28} />;
      tone = 'bg-amber-50 text-amber-600';
      title = t(`location.${state.reason}Title`);
      body = (
        <>
          <p>{t(`location.${state.reason}Text`)}</p>
          {state.reason === 'denied' && <LocationSteps className="mt-3" />}
        </>
      );
      actions =
        state.reason === 'insecure' || state.reason === 'unsupported' ? null : (
          <button type="button" className="btn btn-primary h-11 w-full" onClick={locate}>
            <IoRefresh size={18} />
            {t('location.retry')}
          </button>
        );
      break;
    }
    case 'apiError':
      icon = <IoWarning size={28} />;
      tone = 'bg-rose-50 text-rose-600';
      title = t('common.failed');
      body = <p>{t(state.messageKey)}</p>;
      actions = (
        <button type="button" className="btn btn-primary h-11 w-full" onClick={locate}>
          <IoRefresh size={18} />
          {t('location.retry')}
        </button>
      );
      break;
    case 'near':
      icon = <IoCheckmarkCircle size={30} />;
      tone = 'bg-emerald-50 text-emerald-600';
      title = t('location.nearTitle');
      body = <p>{t('location.nearText', {distance: distanceText(state.distance)})}</p>;
      actions = (
        <button
          type="button"
          className="btn btn-primary h-11 w-full"
          onClick={() => fileInput.current?.click()}>
          <IoCamera size={18} />
          {t('location.takePhoto')}
        </button>
      );
      break;
    case 'far':
      icon = <IoLocationOutline size={28} />;
      tone = 'bg-amber-50 text-amber-600';
      title = t('location.farTitle');
      body = (
        <>
          <p>{t('location.farText', {distance: distanceText(state.distance), max: MAX_DISTANCE})}</p>
          {(state.coords.accuracy ?? 0) > 100 && (
            <p className="mt-2 text-xs text-slate-500">
              {t('location.lowAccuracy', {accuracy: Math.round(state.coords.accuracy!)})}
            </p>
          )}
        </>
      );
      actions = (
        <div className="grid w-full grid-cols-2 gap-3">
          {directionsUrl ? (
            <a href={directionsUrl} target="_blank" rel="noreferrer" className="btn btn-outline h-11">
              <IoNavigate size={17} />
              {t('location.directions')}
            </a>
          ) : (
            <span />
          )}
          <button type="button" className="btn btn-primary h-11" onClick={locate}>
            <IoRefresh size={17} />
            {t('location.checkAgain')}
          </button>
        </div>
      );
      break;
  }

  return (
    <div className="fixed inset-0 z-[900] grid place-items-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm animate-pop-in rounded-3xl bg-white p-6 text-center shadow-2xl">
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
          <IoClose size={20} />
        </button>
        <span className={`mx-auto grid size-14 place-items-center rounded-2xl ${tone}`}>{icon}</span>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm font-medium text-brand-700">{challenge.challengeSummary}</p>
        <div className="mt-3 text-sm leading-relaxed text-slate-600">{body}</div>
        {actions && <div className="mt-5">{actions}</div>}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
