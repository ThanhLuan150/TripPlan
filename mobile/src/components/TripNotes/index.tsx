import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useQueryClient} from '@tanstack/react-query';
import {MAX_NOTE_LENGTH, tripsApi, TripNote} from '../../api';
import {queryKeys, useTripNotes} from '../../hooks/queries';
import {useApiMutation} from '../../hooks/useApiMutation';
import {alert} from '../../lib/alert';
import {errorText} from '../../lib/apiClient';
import {colors, radius} from '../../lib/theme';
import ConfirmModal from '../ConfirmModal';
import FieldError from '../FieldError';

// Error key for a note text, or null when it can be saved (not empty, not too long).
export const noteErrorKey = (
  text: string,
): 'trips.notesRequired' | 'trips.notesTooLong' | null => {
  const value = text.trim();
  if (!value) {return 'trips.notesRequired';}
  return value.length > MAX_NOTE_LENGTH ? 'trips.notesTooLong' : null;
};

// Edited = changed after it was written (the two dates differ by a few ms on a new note)
const isEdited = (note: TripNote) =>
  new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 1000;

interface FormProps {
  initial?: string;
  submitLabel: string;
  busy: boolean;
  onSubmit: (text: string) => void;
  onCancel?: () => void;
}

// A text box with a counter and its error, used to add a note and to edit one.
function NoteForm({initial = '', submitLabel, busy, onSubmit, onCancel}: FormProps) {
  const {t} = useTranslation();
  const [text, setText] = useState(initial);
  const [touched, setTouched] = useState(false);
  const errorKey = touched ? noteErrorKey(text) : null;

  const submit = () => {
    setTouched(true);
    if (!noteErrorKey(text)) {onSubmit(text.trim());}
  };

  return (
    <View>
      <TextInput
        multiline
        value={text}
        onChangeText={setText}
        accessibilityLabel={t('trips.notesPlaceholder')}
        placeholder={t('trips.notesPlaceholder')}
        placeholderTextColor={colors.faint}
        style={[styles.input, !!errorKey && styles.invalid]}
      />
      <View style={styles.formRow}>
        <View style={styles.errorBox}>
          <FieldError message={errorKey ? t(errorKey, {max: MAX_NOTE_LENGTH}) : false} />
        </View>
        <Text style={styles.counter}>
          {text.length}/{MAX_NOTE_LENGTH}
        </Text>
      </View>
      <View style={styles.actions}>
        {onCancel && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            style={[styles.button, styles.cancel]}
            onPress={onCancel}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={submitLabel}
          disabled={busy}
          style={[styles.button, busy && styles.disabled]}
          onPress={submit}>
          <Text style={styles.buttonText}>{submitLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// The user's private notes on a trip: add, read, edit and delete.
// Only the owner reaches this screen; the backend enforces it on every request.
export default function TripNotes({tripId}: {tripId: string}) {
  const {t} = useTranslation();
  const qc = useQueryClient();
  const notes = useTripNotes(tripId);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TripNote | null>(null);
  // changes after a note is added: remounts the add form so it is empty again
  const [formKey, setFormKey] = useState(0);
  const reload = () => qc.invalidateQueries({queryKey: queryKeys.tripNotes(tripId)});

  const add = useApiMutation((content: string) => tripsApi.addNote(tripId, content), {
    onSuccess: () => {
      setFormKey(k => k + 1);
      reload();
    },
    onError: e => alert.error(t('trips.notesSaveFailed'), errorText(e)),
  });
  const update = useApiMutation(
    ({id, content}: {id: string; content: string}) =>
      tripsApi.updateNote(tripId, id, content),
    {
      onSuccess: () => {
        setEditing(null);
        reload();
      },
      onError: e => alert.error(t('trips.notesSaveFailed'), errorText(e)),
    },
  );
  const remove = useApiMutation((id: string) => tripsApi.removeNote(tripId, id), {
    onSuccess: reload,
    onError: e => alert.error(t('trips.notesDeleteFailed'), errorText(e)),
  });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('trips.notesTitle')}</Text>
      <View style={styles.hintRow}>
        <Ionicons name="lock-closed-outline" size={13} color={colors.muted} />
        <Text style={styles.hint}>{t('trips.notesHint')}</Text>
      </View>

      <NoteForm
        key={formKey}
        submitLabel={t('trips.notesAdd')}
        busy={add.isPending}
        onSubmit={content => add.mutate(content)}
      />

      {notes.error && (
        <Text style={styles.loadError}>{t('trips.notesLoadFailed')}</Text>
      )}
      {notes.data?.length === 0 && (
        <Text style={styles.empty}>{t('trips.notesEmpty')}</Text>
      )}

      {notes.data?.map(note => (
        <View key={note._id} style={styles.note}>
          {editing === note._id ? (
            <NoteForm
              initial={note.content}
              submitLabel={t('trips.notesSave')}
              busy={update.isPending}
              onSubmit={content => update.mutate({id: note._id, content})}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <View style={styles.noteRow}>
              <View style={styles.noteBody}>
                <Text style={styles.noteText}>{note.content}</Text>
                {isEdited(note) && (
                  <Text style={styles.edited}>{t('trips.notesEdited')}</Text>
                )}
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('trips.notesEdit')}
                style={styles.icon}
                onPress={() => setEditing(note._id)}>
                <Ionicons name="create-outline" size={18} color={colors.muted} />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t('trips.notesRemove')}
                style={styles.icon}
                onPress={() => setDeleting(note)}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      <ConfirmModal
        visible={deleting !== null}
        title={t('trips.notesDeleteConfirm')}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {remove.mutate(deleting._id);}
          setDeleting(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    marginBottom: 32,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  title: {fontSize: 16, fontWeight: '700', color: colors.text},
  hintRow: {flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10, marginTop: 2},
  hint: {fontSize: 12, color: colors.muted},
  input: {
    minHeight: 72,
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
  loadError: {marginTop: 10, color: colors.error},
  empty: {marginTop: 10, color: colors.muted},
  note: {marginTop: 10, padding: 10, borderRadius: radius.sm, backgroundColor: colors.surface},
  noteRow: {flexDirection: 'row', alignItems: 'flex-start'},
  noteBody: {flex: 1},
  noteText: {color: colors.body},
  edited: {marginTop: 4, fontSize: 12, color: colors.faint},
  icon: {padding: 6},
});
