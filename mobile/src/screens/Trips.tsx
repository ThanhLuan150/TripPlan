import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {Trip, tripsApi} from '../api';
import EmptyState from '../components/EmptyState';
import ErrorText from '../components/ErrorText';
import TripItem from '../components/TripItem';
import {queryKeys, useFavoriteTrips, useTrips} from '../hooks/queries';
import {useApiMutation} from '../hooks/useApiMutation';
import {alert} from '../lib/alert';
import {errorText} from '../lib/apiClient';
import {colors} from '../lib/theme';

// "Kế hoạch" tab: the "add a plan" box and the plans already created.
export default function Trips() {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const trips = useTrips();
  const remove = useApiMutation(tripsApi.remove, {
    onSuccess: () => qc.invalidateQueries({queryKey: queryKeys.trips}),
  });
  const duplicate = useApiMutation(tripsApi.duplicate, {
    onSuccess: ({nameTrip}) => {
      qc.invalidateQueries({queryKey: queryKeys.trips});
      alert.success(t('trips.duplicateSuccess', {name: nameTrip}));
    },
    onError: error =>
      alert.error(t('trips.duplicateFailed'), errorText(error)),
  });
  const favorites = useFavoriteTrips();
  const [tab, setTab] = useState<'all' | 'favorites'>('all');
  const favoriteIds = new Set((favorites.data ?? []).map(item => item._id));
  // Heart: changes at once, goes back if the server refuses, reloaded afterwards.
  const toggleFavorite = useApiMutation(
    ({trip, favorite}: {trip: Trip; favorite: boolean}) =>
      favorite
        ? tripsApi.addFavorite(trip._id)
        : tripsApi.removeFavorite(trip._id),
    {
      onMutate: async ({trip, favorite}) => {
        await qc.cancelQueries({queryKey: queryKeys.favoriteTrips});
        const previous = qc.getQueryData<Trip[]>(queryKeys.favoriteTrips);
        if (previous) {
          const others = previous.filter(item => item._id !== trip._id);
          qc.setQueryData<Trip[]>(
            queryKeys.favoriteTrips,
            favorite ? [trip, ...others] : others,
          );
        }
        return {previous};
      },
      onError: (error, _vars, context) => {
        const previous = (context as {previous?: Trip[]} | undefined)?.previous;
        if (previous) {
          qc.setQueryData(queryKeys.favoriteTrips, previous);
        }
        alert.error(t('trips.favoriteFailed'), errorText(error));
      },
      onSettled: () =>
        qc.invalidateQueries({queryKey: queryKeys.favoriteTrips}),
    },
  );
  const showFavorites = tab === 'favorites';
  const source = showFavorites ? favorites : trips;
  const list = (source.data ?? []).filter(item => item.status !== 'delete');

  const askDelete = (trip: Trip) =>
    alert.confirm({
      title: t('trips.deleteConfirm', {name: trip.nameTrip}),
      confirmText: t('common.delete'),
      destructive: true,
      onConfirm: () => remove.mutate(trip._id),
    });

  return (
    <View style={styles.container}>
      <View style={styles.addNew}>
        <TouchableOpacity onPress={() => navigation.navigate('CreateTrip')}>
          <AntDesign name="pluscircle" size={47} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.addText}>{t('trips.addNew')}</Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('trips.exploreOpen')}
        style={styles.explore}
        onPress={() => navigation.navigate('PublicTrips')}>
        <Ionicons name="compass-outline" size={18} color={colors.primaryDark} />
        <Text style={styles.exploreText}>{t('trips.exploreOpen')}</Text>
      </TouchableOpacity>
      <View style={styles.tabs}>
        {(['all', 'favorites'] as const).map(key => (
          <TouchableOpacity
            key={key}
            accessibilityRole="tab"
            accessibilityState={{selected: tab === key}}
            style={[styles.tab, tab === key && styles.tabActive]}
            onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {t(key === 'all' ? 'trips.tabAll' : 'trips.tabFavorites')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {(list.length > 0 || (showFavorites && favorites.isError)) && (
        <View style={styles.created}>
          <Text style={styles.createdText}>{t('trips.created')}</Text>
          <TouchableOpacity onPress={() => source.refetch()}>
            <Text style={styles.refresh}>{t('common.refresh')}</Text>
          </TouchableOpacity>
        </View>
      )}
      {source.isLoading ? (
        <ActivityIndicator
          size={30}
          color={colors.primary}
          style={styles.loading}
        />
      ) : showFavorites && favorites.isError ? (
        <ErrorText message={t('trips.favoritesError')} />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          data={list}
          ListEmptyComponent={
            <EmptyState
              icon={showFavorites ? 'heart-outline' : 'map-outline'}
              text={t(showFavorites ? 'trips.favoritesEmpty' : 'trips.empty')}
            />
          }
          keyExtractor={(item, i) => item.nameTrip + i}
          renderItem={({item}) => (
            <TripItem
              trip={item}
              onOpen={() => navigation.navigate('TripDetail', {id: item._id})}
              onDelete={() => askDelete(item)}
              onDuplicate={() => duplicate.mutate(item._id)}
              favorite={favoriteIds.has(item._id)}
              onToggleFavorite={() =>
                toggleFavorite.mutate({
                  trip: item,
                  favorite: !favoriteIds.has(item._id),
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  explore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    marginHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.tint,
  },
  exploreText: {color: colors.primaryDark, fontWeight: '700', fontSize: 14},
  container: {flex: 1, backgroundColor: '#fff'},
  addNew: {
    marginTop: 16,
    marginHorizontal: 16,
    height: 104,
    borderRadius: 20,
    borderColor: colors.primaryLight,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addText: {color: colors.primaryDark, marginTop: 6, fontWeight: '700'},
  created: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 18,
  },
  tabs: {flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 16},
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.tint,
  },
  tabActive: {backgroundColor: colors.primary},
  tabText: {color: colors.primaryDark, fontWeight: '700'},
  tabTextActive: {color: '#fff'},
  createdText: {color: colors.text, fontWeight: '800', fontSize: 16},
  refresh: {color: colors.primary, fontWeight: '700'},
  loading: {marginTop: 30},
  list: {flex: 1, paddingHorizontal: 16},
  listContent: {paddingBottom: 110},
});
