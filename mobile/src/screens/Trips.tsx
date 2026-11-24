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
import {useNavigation} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {Trip, tripsApi} from '../api';
import EmptyState from '../components/EmptyState';
import TripItem from '../components/TripItem';
import {queryKeys, useTrips} from '../hooks/queries';
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
  const list = trips.data ?? [];

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
      {list.length > 0 && (
        <View style={styles.created}>
          <Text style={styles.createdText}>{t('trips.created')}</Text>
          <TouchableOpacity onPress={() => trips.refetch()}>
            <Text style={styles.refresh}>{t('common.refresh')}</Text>
          </TouchableOpacity>
        </View>
      )}
      {trips.isLoading ? (
        <ActivityIndicator
          size={30}
          color={colors.primary}
          style={styles.loading}
        />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          data={list}
          ListEmptyComponent={
            <EmptyState icon="map-outline" text={t('trips.empty')} />
          }
          keyExtractor={(item, i) => item.nameTrip + i}
          renderItem={({item}) => (
            <TripItem
              trip={item}
              onOpen={() => navigation.navigate('TripDetail', {id: item._id})}
              onDelete={() => askDelete(item)}
              onDuplicate={() => duplicate.mutate(item._id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  createdText: {color: colors.text, fontWeight: '800', fontSize: 16},
  refresh: {color: colors.primary, fontWeight: '700'},
  loading: {marginTop: 30},
  list: {flex: 1, paddingHorizontal: 16},
  listContent: {paddingBottom: 110},
});
