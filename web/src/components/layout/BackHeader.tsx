import {ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoArrowBack} from 'react-icons/io5';

// Header with a back arrow for screens outside the tab bar
// (Notifications, Videos, Edit profile, ...).
export default function BackHeader({
  title,
  onBack,
  right,
}: {
  title: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const navigate = useNavigate();
  const {t} = useTranslation();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-3 md:px-6">
        <button
          type="button"
          aria-label={t('common.back')}
          onClick={onBack ?? (() => navigate(-1))}
          className="grid size-10 place-items-center rounded-full text-slate-700 transition hover:bg-slate-100">
          <IoArrowBack size={22} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">
          {title}
        </h1>
        {right}
      </div>
    </header>
  );
}
