import {useEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {IoClose, IoLogoYoutube} from 'react-icons/io5';
import {isYoutubeShort, youtubeEmbedUrl, youtubeId} from '@/lib/youtube';
import type {VideoItem} from './api';

// Plays a video in the app: the YouTube player when the admin gave a YouTube
// link, else the video file. Escape, the backdrop and the close button close it;
// the focus goes back to the tile that opened it.
export default function VideoPlayerDialog({video, onClose}: {video: VideoItem; onClose: () => void}) {
  const {t} = useTranslation();
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, []);

  const id = youtubeId(video.youtubeLink);
  const vertical = isYoutubeShort(video.youtubeLink);

  return (
    <div className="fixed inset-0 z-[900] grid place-items-center p-3 sm:p-6">
      <div aria-hidden className="absolute inset-0 animate-fade-in bg-slate-900/80" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={video.title || t('videos.title')}
        className={`relative w-full animate-pop-in overflow-hidden rounded-2xl bg-slate-950 shadow-xl ${vertical ? 'max-w-sm' : 'max-w-4xl'}`}>
        <div className="flex items-center gap-3 px-4 py-3 text-white">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{video.title}</p>
          {video.youtubeLink && (
            <a
              href={video.youtubeLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/20">
              <IoLogoYoutube size={16} className="text-red-500" aria-hidden />
              {t('common.watchOnYoutube')}
            </a>
          )}
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 transition hover:bg-white/20">
            <IoClose size={18} aria-hidden />
          </button>
        </div>
        <div className={vertical ? 'aspect-[9/16] max-h-[75dvh] w-full' : 'aspect-video w-full'}>
          {id ? (
            <iframe
              src={youtubeEmbedUrl(id)}
              title={video.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="size-full border-0"
            />
          ) : video.src ? (
            <video src={video.src} controls autoPlay playsInline className="size-full bg-black" />
          ) : (
            <p className="grid size-full place-items-center p-6 text-center text-sm text-slate-300">{t('videos.unavailable')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
