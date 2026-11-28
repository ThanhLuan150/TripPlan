import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {tripsApi} from '../api';
import {BackPill, ErrorText} from '../components';
import LikeButton from '../components/LikeButton';
import ReportPostModal from '../components/ReportPostModal';
import SaveButton from '../components/SaveButton';
import {PleaseWait} from '../components/GenerateStatus';
import {queryKeys, usePublicTrip} from '../hooks/queries';
import {useApiMutation} from '../hooks/useApiMutation';
import {alert} from '../lib/alert';
import {errorText} from '../lib/apiClient';
import {formatDate} from '../lib/date';
import {addCommas} from '../lib/money';
import {colors, radius, shadow} from '../lib/theme';

// A public plan, read only. A signed-in user can keep a private copy; the original is never changed.
export default function PublicTripDetail() {
  const {t, i18n} = useTranslation();
  const {id} = useRoute<any>().params as {id: string};
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const trip = usePublicTrip(id);
  const [reporting, setReporting] = useState(false);
  const save = useApiMutation(() => tripsApi.copyPublic(id), {
    onSuccess: ({tripId}) => {
      qc.invalidateQueries({queryKey: queryKeys.trips});
      alert.success(t('common.success'), t('trips.publicSaved'));
      navigation.replace('TripDetail', {id: tripId});
    },
    onError: e => alert.error(t('trips.publicSaveFailed'), errorText(e)),
  });

  if (trip.isLoading) {return <PleaseWait />;}
  if (trip.error || !trip.data) {
    return (
      <View style={styles.container}>
        <BackPill onPress={() => navigation.goBack()} />
        <ErrorText message={t('trips.publicNotAvailable')} />
      </View>
    );
  }
  const data = trip.data;

  return (
    <View style={styles.container}>
      <BackPill onPress={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.badge}>{t('trips.publicReadOnly')}</Text>
        <Text style={styles.title}>{data.nameTrip ?? data.location}</Text>
        <Text style={styles.meta}>
          {`${formatDate(data.startDate, i18n.language)} - ${formatDate(
            data.endDate,
            i18n.language,
          )}`}
        </Text>
        <Text style={styles.meta}>{data.location}</Text>
        {!!data.postContent && (
          <View style={styles.note}>
            <Text style={styles.noteTitle}>{t('trips.publicAuthorNote')}</Text>
            <Text style={styles.noteText}>{data.postContent}</Text>
          </View>
        )}
        <View style={styles.likeRow}>
          <LikeButton
            tripId={id}
            liked={data.liked}
            likesCount={data.likesCount}
          />
          <SaveButton tripId={id} saved={data.saved} />
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('trips.publicSave')}
          disabled={save.isPending}
          style={[styles.save, save.isPending && styles.disabled]}
          onPress={() => save.mutate()}>
          <Ionicons name="bookmark-outline" size={18} color="#fff" />
          <Text style={styles.saveText}>{t('trips.publicSave')}</Text>
        </TouchableOpacity>
        <View style={styles.links}>
          {!!data.location && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('trips.publicReviewsLink', {
                place: data.location,
              })}
              style={styles.link}
              onPress={() =>
                navigation.navigate('DestinationReviews', {
                  destination: data.location,
                })
              }>
              <Ionicons name="star-outline" size={16} color={colors.primary} />
              <Text style={styles.linkText}>
                {t('trips.publicReviewsLink', {place: data.location})}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('trips.reportOpen')}
            style={styles.link}
            onPress={() => setReporting(true)}>
            <Ionicons name="flag-outline" size={16} color={colors.error} />
            <Text style={[styles.linkText, styles.reportText]}>
              {t('trips.reportOpen')}
            </Text>
          </TouchableOpacity>
        </View>

        {data.dataTripDays.map((day, index) => (
          <View key={index} style={styles.day}>
            <Text style={styles.dayTitle}>{`${index + 1}. ${day.title}`}</Text>
            {day.challenges.map(c => (
              <View key={c._id} style={styles.challenge}>
                <Text style={styles.challengeName}>{c.challengeSummary}</Text>
                {!!c.location && <Text style={styles.meta}>{c.location}</Text>}
              </View>
            ))}
            <Text style={styles.meta}>
              {`${addCommas(day.transportCost)} · ${addCommas(
                day.foodCost,
              )} · ${addCommas(day.otherCost)} VND`}
            </Text>
          </View>
        ))}
      </ScrollView>
      <ReportPostModal
        tripId={id}
        visible={reporting}
        onClose={() => setReporting(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg, paddingTop: 36},
  content: {padding: 16, paddingTop: 20, gap: 8},
  badge: {
    alignSelf: 'center',
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  meta: {fontSize: 13, color: colors.muted, textAlign: 'center'},
  save: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 12,
    marginVertical: 8,
  },
  likeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: {color: '#fff', fontWeight: '700', fontSize: 15},
  note: {
    backgroundColor: colors.tint,
    borderRadius: radius.lg,
    padding: 14,
    gap: 4,
  },
  noteTitle: {color: colors.primaryDeep, fontWeight: '700', fontSize: 12},
  noteText: {color: colors.body, fontSize: 14},
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  linkText: {color: colors.primary, fontWeight: '600', fontSize: 13},
  reportText: {color: colors.error},
  disabled: {opacity: 0.6},
  day: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    gap: 6,
    ...shadow,
  },
  dayTitle: {fontWeight: '700', color: colors.text},
  challenge: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 10,
    gap: 2,
  },
  challengeName: {color: colors.text, fontWeight: '600'},
});
