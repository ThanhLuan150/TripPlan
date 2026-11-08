import {storage} from '@/lib/storage';
import {getUser} from '@/features/auth/store/session';
import type {Message} from '../types';

export const initialMessages: Message[] = [
  {type: 'bot', i18nKey: 'assistant.welcome1', error: false},
  {type: 'bot', i18nKey: 'assistant.welcome2', error: false},
];

// Keeps the open conversation while the user moves between tabs (on mobile
// the tab screens stayed mounted). Reset on sign-out.
export const chatCache: {messages: Message[]; idChat: string | null} = {
  messages: initialMessages,
  idChat: null,
};

export const resetChatCache = () => {
  chatCache.messages = initialMessages;
  chatCache.idChat = null;
};

// The id of the open conversation survives a page reload (per account); the
// messages themselves are stored by the backend.
const savedIdKey = () => `aloca.chat.${getUser()?.username ?? 'guest'}`;

export const getSavedChatId = () => storage.getItem(savedIdKey());

export const saveChatId = (id: string | null) =>
  id ? storage.setItem(savedIdKey(), id) : storage.removeItem(savedIdKey());
