import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useQueryClient} from '@tanstack/react-query';
import {AiEditProposal, MAX_AI_EDIT_LENGTH, TripDay, tripsApi} from '../../api';
import {queryKeys} from '../../hooks/queries';
import {useApiMutation} from '../../hooks/useApiMutation';
import {alert} from '../../lib/alert';
import {colors, radius} from '../../lib/theme';
import FieldError from '../FieldError';

// Error key for an AI edit request, or null when it can be sent (not empty, not too long).
export const aiEditErrorKey = (
  text: string,
): 'trips.aiEditRequired' | 'trips.aiEditTooLong' | null => {
  const value = text.trim();
  if (!value) {return 'trips.aiEditRequired';}
  return value.length > MAX_AI_EDIT_LENGTH ? 'trips.aiEditTooLong' : null;
};

const norm = (name?: string) => (name ?? '').trim().toLowerCase();
const status = (e: unknown) => (e as {response?: {status?: number}})?.response?.status;
const code = (e: unknown) => (e as {response?: {data?: {code?: string}}})?.response?.data?.code;

// Ask the AI to change the itinerary, preview the proposal, then Accept (saved) or Reject (dropped).
// The stored itinerary is only changed by Accept.
export default function AiEditPanel({tripId, days}: {tripId: string; days: TripDay[]}) {
  const {t} = useTranslation();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);
  const [proposal, setProposal] = useState<AiEditProposal | null>(null);
  const errorKey = touched ? aiEditErrorKey(text) : null;

  const propose = useApiMutation((instruction: string) => tripsApi.proposeAiEdit(tripId, instruction), {
    onSuccess: setProposal,
    onError: e =>
      alert.error(
        t(
          code(e) === 'AI_INVALID_RESPONSE' || status(e) === 502
            ? 'trips.aiEditInvalid'
            : code(e)?.startsWith('AI_')
              ? 'trips.aiEditUnavailable'
              : 'trips.aiEditFailed',
        ),
      ),
  });
  const apply = useApiMutation((proposalId: string) => tripsApi.applyAiEdit(tripId, proposalId), {
    onSuccess: () => {
      setProposal(null);
      setText('');
      setTouched(false);
      qc.invalidateQueries({queryKey: queryKeys.trip(tripId)});
      qc.invalidateQueries({queryKey: queryKeys.trips});
      alert.success(t('trips.aiEditApplied'));
    },
    onError: () => alert.error(t('trips.aiEditApplyFailed')),
  });

  const existing = new Set(days.flatMap(d => d.challenges.map(c => norm(c.nameLocation))));

  const ask = () => {
    setTouched(true);
    if (!aiEditErrorKey(text) && !propose.isPending) {
      setProposal(null);
      propose.mutate(text.trim());
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('trips.aiEditTitle')}</Text>
      <Text style={styles.hint}>{t('trips.aiEditHint')}</Text>
      <TextInput
        multiline
        value={text}
        onChangeText={setText}
        // the keyboard's return key sends the request instead of adding a new line
        submitBehavior="submit"
        returnKeyType="send"
        onSubmitEditing={ask}
        accessibilityLabel={t('trips.aiEditPlaceholder')}
        placeholder={t('trips.aiEditPlaceholder')}
        placeholderTextColor={colors.faint}
        style={[styles.input, !!errorKey && styles.invalid]}
      />
      <View style={styles.formRow}>
        <View style={styles.errorBox}>
          <FieldError message={errorKey ? t(errorKey, {max: MAX_AI_EDIT_LENGTH}) : false} />
        </View>
        <Text style={styles.counter}>
          {text.length}/{MAX_AI_EDIT_LENGTH}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('trips.aiEditAsk')}
          disabled={propose.isPending}
          style={[styles.button, propose.isPending && styles.disabled]}
          onPress={ask}>
          <Text style={styles.buttonText}>{t('trips.aiEditAsk')}</Text>
        </TouchableOpacity>
      </View>

      {propose.isPending && <Text style={styles.hint}>{t('trips.aiEditLoading')}</Text>}

      {proposal && (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>{t('trips.aiEditPreview')}</Text>
          <Text style={styles.hint}>
            {t('trips.aiEditPreviewHint')} {t('trips.aiEditKeptHint')}
          </Text>
          {proposal.days.map((day, index) => (
            <View key={index} style={styles.day}>
              <Text style={styles.dayTitle}>
                {t('trips.aiEditDay', {n: index + 1})}: {day.title}
              </Text>
              {day.activities.map((a, i) => (
                <View key={i} style={styles.activity}>
                  <Text style={styles.activityName}>
                    • {a.name_location}
                    {a.kept && ` (${t('trips.aiEditKept')})`}
                    {!a.kept && !existing.has(norm(a.name_location)) && ` (${t('trips.aiEditNew')})`}
                  </Text>
                  <Text style={styles.activitySummary}>{a.challenge_summary}</Text>
                </View>
              ))}
            </View>
          ))}
          <View style={styles.actions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('trips.aiEditReject')}
              disabled={apply.isPending}
              style={[styles.button, styles.cancel]}
              onPress={() => {
                // the server forgets it; the itinerary was never changed, so a failure here does not matter
                Promise.resolve(tripsApi.rejectAiEdit(tripId, proposal.id)).catch(() => undefined);
                setProposal(null);
                alert.info(t('trips.aiEditRejected'));
              }}>
              <Text style={styles.cancelText}>{t('trips.aiEditReject')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('trips.aiEditAccept')}
              disabled={apply.isPending}
              style={[styles.button, apply.isPending && styles.disabled]}
              onPress={() => apply.mutate(proposal.id)}>
              <Text style={styles.buttonText}>{t('trips.aiEditAccept')}</Text>
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
  dayTitle: {fontWeight: '700', color: colors.text},
  activity: {marginTop: 4},
  activityName: {color: colors.body},
  activitySummary: {fontSize: 12, color: colors.muted, marginLeft: 10},
});
