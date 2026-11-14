import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoArrowForward} from 'react-icons/io5';
import {routes} from '@/app/routes';
import type {HomeBanner} from '../api';

// Autoplaying slider of the banners the admin chose, with dots. Without
// banners (or while they load) the same panel shows on a plain background.
export default function HeroSlider({banners, loading = false}: {banners: HomeBanner[]; loading?: boolean}) {
  const {t} = useTranslation();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = banners.length;
  const current = count ? index % count : 0;

  useEffect(() => {
    if (paused || count < 2) {
      return;
    }
    const id = window.setInterval(() => setIndex(i => (i + 1) % count), 3500);
    return () => window.clearInterval(id);
  }, [paused, count]);

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 shadow-soft"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}>
      {count > 0 ? (
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{transform: `translateX(-${current * 100}%)`}}>
          {banners.map(banner => (
            <img
              key={banner.id}
              src={banner.imageUrl}
              alt={banner.title}
              className="aspect-[16/10] w-full shrink-0 object-cover sm:aspect-[16/7] lg:aspect-[16/6]"
            />
          ))}
        </div>
      ) : (
        <div
          className={`aspect-[16/10] w-full sm:aspect-[16/7] lg:aspect-[16/6] ${loading ? 'animate-pulse bg-slate-200' : ''}`}
        />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
      <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 md:inset-x-8 md:bottom-8">
        <div className="text-white">
          <p className="text-xl font-bold md:text-3xl">{t('home.heroTitle')}</p>
          <p className="mt-1 hidden text-sm text-white/85 sm:block md:text-base">
            {count === 0 && !loading ? t('home.bannersEmpty') : t('home.heroText')}
          </p>
          <Link
            to={routes.TripPlanChoose}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50">
            {t('home.heroCta')}
            <IoArrowForward size={16} />
          </Link>
        </div>
        {count > 1 && (
          <div className="flex shrink-0 gap-1.5">
            {banners.map((banner, i) => (
              <button
                key={banner.id}
                type="button"
                aria-label={t('home.slide', {n: i + 1})}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === current ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
