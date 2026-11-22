import type {ChangeEvent, FocusEvent} from 'react';
import {useTranslation} from 'react-i18next';
import {IoCreateOutline} from 'react-icons/io5';
import FormSection from './FormSection';
import {controlClass} from './styles';

// Free note for the AI, with a counter of the characters used.
export default function NoteField({
  value,
  max,
  onChange,
  onBlur,
  error,
}: {
  value: string;
  max: number;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: FocusEvent<HTMLTextAreaElement>) => void;
  error?: string;
}) {
  const {t} = useTranslation();
  return (
    <FormSection
      icon={<IoCreateOutline size={18} />}
      title={t('trips.create.note')}
      hint={t('trips.create.noteHint')}
      labelFor="note"
      error={error}>
      <textarea
        id="note"
        name="note"
        rows={value ? 6 : 3}
        maxLength={max}
        value={value}
        aria-invalid={!!error}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={t('trips.create.notePlaceholder')}
        className={`${controlClass(!!error)} resize-y px-4 py-3 text-sm leading-relaxed`}
      />
      <p className="mt-1 text-right text-xs text-slate-400">
        {value.length}/{max}
      </p>
    </FormSection>
  );
}
