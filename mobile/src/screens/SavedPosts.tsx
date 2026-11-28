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
import SaveButton from '../components/SaveButton';
import {useSavedPosts} from '../hooks/queries';
import {formatDate} from '../lib/date';
import {addCommas} from '../lib/money';
import {colors, radius, shadow} from '../lib/theme';

// The user's own saved posts. The list is private (the server only ever answers with the
// caller's own) and leaves out posts that were deleted or are no longer public.
export default function SavedPosts() {
  const {t, i18n} = useTranslation();
  const navigation = useNavigation<any>();
  const query = useSavedPosts();
  const items = query.data?.pages.flatMap(page => page.items) ?? [];

  return (
    <View style={styles.container}>
      <BackPill onPress={() => navigation.goBack()} />
      <Text style={styles.title}>{t('trips.savedTitle')}</Text>
      <Text style={styles.subtitle}>{t('trips.savedSubtitle')}</Text>
      {query.isLoading ? (
        <ActivityIndicator
          size={30}
          color={colors.primary}
          style={styles.loading}
        />
      ) : query.isError && items.length === 0 ? (
        <ErrorText message={t('trips.savedError')} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          data={items}
          keyExtractor={item => item._id}
          ListEmptyComponent={
            <View>
              <EmptyState
                icon="bookmark-outline"
                text={t('trips.savedEmpty')}
              />
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.more}
                onPress={() => navigation.navigate('Tabs', {screen: 'Explore'})}>
                <Text style={styles.moreText}>{t('trips.savedExplore')}</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({item}) => (
            <View style={styles.card}>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.cardBody}
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
                    {`${formatDate(
                      item.startDate,
                      i18n.language,
                    )} - ${formatDate(item.endDate, i18n.language)}`}
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
              <View style={styles.actions}>
                <SaveButton tripId={item._id} saved />
              </View>
            </View>
          )}
          ListFooterComponent={
            query.hasNextPage ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.more}
                disabled={query.isFetchingNextPage}
                onPress={() => query.fetchNextPage()}>
                <Text style={styles.moreText}>{t('trips.savedMore')}</Text>
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
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginHorizontal: 24,
    marginTop: 4,
    marginBottom: 10,
  },
  loading: {marginTop: 40},
  list: {paddingHorizontal: 15, paddingBottom: 110, gap: 12},
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  cardBody: {gap: 4},
  name: {fontSize: 16, fontWeight: '700', color: colors.text},
  row: {flexDirection: 'row', alignItems: 'center', gap: 6},
  meta: {fontSize: 13, color: colors.muted},
  actions: {flexDirection: 'row', justifyContent: 'flex-end'},
  more: {alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20},
  moreText: {color: colors.primary, fontWeight: '700'},
});
