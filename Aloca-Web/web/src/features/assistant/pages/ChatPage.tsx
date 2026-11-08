import {FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {FiSend} from 'react-icons/fi';
import {IoAdd, IoAddCircle, IoReload, IoSparkles, IoTimeOutline} from 'react-icons/io5';
import {routes} from '@/app/routes';
import Toast from '@/components/ui/Toast';
import {extractTripHints} from '@/features/trips/utils/tripHints';
import type {TripFormPrefill} from '@/features/trips/types';
import {apiStatus, connectionErrorKey, isAiError} from '@/lib/apiClient';
import {CHAT_ERROR, CHAT_SUCCESS, chatApi} from '../api/chatApi';
import ChatHistory from '../components/ChatHistory';
import {chatCache, getSavedChatId, initialMessages, saveChatId} from '../store/chatCache';
import type {Message} from '../types';
import logo from '@/assets/images/Icon.png';

const suggestionKeys = [
  'assistant.suggestion1',
  'assistant.suggestion2',
  'assistant.suggestion3',
  'assistant.suggestion4',
];

function BotAvatar() {
  return (
    <img
      src={logo}
      alt=""
      className="size-8 shrink-0 rounded-full bg-white object-cover ring-1 ring-slate-200"
    />
  );
}

export const ChatPage = () => {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<Message[]>(chatCache.messages);
  const [idChat, setIdChat] = useState<string | null>(chatCache.idChat);
  const [textInput, setTextInput] = useState('');
  const [reloadQuest, setReloadQuest] = useState('');
  const [isAnalyzing, setAnalyzing] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    chatCache.messages = data;
    chatCache.idChat = idChat;
    if (idChat) {
      saveChatId(idChat);
    }
  }, [data, idChat]);

  // Opens a saved conversation: its messages come from the backend.
  const openConversation = useCallback(
    async (id: string) => {
      setHistoryOpen(false);
      setLoadingChat(true);
      try {
        const messages = await chatApi.messages(id);
        setData([
          ...initialMessages,
          ...messages.map<Message>(m => ({
            type: m.role === 'user' ? 'user' : 'bot',
            text: m.text,
            error: false,
          })),
        ]);
        setIdChat(id);
        setReloadQuest('');
      } catch (error) {
        if (apiStatus(error) === 404) {
          // deleted meanwhile: start over
          saveChatId(null);
          setData(initialMessages);
          setIdChat(null);
        } else {
          Toast.show({
            type: 'error',
            text1: t('common.failed'),
            text2: t(connectionErrorKey(error) ?? 'assistant.loadFailed'),
          });
        }
      } finally {
        setLoadingChat(false);
      }
    },
    [t],
  );

  // After a page reload the in-memory chat is empty: reopen the last conversation.
  useEffect(() => {
    if (restored.current) {
      return;
    }
    restored.current = true;
    const saved = getSavedChatId();
    if (saved && !chatCache.idChat && chatCache.messages === initialMessages) {
      openConversation(saved);
    }
  }, [openConversation]);

  const startNewChat = () => {
    setHistoryOpen(false);
    saveChatId(null);
    setData(initialMessages);
    setIdChat(null);
    setReloadQuest('');
    setTextInput('');
  };

  // FlatList onContentSizeChange -> scrollToEnd
  useEffect(() => {
    listRef.current?.scrollTo({top: listRef.current.scrollHeight, behavior: 'smooth'});
  }, [data, isAnalyzing]);

  const sendRequest = async (prompt: string) => {
    setAnalyzing(true);
    try {
      const body = await chatApi.send(prompt, idChat);
      const newId = body.data?.chatAi?._id ?? body.chatAi?._id;
      if (newId) {
        setIdChat(newId);
      }
      if (body.message === CHAT_SUCCESS && body.data) {
        setData(prev => [...prev, {type: 'bot', text: body.data!.ChatResponse, error: false}]);
        // new conversation / new last-message time in the history list
        queryClient.invalidateQueries({queryKey: ['chats']});
      } else if (body.message === CHAT_ERROR) {
        setData(prev => [...prev, {type: 'bot', i18nKey: 'assistant.error', error: true}]);
      } else {
        setData(prev => [...prev, {type: 'bot', text: body.message, error: false}]);
      }
    } catch (error) {
      console.error('Có lỗi xảy ra khi gửi yêu cầu:', error);
      const key =
        connectionErrorKey(error) ??
        (isAiError(error) ? 'assistant.aiUnavailable' : 'assistant.error');
      setData(prev => [...prev, {type: 'bot', i18nKey: key, error: true}]);
    } finally {
      setAnalyzing(false);
    }
  };

  const sendPrompt = (text: string) => {
    const prompt = text.trim();
    if (!prompt || isAnalyzing || loadingChat) {
      return;
    }
    setReloadQuest(prompt);
    setData(prev => [...prev, {type: 'user', text: prompt, error: false}]);
    setTextInput('');
    sendRequest(prompt);
  };

  const handleSend = (e?: FormEvent) => {
    e?.preventDefault();
    sendPrompt(textInput);
  };

  const reloadSend = () => {
    setData(prev => prev.filter(item => item.error !== true));
    sendRequest(reloadQuest);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // Opens the trip form filled from the AI answer at `index` (and the question
  // before it): destination, days, people, and the answer as a note for the AI.
  const planFromSuggestion = (index: number) => {
    const answer = data[index]?.text ?? '';
    const question = data[index - 1]?.type === 'user' ? data[index - 1].text : undefined;
    const hints = extractTripHints(answer, question);
    const state: TripFormPrefill = {...hints, note: answer.slice(0, 1500), fromChat: true};
    navigate(routes.TripPlanChoose, {state});
  };

  const textOf = (m: Message) => (m.i18nKey ? t(m.i18nKey) : m.text);
  const noUserMessage = !data.some(m => m.type === 'user');
  const title = data.find(m => m.type === 'user')?.text;

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-7.5rem-env(safe-area-inset-bottom))] w-full max-w-3xl flex-col overflow-hidden md:h-[calc(100dvh-7.5rem)]">
      {/* toolbar: current conversation + history / new chat */}
      <div className="flex items-center gap-2 border-b border-slate-200/70 px-4 py-2 md:px-6">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-500" title={title}>
          {title ?? t('assistant.newChat')}
        </p>
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          title={t('assistant.historyTitle')}
          aria-label={t('assistant.historyTitle')}
          className="btn btn-ghost px-3 py-1.5 text-sm">
          <IoTimeOutline size={17} />
          <span className="hidden sm:inline">{t('assistant.history')}</span>
        </button>
        <button
          type="button"
          onClick={startNewChat}
          disabled={noUserMessage || isAnalyzing}
          title={t('assistant.newChat')}
          aria-label={t('assistant.newChat')}
          className="btn btn-outline px-3 py-1.5 text-sm">
          <IoAdd size={17} />
          <span className="hidden sm:inline">{t('assistant.newChat')}</span>
        </button>
      </div>

      <ChatHistory
        open={historyOpen}
        currentId={idChat}
        onClose={() => setHistoryOpen(false)}
        onSelect={openConversation}
        onNewChat={startNewChat}
        onDeleted={id => {
          if (id === idChat) {
            startNewChat();
          }
        }}
      />

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
        {loadingChat ? (
          <div className="flex min-h-full flex-col justify-end gap-3" aria-label={t('assistant.loadingChat')}>
            {['w-2/3', 'ml-auto w-1/2', 'w-3/4', 'ml-auto w-2/5'].map((w, i) => (
              <div key={i} className={`h-12 animate-pulse rounded-2xl ${i % 2 ? 'bg-brand-100' : 'bg-slate-200'} ${w}`} />
            ))}
          </div>
        ) : (
        <div className="flex min-h-full flex-col justify-end gap-3">
          {data.map((item, index) =>
            item.type === 'user' ? (
              <div key={index} className="flex animate-pop-in justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-500 px-4 py-2.5 break-words whitespace-pre-wrap text-white shadow-sm md:max-w-[70%]">
                  {textOf(item)}
                </p>
              </div>
            ) : (
              <div key={index} className="flex animate-pop-in items-end gap-2">
                <BotAvatar />
                <div className="flex max-w-[85%] flex-col items-start gap-1 md:max-w-[75%]">
                  <p
                    className={`rounded-2xl rounded-bl-md bg-white px-4 py-2.5 leading-relaxed break-words whitespace-pre-wrap shadow-soft ring-1 ${
                      item.error ? 'text-rose-700 ring-rose-200' : 'text-slate-800 ring-slate-100'
                    }`}>
                    {textOf(item)}
                  </p>
                  {item.error && index === data.length - 1 && !isAnalyzing && (
                    <button
                      type="button"
                      onClick={reloadSend}
                      className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50">
                      <IoReload size={14} />
                      {t('assistant.resend')}
                    </button>
                  )}
                  {/* AI answers (not the built-in greetings / errors) can start a plan */}
                  {!item.error && item.text && (
                    <button
                      type="button"
                      onClick={() => planFromSuggestion(index)}
                      className="flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700 transition hover:border-brand-400 hover:bg-brand-50">
                      <IoAddCircle size={15} />
                      {t('assistant.planFromSuggestion')}
                    </button>
                  )}
                </div>
              </div>
            ),
          )}

          {isAnalyzing && (
            <div className="flex items-end gap-2" aria-label={t('assistant.typing')}>
              <BotAvatar />
              <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3.5 shadow-soft ring-1 ring-slate-100">
                <span className="size-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                <span className="size-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                <span className="size-2 animate-bounce rounded-full bg-slate-400" />
              </div>
            </div>
          )}

          {noUserMessage && !isAnalyzing && (
            <div className="mt-2 flex flex-wrap gap-2 pl-10">
              {suggestionKeys.map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => sendPrompt(t(key))}
                  className="flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-sm text-brand-700 transition hover:border-brand-400 hover:bg-brand-50">
                  <IoSparkles size={14} />
                  {t(key)}
                </button>
              ))}
            </div>
          )}
        </div>
        )}
      </div>

      <form onSubmit={handleSend} className="px-4 pt-1 pb-3 md:px-6 md:pb-5">
        <div className="flex items-end gap-2 rounded-3xl bg-white p-1.5 pl-4 shadow-soft ring-1 ring-slate-200 transition focus-within:ring-2 focus-within:ring-brand-400">
          <textarea
            placeholder={t('assistant.placeholder')}
            rows={1}
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label={t('assistant.message')}
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-[15px] outline-none [field-sizing:content] placeholder:text-slate-400"
          />
          <button
            type="submit"
            aria-label={t('assistant.send')}
            disabled={isAnalyzing || loadingChat || textInput.trim() === ''}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600 disabled:bg-slate-200 disabled:text-slate-400">
            <FiSend size={18} />
          </button>
        </div>
      </form>
    </div>
  );
};
