import {useTranslation} from 'react-i18next';
import {IoDocumentTextOutline} from 'react-icons/io5';

// "You have an unfinished draft. Continue editing?" with the two ways out.
export default function DraftBanner({
  savedAt,
  onContinue,
  onDiscard,
}: {
  savedAt: number;
  onContinue: () => void;
  onDiscard: () => void;
}) {
  const {t, i18n} = useTranslation();
  const time = new Date(savedAt).toLocaleString(i18n.language === 'en' ? 'en-GB' : 'vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
      <IoDocumentTextOutline size={20} className="shrink-0 text-amber-600" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t('drafts.found')}</p>
        <p className="text-xs text-amber-700">{t('drafts.savedAt', {time})}</p>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn btn-outline px-3 py-1.5 text-sm" onClick={onDiscard}>
          {t('drafts.startNew')}
        </button>
        <button type="button" className="btn btn-primary px-3 py-1.5 text-sm" onClick={onContinue}>
          {t('drafts.continue')}
        </button>
      </div>
    </div>
  );
}
