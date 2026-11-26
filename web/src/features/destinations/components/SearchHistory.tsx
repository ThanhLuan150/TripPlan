import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {IoTimeOutline, IoTrashOutline} from 'react-icons/io5';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Spinner from '@/components/ui/Spinner';
import Toast from '@/components/ui/Toast';
import {connectionErrorKey} from '@/lib/apiClient';
import {formatDate} from '@/lib/date';
import {destinationsApi} from '../api';
import {HISTORY_KEY} from '../keys';
import type {SearchDetail, SearchStatus, SearchSummary} from '../types';

// what the user asked, in a few words (the request, else the choices they made)
const titleOf = (search: SearchSummary, fallback: string) =>
  search.query || [...search.interests, search.region].filter(Boolean).join(', ') || fallback;

function Group({
  status,
  items,
  openingId,
  onOpen,
  onDelete,
}: {
  status: SearchStatus;
  items: SearchSummary[];
  openingId: string | null;
  onOpen: (search: SearchSummary) => void;
  onDelete: (search: SearchSummary) => void;
}) {
  const {t} = useTranslation();
  const label = t(status === 'draft' ? 'destinations.historyDrafts' : 'destinations.historyCreated');
  return (
    <section aria-label={label} className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">
          {label} <span className="font-normal text-slate-400">({items.length})</span>
        </h3>
        <p className="text-xs text-slate-500">{t(status === 'draft' ? 'destinations.historyDraftsHint' : 'destinations.historyCreatedHint')}</p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-3 text-center text-xs text-slate-400">—</p>
      ) : (
        <ul className="space-y-2">
          {items.map(search => (
            <li key={search.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{titleOf(search, t('destinations.historyUntitled'))}</p>
                <p className="truncate text-xs text-slate-500">
                  {formatDate(search.createdAt)} · {t('destinations.historyCount', {count: search.count})}
                  {search.names.length > 0 && ` · ${search.names.join(', ')}`}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline px-3 py-1.5 text-sm"
                disabled={openingId === search.id}
                aria-label={`${t('destinations.historyOpen')}: ${titleOf(search, t('destinations.historyUntitled'))}`}
                onClick={() => onOpen(search)}>
                {t('destinations.historyOpen')}
              </button>
              <button
                type="button"
                aria-label={`${t('destinations.historyDelete')}: ${titleOf(search, t('destinations.historyUntitled'))}`}
                className="grid size-9 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                onClick={() => onDelete(search)}>
                <IoTrashOutline size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// The earlier AI suggestions of the user in two groups (drafts: not used yet, created: a plan was
// started from them). Open one to read it again and change the request, or delete it.
export default function SearchHistory({onOpen}: {onOpen: (search: SearchDetail) => void}) {
  const {t} = useTranslation();
  const queryClient = useQueryClient();
  const history = useQuery({queryKey: HISTORY_KEY, queryFn: destinationsApi.history});
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<SearchSummary | null>(null);

  const fail = (error: unknown, key: string) =>
    Toast.show({type: 'error', text1: t('common.failed'), text2: t(connectionErrorKey(error) ?? key)});

  const open = async (search: SearchSummary) => {
    setOpeningId(search.id);
    try {
      onOpen(await destinationsApi.open(search.id));
    } catch (error) {
      fail(error, 'destinations.historyOpenFailed');
    } finally {
      setOpeningId(null);
    }
  };
  const remove = useMutation({
    mutationFn: (id: string) => destinationsApi.remove(id),
    onSuccess: () => {
      setDeleting(null);
      queryClient.invalidateQueries({queryKey: HISTORY_KEY});
      Toast.show({type: 'success', text1: t('common.success'), text2: t('destinations.historyDeleted')});
    },
    onError: error => {
      setDeleting(null);
      fail(error, 'destinations.historyDeleteFailed');
    },
  });

  const items = history.data ?? [];
  return (
    <section aria-labelledby="history-title" className="card space-y-4 p-4">
      <div>
        <h2 id="history-title" className="flex items-center gap-2 font-semibold text-slate-900">
          <IoTimeOutline size={18} className="text-brand-600" />
          {t('destinations.historyTitle')}
        </h2>
        <p className="text-xs text-slate-500">{t('destinations.historyIntro')}</p>
      </div>

      {history.isLoading && (
        <div className="grid place-items-center py-4">
          <Spinner size={24} />
        </div>
      )}
      {history.isError && (
        <div role="alert" className="space-y-2 text-center">
          <p className="text-sm text-slate-600">{t(connectionErrorKey(history.error) ?? 'destinations.historyLoadFailed')}</p>
          <button type="button" className="btn btn-outline px-3 py-1.5 text-sm" onClick={() => history.refetch()}>
            {t('common.retry')}
          </button>
        </div>
      )}
      {history.data && items.length === 0 && <p className="text-center text-sm text-slate-500">{t('destinations.historyEmpty')}</p>}
      {items.length > 0 && (
        <div className="space-y-5">
          <Group status="draft" items={items.filter(item => item.status === 'draft')} openingId={openingId} onOpen={open} onDelete={setDeleting} />
          <Group status="created" items={items.filter(item => item.status === 'created')} openingId={openingId} onOpen={open} onDelete={setDeleting} />
        </div>
      )}

      <ConfirmModal
        visible={!!deleting}
        danger
        title={t('destinations.historyDeleteTitle')}
        confirmText={t('destinations.historyDelete')}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}>
        {t('destinations.historyDeleteText')}
      </ConfirmModal>
    </section>
  );
}
