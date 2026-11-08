import {useTranslation} from 'react-i18next';
import {IoLogoYoutube} from 'react-icons/io5';
import Page from '@/components/layout/Page';
import {allVideos} from '../data/videos';

export default function VideosPage() {
  const {t} = useTranslation();
  return (
    <Page title={t('videos.title')} wide>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {allVideos.map(item => (
          <a
            key={item.id}
            href={item.youtubeLink}
            target="_blank"
            rel="noreferrer"
            aria-label={t('common.watchOnYoutube')}
            className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-slate-900 shadow-soft">
            <video
              src={item.src}
              muted
              autoPlay
              loop
              playsInline
              className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent p-3 pt-10 text-xs font-medium text-white">
              <IoLogoYoutube size={18} className="text-red-500" />
              {t('common.watchOnYoutube')}
            </div>
          </a>
        ))}
      </div>
    </Page>
  );
}
