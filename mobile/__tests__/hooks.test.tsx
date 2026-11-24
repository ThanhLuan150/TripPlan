import React from 'react';
import {Keyboard, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../src/api';
import {CHAT_ERROR, CHAT_SUCCESS, chatApi} from '../src/api';
import {
  useChats,
  useGeneratedPlans,
  useHome,
  useNotifications,
  useRanking,
  useTrip,
  useTrips,
  useVideos,
} from '../src/hooks/queries';
import {useApiMutation} from '../src/hooks/useApiMutation';
import {useChat} from '../src/hooks/useChat';
import {useKeyboardVisible} from '../src/hooks/useKeyboard';
import {act, flush, makeAuth, queryClient, render, renderApp} from './helpers/render';

jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  chatApi: {send: jest.fn(), messages: jest.fn(), list: jest.fn(), remove: jest.fn()},
  contentApi: {home: jest.fn(), videos: jest.fn()},
  rankingApi: {get: jest.fn()},
  tripsApi: {list: jest.fn(), get: jest.fn(), generate: jest.fn()},
  profileApi: {notifications: jest.fn()},
}));

// Mounts a hook and exposes its latest value.
function hookOf<T>(useIt: () => T, wrap = true) {
  const out: {current: T} = {current: undefined as T};
  const Probe = () => {
    out.current = useIt();
    return null;
  };
  if (wrap) {
    renderApp(<Probe />);
  } else {
    render(<Probe />);
  }
  return out;
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('queries', () => {
  it('each hook reads through its api function', async () => {
    (api.contentApi.home as jest.Mock).mockResolvedValue({banners: []});
    (api.contentApi.videos as jest.Mock).mockResolvedValue([1]);
    (api.rankingApi.get as jest.Mock).mockResolvedValue([2]);
    (api.tripsApi.list as jest.Mock).mockResolvedValue([3]);
    (api.tripsApi.get as jest.Mock).mockResolvedValue({location: 'x'});
    (api.profileApi.notifications as jest.Mock).mockResolvedValue([4]);
    (api.tripsApi.generate as jest.Mock).mockResolvedValue({p: {}});
    (chatApi.list as jest.Mock).mockResolvedValue([5]);
    const params = {location: 'x'} as any;
    const all = hookOf(() => ({
      home: useHome(),
      videos: useVideos(),
      ranking: useRanking('weekly'),
      trips: useTrips(),
      trip: useTrip('9'),
      notifications: useNotifications(),
      plans: useGeneratedPlans(params),
      chats: useChats(true),
    }));
    await flush(10);
    const r = all.current;
    expect(r.home.data).toEqual({banners: []});
    expect(r.videos.data).toEqual([1]);
    expect(r.ranking.data).toEqual([2]);
    expect(r.trips.data).toEqual([3]);
    expect(r.trip.data).toEqual({location: 'x'});
    expect(api.tripsApi.get).toHaveBeenCalledWith('9');
    expect(r.notifications.data).toEqual([4]);
    expect(r.plans.data).toEqual({p: {}});
    expect(r.chats.data).toEqual([5]);
  });

  it('useChats does nothing while disabled', async () => {
    hookOf(() => useChats(false));
    await flush();
    expect(chatApi.list).not.toHaveBeenCalled();
  });
});

describe('useApiMutation', () => {
  it('exposes the error as text', async () => {
    const h = hookOf(() =>
      useApiMutation(async () => {
        throw {response: {data: {message: 'Nope'}}};
      }),
    );
    expect(h.current.errorMessage).toBe('');
    await act(async () => {
      h.current.mutate();
    });
    await flush();
    expect(h.current.errorMessage).toBe('Nope');
  });
});

describe('useKeyboardVisible', () => {
  const run = (os: 'ios' | 'android', show: string, hide: string) => {
    Platform.OS = os;
    const handlers: Record<string, () => void> = {};
    const remove = jest.fn();
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((
      e: string,
      cb: () => void,
    ) => {
      handlers[e] = cb;
      return {remove};
    }) as any);
    const out = hookOf(useKeyboardVisible, false);
    expect(out.current).toBe(false);
    act(() => handlers[show]());
    expect(out.current).toBe(true);
    act(() => handlers[hide]());
    expect(out.current).toBe(false);
  };
  afterEach(() => {
    jest.restoreAllMocks();
    Platform.OS = 'ios';
  });
  it('ios', () => run('ios', 'keyboardWillShow', 'keyboardWillHide'));
  it('android', () => run('android', 'keyboardDidShow', 'keyboardDidHide'));
});

describe('useChat', () => {
  type Chat = ReturnType<typeof useChat>;
  const mount = (auth = makeAuth()) => {
    const out: {current: Chat} = {current: undefined as any};
    const Probe = () => {
      out.current = useChat();
      return null;
    };
    const client = queryClient();
    const spy = jest.spyOn(client, 'invalidateQueries');
    renderApp(<Probe />, {auth, client});
    return {out, spy};
  };
  const send = async (c: {current: Chat}, text: string) => {
    await act(async () => c.current.sendPrompt(text));
    await flush();
  };

  it('starts with the two welcome messages', () => {
    const {out} = mount();
    expect(out.current.messages).toHaveLength(2);
    expect(out.current.idChat).toBeNull();
  });

  it('sends a prompt and shows the answer, remembering the conversation', async () => {
    (chatApi.send as jest.Mock).mockResolvedValue({
      message: CHAT_SUCCESS,
      data: {ChatResponse: 'Hi!', chatAi: {_id: 'c1'}},
    });
    const {out, spy} = mount();
    await send(out, '  hello  ');
    expect(chatApi.send).toHaveBeenCalledWith('hello', null);
    expect(out.current.messages.slice(-2).map(m => m.text)).toEqual(['hello', 'Hi!']);
    expect(out.current.idChat).toBe('c1');
    expect(await AsyncStorage.getItem('aloca.chat.luan')).toBe('c1');
    expect(spy).toHaveBeenCalled();
    await send(out, 'again');
    expect(chatApi.send).toHaveBeenLastCalledWith('again', 'c1');
  });

  it('takes the conversation id from the top level too, and stores as guest', async () => {
    (chatApi.send as jest.Mock).mockResolvedValue({message: 'plain', chatAi: {_id: 'c2'}});
    const {out} = mount(makeAuth({user: null}));
    await send(out, 'x');
    expect(out.current.messages.at(-1)).toMatchObject({text: 'plain', error: false});
    expect(await AsyncStorage.getItem('aloca.chat.guest')).toBe('c2');
  });

  it('ignores empty prompts', async () => {
    const {out} = mount();
    await send(out, '   ');
    expect(chatApi.send).not.toHaveBeenCalled();
  });

  it('shows an error bubble for the backend error and for a failed call, and resends', async () => {
    (chatApi.send as jest.Mock).mockResolvedValueOnce({message: CHAT_ERROR});
    const {out} = mount();
    await send(out, 'q');
    expect(out.current.messages.at(-1)).toMatchObject({error: true, i18nKey: 'assistant.error'});

    (chatApi.send as jest.Mock).mockRejectedValueOnce(new Error('net'));
    await act(async () => out.current.resend());
    await flush();
    expect(out.current.messages.filter(m => m.error)).toHaveLength(1);

    (chatApi.send as jest.Mock).mockResolvedValueOnce({
      message: CHAT_SUCCESS,
      data: {ChatResponse: 'ok'},
    });
    await act(async () => out.current.resend());
    await flush();
    expect(out.current.messages.at(-1)).toMatchObject({text: 'ok', error: false});
    expect(out.current.messages.some(m => m.error)).toBe(false);
  });

  it('opens a saved conversation, and starts over from it', async () => {
    (chatApi.messages as jest.Mock).mockResolvedValue([
      {role: 'user', text: 'q', createdAt: ''},
      {role: 'model', text: 'a', createdAt: ''},
    ]);
    const {out} = mount();
    await act(async () => out.current.openConversation('c9'));
    await flush();
    expect(out.current.messages.slice(2).map(m => [m.type, m.text])).toEqual([
      ['user', 'q'],
      ['bot', 'a'],
    ]);
    expect(out.current.idChat).toBe('c9');
    act(() => out.current.startNew());
    expect(out.current.messages).toHaveLength(2);
    expect(out.current.idChat).toBeNull();
    expect(await AsyncStorage.getItem('aloca.chat.luan')).toBeNull();
  });

  it('starts over when the saved conversation no longer exists', async () => {
    (chatApi.messages as jest.Mock).mockRejectedValue(new Error('gone'));
    const {out} = mount();
    await act(async () => out.current.openConversation('gone'));
    await flush();
    expect(out.current.idChat).toBeNull();
    expect(out.current.messages).toHaveLength(2);
  });

  it('reopens the last conversation after a restart', async () => {
    await AsyncStorage.setItem('aloca.chat.luan', 'saved');
    (chatApi.messages as jest.Mock).mockResolvedValue([]);
    const {out} = mount();
    await flush(10);
    expect(chatApi.messages).toHaveBeenCalledWith('saved');
    expect(out.current.idChat).toBe('saved');
  });

  it('survives storage failing at start', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    const {out} = mount();
    await flush();
    expect(out.current.messages).toHaveLength(2);
  });
});
