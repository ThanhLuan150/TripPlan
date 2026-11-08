import {FormEvent, useEffect, useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link, useNavigate} from 'react-router-dom';
import {
  IoAirplane,
  IoArrowForward,
  IoChatbubbles,
  IoNotificationsOutline,
  IoPlay,
  IoSearch,
  IoTrophy,
} from 'react-icons/io5';
import {api} from '../api/client';
import {getUser} from '../Helper/storage';
import {routes} from '../navigation/routes';
import SectionHeader from '../components/SectionHeader';
import {homeVideos} from '../components/shortVideo/videos';
import silder from '../assets/images/silder.png';
import sliderImge from '../assets/images/sliderImge.jpg';
import sliderImage1 from '../assets/images/sliderImage1.jpg';
import sliderImage4 from '../assets/images/sliderImage4.jpg';
import imagehomepage from '../assets/images/imagehomepage.png';
import hagiangImage from '../assets/images/hagiangImage.jpg';
import hagiangImage1 from '../assets/images/hagiangImage1.jpg';
import hagiangImage2 from '../assets/images/hagiangImage2.jpg';

const sliderImages = [sliderImage1, sliderImge, sliderImage4, silder];

const imageshomescreen = [
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
const result = notificationCount >= 10 ? '9+' : notificationCount.toString();

const quickActions = [
  {
    to: routes.Chat,
    label: 'Hỏi trợ lý AI',
    icon: IoChatbubbles,
    tone: 'bg-sky-50 text-sky-600',
  },
  {
    to: routes.TripPlanChoose,
    label: 'Lên kế hoạch',
    icon: IoAirplane,
    tone: 'bg-brand-50 text-brand-600',
  },
  {
    to: routes.Ranking,
    label: 'Bảng xếp hạng',
    icon: IoTrophy,
    tone: 'bg-amber-50 text-amber-600',
  },
];

// react-native-swiper with autoplay -> autoplaying slider with dots
function Slider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) {
      return;
    }
    const id = window.setInterval(
      () => setIndex(i => (i + 1) % sliderImages.length),
      3500,
    );
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-slate-200 shadow-soft"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}>
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{transform: `translateX(-${index * 100}%)`}}>
        {sliderImages.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="aspect-[16/10] w-full shrink-0 object-cover sm:aspect-[16/7] lg:aspect-[16/6]"
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
      <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 md:inset-x-8 md:bottom-8">
        <div className="text-white">
          <p className="text-xl font-bold md:text-3xl">Khám phá Việt Nam</p>
          <p className="mt-1 hidden text-sm text-white/85 sm:block md:text-base">
            Lịch trình thông minh, thử thách thú vị ở mỗi điểm đến
          </p>
          <Link
            to={routes.TripPlanChoose}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50">
            Lên kế hoạch ngay
            <IoArrowForward size={16} />
          </Link>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {sliderImages.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Ảnh ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomeScreens() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const {data: dataUser} = useQuery({
    queryKey: ['profile'],
    queryFn: async () => getUser(),
  });
  const name = dataUser?.data.fullname || dataUser?.data.username || '';

  const {data: rankingData, isLoading: rankingLoading} = useQuery({
    queryKey: ['rankings', '/rankings/rankingUserHighest'],
    queryFn: async () => (await api.get('/rankings/rankingUserHighest')).data,
  });
  const ranks: any[] = rankingData?.dataRanks ?? [];

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
          <p className="text-sm text-slate-500">Xin chào,</p>
          <h1 className="truncate text-xl font-bold text-slate-900 md:text-2xl">
            {name || 'bạn'} 👋
          </h1>
        </div>
        <Link
          to={routes.Notification}
          aria-label="Thông báo"
          className="relative grid size-11 place-items-center rounded-full bg-white text-slate-700 shadow-soft ring-1 ring-slate-100 transition hover:text-brand-600">
          <IoNotificationsOutline size={22} />
          <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-slate-50">
            {result}
          </span>
        </Link>
        {dataUser?.data.image && (
          <Link to={routes.Profile} aria-label="Tài khoản" className="md:hidden">
            <img
              src={dataUser.data.image}
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
          placeholder="Bạn muốn đi đâu?"
          aria-label="Bạn muốn đi đâu?"
          className="h-13 w-full rounded-2xl bg-white pr-4 pl-12 text-[15px] shadow-soft ring-1 ring-slate-100 transition outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-brand-400"
        />
      </form>

      <Slider />

      {/* quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {quickActions.map(({to, label, icon: Icon, tone}) => (
          <Link
            key={label}
            to={to}
            className="card flex flex-col items-center gap-2 px-2 py-4 text-center transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:px-4 sm:text-left">
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}>
              <Icon size={22} />
            </span>
            <span className="text-xs font-semibold text-slate-800 sm:text-sm">
              {label}
            </span>
          </Link>
        ))}
      </div>

      <section>
        <SectionHeader title="Video nổi bật" to={routes.VideoTravel} />
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
          {homeVideos.map(item => (
            <a
              key={item.id}
              href={item.youtubeLink}
              target="_blank"
              rel="noreferrer"
              aria-label="Xem video trên YouTube"
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
        <SectionHeader title="Có thể bạn sẽ thích?" />
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
          {imageshomescreen.map((item, index) => (
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
        <SectionHeader
          title="Bảng xếp hạng 'Vua du lịch'"
          to={routes.Ranking}
        />
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
            <p className="py-4 text-center text-sm text-slate-500">
              Chưa có ai trên bảng xếp hạng. Hãy là người đầu tiên!
            </p>
          )}
          <div className="no-scrollbar flex gap-4 overflow-x-auto">
            {ranks.map((item, index) => (
              <div
                key={index}
                className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center">
                <div className="relative">
                  <img
                    src={item.image}
                    alt=""
                    className={`size-14 rounded-full bg-slate-100 object-cover ring-2 ${
                      index === 0
                        ? 'ring-amber-400'
                        : index === 1
                          ? 'ring-slate-300'
                          : index === 2
                            ? 'ring-orange-300'
                            : 'ring-slate-100'
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
