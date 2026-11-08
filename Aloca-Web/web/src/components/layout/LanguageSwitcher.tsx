import {useTranslation} from 'react-i18next';
import {languages} from '@/lib/i18n';

// VI | EN toggle. `tone="dark"` for use on top of photos.
export default function LanguageSwitcher({
  tone = 'light',
  className = '',
}: {
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const {t, i18n} = useTranslation();
  const current = i18n.resolvedLanguage;
  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className={`inline-flex rounded-full p-0.5 text-xs font-semibold ${
        tone === 'dark' ? 'bg-white/15 backdrop-blur' : 'bg-slate-100'
      } ${className}`}>
      {languages.map(lang => {
        const active = current === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            title={lang.label}
            aria-pressed={active}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`rounded-full px-2.5 py-1 transition ${
              active
                ? tone === 'dark'
                  ? 'bg-white text-slate-900'
                  : 'bg-white text-brand-600 shadow-sm'
                : tone === 'dark'
                  ? 'text-white/80 hover:text-white'
                  : 'text-slate-500 hover:text-slate-800'
            }`}>
            {lang.short}
          </button>
        );
      })}
    </div>
  );
}
