import {useTranslation} from 'react-i18next';
import {IoClose, IoSearchOutline} from 'react-icons/io5';
import {adminInput} from './styles';

// Search box of a list toolbar. The placeholder is also its accessible name.
export default function AdminSearch({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  const {t} = useTranslation();
  return (
    <div className={`relative w-full sm:max-w-xs ${className}`}>
      <IoSearchOutline
        size={16}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
      />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${adminInput} pr-9 pl-9 [&::-webkit-search-cancel-button]:appearance-none`}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('admin.common.clearSearch')}
          className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          <IoClose size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}
