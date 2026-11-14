import {useTranslation} from 'react-i18next';
import {IoVideocamOffOutline} from 'react-icons/io5';
import Page from '@/components/layout/Page';
import {useVideos} from '../useVideos';
import VideoCard from '../VideoCard';

// Every video the admin published.
export default function VideosPage() {
  const {t} = useTranslation();
  const {data, isLoading} = useVideos();
  return (
    <Page title={t('videos.title')} wide>
      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="aspect-[9/16] animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      )}
      {!isLoading && !data?.length && (
        <div className="card flex flex-col items-center gap-2 p-10 text-center text-slate-500">
          <IoVideocamOffOutline size={36} className="text-slate-300" />
          {t('videos.empty')}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
        {data?.map(item => (
          <VideoCard key={item.id} video={item} />
        ))}
      </div>
    </Page>
  );
}
