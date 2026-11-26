import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoCreateOutline, IoLockClosedOutline, IoTrashOutline} from 'react-icons/io5';
import ConfirmModal from '@/components/ui/ConfirmModal';
import FieldError from '@/components/ui/FieldError';
import Toast from '@/components/ui/Toast';
import {connectionErrorKey} from '@/lib/apiClient';
import {formatDate} from '@/lib/date';
import {tripsApi} from '../api/tripsApi';
import {noteErrorKey} from '../noteValidation';
import {MAX_NOTE_LENGTH, type TripNote} from '../types';

// Edited = changed after it was written (the two dates differ by a few ms on a new note)
const isEdited = (note: TripNote) => new Date(note.updatedAt).getTime() - new Date(note.createdAt).getTime() > 1000;

// A text box with a counter and its error, used to add a note and to edit one.
function NoteForm({
  initial = '',
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial?: string;
  submitLabel: string;
  busy: boolean;
  onSubmit: (text: string) => void;
  onCancel?: () => void;
}) {
  const {t} = useTranslation();
  const [text, setText] = useState(initial);
  const [touched, setTouched] = useState(false);
  const errorKey = touched ? noteErrorKey(text) : null;

  return (
    <form
      noValidate
      onSubmit={event => {
        event.preventDefault();
        setTouched(true);
        if (!noteErrorKey(text)) {
          onSubmit(text.trim());
        }
      }}>
      <textarea
        rows={3}
        value={text}
        aria-label={t('trips.notes.placeholder')}
        placeholder={t('trips.notes.placeholder')}
        aria-invalid={errorKey ? true : undefined}
        onChange={event => setText(event.target.value)}
        className="field w-full resize-y"
      />
      <div className="flex items-start justify-between gap-3">
        <FieldError role="alert">{errorKey ? String(t(errorKey, {max: MAX_NOTE_LENGTH})) : undefined}</FieldError>
        <span className="mt-1.5 ml-auto text-xs text-slate-400">
          {t('trips.notes.counter', {length: text.length, max: MAX_NOTE_LENGTH})}
        </span>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        {onCancel && (
          <button type="button" className="btn btn-outline px-4 py-2 text-sm" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        )}
        <button type="submit" className="btn btn-primary px-4 py-2 text-sm" disabled={busy}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

// The user's private notes on a trip: add, read, edit and delete.
// Only the owner reaches this page; the backend enforces it on every request.
export default function TripNotes({tripId}: {tripId: string}) {
  const {t} = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = ['tripNotes', tripId];
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TripNote | null>(null);
  // changes after a note is added: remounts the add form so it is empty again
  const [formKey, setFormKey] = useState(0);

  const notes = useQuery({queryKey, queryFn: () => tripsApi.notes(tripId)});
  const reload = () => queryClient.invalidateQueries({queryKey});
  const fail = (fallbackKey: string) => (error: unknown) =>
    Toast.show({
      type: 'error',
      text1: t('common.failed'),
      text2: t(connectionErrorKey(error) ?? fallbackKey),
    });

  const add = useMutation({
    mutationFn: (content: string) => tripsApi.addNote(tripId, content),
    onSuccess: () => {
      setFormKey(key => key + 1);
      reload();
    },
    onError: fail('trips.notes.saveFailed'),
  });
  const update = useMutation({
    mutationFn: ({id, content}: {id: string; content: string}) => tripsApi.updateNote(tripId, id, content),
    onSuccess: () => {
      setEditing(null);
      reload();
    },
    onError: fail('trips.notes.saveFailed'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => tripsApi.removeNote(tripId, id),
    onSuccess: reload,
    onError: fail('trips.notes.deleteFailed'),
  });

  return (
    <section className="card space-y-3 p-4" aria-labelledby="trip-notes-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="trip-notes-title" className="font-semibold text-slate-900">
          {t('trips.notes.title')}
        </h2>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <IoLockClosedOutline size={13} />
          {t('trips.notes.hint')}
        </span>
      </div>

      {/* kept as typed when saving fails, emptied when it worked */}
      <NoteForm
        key={formKey}
        submitLabel={t('trips.notes.add')}
        busy={add.isPending}
        onSubmit={content => add.mutate(content)}
      />

      {notes.isLoading && <div className="h-12 animate-pulse rounded-xl bg-slate-100" />}
      {notes.isError && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          <span>{t('trips.notes.loadFailed')}</span>
          <button type="button" className="font-semibold underline" onClick={() => notes.refetch()}>
            {t('trips.notes.retry')}
          </button>
        </div>
      )}
      {notes.data?.length === 0 && <p className="text-sm text-slate-500">{t('trips.notes.empty')}</p>}

      <ul className="space-y-2">
        {notes.data?.map(note => (
          <li key={note._id} className="rounded-xl bg-slate-50 p-3">
            {editing === note._id ? (
              <NoteForm
                initial={note.content}
                submitLabel={t('trips.notes.save')}
                busy={update.isPending}
                onSubmit={content => update.mutate({id: note._id, content})}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm break-words whitespace-pre-wrap text-slate-800">{note.content}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(note.createdAt)}
                    {isEdited(note) && ` · ${t('trips.notes.edited')}`}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t('trips.notes.edit')}
                  title={t('trips.notes.edit')}
                  onClick={() => setEditing(note._id)}
                  className="grid size-8 place-items-center rounded-full text-slate-500 transition hover:bg-slate-200">
                  <IoCreateOutline size={17} />
                </button>
                <button
                  type="button"
                  aria-label={t('trips.notes.remove')}
                  title={t('trips.notes.remove')}
                  onClick={() => setDeleting(note)}
                  className="grid size-8 place-items-center rounded-full text-rose-500 transition hover:bg-rose-100">
                  <IoTrashOutline size={17} />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <ConfirmModal
        visible={deleting !== null}
        danger
        title={t('trips.notes.deleteTitle')}
        confirmText={t('common.delete')}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            remove.mutate(deleting._id);
          }
          setDeleting(null);
        }}>
        <p className="text-center text-sm text-slate-600">{t('trips.notes.deleteText')}</p>
      </ConfirmModal>
    </section>
  );
}
