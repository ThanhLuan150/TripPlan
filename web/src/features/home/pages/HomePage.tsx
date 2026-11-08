import {FormEvent, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {
  IoAirplane,
  IoChatbubbles,
  IoNotificationsOutline,
  IoPlay,
  IoSearch,
  IoTrophy,
} from 'react-icons/io5';
import {routes} from '@/app/routes';
import SectionHeader from '@/components/ui/SectionHeader';
import {useProfile} from '@/hooks/useProfile';
import {useRanking} from '@/features/ranking/hooks/useRanking';
import {homeVideos} from '@/features/videos/data/videos';
import HeroSlider from '../components/HeroSlider';
import imagehomepage from '@/assets/images/imagehomepage.png';
import hagiangImage from '@/assets/images/hagiangImage.jpg';
import hagiangImage1 from '@/assets/images/hagiangImage1.jpg';
import hagiangImage2 from '@/assets/images/hagiangImage2.jpg';

const suggestionImages = [
  imagehomepage,
  hagiangImage,
  hagiangImage1,
  hagiangImage2,
  imagehomepage,
  imagehomepage,
  imagehomepage,
];

// Notification badge: the mobile app showed a fixed demo count of 12 -> "9+".
const notificationCount = 12;
const badge = notificationCount >= 10 ? '9+' : notificationCount.toString();

const quickActions = [
  {to: routes.Chat, labelKey: 'home.quickChat', icon: IoChatbubbles, tone: 'bg-sky-50 text-sky-600'},
  {to: routes.TripPlanChoose, labelKey: 'home.quickPlan', icon: IoAirplane, tone: 'bg-brand-50 text-brand-600'},
  {to: routes.Ranking, labelKey: 'home.quickRanking', icon: IoTrophy, tone: 'bg-amber-50 text-amber-600'},
];

const rankRing = ['ring-amber-400', 'ring-slate-300', 'ring-orange-300'];

export default function HomePage() {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const {user, name} = useProfile();
  const {data: ranks = [], isLoading: rankingLoading} = useRanking('highest');

  // the search box starts a new plan for that destination
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(routes.TripPlanChoose, {state: {location: query.trim()}});
  };

  return (
    <div className="space-y-8 px-4 py-5 md:px-6 md:py-8">
      {/* greeting */}
      <header className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500">{t('home.hello')}</p>
          <h1 className="truncate text-xl font-bold text-slate-900 md:text-2xl">
            {name || t('home.you')} 👋
          </h1>
        </div>
        <Link
          to={routes.Notification}
          aria-label={t('home.notifications')}
          className="relative grid size-11 place-items-center rounded-full bg-white text-slate-700 shadow-soft ring-1 ring-slate-100 transition hover:text-brand-600">
          <IoNotificationsOutline size={22} />
          <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-slate-50">
            {badge}
          </span>
        </Link>
        {user?.image && (
          <Link to={routes.Profile} aria-label={t('nav.account')} className="md:hidden">
            <img
              src={user.image}
              alt=""
              className="size-11 rounded-full object-cover shadow-soft ring-2 ring-white"
            />
          </Link>
        )}
      </header>

      <form onSubmit={handleSearch} className="relative -mt-3">
        <IoSearch
          size={20}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('home.search')}
          aria-label={t('home.search')}
          className="h-13 w-full rounded-2xl bg-white pr-4 pl-12 text-[15px] shadow-soft ring-1 ring-slate-100 transition outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-brand-400"
        />
      </form>

      <HeroSlider />

      {/* quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {quickActions.map(({to, labelKey, icon: Icon, tone}) => (
          <Link
            key={labelKey}
            to={to}
            className="card flex flex-col items-center gap-2 px-2 py-4 text-center transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:px-4 sm:text-left">
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}>
              <Icon size={22} />
            </span>
            <span className="text-xs font-semibold text-slate-800 sm:text-sm">{t(labelKey)}</span>
          </Link>
        ))}
      </div>

      <section>
        <SectionHeader title={t('home.videos')} to={routes.VideoTravel} />
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
          {homeVideos.map(item => (
            <a
              key={item.id}
              href={item.youtubeLink}
              target="_blank"
              rel="noreferrer"
              aria-label={t('common.watchOnYoutube')}
              className="group relative aspect-[9/16] w-32 shrink-0 snap-start overflow-hidden rounded-2xl bg-slate-900 shadow-soft md:w-40">
              <video
                src={item.src}
                muted
                autoPlay
                loop
                playsInline
                className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="absolute bottom-2 left-2 grid size-8 place-items-center rounded-full bg-white/90 text-slate-900">
                <IoPlay size={14} className="ml-0.5" />
              </span>
            </a>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title={t('home.suggestions')} />
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
          {suggestionImages.map((item, index) => (
            <div
              key={index}
              className="aspect-[4/3] w-56 shrink-0 snap-start overflow-hidden rounded-2xl bg-slate-200 shadow-soft md:w-64">
              <img
                src={item}
                alt=""
                className="size-full object-cover transition duration-500 hover:scale-105"
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title={t('home.rankingTitle')} to={routes.Ranking} />
        <div className="card p-4">
          {rankingLoading && (
            <div className="flex gap-4">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="flex animate-pulse flex-col items-center gap-2">
                  <div className="size-14 rounded-full bg-slate-200" />
                  <div className="h-2.5 w-12 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          )}
          {!rankingLoading && ranks.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-500">{t('home.rankingEmpty')}</p>
          )}
          <div className="no-scrollbar flex gap-4 overflow-x-auto">
            {ranks.map((item, index) => (
              <div
                key={item._id ?? index}
                className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center">
                <div className="relative">
                  <img
                    src={item.image}
                    alt=""
                    className={`size-14 rounded-full bg-slate-100 object-cover ring-2 ${
                      rankRing[index] ?? 'ring-slate-100'
                    }`}
                  />
                  <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-slate-900 text-[10px] font-bold text-white ring-2 ring-white">
                    {index + 1}
                  </span>
                </div>
                <span className="w-full truncate text-xs font-medium text-slate-700">
                  {item.fullname}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
