import {useEffect, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {IoAdd, IoChatbubblesOutline, IoClose, IoTrashOutline} from 'react-icons/io5';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Toast from '@/components/ui/Toast';
import {formatDate} from '@/lib/date';
import {chatApi} from '../api/chatApi';
import type {ChatSummary} from '../types';

// Drawer listing the user's saved conversations.
export default function ChatHistory({
  open,
  currentId,
  onClose,
  onSelect,
  onNewChat,
  onDeleted,
}: {
  open: boolean;
  currentId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDeleted: (id: string) => void;
}) {
  const {t} = useTranslation();
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState<ChatSummary | null>(null);

  const {data: chats = [], isLoading} = useQuery({
    queryKey: ['chats'],
    queryFn: chatApi.list,
    enabled: open,
  });

  const remove = useMutation({
    mutationFn: chatApi.remove,
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({queryKey: ['chats']});
      onDeleted(id);
    },
    onError: () => Toast.show({type: 'error', text1: t('common.failed'), text2: t('assistant.deleteFailed')}),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !toDelete && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, toDelete]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="absolute inset-0 z-20 animate-fade-in bg-slate-900/20" onClick={onClose} />
      <aside
        aria-label={t('assistant.historyTitle')}
        className="absolute inset-y-0 right-0 z-30 flex w-80 max-w-[88%] animate-fade-in flex-col bg-white shadow-2xl ring-1 ring-slate-200 md:rounded-l-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="font-semibold text-slate-900">{t('assistant.historyTitle')}</h2>
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100">
            <IoClose size={20} />
          </button>
        </div>

        <div className="p-3">
          <button type="button" onClick={onNewChat} className="btn btn-primary w-full">
            <IoAdd size={18} />
            {t('assistant.newChat')}
          </button>
        </div>

        <ul className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {isLoading &&
            [0, 1, 2].map(i => (
              <li key={i} className="animate-pulse space-y-2 rounded-xl p-3">
                <div className="h-3 w-3/4 rounded bg-slate-200" />
                <div className="h-2.5 w-1/3 rounded bg-slate-100" />
              </li>
            ))}
          {!isLoading && chats.length === 0 && (
            <li className="flex flex-col items-center gap-2 p-6 text-center text-sm text-slate-500">
              <IoChatbubblesOutline size={28} className="text-slate-300" />
              {t('assistant.noHistory')}
            </li>
          )}
          {chats.map(chat => {
            const active = chat._id === currentId;
            return (
              <li key={chat._id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelect(chat._id)}
                  aria-current={active}
                  className={`w-full rounded-xl py-2.5 pr-10 pl-3 text-left transition ${
                    active ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50'
                  }`}>
                  <span className={`block truncate text-sm font-medium ${active ? 'text-brand-800' : 'text-slate-800'}`}>
                    {chat.title || t('assistant.untitled')}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDate(chat.updatedAt ?? chat.createdAt)}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={t('assistant.deleteChat')}
                  title={t('assistant.deleteChat')}
                  onClick={() => setToDelete(chat)}
                  className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-slate-400 opacity-100 transition hover:bg-rose-50 hover:text-rose-600 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100">
                  <IoTrashOutline size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <ConfirmModal
        visible={toDelete !== null}
        title={t('assistant.deleteChatTitle')}
        confirmText={t('common.delete')}
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete._id);
          }
          setToDelete(null);
        }}>
        <p className="text-center text-sm text-slate-600">
          {t('assistant.deleteChatText', {title: toDelete?.title || t('assistant.untitled')})}
        </p>
      </ConfirmModal>
    </>
  );
}
