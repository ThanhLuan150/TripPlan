import {useMemo, useState} from 'react';
import {useFormik} from 'formik';
import {useTranslation} from 'react-i18next';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {GenerateParams} from '../api';
import {BackPill} from '../components';
import FieldSection from '../components/FieldSection';
import AreaTypeGrid from '../components/AreaTypeGrid';
import DateRangeField from '../components/DateRangeField';
import DraftBanner from '../components/DraftBanner';
import DropdownInput from '../components/DropdownInput';
import {useDraft} from '../hooks/useDraft';
import {DraftNames} from '../lib/drafts';
import QuantityInput from '../components/QuantityInput';
import {provices} from '../lib/provinces';
import {money, stripTones} from '../lib/text';
import {colors} from '../lib/theme';
import {countDays, createTripSchema} from '../lib/validation';

const DAY_MS = 24 * 60 * 60 * 1000;
const tiers = ['low', 'mid', 'high'] as const;

// Step 1 of a new plan: place, dates, people, budget and the kinds of places -> AI suggestions.
export default function CreateTrip() {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const prefill = (useRoute<any>().params ?? {}) as {
    location?: string;
    days?: number;
    people?: number;
    note?: string;
    fromSuggestion?: boolean;
  };

  const [provinceOpen, setProvinceOpen] = useState(
    !!prefill.location && !provices.includes(prefill.location),
  );
  const [budgetOpen, setBudgetOpen] = useState(false);

  const formik = useFormik({
    initialValues: {
      location: prefill.location ?? '',
      startDate: new Date(),
      endDate: new Date(
        Date.now() + Math.max(0, (prefill.days ?? 1) - 1) * DAY_MS,
      ),
      quantity: prefill.people ?? 1,
      budget: '',
      areaTypes: [] as string[],
    },
    validationSchema: createTripSchema,
    onSubmit: (values, helpers) => {
      const budgetIndex = budgets.indexOf(values.budget);
      // the budget was chosen for another number of people
      if (budgetIndex < 0) {
        return helpers.setFieldError('budget', 'trips.create.errorMissing');
      }
      const params: GenerateParams = {
        location: values.location,
        quantity: values.quantity,
        budget: budgetValues[budgetIndex],
        budgetTier: tiers[budgetIndex],
        areaTypes: values.areaTypes,
        days: countDays(values.startDate, values.endDate),
        startDate: values.startDate.toISOString(),
        endDate: values.endDate.toISOString(),
        note: prefill.note,
      };
      navigation.navigate('GenerateTrips', {params});
    },
  });
  const {location, startDate, endDate, quantity, budget, areaTypes} =
    formik.values;
  const setField = formik.setFieldValue;

  // the form is kept as a draft while the user fills it (not when it was opened already filled)
  const filled =
    !!location || !!budget || areaTypes.length > 0 || quantity !== 1;
  const draft = useDraft(
    DraftNames.createTrip,
    {location, startDate, endDate, quantity, budget, areaTypes},
    !filled,
    Object.keys(prefill).length === 0,
  );
  // a draft from days ago may start in the past: keep its length, start today
  const resumeDraft = () => {
    const saved = draft.resume();
    if (saved) {
      const start = new Date(saved.startDate);
      const end = new Date(saved.endDate);
      const length = Math.max(0, end.getTime() - start.getTime());
      const today = new Date();
      const from = start < today ? today : start;
      formik.setValues({
        ...saved,
        startDate: from,
        endDate: new Date(from.getTime() + length),
      });
    }
  };

  const provinces = useMemo(() => {
    const q = stripTones(location);
    return provices.filter(p => stripTones(p).includes(q));
  }, [location]);
  const budgets = [
    t('trips.create.budgetUnder', {max: money(1000000 * quantity)}),
    t('trips.create.budgetRange', {
      min: money(1000000 * quantity),
      max: money(5000000 * quantity),
    }),
    t('trips.create.budgetRange', {
      min: money(5000000 * quantity),
      max: money(15000000 * quantity),
    }),
  ];
  // the text sent to the AI is always Vietnamese
  const budgetValues = [
    `Dưới ${money(1000000 * quantity)} VND`,
    `${money(1000000 * quantity)} VND - ${money(5000000 * quantity)} VND`,
    `${money(5000000 * quantity)} VND - ${money(15000000 * quantity)} VND`,
  ];

  const reset = () => {
    formik.resetForm({
      values: {
        location: '',
        startDate: new Date(),
        endDate: new Date(),
        quantity: 1,
        budget: '',
        areaTypes: [],
      },
    });
  };

  // an error shows once its field was touched, or when the form is submitted
  const shown = (field: 'location' | 'budget' | 'quantity' | 'areaTypes') => {
    const message = formik.touched[field] ? formik.errors[field] : undefined;
    return message ? t(message as string) : undefined;
  };
  // a date shows its error as soon as it is changed
  const dateError = (field: 'startDate' | 'endDate') => {
    const message = formik.errors[field];
    return message ? t(message as string) : undefined;
  };
  const touch = (field: 'location' | 'budget') =>
    formik.setFieldTouched(field, true);

  const header = (
    <>
      <Text style={styles.header}>{t('trips.create.title')}</Text>
      <TouchableOpacity
        accessibilityRole="link"
        style={styles.askAi}
        onPress={() => navigation.navigate('Recommend')}>
        <Text style={styles.askAiText}>{t('trips.create.askAi')}</Text>
      </TouchableOpacity>
      {draft.pending && (
        <View style={styles.banner}>
          <DraftBanner
            savedAt={draft.pending.savedAt}
            onContinue={resumeDraft}
            onDiscard={draft.discard}
          />
        </View>
      )}
      {prefill.fromSuggestion && (
        <Text style={styles.fromSuggestion}>
          {t('trips.create.fromSuggestion')}
          {!prefill.location && ` ${t('trips.create.fromChatNoPlace')}`}
        </Text>
      )}
      <FieldSection
        icon="location-outline"
        title={t('trips.create.destination')}
        error={shown('location')}>
        <DropdownInput
          icon="search-outline"
          value={location}
          placeholder={t('trips.create.destinationPlaceholder')}
          open={provinceOpen}
          invalid={!!shown('location')}
          options={provinceOpen ? provinces.slice(0, 6) : []}
          onChangeText={text => setField('location', text)}
          onBlur={() => touch('location')}
          onToggle={() => setProvinceOpen(o => !o)}
          onPick={p => {
            setField('location', p);
            setProvinceOpen(false);
          }}
        />
      </FieldSection>
      <FieldSection
        icon="calendar-outline"
        title={t('trips.create.dates')}
        hint={t('trips.create.daysHint', {
          count: countDays(startDate, endDate),
        })}
        error={dateError('startDate') ?? dateError('endDate')}>
        <DateRangeField
          startDate={startDate}
          endDate={endDate}
          startInvalid={!!dateError('startDate')}
          endInvalid={!!dateError('endDate')}
          onStart={date =>
            formik.setValues({
              ...formik.values,
              startDate: date,
              endDate: endDate < date ? date : endDate,
            })
          }
          onEnd={date => setField('endDate', date)}
        />
      </FieldSection>
      <FieldSection
        icon="people-outline"
        title={t('trips.create.people')}
        hint={t('trips.create.peopleHint')}
        error={shown('quantity')}>
        <QuantityInput
          value={quantity}
          invalid={!!shown('quantity')}
          onChange={value => setField('quantity', value)}
        />
      </FieldSection>
      <FieldSection
        icon="wallet-outline"
        title={t('trips.create.budget')}
        error={shown('budget')}>
        <DropdownInput
          icon="cash-outline"
          value={budget}
          placeholder={t('trips.budgetPlaceholder')}
          editable={false}
          open={budgetOpen}
          invalid={!!shown('budget')}
          options={budgets}
          onBlur={() => touch('budget')}
          onToggle={() => setBudgetOpen(o => !o)}
          onPick={b => {
            setField('budget', b);
            setBudgetOpen(false);
          }}
        />
      </FieldSection>
      <FieldSection
        icon="heart-outline"
        title={t('trips.create.interests')}
        error={shown('areaTypes')}
      />
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
            renderItem={() => (
              <AreaTypeGrid
                selected={areaTypes}
                invalid={!!shown('areaTypes')}
                onToggle={v => {
                  setField(
                    'areaTypes',
                    areaTypes.includes(v)
                      ? areaTypes.filter(x => x !== v)
                      : [...areaTypes, v],
                  );
                  formik.setFieldTouched('areaTypes', true, false);
                }}
              />
            )}
            ListFooterComponent={
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.send, styles.sendOutline]}
                  onPress={reset}>
                  <Text style={[styles.sendText, styles.sendOutlineText]}>
                    {t('trips.reset')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.send}
                  onPress={() => formik.handleSubmit()}>
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
  container: {
    borderRadius: 24,
    borderColor: '#B8EFEA',
    margin: 14,
    marginTop: 52,
    borderWidth: 1.5,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryDark,
    alignSelf: 'center',
    marginBottom: 16,
  },
  askAi: {alignSelf: 'center', marginBottom: 12},
  askAiText: {color: colors.primaryDark, fontWeight: '700'},
  banner: {marginBottom: 12},
  fromSuggestion: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.tint,
    color: colors.primaryDeep,
    fontSize: 13,
  },
  footer: {flexDirection: 'row', justifyContent: 'space-evenly'},
  send: {
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 14,
    width: '44%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  sendOutline: {backgroundColor: '#fff'},
  sendText: {fontSize: 16, color: '#fff', fontWeight: '700'},
  sendOutlineText: {color: colors.primary},
});
