import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {IoArrowForward} from 'react-icons/io5';
import {routes} from '@/app/routes';
import silder from '@/assets/images/silder.png';
import sliderImge from '@/assets/images/sliderImge.jpg';
import sliderImage1 from '@/assets/images/sliderImage1.jpg';
import sliderImage4 from '@/assets/images/sliderImage4.jpg';

const sliderImages = [sliderImage1, sliderImge, sliderImage4, silder];

// react-native-swiper with autoplay -> autoplaying slider with dots
export default function HeroSlider() {
  const {t} = useTranslation();
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
          <p className="text-xl font-bold md:text-3xl">{t('home.heroTitle')}</p>
          <p className="mt-1 hidden text-sm text-white/85 sm:block md:text-base">
            {t('home.heroText')}
          </p>
          <Link
            to={routes.TripPlanChoose}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50">
            {t('home.heroCta')}
            <IoArrowForward size={16} />
          </Link>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {sliderImages.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={t('home.slide', {n: i + 1})}
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
