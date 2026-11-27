import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useQueryClient} from '@tanstack/react-query';
import {AiEditDay, DayRegeneration, MAX_AI_EDIT_LENGTH, TripDay, tripsApi} from '../../api';
import {queryKeys} from '../../hooks/queries';
import {useApiMutation} from '../../hooks/useApiMutation';
import {alert} from '../../lib/alert';
import {colors, radius} from '../../lib/theme';
import DropdownInput from '../DropdownInput';
import FieldError from '../FieldError';

const norm = (name?: string) => (name ?? '').trim().toLowerCase();
const status = (e: unknown) => (e as {response?: {status?: number}})?.response?.status;
const code = (e: unknown) => (e as {response?: {data?: {code?: string}}})?.response?.data?.code;
const isNetwork = (e: unknown) => !!(e as {isAxiosError?: boolean})?.isAxiosError && !status(e);

// Why no proposal came back (the itinerary is untouched in every case)
const proposeErrorKey = (e: unknown) => {
  if (code(e) === 'AI_EMPTY_DAY') {return 'trips.dayRegenEmpty';}
  if (code(e) === 'AI_INVALID_RESPONSE' || status(e) === 502) {return 'trips.dayRegenInvalid';}
  if (code(e)?.startsWith('AI_')) {return 'trips.dayRegenUnavailable';}
  return isNetwork(e) ? 'common.networkError' : 'trips.dayRegenFailed';
};

function DayPreview({title, day, existing}: {title: string; day: AiEditDay; existing?: Set<string>}) {
  const {t} = useTranslation();
  return (
    <View style={styles.day}>
      <Text style={styles.dayLabel}>{title}</Text>
      <Text style={styles.dayTitle}>{day.title}</Text>
      {day.activities.map((a, i) => (
        <View key={i} style={styles.activity}>
          <Text style={styles.activityName}>
            • {a.name_location}
            {a.kept && ` (${t('trips.dayRegenKept')})`}
            {existing && !a.kept && !existing.has(norm(a.name_location)) && ` (${t('trips.dayRegenNew')})`}
          </Text>
        </View>
      ))}
    </View>
  );
}

// Ask the AI to rewrite ONE day, compare it with the current day, then Accept (saved) or Reject
// (dropped). Only that day is ever changed, and only by Accept.
export default function DayRegeneratePanel({tripId, days}: {tripId: string; days: TripDay[]}) {
  const {t} = useTranslation();
  const qc = useQueryClient();
  const options = days.filter(d => d._id);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [result, setResult] = useState<DayRegeneration | null>(null);
  const label = (d: TripDay) => `${days.indexOf(d) + 1}. ${d.title}`;
  const selected = options[Math.min(index, options.length - 1)];
  const tooLong = text.trim().length > MAX_AI_EDIT_LENGTH;

  const propose = useApiMutation(() => tripsApi.proposeDayRegeneration(tripId, selected._id!, text.trim() || undefined), {
    onSuccess: setResult,
    onError: e => alert.error(t(proposeErrorKey(e))),
  });
  const apply = useApiMutation((proposalId: string) => tripsApi.applyDayRegeneration(tripId, proposalId), {
    onSuccess: () => {
      setResult(null);
      setText('');
      qc.invalidateQueries({queryKey: queryKeys.trip(tripId)});
      qc.invalidateQueries({queryKey: queryKeys.trips});
      alert.success(t('trips.dayRegenApplied'));
    },
    onError: e =>
      alert.error(
        t(isNetwork(e) ? 'common.networkError' : status(e) === 404 || status(e) === 409 ? 'trips.dayRegenApplyInvalid' : 'trips.dayRegenApplyFailed'),
      ),
  });

  if (!selected) {return null;}
  const existing = new Set(selected.challenges.map(c => norm(c.nameLocation)));

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('trips.dayRegenTitle')}</Text>
      <Text style={styles.hint}>{t('trips.dayRegenHint')}</Text>
      <DropdownInput
        icon="refresh-outline"
        value={label(selected)}
        placeholder={t('trips.dayRegenDay')}
        editable={false}
        open={open}
        options={options.map(label)}
        onToggle={() => setOpen(o => !o)}
        onPick={picked => {
          setIndex(Math.max(0, options.map(label).indexOf(picked)));
          setOpen(false);
          setResult(null);
        }}
      />
      <TextInput
        multiline
        value={text}
        onChangeText={setText}
        accessibilityLabel={t('trips.dayRegenPlaceholder')}
        placeholder={t('trips.dayRegenPlaceholder')}
        placeholderTextColor={colors.faint}
        style={[styles.input, tooLong && styles.invalid]}
      />
      <View style={styles.formRow}>
        <View style={styles.errorBox}>
          <FieldError message={tooLong ? t('trips.dayRegenTooLong', {max: MAX_AI_EDIT_LENGTH}) : false} />
        </View>
        <Text style={styles.counter}>
          {text.length}/{MAX_AI_EDIT_LENGTH}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('trips.dayRegenRegenerate')}
          disabled={propose.isPending || apply.isPending || tooLong}
          style={[styles.button, (propose.isPending || apply.isPending || tooLong) && styles.disabled]}
          onPress={() => {
            setResult(null);
            propose.mutate();
          }}>
          <Text style={styles.buttonText}>{t('trips.dayRegenRegenerate')}</Text>
        </TouchableOpacity>
      </View>

      {propose.isPending && <Text style={styles.hint}>{t('trips.dayRegenLoading')}</Text>}

      {result && (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>{t('trips.dayRegenPreview')}</Text>
          <Text style={styles.hint}>{t('trips.dayRegenPreviewHint')}</Text>
          <DayPreview title={t('trips.dayRegenCurrent')} day={result.current} />
          <DayPreview title={t('trips.dayRegenProposed')} day={result.proposal.day} existing={existing} />
          <View style={styles.actions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('trips.dayRegenReject')}
              disabled={apply.isPending}
              style={[styles.button, styles.cancel]}
              onPress={() => {
                // the server forgets it; the itinerary was never changed, so a failure here does not matter
                Promise.resolve(tripsApi.rejectDayRegeneration(tripId, result.proposal.id)).catch(() => undefined);
                setResult(null);
                alert.info(t('trips.dayRegenRejected'));
              }}>
              <Text style={styles.cancelText}>{t('trips.dayRegenReject')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('trips.dayRegenAccept')}
              disabled={apply.isPending}
              style={[styles.button, apply.isPending && styles.disabled]}
              onPress={() => apply.mutate(result.proposal.id)}>
              <Text style={styles.buttonText}>{t('trips.dayRegenAccept')}</Text>
            </TouchableOpacity>
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
  title: {fontSize: 16, fontWeight: '700', color: colors.text},
  hint: {fontSize: 12, color: colors.muted, marginBottom: 8, marginTop: 2},
  input: {
    minHeight: 56,
    textAlignVertical: 'top',
    padding: 10,
    marginTop: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  invalid: {borderColor: colors.error},
  formRow: {flexDirection: 'row', alignItems: 'flex-start'},
  errorBox: {flex: 1},
  counter: {marginTop: 6, fontSize: 12, color: colors.faint},
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
  preview: {marginTop: 12, padding: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border},
  previewTitle: {fontSize: 15, fontWeight: '700', color: colors.text},
  day: {marginTop: 8, padding: 10, borderRadius: radius.sm, backgroundColor: colors.surface},
  dayLabel: {fontWeight: '700', color: colors.text},
  dayTitle: {color: colors.body, marginBottom: 2},
  activity: {marginTop: 4},
  activityName: {color: colors.body},
});
