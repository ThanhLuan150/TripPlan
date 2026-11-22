import {useState} from 'react';
import {useFormik} from 'formik';
import {useTranslation} from 'react-i18next';
import {FlatList, StyleSheet, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {GenerateParams, PlanDay, tripsApi} from '../api';
import {BackPill} from '../components';
import {GenerateError, PleaseWait} from '../components/GenerateStatus';
import NameDialog from '../components/NameDialog';
import {planNameSchema} from '../lib/validation';
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
  const qc = useQueryClient();
  const plans = useGeneratedPlans(params);

  const save = useApiMutation(
    (days: PlanDay[]) =>
      tripsApi.save(params, nameForm.values.name.trim(), days),
    {
      onSuccess: async data => {
        // the new plan must appear in the "Kế hoạch" list right away
        await qc.invalidateQueries({queryKey: queryKeys.trips});
        nameForm.resetForm();
        navigation.replace('TripDetail', {id: data.tripId});
      },
      onError: e =>
        alert.error(
          t('common.failed'),
          apiMessage(e) === 'A trip with the same name already exists'
            ? t('trips.generate.duplicateName')
            : t('trips.generate.saveFailed'),
        ),
    },
  );

  // the name asked before the plan is saved
  const nameForm = useFormik({
    initialValues: {name: ''},
    validationSchema: planNameSchema,
    onSubmit: () => {
      if (chosen) {save.mutate(chosen);}
      setChosen(null);
    },
  });
  const nameError =
    nameForm.touched.name && nameForm.errors.name
      ? t(nameForm.errors.name)
      : undefined;

  if (plans.isFetching || save.isPending) {return <PleaseWait />;}

  return (
    <View style={styles.container}>
      <BackPill onPress={() => navigation.goBack()} />
      {plans.isError || !plans.data ? (
        <GenerateError
          overlap={
            !!apiMessage(plans.error)?.startsWith('Please choose another day')
          }
          onRetry={() => plans.refetch()}
        />
      ) : (
        <FlatList
          style={styles.list}
          data={Object.values(plans.data)}
          keyExtractor={(_, i) => String(i)}
          renderItem={({item, index}) => (
            <PlanCard
              plan={item}
              number={index + 1}
              location={params.location}
              onChoose={() => setChosen(Object.values(item))}
            />
          )}
          ListFooterComponent={<View style={styles.footer} />}
        />
      )}
      <NameDialog
        visible={chosen !== null}
        value={nameForm.values.name}
        error={nameError}
        onChange={nameForm.handleChange('name')}
        onCancel={() => {
          setChosen(null);
          nameForm.resetForm();
        }}
        onConfirm={() => nameForm.handleSubmit()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff', width: '100%'},
  list: {width: '100%', paddingTop: 50},
  footer: {height: 20},
});
