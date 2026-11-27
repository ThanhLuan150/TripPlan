import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useQueryClient} from '@tanstack/react-query';
import {
  BudgetCategoryKey,
  BudgetEstimate,
  MAX_TRAVELERS,
  SPENDING_LEVELS,
  SpendingLevel,
  TripDay,
  tripsApi,
} from '../../api';
import {queryKeys, useTripBudget} from '../../hooks/queries';
import {useApiMutation} from '../../hooks/useApiMutation';
import {alert} from '../../lib/alert';
import {addCommas} from '../../lib/money';
import {colors, radius} from '../../lib/theme';
import DropdownInput from '../DropdownInput';
import FieldError from '../FieldError';

// Error key for the number of people, or null when it is a whole number from 1 to MAX_TRAVELERS.
export const travelersErrorKey = (value: string): 'trips.budgetTravelersInvalid' | null => {
  const n = Number(value);
  return value.trim() !== '' && Number.isInteger(n) && n >= 1 && n <= MAX_TRAVELERS
    ? null
    : 'trips.budgetTravelersInvalid';
};

// Error key for an amount typed by the user, or null when it is a number >= 0.
export const amountErrorKey = (value: string): 'trips.budgetAmountInvalid' | null => {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) && n >= 0 ? null : 'trips.budgetAmountInvalid';
};

const CATEGORY_KEYS: Record<BudgetCategoryKey, string> = {
  accommodation: 'trips.budgetAccommodation',
  food: 'trips.budgetFood',
  transport: 'trips.budgetTransport',
  activities: 'trips.budgetActivities',
  other: 'trips.budgetOther',
};
const LEVEL_KEYS: Record<SpendingLevel, string> = {
  budget: 'trips.budgetLevelBudget',
  moderate: 'trips.budgetLevelModerate',
  premium: 'trips.budgetLevelPremium',
};

const status = (e: unknown) => (e as {response?: {status?: number}})?.response?.status;
const code = (e: unknown) => (e as {response?: {data?: {code?: string}}})?.response?.data?.code;

// Ask the AI for a budget estimate, view it by category, and adjust the amounts.
// Everything shown here is an ESTIMATE: it is never an expense and never changes the trip.
export default function BudgetEstimatePanel({tripId, days = []}: {tripId: string; days?: TripDay[]}) {
  const {t} = useTranslation();
  const qc = useQueryClient();
  const [travelers, setTravelers] = useState('1');
  const [level, setLevel] = useState<SpendingLevel>('moderate');
  const [levelOpen, setLevelOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  // amounts being edited (as typed), or null when not editing
  const [draft, setDraft] = useState<Record<string, string> | null>(null);

  const saved = useTripBudget(tripId);
  const estimate = saved.data ?? null;
  const store = (next: BudgetEstimate) => qc.setQueryData(queryKeys.tripBudget(tripId), next);

  const ask = useApiMutation(
    () => tripsApi.estimateBudget(tripId, {travelers: Number(travelers), spendingLevel: level}),
    {
      onSuccess: next => {
        store(next);
        setDraft(null);
        alert.success(t('trips.budgetEstimated'));
      },
      onError: e =>
        alert.error(
          t(
            code(e) === 'AI_INVALID_RESPONSE' || status(e) === 502
              ? 'trips.budgetInvalid'
              : code(e)?.startsWith('AI_')
                ? 'trips.budgetUnavailable'
                : status(e) === 400
                  ? 'trips.budgetNoItinerary'
                  : 'trips.budgetFailed',
          ),
        ),
    },
  );
  const update = useApiMutation(
    (amounts: {key: BudgetCategoryKey; amount: number}[]) =>
      tripsApi.updateBudgetEstimate(tripId, amounts),
    {
      onSuccess: next => {
        store(next);
        setDraft(null);
        alert.success(t('trips.budgetUpdated'));
      },
      onError: () => alert.error(t('trips.budgetUpdateFailed')),
    },
  );

  // costs suggested when the trip was planned (per person, not actual spending)
  const planned = days.reduce(
    (sum, d) => sum + (d.transportCost ?? 0) + (d.foodCost ?? 0) + (d.otherCost ?? 0),
    0,
  );
  const travelersError = touched ? travelersErrorKey(travelers) : null;
  const submit = () => {
    setTouched(true);
    if (!travelersErrorKey(travelers) && !ask.isPending) {
      ask.mutate();
    }
  };

  const draftValid = draft !== null && Object.values(draft).every(v => !amountErrorKey(v));
  const draftTotal = draft
    ? Object.values(draft).reduce((sum, v) => sum + (amountErrorKey(v) ? 0 : Math.round(Number(v))), 0)
    : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('trips.budgetTitle')}</Text>
        <Text style={styles.badge}>{t('trips.budgetBadge')}</Text>
      </View>
      <Text style={styles.hint}>{t('trips.budgetNotExpense')}</Text>
      {planned > 0 && (
        <Text style={styles.hint}>{t('trips.budgetPlanned', {amount: addCommas(planned)})}</Text>
      )}

      <Text style={styles.label}>{t('trips.budgetTravelers')}</Text>
      <TextInput
        value={travelers}
        onChangeText={setTravelers}
        keyboardType="number-pad"
        accessibilityLabel={t('trips.budgetTravelers')}
        style={[styles.input, !!travelersError && styles.invalid]}
      />
      <FieldError
        message={travelersError ? t(travelersError, {max: MAX_TRAVELERS}) : false}
      />

      <Text style={styles.label}>{t('trips.budgetLevel')}</Text>
      <DropdownInput
        icon="cash-outline"
        value={t(LEVEL_KEYS[level])}
        placeholder={t('trips.budgetLevel')}
        editable={false}
        open={levelOpen}
        options={SPENDING_LEVELS.map(v => t(LEVEL_KEYS[v]))}
        onToggle={() => setLevelOpen(o => !o)}
        onPick={label => {
          setLevel(SPENDING_LEVELS.find(v => t(LEVEL_KEYS[v]) === label) ?? 'moderate');
          setLevelOpen(false);
        }}
      />

      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={estimate ? t('trips.budgetReestimate') : t('trips.budgetEstimate')}
          disabled={ask.isPending}
          style={[styles.button, ask.isPending && styles.disabled]}
          onPress={submit}>
          <Text style={styles.buttonText}>
            {estimate ? t('trips.budgetReestimate') : t('trips.budgetEstimate')}
          </Text>
        </TouchableOpacity>
      </View>

      {ask.isPending && <Text style={styles.hint}>{t('trips.budgetLoading')}</Text>}
      {saved.isError && <Text style={styles.error}>{t('trips.budgetLoadFailed')}</Text>}
      {!saved.isLoading && !saved.isError && !estimate && (
        <Text style={styles.hint}>{t('trips.budgetEmpty')}</Text>
      )}

      {estimate && (
        <View style={styles.result}>
          <Text style={styles.hint}>
            {t('trips.budgetForPeople', {
              count: estimate.travelers,
              level: t(LEVEL_KEYS[estimate.spendingLevel]),
            })}
            {estimate.source === 'manual' && ` · ${t('trips.budgetEdited')}`}
          </Text>
          {estimate.categories.map(c => (
            <View key={c.key} style={styles.row}>
              <View style={styles.rowName}>
                <Text style={styles.category}>{t(CATEGORY_KEYS[c.key])}</Text>
                {!!c.note && <Text style={styles.note}>{c.note}</Text>}
              </View>
              {draft ? (
                <View style={styles.amountBox}>
                  <TextInput
                    value={draft[c.key]}
                    onChangeText={v => setDraft({...draft, [c.key]: v})}
                    keyboardType="number-pad"
                    accessibilityLabel={t(CATEGORY_KEYS[c.key])}
                    style={[styles.input, styles.amountInput, !!amountErrorKey(draft[c.key]) && styles.invalid]}
                  />
                  <FieldError
                    message={amountErrorKey(draft[c.key]) ? t('trips.budgetAmountInvalid') : false}
                  />
                </View>
              ) : (
                <Text style={styles.amount}>
                  {addCommas(c.amount)} {estimate.currency}
                </Text>
              )}
            </View>
          ))}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.category}>{t('trips.budgetTotal')}</Text>
            <Text style={styles.amount}>
              {addCommas(draft ? draftTotal : estimate.total)} {estimate.currency}
            </Text>
          </View>

          <Text style={styles.sub}>{t('trips.budgetAssumptions')}</Text>
          {estimate.assumptions.map((a, i) => (
            <Text key={i} style={styles.note}>
              • {a}
            </Text>
          ))}

          <View style={styles.actions}>
            {draft ? (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('trips.budgetCancel')}
                  disabled={update.isPending}
                  style={[styles.button, styles.cancel]}
                  onPress={() => setDraft(null)}>
                  <Text style={styles.cancelText}>{t('trips.budgetCancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t('trips.budgetSave')}
                  disabled={!draftValid || update.isPending}
                  style={[styles.button, (!draftValid || update.isPending) && styles.disabled]}
                  onPress={() =>
                    draftValid &&
                    update.mutate(
                      estimate.categories.map(c => ({key: c.key, amount: Math.round(Number(draft[c.key]))})),
                    )
                  }>
                  <Text style={styles.buttonText}>{t('trips.budgetSave')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('trips.budgetEdit')}
                style={[styles.button, styles.cancel]}
                onPress={() =>
                  setDraft(Object.fromEntries(estimate.categories.map(c => [c.key, String(c.amount)])))
                }>
                <Text style={styles.cancelText}>{t('trips.budgetEdit')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  title: {fontSize: 16, fontWeight: '700', color: colors.text},
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  hint: {fontSize: 12, color: colors.muted, marginBottom: 8, marginTop: 2},
  error: {fontSize: 12, color: colors.error, marginTop: 4},
  label: {fontSize: 13, color: colors.body, marginTop: 6, marginBottom: 4},
  input: {
    padding: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  invalid: {borderColor: colors.error},
  levels: {flexDirection: 'row', gap: 8},
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  chipOn: {backgroundColor: colors.primary},
  chipText: {color: colors.body, fontWeight: '600'},
  chipTextOn: {color: '#fff'},
  actions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8},
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  buttonText: {color: '#fff', fontWeight: '600'},
  cancel: {backgroundColor: colors.surface},
  cancelText: {color: colors.body, fontWeight: '600'},
  disabled: {opacity: 0.6},
  result: {marginTop: 12, padding: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6, gap: 8},
  rowName: {flex: 1},
  category: {fontWeight: '600', color: colors.text},
  note: {fontSize: 12, color: colors.muted},
  amount: {fontWeight: '600', color: colors.text},
  amountBox: {width: 140},
  amountInput: {textAlign: 'right', padding: 6},
  totalRow: {borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4},
  sub: {fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 2},
});
