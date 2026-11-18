import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FlatList, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {GenerateParams, PlanDay, tripsApi} from '../api';
import {BackPill} from '../components';
import {GenerateError, PleaseWait} from '../components/GenerateStatus';
import NameDialog from '../components/NameDialog';
import PlanCard from '../components/PlanCard';
import {queryKeys, useGeneratedPlans} from '../hooks/queries';
import {useApiMutation} from '../hooks/useApiMutation';
import {alert} from '../lib/alert';
import {apiMessage} from '../lib/apiClient';

// Step 2: the AI's suggested plans; pick one, name it, save it.
export default function GenerateTrips() {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const {params} = useRoute<any>().params as {params: GenerateParams};
  const [chosen, setChosen] = useState<PlanDay[] | null>(null);
  const [name, setName] = useState('');
  const qc = useQueryClient();
  const plans = useGeneratedPlans(params);

  const save = useApiMutation((days: PlanDay[]) => tripsApi.save(params, name.trim(), days), {
    onSuccess: async data => {
      // the new plan must appear in the "Kế hoạch" list right away
      await qc.invalidateQueries({queryKey: queryKeys.trips});
      setName('');
      navigation.replace('TripDetail', {id: data.tripId});
    },
    onError: e =>
      alert.error(t('common.failed'), apiMessage(e) === 'A trip with the same name already exists' ? t('trips.generate.duplicateName') : t('trips.generate.saveFailed')),
  });

  const confirm = () => {
    if (!name.trim()) return alert.error(t('common.failed'), t('trips.generate.nameRequired'));
    if (chosen) save.mutate(chosen);
    setChosen(null);
  };

  if (plans.isFetching || save.isPending) return <PleaseWait />;

  return (
    <View style={styles.container}>
      <BackPill onPress={() => navigation.goBack()} />
      {plans.isError || !plans.data ? (
        <GenerateError overlap={!!apiMessage(plans.error)?.startsWith('Please choose another day')} onRetry={() => plans.refetch()} />
      ) : (
        <FlatList
          style={styles.list}
          data={Object.values(plans.data)}
          keyExtractor={(_, i) => String(i)}
          renderItem={({item, index}) => <PlanCard plan={item} number={index + 1} location={params.location} onChoose={() => setChosen(Object.values(item))} />}
          ListFooterComponent={<View style={styles.footer} />}
        />
      )}
      <NameDialog
        visible={chosen !== null}
        value={name}
        onChange={setName}
        onCancel={() => {
          setChosen(null);
          setName('');
        }}
        onConfirm={confirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff', width: '100%'},
  list: {width: '100%', paddingTop: 50},
  footer: {height: 20},
});
