import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoPlay} from 'react-icons/io5';
import type {VideoItem} from './api';
import VideoPlayerDialog from './VideoPlayerDialog';

// Video tile: the video file (muted loop) or the YouTube thumbnail. Tapping it
// plays the video in the app. `compact` is the small tile of the home screen.
export default function VideoCard({video, compact = false}: {video: VideoItem; compact?: boolean}) {
  const {t} = useTranslation();
  const [open, setOpen] = useState(false);
  const size = compact ? 'w-32 shrink-0 snap-start md:w-40' : '';
  const media = 'absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105';
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('videos.play', {title: video.title})}
        title={video.title}
        className={`group relative aspect-[9/16] overflow-hidden rounded-2xl bg-slate-900 text-left shadow-soft ${size}`}>
        {video.src ? (
          <video src={video.src} muted autoPlay loop playsInline className={media} />
        ) : (
          video.thumbnail && <img src={video.thumbnail} alt="" loading="lazy" className={media} />
        )}
        <span className="absolute bottom-2 left-2 grid size-8 place-items-center rounded-full bg-white/90 text-slate-900">
          <IoPlay size={14} className="ml-0.5" aria-hidden />
        </span>
        {!compact && video.title && (
          <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent p-3 pt-10 pl-12 text-xs font-medium text-white">
            {video.title}
          </span>
        )}
      </button>
      {open && <VideoPlayerDialog video={video} onClose={() => setOpen(false)} />}
    </>
  );
}
