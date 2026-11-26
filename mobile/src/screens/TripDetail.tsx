import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FlatList, Share, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ShareTripModal from '../components/ShareTripModal';
import {colors} from '../lib/theme';
import {exportTripPdf} from '../lib/exportPdf';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {BackPill, ConfirmModal, ErrorText} from '../components';
import ActivityRow from '../components/ActivityRow';
import DayCard from '../components/DayCard';
import {PleaseWait} from '../components/GenerateStatus';
import TripHero from '../components/TripHero';
import AiEditPanel from '../components/AiEditPanel';
import TripNotes from '../components/TripNotes';
import {queryKeys, useTrip, useTripVisibility} from '../hooks/queries';
import {tripsApi, TripVisibility} from '../api';
import {API_URL} from '../lib/config';
import {useApiMutation} from '../hooks/useApiMutation';
import {alert} from '../lib/alert';
import {apiMessage, errorText} from '../lib/apiClient';
import {CheckInError, checkIn as runCheckIn} from '../lib/checkIn';

// Readable text for a failed check-in (location, distance, no place found, photo...).
const checkInMessage = (
  e: unknown,
  t: (key: string, options?: Record<string, unknown>) => string,
) => {
  if (e instanceof CheckInError) {return t(`trips.${e.key}`, e.params);}
  if ((e as Error)?.message === 'denied') {return t('trips.locationDenied');}
  if ((e as Error)?.message === 'unavailable')
    {return t('trips.locationUnavailable');}
  const message = apiMessage(e);
  if (message === 'This challenge has no location')
    {return t('trips.noLocation');}
  return errorText(e);
};

export default function TripDetail() {
  const {t, i18n} = useTranslation();
  const {id} = useRoute<any>().params as {id: string};
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const [open, setOpen] = useState<number[]>([]);
  const trip = useTrip(id);

  // be at the place (backend: within 250 m), take a photo, mark the challenge done
  const checkIn = useApiMutation(runCheckIn, {
    onSuccess: async done => {
      if (!done) {return;}
      await qc.invalidateQueries({queryKey: queryKeys.trip(id)});
      alert.success(t('common.success'), t('trips.checkedIn'));
    },
    onError: e => alert.error(t('common.failed'), checkInMessage(e, t)),
  });
  const [retake, setRetake] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [confirmPublic, setConfirmPublic] = useState(false);
  const visibility = useTripVisibility(id);
  const changeVisibility = useApiMutation(
    (v: TripVisibility) => tripsApi.setVisibility(id, v),
    {
      onSuccess: data => {
        qc.setQueryData(queryKeys.tripVisibility(id), data);
        // going private also turns the share link off
        qc.invalidateQueries({queryKey: queryKeys.tripShare(id)});
      },
      onError: e => alert.error(t('trips.visibilityFailed'), errorText(e)),
    },
  );
  const isPublic = visibility.data?.visibility === 'public';
  const [exporting, setExporting] = useState(false);

  // PDF of the saved trip (nothing is changed), opened with the system viewer
  const exportPdf = async () => {
    setExporting(true);
    try {
      await exportTripPdf(
        id,
        i18n.language,
        trip.data?.nameTrip ?? trip.data?.location,
      );
    } catch (e) {
      alert.error(t('common.failed'), t('trips.exportPdfFailed'));
    } finally {
      setExporting(false);
    }
  };

  if (trip.isLoading) {return <PleaseWait />;}
  if (trip.error) {return <ErrorText message={errorText(trip.error)} />;}

  return (
    <View style={styles.container}>
      <BackPill onPress={() => navigation.goBack()} />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('trips.share')}
        style={styles.share}
        onPress={() => setSharing(true)}>
        <Ionicons name="share-social-outline" size={20} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('trips.exportPdf')}
        disabled={exporting}
        style={[styles.share, styles.pdf, exporting && styles.disabled]}
        onPress={exportPdf}>
        <Ionicons name="document-text-outline" size={20} color="#fff" />
      </TouchableOpacity>
      {visibility.data && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('trips.visibilityChange')}
          disabled={changeVisibility.isPending}
          style={[
            styles.share,
            styles.visibility,
            changeVisibility.isPending && styles.disabled,
          ]}
          onPress={() =>
            isPublic ? changeVisibility.mutate('private') : setConfirmPublic(true)
          }>
          <Ionicons
            name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
            size={20}
            color="#fff"
          />
          <Text style={styles.visibilityText}>
            {t(isPublic ? 'trips.visibilityPublic' : 'trips.visibilityPrivate')}
          </Text>
        </TouchableOpacity>
      )}
      {isPublic && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('trips.visibilityShareLink')}
          style={[styles.share, styles.publicLink]}
          onPress={() =>
            Share.share({
              message:
                visibility.data?.publicUrl ?? `${API_URL}/public-trip/${id}`,
            }).catch(() => undefined)
          }>
          <Ionicons name="link-outline" size={20} color="#fff" />
        </TouchableOpacity>
      )}
      <ConfirmModal
        visible={confirmPublic}
        title={t('trips.visibilityConfirmPublic')}
        onCancel={() => setConfirmPublic(false)}
        onConfirm={() => {
          setConfirmPublic(false);
          changeVisibility.mutate('public');
        }}
      />
      <ShareTripModal
        tripId={id}
        visible={sharing}
        onClose={() => setSharing(false)}
      />
      <FlatList
        showsVerticalScrollIndicator={false}
        style={styles.list}
        ListHeaderComponent={
          <TripHero
            location={trip.data?.location}
            startDate={trip.data?.startDate}
            endDate={trip.data?.endDate}
            onMap={() => navigation.navigate('TripMap', {id})}
          />
        }
        ListFooterComponent={
          <>
            <AiEditPanel tripId={id} days={trip.data?.dataTripDays ?? []} />
            <TripNotes tripId={id} />
          </>
        }
        data={trip.data?.dataTripDays ?? []}
        keyExtractor={(_, i) => String(i)}
        renderItem={({item, index}) => (
          <DayCard
            day={item}
            open={open.includes(index)}
            onToggle={() =>
              setOpen(p =>
                p.includes(index) ? p.filter(x => x !== index) : [...p, index],
              )
            }>
            {item.challenges.map(c => (
              <ActivityRow
                key={c._id}
                challenge={c}
                busy={checkIn.isPending && checkIn.variables === c._id}
                disabled={checkIn.isPending}
                onAddPhoto={() => checkIn.mutate(c._id)}
                onRetake={() => setRetake(c._id)}
              />
            ))}
          </DayCard>
        )}
      />
      <ConfirmModal
        visible={retake !== null}
        title={t('trips.retake')}
        onCancel={() => setRetake(null)}
        onConfirm={() => {
          if (retake) {checkIn.mutate(retake);}
          setRetake(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff', paddingTop: 36},
  list: {paddingHorizontal: 15},
  pdf: {top: 88},
  visibility: {top: 136, flexDirection: 'row', alignItems: 'center', gap: 6},
  publicLink: {top: 184},
  visibilityText: {color: '#fff', fontWeight: '600', fontSize: 13},
  disabled: {opacity: 0.6},
  share: {
    position: 'absolute',
    zIndex: 5,
    top: 40,
    right: 0,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingRight: 10,
    paddingLeft: 14,
    borderTopLeftRadius: 50,
    borderBottomLeftRadius: 50,
  },
});
