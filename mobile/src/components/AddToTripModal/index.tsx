import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {
  AddPlaceResult,
  MAX_PLACES_PER_DAY,
  Recommendation,
  tripsApi,
} from '../../api';
import {queryKeys, useTrips} from '../../hooks/queries';
import {useApiMutation} from '../../hooks/useApiMutation';
import {formatDate} from '../../lib/date';
import {planParams} from '../../lib/recommend';
import {colors, radius, shadow} from '../../lib/theme';

export const addPlaceErrorKey = (error: unknown) => {
  const code = (error as {response?: {data?: {code?: string}}})?.response?.data
    ?.code;
  if (code === 'PLACE_ALREADY_IN_TRIP') {
    return 'recommend.addDuplicate';
  }
  return code === 'DAY_FULL'
    ? 'recommend.addDayFullError'
    : 'recommend.addFailed';
};

interface Props {
  item: Recommendation;
  visible: boolean;
  onClose: () => void;
  // the place is now in this trip
  onAdded?: (tripId: string) => void;
}

// Add one suggested place to a day of one of the user's trips, in plain steps: choose the trip, choose
// the day, read what will happen, confirm. Nothing is saved before the confirmation.
export default function AddToTripModal({
  item,
  visible,
  onClose,
  onAdded,
}: Props) {
  const {t, i18n} = useTranslation();
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const [tripId, setTripId] = useState('');
  const [dayId, setDayId] = useState('');
  const [done, setDone] = useState<AddPlaceResult | null>(null);
  const province = planParams(item).location ?? item.province;

  const trips = useTrips();
  const detail = useQuery({
    queryKey: queryKeys.trip(tripId),
    enabled: !!tripId,
    queryFn: () => tripsApi.get(tripId),
  });
  const trip = trips.data?.find(entry => entry._id === tripId);
  const days = detail.data?.dataTripDays ?? [];
  const dayIndex = days.findIndex(day => day._id === dayId);
  const dayLabel = dayIndex >= 0 ? t('recommend.addDay', {n: dayIndex + 1}) : '';
  // trips of the same province first: the likeliest choice
  const sorted = [...(trips.data ?? [])].sort(
    (a, b) => Number(b.location === province) - Number(a.location === province),
  );

  const add = useApiMutation(
    () =>
      tripsApi.addPlace(tripId, {
        name: item.name,
        dayId,
        province: item.province,
        summary: item.description,
      }),
    {
      onSuccess: result => {
        setDone(result);
        onAdded?.(tripId);
        qc.invalidateQueries({queryKey: queryKeys.trip(tripId)});
        qc.invalidateQueries({queryKey: queryKeys.trips});
      },
    },
  );

  const goTo = (screen: string, params: object) => {
    onClose();
    navigation.navigate(screen, params);
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={[styles.card, shadow]}>
          {done ? (
            <View style={styles.gap}>
              <Text style={styles.title}>
                {t('recommend.addDone', {name: item.name, day: dayLabel})}
              </Text>
              <Text style={styles.body}>{t('recommend.addDoneHint')}</Text>
              {!done.located && (
                <Text style={styles.warn}>{t('recommend.addNotLocated')}</Text>
              )}
              <View style={styles.actions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.button, styles.outline]}
                  onPress={onClose}>
                  <Text style={styles.outlineText}>{t('recommend.addClose')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.button}
                  onPress={() => goTo('TripDetail', {id: tripId})}>
                  <Text style={styles.buttonText}>
                    {t('recommend.addViewTrip')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.gap}>
              <Text style={styles.title}>
                {t('recommend.addTitle', {name: item.name})}
              </Text>
              <Text style={styles.body}>{t('recommend.addIntro')}</Text>

              <Text style={styles.step}>{t('recommend.addStep1')}</Text>
              {trips.isLoading && <ActivityIndicator color={colors.primary} />}
              {trips.isError && (
                <View style={styles.gap}>
                  <Text style={styles.body}>
                    {t('recommend.addLoadTripsFailed')}
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[styles.button, styles.outline]}
                    onPress={() => trips.refetch()}>
                    <Text style={styles.outlineText}>
                      {t('recommend.addRetry')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {trips.data && trips.data.length === 0 && (
                <View style={[styles.gap, styles.empty]}>
                  <Text style={styles.body}>{t('recommend.addNoTrips')}</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.button}
                    onPress={() => goTo('CreateTrip', planParams(item))}>
                    <Text style={styles.buttonText}>
                      {t('recommend.addCreate')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {sorted.map(entry => (
                <TouchableOpacity
                  key={entry._id}
                  accessibilityRole="radio"
                  accessibilityState={{selected: entry._id === tripId}}
                  style={[styles.option, entry._id === tripId && styles.optionOn]}
                  onPress={() => {
                    setTripId(entry._id);
                    setDayId('');
                    add.reset();
                  }}>
                  <View style={styles.flex}>
                    <Text style={styles.optionTitle} numberOfLines={1}>
                      {entry.nameTrip ?? entry.location}
                    </Text>
                    <Text style={styles.meta}>
                      {`${entry.location} · ${formatDate(
                        entry.startDate,
                        i18n.language,
                      )} - ${formatDate(entry.endDate, i18n.language)}`}
                    </Text>
                  </View>
                  {!!province && entry.location === province && (
                    <Text style={styles.badge}>
                      {t('recommend.addSameProvince')}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}

              {sorted.length > 0 && (
                <>
                  <Text style={styles.step}>{t('recommend.addStep2')}</Text>
                  {!tripId && (
                    <Text style={styles.body}>
                      {t('recommend.addPickTripFirst')}
                    </Text>
                  )}
                  {!!tripId && detail.isLoading && (
                    <ActivityIndicator color={colors.primary} />
                  )}
                  {!!tripId && detail.isError && (
                    <View style={styles.gap}>
                      <Text style={styles.body}>
                        {t('recommend.addLoadDaysFailed')}
                      </Text>
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={[styles.button, styles.outline]}
                        onPress={() => detail.refetch()}>
                        <Text style={styles.outlineText}>
                          {t('recommend.addRetry')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {days.map((day, index) => {
                    const full = day.challenges.length >= MAX_PLACES_PER_DAY;
                    const selected = !!day._id && day._id === dayId;
                    return (
                      <TouchableOpacity
                        key={day._id ?? index}
                        accessibilityRole="radio"
                        accessibilityState={{
                          selected,
                          disabled: full || !day._id,
                        }}
                        disabled={full || !day._id}
                        style={[
                          styles.option,
                          selected && styles.optionOn,
                          (full || !day._id) && styles.optionOff,
                        ]}
                        onPress={() => {
                          setDayId(day._id ?? '');
                          add.reset();
                        }}>
                        <View style={styles.flex}>
                          <Text style={styles.optionTitle} numberOfLines={1}>
                            {t('recommend.addDay', {n: index + 1})}
                            {day.title ? `: ${day.title}` : ''}
                          </Text>
                          {!!day.date && (
                            <Text style={styles.meta}>
                              {formatDate(day.date, i18n.language)}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.meta}>
                          {full
                            ? t('recommend.addDayFull', {max: MAX_PLACES_PER_DAY})
                            : t('recommend.addDayPlaces', {
                                count: day.challenges.length,
                              })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {!!trip && !!dayId && (
                <View style={styles.summary}>
                  <Text style={styles.summaryTitle}>
                    {t('recommend.addSummary', {
                      name: item.name,
                      day: dayLabel,
                      trip: trip.nameTrip ?? trip.location,
                    })}
                  </Text>
                  <Text style={styles.meta}>{t('recommend.addGeocodeNote')}</Text>
                  {!item.inApp && (
                    <Text style={styles.warn}>{t('recommend.addUnverified')}</Text>
                  )}
                </View>
              )}

              {add.isError && (
                <Text style={styles.error}>
                  {t(addPlaceErrorKey(add.error))}
                </Text>
              )}

              <View style={styles.actions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.button, styles.outline]}
                  onPress={onClose}>
                  <Text style={styles.outlineText}>{t('recommend.addCancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('recommend.addConfirm')}
                  disabled={!tripId || !dayId || add.isPending}
                  style={[
                    styles.button,
                    (!tripId || !dayId || add.isPending) && styles.disabled,
                  ]}
                  onPress={() => add.mutate()}>
                  <Text style={styles.buttonText}>
                    {add.isPending
                      ? t('recommend.addAdding')
                      : t('recommend.addConfirm')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  center: {flex: 1, justifyContent: 'center', padding: 20},
  card: {
    maxHeight: '88%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: radius.lg,
  },
  gap: {gap: 10},
  flex: {flex: 1},
  title: {color: colors.text, fontWeight: '700', fontSize: 18},
  step: {color: colors.text, fontWeight: '700', marginTop: 6},
  body: {color: colors.body, fontSize: 13},
  meta: {color: colors.muted, fontSize: 12},
  warn: {color: '#B45309', fontSize: 12},
  error: {color: colors.error, fontSize: 13},
  empty: {padding: 12, borderRadius: radius.md, backgroundColor: colors.surface},
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionOn: {borderColor: colors.primary, backgroundColor: colors.tint},
  optionOff: {opacity: 0.5, backgroundColor: colors.surface},
  optionTitle: {color: colors.text, fontWeight: '600'},
  badge: {
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  summary: {gap: 4, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface},
  summaryTitle: {color: colors.text, fontWeight: '700'},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4},
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  buttonText: {color: '#fff', fontWeight: '600'},
  outline: {backgroundColor: '#fff', borderWidth: 1, borderColor: colors.primary},
  outlineText: {color: colors.primaryDark, fontWeight: '600'},
  disabled: {opacity: 0.5},
});
