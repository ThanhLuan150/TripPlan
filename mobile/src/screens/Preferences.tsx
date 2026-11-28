import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useQueryClient} from '@tanstack/react-query';
import {
  MAX_PREFERENCE_NOTES,
  PREFERENCE_CATEGORIES,
  PreferenceCategory,
  profileApi,
} from '../api';
import {BackHeader, Button, ConfirmModal, ErrorText} from '../components';
import {queryKeys, usePreferences} from '../hooks/queries';
import {useApiMutation} from '../hooks/useApiMutation';
import {alert} from '../lib/alert';
import {colors, radius, shadow} from '../lib/theme';

// i18n key of the problem with the form, or null when it can be saved
export const preferencesErrorKey = (
  categories: PreferenceCategory[],
  notes: string,
) => {
  if (notes.trim().length > MAX_PREFERENCE_NOTES) {
    return 'profile.preferences.errors.notesLong';
  }
  if (categories.length === 0 && !notes.trim()) {
    return 'profile.preferences.errors.empty';
  }
  return null;
};

// The user's AI travel preferences: pick the groups they like, add a short note, save, or delete all.
// They are optional: the AI works without them and only uses them to personalize its answers.
export default function Preferences() {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const qc = useQueryClient();
  const query = usePreferences();
  const stored = query.data;
  const [categories, setCategories] = useState<PreferenceCategory[]>([]);
  const [notes, setNotes] = useState('');
  const [touched, setTouched] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hasStored = !!stored && (stored.categories.length > 0 || !!stored.notes);
  const errorKey = touched ? preferencesErrorKey(categories, notes) : null;

  // the form starts from what is stored
  useEffect(() => {
    if (stored) {
      setCategories(stored.categories);
      setNotes(stored.notes);
    }
  }, [stored]);

  const done = (preferences: unknown, messageKey: string) => {
    qc.setQueryData(queryKeys.preferences, preferences);
    setTouched(false);
    alert.success(t('common.success'), t(messageKey));
  };
  const save = useApiMutation(
    () => profileApi.savePreferences({categories, notes: notes.trim()}),
    {onSuccess: data => done(data.preferences, 'profile.preferences.saved')},
  );
  const remove = useApiMutation(profileApi.deletePreferences, {
    onSuccess: data => {
      setConfirmDelete(false);
      done(data.preferences, 'profile.preferences.deleted');
    },
    onError: () => setConfirmDelete(false),
  });

  const toggle = (key: PreferenceCategory) =>
    setCategories(current =>
      current.includes(key) ? current.filter(item => item !== key) : [...current, key],
    );
  const submit = () => {
    setTouched(true);
    if (!preferencesErrorKey(categories, notes)) {
      save.mutate();
    }
  };

  return (
    <View style={styles.container}>
      <BackHeader
        title={t('profile.preferences.title')}
        onBack={() => navigation.goBack()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={[styles.card, shadow]}>
          <Text style={styles.intro}>{t('profile.preferences.intro')}</Text>

          {query.isLoading && (
            <Text style={styles.info}>{t('common.loading')}</Text>
          )}
          {query.isError && (
            <TouchableOpacity onPress={() => query.refetch()}>
              <Text style={styles.errorLine}>
                {t('profile.preferences.loadFailed')} {t('common.retry')}
              </Text>
            </TouchableOpacity>
          )}

          {!query.isLoading && !query.isError && (
            <>
              <Text style={styles.label}>{t('profile.preferences.categories')}</Text>
              <View style={styles.chips}>
                {PREFERENCE_CATEGORIES.map(key => {
                  const on = categories.includes(key);
                  return (
                    <TouchableOpacity
                      key={key}
                      accessibilityState={{selected: on}}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() => toggle(key)}>
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>
                        {t(`profile.preferences.category.${key}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>{t('profile.preferences.notes')}</Text>
              <TextInput
                style={styles.input}
                multiline
                value={notes}
                placeholder={t('profile.preferences.notesPlaceholder')}
                placeholderTextColor={colors.faint}
                onChangeText={setNotes}
                onBlur={() => setTouched(true)}
              />
              <Text style={styles.count}>
                {notes.trim().length}/{MAX_PREFERENCE_NOTES}
              </Text>
              <ErrorText message={errorKey ? t(errorKey) : save.errorMessage} />

              <Button
                title={save.isPending ? t('profile.saving') : t('profile.save')}
                onPress={submit}
                loading={save.isPending}
              />
              {hasStored && (
                <Button
                  title={t('profile.preferences.delete')}
                  variant="outline"
                  onPress={() => setConfirmDelete(true)}
                  style={styles.delete}
                />
              )}
              <ErrorText message={remove.errorMessage} />
            </>
          )}
        </View>
      </ScrollView>

      <ConfirmModal
        visible={confirmDelete}
        title={t('profile.preferences.deleteTitle')}
        confirmText={t('common.delete')}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate()}>
        <Text style={styles.info}>{t('profile.preferences.deleteText')}</Text>
      </ConfirmModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface},
  content: {padding: 16, paddingBottom: 40},
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
  },
  intro: {color: colors.body, fontSize: 14, lineHeight: 20},
  info: {color: colors.muted, fontSize: 14},
  errorLine: {color: colors.error, fontSize: 14},
  label: {color: colors.text, fontWeight: '700', fontSize: 14, marginTop: 6},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  chipOn: {backgroundColor: colors.primary, borderColor: colors.primary},
  chipText: {color: colors.body, fontWeight: '600', fontSize: 14},
  chipTextOn: {color: '#fff'},
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    color: colors.text,
    textAlignVertical: 'top',
  },
  count: {color: colors.faint, fontSize: 12, textAlign: 'right'},
  delete: {marginTop: 4},
});
