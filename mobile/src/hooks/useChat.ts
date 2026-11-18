import {useCallback, useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useQueryClient} from '@tanstack/react-query';
import {CHAT_ERROR, CHAT_SUCCESS, chatApi} from '../api';
import {useAuth} from '../store/session';
import {queryKeys} from './queries';
import {useApiMutation} from './useApiMutation';

// A chat bubble. Built-in messages keep an i18n key so they follow the selected language.
export interface Message {
  type: 'bot' | 'user';
  text?: string;
  i18nKey?: string;
  error: boolean;
}

export const initialMessages: Message[] = [
  {type: 'bot', i18nKey: 'assistant.welcome1', error: false},
  {type: 'bot', i18nKey: 'assistant.welcome2', error: false},
];

// State of one conversation with the assistant: messages, the saved conversation id,
// sending (with "resend" after an error) and opening a saved conversation.
export function useChat() {
  const {user} = useAuth();
  const qc = useQueryClient();
  const storageKey = `aloca.chat.${user?.username ?? 'guest'}`;
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [idChat, setIdChat] = useState<string | null>(null);
  const idRef = useRef<string | null>(null);
  const lastPrompt = useRef('');

  const remember = useCallback(
    (id: string | null) => {
      idRef.current = id;
      setIdChat(id);
      if (id) void AsyncStorage.setItem(storageKey, id);
      else void AsyncStorage.removeItem(storageKey);
    },
    [storageKey],
  );

  const send = useApiMutation((prompt: string) => chatApi.send(prompt, idRef.current), {
    onSuccess: body => {
      const newId = body.data?.chatAi?._id ?? body.chatAi?._id;
      if (newId) remember(newId);
      if (body.message === CHAT_SUCCESS && body.data) {
        setMessages(p => [...p, {type: 'bot', text: body.data!.ChatResponse, error: false}]);
        void qc.invalidateQueries({queryKey: queryKeys.chats});
      } else if (body.message === CHAT_ERROR) {
        setMessages(p => [...p, {type: 'bot', i18nKey: 'assistant.error', error: true}]);
      } else {
        setMessages(p => [...p, {type: 'bot', text: body.message, error: false}]);
      }
    },
    onError: () => setMessages(p => [...p, {type: 'bot', i18nKey: 'assistant.error', error: true}]),
  });

  const open = useApiMutation((id: string) => chatApi.messages(id), {
    onSuccess: (list, id) => {
      setMessages([...initialMessages, ...list.map<Message>(m => ({type: m.role === 'user' ? 'user' : 'bot', text: m.text, error: false}))]);
      remember(id);
      lastPrompt.current = '';
    },
    // the conversation was deleted meanwhile: start over
    onError: () => startNew(),
  });

  const startNew = useCallback(() => {
    remember(null);
    setMessages(initialMessages);
    lastPrompt.current = '';
  }, [remember]);

  const sendPrompt = (text: string) => {
    const prompt = text.trim();
    if (!prompt || send.isPending || open.isPending) return;
    lastPrompt.current = prompt;
    setMessages(p => [...p, {type: 'user', text: prompt, error: false}]);
    send.mutate(prompt);
  };

  const resend = () => {
    setMessages(p => p.filter(m => !m.error));
    send.mutate(lastPrompt.current);
  };

  // after the app restarts, reopen the last conversation
  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then(saved => saved && open.mutate(saved))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    messages,
    idChat,
    sending: send.isPending,
    loading: open.isPending,
    sendPrompt,
    resend,
    startNew,
    openConversation: open.mutate,
  };
}
