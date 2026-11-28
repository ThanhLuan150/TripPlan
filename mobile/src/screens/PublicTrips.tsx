import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import EmptyState from '../components/EmptyState';
import LikeButton from '../components/LikeButton';
import SaveButton from '../components/SaveButton';
import ErrorText from '../components/ErrorText';
import {usePublicTrips} from '../hooks/queries';
import {formatDate} from '../lib/date';
import {addCommas} from '../lib/money';
import {colors, radius, shadow} from '../lib/theme';

// the backend rejects a longer keyword
export const MAX_SEARCH_LENGTH = 100;
// wait for the user to stop typing before asking the server
const SEARCH_DELAY_MS = 350;

// The Explore tab: plans other people made public. Search them, open one to read it, like it and keep
// a private copy. Only the plan is listed (no owner, progress or photos).
export default function PublicTrips() {
  const {t, i18n} = useTranslation();
  const navigation = useNavigation<any>();
  // what is typed, and the keyword being searched (typing searches after a short pause)
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const query = usePublicTrips(q);
  const items = query.data?.pages.flatMap(page => page.items) ?? [];
  const total = query.data?.pages[0]?.total ?? 0;
  const searching = q !== '';

  useEffect(() => {
    const next = text.trim();
    if (next === q) {
      return;
    }
    const timer = setTimeout(() => setQ(next), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, q]);

  const clear = () => {
    setText('');
    setQ('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('trips.exploreTitle')}</Text>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.faint} />
        <TextInput
          accessibilityLabel={t('trips.searchLabel')}
          placeholder={t('trips.searchPlaceholder')}
          placeholderTextColor={colors.faint}
          value={text}
          maxLength={MAX_SEARCH_LENGTH}
          returnKeyType="search"
          autoCorrect={false}
          style={styles.searchInput}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
        />
        {text !== '' && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('trips.searchClear')}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            onPress={clear}>
            <Ionicons name="close-circle" size={20} color={colors.faint} />
          </TouchableOpacity>
        )}
      </View>
      {searching && items.length > 0 && (
        <Text style={styles.results}>
          {t('trips.searchResults', {q, count: total})}
        </Text>
      )}
      {query.isLoading ? (
        <ActivityIndicator
          size={30}
          color={colors.primary}
          style={styles.loading}
        />
      ) : query.isError && items.length === 0 ? (
        <ErrorText
          message={t(searching ? 'trips.searchFailed' : 'trips.exploreError')}
        />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          data={items}
          keyExtractor={item => item._id}
          ListEmptyComponent={
            searching ? (
              <View>
                <EmptyState
                  icon="search-outline"
                  text={t('trips.searchEmpty', {q})}
                />
                <Text style={styles.hint}>{t('trips.searchEmptyHint')}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('trips.searchClear')}
                  style={styles.more}
                  onPress={clear}>
                  <Text style={styles.moreText}>{t('trips.searchClear')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <EmptyState icon="compass-outline" text={t('trips.exploreEmpty')} />
            )
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
                {!!item.postContent && (
                  <Text style={styles.intro} numberOfLines={2}>
                    {item.postContent}
                  </Text>
                )}
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
                <LikeButton
                  tripId={item._id}
                  liked={item.liked}
                  likesCount={item.likesCount}
                />
                <SaveButton tripId={item._id} saved={item.saved} />
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 15,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  searchInput: {flex: 1, color: colors.text, paddingVertical: 0},
  results: {
    marginHorizontal: 15,
    marginBottom: 6,
    color: colors.body,
    fontSize: 13,
  },
  hint: {color: colors.faint, fontSize: 12, textAlign: 'center'},
  intro: {fontSize: 13, color: colors.body},
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {fontSize: 16, fontWeight: '700', color: colors.text},
  row: {flexDirection: 'row', alignItems: 'center', gap: 6},
  meta: {fontSize: 13, color: colors.muted},
  more: {alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 20},
  moreText: {color: colors.primary, fontWeight: '700'},
});
