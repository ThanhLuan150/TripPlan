import {useTranslation} from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {BackPill} from '../components';
import EmptyState from '../components/EmptyState';
import ErrorText from '../components/ErrorText';
import {usePublicTrips} from '../hooks/queries';
import {formatDate} from '../lib/date';
import {addCommas} from '../lib/money';
import {colors, radius, shadow} from '../lib/theme';

// Plans other people made public: open one to read it and keep a private copy.
// Only the plan is listed (no owner, progress or photos).
export default function PublicTrips() {
  const {t, i18n} = useTranslation();
  const navigation = useNavigation<any>();
  const query = usePublicTrips();
  const items = query.data?.pages.flatMap(page => page.items) ?? [];

  return (
    <View style={styles.container}>
      <BackPill onPress={() => navigation.goBack()} />
      <Text style={styles.title}>{t('trips.exploreTitle')}</Text>
      {query.isLoading ? (
        <ActivityIndicator
          size={30}
          color={colors.primary}
          style={styles.loading}
        />
      ) : query.isError && items.length === 0 ? (
        <ErrorText message={t('trips.exploreError')} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          data={items}
          keyExtractor={item => item._id}
          ListEmptyComponent={
            <EmptyState icon="compass-outline" text={t('trips.exploreEmpty')} />
          }
          renderItem={({item}) => (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.card}
              onPress={() =>
                navigation.navigate('PublicTripDetail', {id: item._id})
              }>
              <Text style={styles.name} numberOfLines={1}>
                {item.nameTrip ?? item.location}
              </Text>
              <View style={styles.row}>
                <Ionicons name="location" size={14} color={colors.primary} />
                <Text style={styles.meta}>{item.location}</Text>
              </View>
              <View style={styles.row}>
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={colors.muted}
                />
                <Text style={styles.meta}>
                  {`${formatDate(item.startDate, i18n.language)} - ${formatDate(
                    item.endDate,
                    i18n.language,
                  )}`}
                </Text>
              </View>
              <Text style={styles.meta}>
                {t('trips.exploreCost', {
                  amount: addCommas(
                    (item.transportCostTotal ?? 0) +
                      (item.foodCostTotal ?? 0) +
                      (item.otherCostTotal ?? 0),
                  ),
                })}
              </Text>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            query.hasNextPage ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.more}
                disabled={query.isFetchingNextPage}
                onPress={() => query.fetchNextPage()}>
                <Text style={styles.moreText}>{t('trips.exploreMore')}</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.bg, paddingTop: 36},
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginVertical: 14,
  },
  loading: {marginTop: 40},
  list: {paddingHorizontal: 15, paddingBottom: 30, gap: 12},
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  name: {fontSize: 16, fontWeight: '700', color: colors.text},
  row: {flexDirection: 'row', alignItems: 'center', gap: 6},
  meta: {fontSize: 13, color: colors.muted},
  more: {alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20},
  moreText: {color: colors.primary, fontWeight: '700'},
});
