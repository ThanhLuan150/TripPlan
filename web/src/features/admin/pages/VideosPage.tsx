import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  IoAdd,
  IoCreateOutline,
  IoEyeOutline,
  IoLocationOutline,
  IoPlay,
  IoTrashOutline,
} from 'react-icons/io5';
import AdminCard from '../components/AdminCard';
import AdminConfirmDialog from '../components/AdminConfirmDialog';
import AdminFilter from '../components/AdminFilter';
import AdminLoadingState from '../components/AdminLoadingState';
import AdminPageHeader from '../components/AdminPageHeader';
import AdminPagination from '../components/AdminPagination';
import AdminRowAction from '../components/AdminRowAction';
import AdminSearch from '../components/AdminSearch';
import AdminStatusBadge from '../components/AdminStatusBadge';
import NoResults from '../components/NoResults';
import {adminButton, adminToolbar} from '../components/styles';
import {useAdminVideos, useDeleteVideo} from '../hooks/useAdminData';
import {useAdminToast} from '../hooks/useAdminToast';
import VideoFormDialog from '../videos/VideoFormDialog';
import {youtubeThumbnail} from '@/lib/youtube';
import {useAdminFormat} from '../hooks/useAdminFormat';
import {ALL, useTableState} from '../hooks/useTableState';
import {optionsOf, videoStatusBadge} from '../status';
import type {AdminVideo} from '../types';

// Travel videos shown in the app (home "Video nổi bật" and the videos page).
export default function VideosPage() {
  const {t} = useTranslation();
  const format = useAdminFormat();
  const toast = useAdminToast();
  const remove = useDeleteVideo();
  // undefined: closed, null: adding, a video: editing
  const [form, setForm] = useState<AdminVideo | null | undefined>(undefined);
  const {data, isLoading} = useAdminVideos();
  const table = useTableState(data, {
    searchText: video => `${video.title} ${video.location}`,
    filters: {status: (video, value) => video.status === value},
  });
  const [toDelete, setToDelete] = useState<AdminVideo | null>(null);

  return (
    <>
      <AdminPageHeader
        title={t('admin.videos.title')}
        description={t('admin.videos.description')}
        actions={
          <button type="button" className={adminButton.primary} onClick={() => setForm(null)}>
            <IoAdd size={16} aria-hidden />
            {t('admin.videos.add')}
          </button>
        }
      />

      <AdminCard>
        <div className={adminToolbar}>
          <AdminSearch value={table.query} onChange={table.setQuery} placeholder={t('admin.videos.search')} />
          <AdminFilter
            label={t('admin.common.status')}
            value={table.filter('status')}
            onChange={value => table.setFilter('status', value)}
            options={[{value: ALL, label: t('admin.common.allStatuses')}, ...optionsOf(videoStatusBadge, t)]}
          />
        </div>

        {isLoading ? (
          <AdminLoadingState variant="table" />
        ) : table.rows.length ? (
          <ul aria-label={t('admin.videos.title')} className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {table.rows.map(video => (
              <li key={video.id} className="overflow-hidden rounded-lg border border-slate-200">
                <div className="relative grid aspect-video place-items-center bg-slate-100 text-slate-400">
                  {youtubeThumbnail(video.youtubeLink) && (
                    <img src={youtubeThumbnail(video.youtubeLink)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                  )}
                  <span className="relative grid size-11 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm">
                    <IoPlay size={18} aria-hidden className="ml-0.5" />
                  </span>
                  <span className="absolute right-2 bottom-2 z-10 rounded bg-slate-900/75 px-1.5 py-0.5 text-[11px] font-medium text-white tabular-nums">
                    {format.duration(video.durationSec)}
                  </span>
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-medium text-slate-900">{video.title}</p>
                    <AdminStatusBadge tone={videoStatusBadge[video.status].tone}>
                      {t(videoStatusBadge[video.status].labelKey)}
                    </AdminStatusBadge>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <IoLocationOutline size={12} aria-hidden />
                    {video.location}
                    {video.showOnHome && <span className="ml-auto rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-800">{t('admin.videos.onHome')}</span>}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                    <span className="flex items-center gap-1 text-xs text-slate-500 tabular-nums">
                      <IoEyeOutline size={14} aria-hidden />
                      {t('admin.videos.views', {count: video.views, value: format.compact(video.views)})}
                    </span>
                    <span className="flex gap-1">
                      <AdminRowAction
                        icon={IoCreateOutline}
                        label={t('admin.common.editItem', {name: video.title})}
                        onClick={() => setForm(video)}
                      />
                      <AdminRowAction
                        danger
                        icon={IoTrashOutline}
                        label={t('admin.common.deleteItem', {name: video.title})}
                        onClick={() => setToDelete(video)}
                      />
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <NoResults onReset={table.reset} />
        )}
        <AdminPagination {...table} onPageChange={table.setPage} />
      </AdminCard>

      {form !== undefined && <VideoFormDialog video={form ?? undefined} onClose={() => setForm(undefined)} />}
      <AdminConfirmDialog
        open={!!toDelete}
        title={t('admin.videos.deleteTitle')}
        description={t('admin.videos.deleteText', {name: toDelete?.title})}
        confirmLabel={t('admin.common.delete')}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          const video = toDelete!;
          setToDelete(null);
          remove.mutate(video.id, {
            onSuccess: () => toast.done(t('admin.videos.deleted', {name: video.title})),
            onError: toast.failed,
          });
        }}
      />
    </>
  );
}
