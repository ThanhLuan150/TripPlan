import {useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FlatList, Keyboard, KeyboardAvoidingView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {GenerateParams} from '../api';
import {BackPill} from '../components';
import AreaTypeGrid from '../components/AreaTypeGrid';
import DateRangeField from '../components/DateRangeField';
import DropdownInput from '../components/DropdownInput';
import QuantityInput from '../components/QuantityInput';
import {alert} from '../lib/alert';
import {provices} from '../lib/provinces';
import {money, stripTones} from '../lib/text';
import {colors} from '../lib/theme';

const DAY_MS = 24 * 60 * 60 * 1000;
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const tiers = ['low', 'mid', 'high'] as const;

// Step 1 of a new plan: place, dates, people, budget and the kinds of places -> AI suggestions.
export default function CreateTrip() {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const prefill = (useRoute<any>().params ?? {}) as {location?: string; days?: number; people?: number; note?: string};

  const [location, setLocation] = useState(prefill.location ?? '');
  const [provinceOpen, setProvinceOpen] = useState(!!prefill.location && !provices.includes(prefill.location));
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + Math.max(0, (prefill.days ?? 1) - 1) * DAY_MS));
  const [quantity, setQuantity] = useState(prefill.people ?? 1);
  const [budget, setBudget] = useState('');
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [areaTypes, setAreaTypes] = useState<string[]>([]);

  const provinces = useMemo(() => {
    const q = stripTones(location);
    return provices.filter(p => stripTones(p).includes(q));
  }, [location]);
  const budgets = [
    t('trips.create.budgetUnder', {max: money(1000000 * quantity)}),
    t('trips.create.budgetRange', {min: money(1000000 * quantity), max: money(5000000 * quantity)}),
    t('trips.create.budgetRange', {min: money(5000000 * quantity), max: money(15000000 * quantity)}),
  ];
  // the text sent to the AI is always Vietnamese
  const budgetValues = [
    `Dưới ${money(1000000 * quantity)} VND`,
    `${money(1000000 * quantity)} VND - ${money(5000000 * quantity)} VND`,
    `${money(5000000 * quantity)} VND - ${money(15000000 * quantity)} VND`,
  ];

  const fail = (text: string) => alert.error(t('common.failed'), text);

  const reset = () => {
    setLocation('');
    setStartDate(new Date());
    setEndDate(new Date());
    setQuantity(1);
    setBudget('');
    setAreaTypes([]);
  };

  const next = () => {
    const days = Math.round((dayStart(endDate) - dayStart(startDate)) / DAY_MS) + 1;
    const budgetIndex = budgets.indexOf(budget);
    if (days > 7) return fail(t('trips.create.errorMaxDays'));
    if (!provices.includes(location)) return fail(t('trips.create.errorProvince'));
    if (budgetIndex < 0) return fail(t('trips.create.errorMissing'));
    const params: GenerateParams = {
      location,
      quantity,
      budget: budgetValues[budgetIndex],
      budgetTier: tiers[budgetIndex],
      areaTypes,
      days,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      note: prefill.note,
    };
    navigation.navigate('GenerateTrips', {params});
  };

  const header = (
    <>
      <Text style={styles.header}>{t('trips.create.title')}</Text>
      <Text style={styles.subheader}>{t('trips.create.destination')}</Text>
      <DropdownInput
        value={location}
        placeholder={t('trips.create.destinationPlaceholder')}
        open={provinceOpen}
        options={provinceOpen ? provinces.slice(0, 6) : []}
        onChangeText={setLocation}
        onToggle={() => setProvinceOpen(o => !o)}
        onPick={p => {
          setLocation(p);
          setProvinceOpen(false);
        }}
      />
      <DateRangeField startDate={startDate} endDate={endDate} onStart={setStartDate} onEnd={setEndDate} />
      <View style={styles.row}>
        <Text style={styles.subheader}>{t('trips.create.people')} </Text>
        <Text style={styles.hint}>{t('trips.create.peopleHint')}</Text>
      </View>
      <QuantityInput value={quantity} onChange={setQuantity} />
      <Text style={styles.subheader}>{t('trips.create.budget')}</Text>
      <DropdownInput
        value={budget}
        placeholder={t('trips.budgetPlaceholder')}
        editable={false}
        open={budgetOpen}
        options={budgets}
        onToggle={() => setBudgetOpen(o => !o)}
        onPick={b => {
          setBudget(b);
          setBudgetOpen(false);
        }}
      />
      <Text style={styles.subheader}>{t('trips.create.interests')}</Text>
    </>
  );

  return (
    <KeyboardAvoidingView style={styles.flex}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.flex}>
          <BackPill onPress={() => navigation.goBack()} />
          <FlatList
            contentContainerStyle={styles.container}
            ListHeaderComponent={header}
            data={[1]}
            keyExtractor={String}
            renderItem={() => <AreaTypeGrid selected={areaTypes} onToggle={v => setAreaTypes(p => (p.includes(v) ? p.filter(x => x !== v) : [...p, v]))} />}
            ListFooterComponent={
              <View style={styles.footer}>
                <TouchableOpacity style={[styles.send, styles.sendOutline]} onPress={reset}>
                  <Text style={[styles.sendText, styles.sendOutlineText]}>{t('trips.reset')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.send} onPress={next}>
                  <Text style={styles.sendText}>{t('trips.next')}</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: '#fff'},
  container: {borderRadius: 24, borderColor: '#B8EFEA', margin: 14, marginTop: 52, borderWidth: 1.5, padding: 20, backgroundColor: '#fff'},
  header: {fontSize: 22, fontWeight: '800', color: colors.primaryDark, alignSelf: 'center', marginBottom: 16},
  subheader: {fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 6, marginTop: 12},
  hint: {fontSize: 15, color: '#000', marginTop: 6},
  row: {flexDirection: 'row'},
  footer: {flexDirection: 'row', justifyContent: 'space-evenly'},
  send: {backgroundColor: colors.primary, paddingVertical: 13, borderRadius: 14, width: '44%', justifyContent: 'center', alignItems: 'center', marginTop: 18, borderWidth: 1.5, borderColor: colors.primary},
  sendOutline: {backgroundColor: '#fff'},
  sendText: {fontSize: 16, color: '#fff', fontWeight: '700'},
  sendOutlineText: {color: colors.primary},
});
