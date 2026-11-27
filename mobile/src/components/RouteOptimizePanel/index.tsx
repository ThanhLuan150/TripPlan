import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useQueryClient} from '@tanstack/react-query';
import {RoutePlace, RouteProposal, RouteTotals, TripDay, tripsApi} from '../../api';
import {queryKeys} from '../../hooks/queries';
import {useApiMutation} from '../../hooks/useApiMutation';
import {alert} from '../../lib/alert';
import {colors, radius} from '../../lib/theme';
import DropdownInput from '../DropdownInput';

const status = (e: unknown) => (e as {response?: {status?: number}})?.response?.status;
const code = (e: unknown) => (e as {response?: {data?: {code?: string}}})?.response?.data?.code;
const isNetwork = (e: unknown) => !!(e as {isAxiosError?: boolean})?.isAxiosError && !status(e);

// "350 m" / "2.4 km"
export const formatDistance = (meters: number) =>
  meters < 1000 ? `${Math.round(meters)} m` : `${Math.round(meters / 100) / 10} km`;

// "12 min" / "1 h 05 min" from seconds
export const formatDuration = (seconds: number) => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
};

// Why no proposal came back (the itinerary is untouched in every case)
const proposeErrorKey = (e: unknown) => {
  if (code(e) === 'ROUTE_NOT_ENOUGH_COORDINATES') {return 'trips.routeNotEnough';}
  if (code(e) === 'ROUTE_TOO_MANY_PLACES') {return 'trips.routeTooMany';}
  return isNetwork(e) ? 'common.networkError' : 'trips.routeFailed';
};

function Order({title, places, totals, source}: {title: string; places: RoutePlace[]; totals: RouteTotals; source: RouteProposal['source']}) {
  const {t} = useTranslation();
  return (
    <View style={styles.order}>
      <Text style={styles.orderTitle}>{title}</Text>
      {places.map((place, i) => (
        <Text key={place.id} style={styles.place}>
          {i + 1}. {place.name}
        </Text>
      ))}
      <Text style={styles.totals}>
        {t(source === 'road' ? 'trips.routeDistanceRoad' : 'trips.routeDistanceStraight', {distance: formatDistance(totals.distance)})}
        {totals.duration !== null && ` · ${t('trips.routeDuration', {duration: formatDuration(totals.duration)})}`}
      </Text>
    </View>
  );
}

// Ask for a better visiting order of ONE day, compare it with the current one, then Accept (saved) or
// Reject (dropped). The itinerary is only changed by Accept, and no place is ever added or removed.
export default function RouteOptimizePanel({tripId, days}: {tripId: string; days: TripDay[]}) {
  const {t} = useTranslation();
  const qc = useQueryClient();
  const options = days.filter(d => d._id && d.challenges.length > 0);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [proposal, setProposal] = useState<RouteProposal | null>(null);
  // numbered by the day of the trip, not by its place in the list of days that can be optimized
  const label = (d: TripDay) => `${days.indexOf(d) + 1}. ${d.title}`;
  const selected = options[Math.min(index, options.length - 1)];

  const propose = useApiMutation((dayId: string) => tripsApi.proposeRoute(tripId, dayId), {
    onSuccess: setProposal,
    onError: e => alert.error(t(proposeErrorKey(e))),
  });
  const apply = useApiMutation((proposalId: string) => tripsApi.applyRoute(tripId, proposalId), {
    onSuccess: () => {
      setProposal(null);
      qc.invalidateQueries({queryKey: queryKeys.trip(tripId)});
      alert.success(t('trips.routeApplied'));
    },
    onError: e =>
      alert.error(
        t(isNetwork(e) ? 'common.networkError' : status(e) === 404 || status(e) === 409 ? 'trips.routeApplyInvalid' : 'trips.routeApplyFailed'),
      ),
  });

  if (!selected) {return null;}

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('trips.routeTitle')}</Text>
      <Text style={styles.hint}>{t('trips.routeHint')}</Text>
      <DropdownInput
        icon="navigate-outline"
        value={label(selected)}
        placeholder={t('trips.routeDay')}
        editable={false}
        open={open}
        options={options.map(label)}
        onToggle={() => setOpen(o => !o)}
        onPick={picked => {
          setIndex(Math.max(0, options.map(label).indexOf(picked)));
          setOpen(false);
          setProposal(null);
        }}
      />
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('trips.routeOptimize')}
          disabled={propose.isPending || apply.isPending}
          style={[styles.button, (propose.isPending || apply.isPending) && styles.disabled]}
          onPress={() => {
            setProposal(null);
            propose.mutate(selected._id!);
          }}>
          <Text style={styles.buttonText}>{t('trips.routeOptimize')}</Text>
        </TouchableOpacity>
      </View>

      {propose.isPending && <Text style={styles.hint}>{t('trips.routeLoading')}</Text>}

      {proposal && (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>{t('trips.routePreview')}</Text>
          <Text style={styles.hint}>{t(proposal.improved ? 'trips.routePreviewHint' : 'trips.routeAlreadyBest')}</Text>
          {proposal.improved && (
            <>
              <Order title={t('trips.routeCurrent')} places={proposal.currentOrder} totals={proposal.current} source={proposal.source} />
              <Order title={t('trips.routeProposed')} places={proposal.proposedOrder} totals={proposal.proposed} source={proposal.source} />
            </>
          )}
          {proposal.source === 'straight-line' && <Text style={styles.warning}>{t('trips.routeStraightLine')}</Text>}
          {proposal.missingCoordinates.length > 0 && (
            <Text style={styles.warning}>
              {t('trips.routeMissing', {places: proposal.missingCoordinates.map(p => p.name).join(', ')})}
            </Text>
          )}
          <View style={styles.actions}>
            {proposal.improved && proposal.proposalId ? (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('trips.routeReject')}
                  disabled={apply.isPending}
                  style={[styles.button, styles.cancel]}
                  onPress={() => {
                    // the server forgets it; the itinerary was never changed, so a failure here does not matter
                    Promise.resolve(tripsApi.rejectRoute(tripId, proposal.proposalId!)).catch(() => undefined);
                    setProposal(null);
                    alert.info(t('trips.routeRejected'));
                  }}>
                  <Text style={styles.cancelText}>{t('trips.routeReject')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('trips.routeAccept')}
                  disabled={apply.isPending}
                  style={[styles.button, apply.isPending && styles.disabled]}
                  onPress={() => apply.mutate(proposal.proposalId!)}>
                  <Text style={styles.buttonText}>{t('trips.routeAccept')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('trips.routeClose')}
                style={[styles.button, styles.cancel]}
                onPress={() => setProposal(null)}>
                <Text style={styles.cancelText}>{t('trips.routeClose')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  title: {fontSize: 16, fontWeight: '700', color: colors.text},
  hint: {fontSize: 12, color: colors.muted, marginBottom: 8, marginTop: 2},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8},
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  buttonText: {color: '#fff', fontWeight: '600'},
  cancel: {backgroundColor: colors.surface},
  cancelText: {color: colors.body, fontWeight: '600'},
  disabled: {opacity: 0.6},
  preview: {marginTop: 12, padding: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border},
  previewTitle: {fontSize: 15, fontWeight: '700', color: colors.text},
  order: {marginTop: 8, padding: 10, borderRadius: radius.sm, backgroundColor: colors.surface},
  orderTitle: {fontWeight: '700', color: colors.text, marginBottom: 2},
  place: {color: colors.body, marginTop: 2},
  totals: {marginTop: 6, fontSize: 12, color: colors.muted},
  warning: {marginTop: 8, fontSize: 12, color: colors.error},
});
