import {NavLink, Outlet, useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoChatbubbles, IoMap} from 'react-icons/io5';
import {ChatPage} from '@/features/assistant/pages/ChatPage';
import {routes} from '@/app/routes';

const tabClass = ({isActive}: {isActive: boolean}) =>
  `flex items-center justify-center gap-1.5 rounded-full py-1.5 transition ${
    isActive
      ? 'bg-white text-brand-600 shadow-sm'
      : 'text-slate-500 hover:text-slate-800'
  }`;

export default function AssistantLayout() {
  const {t} = useTranslation();
  const {pathname} = useLocation();
  const isChat = pathname.startsWith(routes.Chat);

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-30 flex h-14 items-center justify-center bg-slate-50/90 px-4 backdrop-blur-md md:top-16 md:px-6">
        <nav
          aria-label={t('nav.assistant')}
          className="grid w-full max-w-xs grid-cols-2 rounded-full bg-slate-200/70 p-1 text-sm font-semibold">
          <NavLink to={routes.Chat} className={tabClass}>
            <IoChatbubbles size={16} aria-hidden />
            {t('nav.chat')}
          </NavLink>
          <NavLink to={routes.AddNewTrip} className={tabClass}>
            <IoMap size={16} aria-hidden />
            {t('nav.plans')}
          </NavLink>
        </nav>
      </div>
      <div hidden={!isChat}>
        <ChatPage />
      </div>
      {!isChat && <Outlet />}
    </div>
  );
}
