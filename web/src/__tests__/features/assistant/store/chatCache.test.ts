import {describe, expect, it} from 'vitest';
import {saveSession} from '@/features/auth/store/session';
import {chatCache, getSavedChatId, initialMessages, resetChatCache, saveChatId} from '@/features/assistant/store/chatCache';

describe('chatCache', () => {
  it('starts with the two welcome messages', () => {
    expect(chatCache.messages).toBe(initialMessages);
    expect(initialMessages.map(m => m.i18nKey)).toEqual(['assistant.welcome1', 'assistant.welcome2']);
  });

  it('resetChatCache drops the open conversation', () => {
    chatCache.messages = [...initialMessages, {type: 'user', text: 'hi', error: false}];
    chatCache.idChat = 'c1';

    resetChatCache();

    expect(chatCache.messages).toBe(initialMessages);
    expect(chatCache.idChat).toBeNull();
  });

  it('remembers the open conversation per account', () => {
    saveChatId('guest-chat');
    expect(getSavedChatId()).toBe('guest-chat');

    saveSession({accessToken: 't', data: {username: 'lan'}});
    expect(getSavedChatId()).toBeNull(); // another account, another key

    saveChatId('lan-chat');
    expect(getSavedChatId()).toBe('lan-chat');
    expect(window.localStorage.getItem('aloca.chat.lan')).toBe('lan-chat');
  });

  it('saveChatId(null) forgets it', () => {
    saveChatId('c1');
    saveChatId(null);
    expect(getSavedChatId()).toBeNull();
  });
});
