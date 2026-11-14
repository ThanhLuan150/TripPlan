import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoAdd, IoCreateOutline, IoImagesOutline, IoTrashOutline} from 'react-icons/io5';
import AdminCard from '../components/AdminCard';
import AdminConfirmDialog from '../components/AdminConfirmDialog';
import AdminEmptyState from '../components/AdminEmptyState';
import AdminLoadingState from '../components/AdminLoadingState';
import AdminPageHeader from '../components/AdminPageHeader';
import AdminRowAction from '../components/AdminRowAction';
import AdminStatusBadge from '../components/AdminStatusBadge';
import {adminButton} from '../components/styles';
import {useAdminShowcase, useDeleteShowcase} from '../hooks/useAdminData';
import {useAdminToast} from '../hooks/useAdminToast';
import ShowcaseFormDialog from '../showcase/ShowcaseFormDialog';
import {videoStatusBadge} from '../status';
import type {AdminShowcase, ShowcaseKind} from '../types';

const KINDS: ShowcaseKind[] = ['banner', 'suggestion'];

// Pictures of the home page of the app: the slider and the destination suggestions.
export default function HomeContentPage() {
  const {t} = useTranslation();
  const toast = useAdminToast();
  const remove = useDeleteShowcase();
  const {data, isLoading} = useAdminShowcase();
  // the dialog: a picture to edit, or the kind of a new one
  const [form, setForm] = useState<{item?: AdminShowcase; kind: ShowcaseKind} | null>(null);
  const [toDelete, setToDelete] = useState<AdminShowcase | null>(null);

  return (
    <>
      <AdminPageHeader title={t('admin.showcase.title')} description={t('admin.showcase.description')} />

      {isLoading ? (
        <AdminLoadingState variant="cards" />
      ) : (
        <div className="space-y-6">
          {KINDS.map(kind => {
            const items = (data ?? []).filter(item => item.kind === kind);
            return (
              <AdminCard
                key={kind}
                title={t(`admin.showcase.sections.${kind}`)}
                description={t(`admin.showcase.sections.${kind}Hint`)}
                actions={
                  <button type="button" className={adminButton.primary} onClick={() => setForm({kind})}>
                    <IoAdd size={16} aria-hidden />
                    {t('admin.showcase.add', {kind: t(`admin.showcase.kinds.${kind}`)})}
                  </button>
                }>
                {items.length ? (
                  <ul aria-label={t(`admin.showcase.sections.${kind}`)} className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {items.map(item => (
                      <li key={item.id} className="overflow-hidden rounded-lg border border-slate-200">
                        <img src={item.imageUrl} alt="" loading="lazy" className="aspect-video w-full bg-slate-100 object-cover" />
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-medium text-slate-900">
                              {item.title || <span className="text-slate-400">{t('admin.showcase.untitled')}</span>}
                            </p>
                            <AdminStatusBadge tone={videoStatusBadge[item.status].tone}>
                              {t(videoStatusBadge[item.status].labelKey)}
                            </AdminStatusBadge>
                          </div>
                          {item.location && <p className="mt-1 truncate text-xs text-slate-500">{item.location}</p>}
                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                            <span className="text-xs text-slate-500 tabular-nums">{t('admin.showcase.orderValue', {order: item.sortOrder})}</span>
                            <span className="flex gap-1">
                              <AdminRowAction icon={IoCreateOutline} label={t('admin.common.editItem', {name: item.title || item.imageUrl})} onClick={() => setForm({item, kind})} />
                              <AdminRowAction danger icon={IoTrashOutline} label={t('admin.common.deleteItem', {name: item.title || item.imageUrl})} onClick={() => setToDelete(item)} />
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <AdminEmptyState
                    icon={IoImagesOutline}
                    title={t(`admin.showcase.empty.${kind}`)}
                    description={t('admin.showcase.emptyHint')}
                  />
                )}
              </AdminCard>
            );
          })}
        </div>
      )}

      {form && <ShowcaseFormDialog item={form.item} kind={form.kind} onClose={() => setForm(null)} />}
      <AdminConfirmDialog
        open={!!toDelete}
        title={t('admin.showcase.deleteTitle')}
        description={t('admin.showcase.deleteText')}
        confirmLabel={t('admin.common.delete')}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          const item = toDelete!;
          setToDelete(null);
          remove.mutate(item.id, {onSuccess: () => toast.done(t('admin.showcase.deleted')), onError: toast.failed});
        }}
      />
    </>
  );
}
