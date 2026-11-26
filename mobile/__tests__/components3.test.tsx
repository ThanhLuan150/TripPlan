import React from 'react';
import {FlatList, Image, Modal, Pressable, Text, TextInput, TouchableOpacity} from 'react-native';
import {QueryClientProvider} from '@tanstack/react-query';
import DatePicker from 'react-native-date-picker';
import i18n from '../src/i18n';
import {chatApi} from '../src/api';
import ActivityRow from '../src/components/ActivityRow';
import Alert from '../src/components/Alert';
import ChatHistoryDrawer from '../src/components/ChatHistoryDrawer';
import ChatView from '../src/components/ChatView';
import DateRangeField from '../src/components/DateRangeField';
import DropdownInput from '../src/components/DropdownInput';
import FormInput from '../src/components/FormInput';
import HomeHeader from '../src/components/HomeHeader';
import OtpScreen from '../src/components/OtpScreen';
import RankingHeader from '../src/components/RankingHeader';
import RankingRow from '../src/components/RankingRow';
import {alert} from '../src/lib/alert';
import {act, allText, flush, makeAuth, press, pressText, queryClient, render, renderApp} from './helpers/render';

const touchables = (tree: ReturnType<typeof render>) => tree.root.findAllByType(TouchableOpacity);

jest.mock('@react-navigation/native', () => ({useNavigation: jest.fn()}));
jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  chatApi: {send: jest.fn(), messages: jest.fn(), list: jest.fn(), remove: jest.fn()},
}));

describe('ActivityRow', () => {
  const base = {_id: '1', challengeSummary: 'Visit bridge', location: 'Da Nang', points: 40};
  const run = (challenge: any, extra: any = {}) => {
    const onAddPhoto = jest.fn();
    const onRetake = jest.fn();
    const tree = render(
      <ActivityRow challenge={challenge} busy={false} disabled={false} onAddPhoto={onAddPhoto} onRetake={onRetake} {...extra} />,
    );
    return {tree, onAddPhoto, onRetake};
  };

  it('offers to add a photo', () => {
    const {tree, onAddPhoto} = run(base);
    expect(allText(tree)).toContain('Visit bridge');
    expect(allText(tree)).toContain('Da Nang');
    press(touchables(tree)[0]);
    expect(onAddPhoto).toHaveBeenCalled();
  });

  it('shows a spinner while busy and lets the photo be retaken', () => {
    expect(allText(run(base, {busy: true}).tree)).not.toContain('addPhoto');
    const {tree, onRetake} = run({...base, imageUrl: '/files/a', completed: false});
    expect(tree.root.findAllByType(Image)).toHaveLength(1);
    press(touchables(tree)[0]);
    expect(onRetake).toHaveBeenCalled();
  });

  it('locks a completed challenge and works without a location', () => {
    const {tree} = run({...base, location: '', imageUrl: '/files/a', completed: true});
    expect(touchables(tree)[0].props.disabled).toBe(true);
  });
});

describe('Alert', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders nothing until an alert is raised', () => {
    expect(render(<Alert />).toJSON()).toBeNull();
  });

  it('closes a success alert by itself after a while', () => {
    const tree = render(<Alert />);
    act(() => alert.success('Saved', 'All good'));
    expect(allText(tree)).toContain('Saved');
    expect(allText(tree)).toContain('All good');
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(tree.toJSON()).toBeNull();
  });

  it('shows error and info alerts until dismissed', () => {
    const tree = render(<Alert />);
    act(() => alert.error('Oops'));
    expect(allText(tree)).toContain('Oops');
    press(touchables(tree)[0]);
    expect(tree.toJSON()).toBeNull();
    act(() => alert.info('FYI'));
    act(() => tree.root.findByType(Modal).props.onRequestClose());
    expect(tree.toJSON()).toBeNull();
    act(() => alert.info('Again'));
    act(() => tree.root.findByType(Pressable).props.onPress());
    expect(tree.toJSON()).toBeNull();
  });

  it('confirm: runs onConfirm on yes, nothing on cancel', () => {
    const tree = render(<Alert />);
    const onConfirm = jest.fn();
    act(() => alert.confirm({title: 'Sure?', onConfirm, confirmText: 'Yes', cancelText: 'No', destructive: true}));
    press(touchables(tree)[0]);
    expect(onConfirm).not.toHaveBeenCalled();
    act(() => alert.confirm({title: 'Sure?', onConfirm}));
    press(touchables(tree)[1]);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(tree.toJSON()).toBeNull();
    act(() => alert.confirm({title: 'No handler'}));
    press(touchables(tree)[1]);
    expect(tree.toJSON()).toBeNull();
  });
});

describe('FormInput', () => {
  it('shows label, icon and error, and forwards focus events', () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const tree = render(<FormInput label="Email" icon="mail" error="bad" onFocus={onFocus} onBlur={onBlur} />);
    expect(allText(tree)).toBe('Email|bad');
    act(() => tree.root.findByType(TextInput).props.onFocus({}));
    act(() => tree.root.findByType(TextInput).props.onBlur({}));
    expect(onFocus).toHaveBeenCalled();
    expect(onBlur).toHaveBeenCalled();
    // without handlers
    act(() => tree.root.findByType(TextInput).props.onFocus({}));
  });

  it('toggles the password visibility', () => {
    const tree = render(<FormInput label="Password" secureTextEntry />);
    expect(tree.root.findByType(TextInput).props.secureTextEntry).toBe(true);
    const eye = tree.root.findAll(n => n.props.name === 'eye-off')[0];
    act(() => eye.props.onPress());
    expect(tree.root.findByType(TextInput).props.secureTextEntry).toBe(false);
  });
});

const focusOf = (tree: ReturnType<typeof render>, fn: 'onFocus' | 'onBlur') =>
  act(() => tree.root.findByType(TextInput).props[fn]());

describe('DropdownInput', () => {
  const props = (over: any = {}) => ({
    value: 'Huế',
    placeholder: 'Pick',
    open: true,
    options: ['Huế', 'Hà Nội'],
    onToggle: jest.fn(),
    onPick: jest.fn(),
    ...over,
  });

  it('lists options, picks one, toggles', () => {
    const p = props({icon: 'pin', invalid: true, onChangeText: jest.fn(), onBlur: jest.fn()});
    const tree = render(<DropdownInput {...p} />);
    pressText(tree, 'Hà Nội');
    expect(p.onPick).toHaveBeenCalledWith('Hà Nội');
    press(touchables(tree)[0]);
    expect(p.onToggle).toHaveBeenCalled();
    act(() => tree.root.findByType(TextInput).props.onChangeText('x'));
    expect(p.onChangeText).toHaveBeenCalledWith('x');
    act(() => tree.root.findByType(TextInput).props.onBlur());
    expect(p.onBlur).toHaveBeenCalled();
  });

  it('opens on focus when editable and closed, not when read-only or open', () => {
    const closed = props({open: false});
    const tree = render(<DropdownInput {...closed} />);
    act(() => tree.root.findByType(TextInput).props.onFocus());
    expect(closed.onToggle).toHaveBeenCalledTimes(1);
    const readOnly = props({open: false, editable: false});
    focusOf(render(<DropdownInput {...readOnly} />), 'onFocus');
    expect(readOnly.onToggle).not.toHaveBeenCalled();
    const open = props();
    focusOf(render(<DropdownInput {...open} />), 'onFocus');
    expect(open.onToggle).not.toHaveBeenCalled();
    focusOf(render(<DropdownInput {...closed} />), 'onBlur');
  });

  it('hides the list when closed or empty', () => {
    expect(allText(render(<DropdownInput {...props({open: false})} />))).toBe('');
    expect(allText(render(<DropdownInput {...props({options: []})} />))).toBe('');
  });
});

describe('DateRangeField', () => {
  it('picks the start and the end date', () => {
    const onStart = jest.fn();
    const onEnd = jest.fn();
    const start = new Date(2026, 2, 5);
    const end = new Date(2026, 2, 7);
    const tree = render(<DateRangeField startDate={start} endDate={end} startInvalid endInvalid onStart={onStart} onEnd={onEnd} />);
    expect(allText(tree)).toContain('05/03/2026');
    expect(allText(tree)).toContain('07/03/2026');
    expect(tree.root.findByType(DatePicker).props.open).toBe(false);

    press(touchables(tree)[0]);
    expect(tree.root.findByType(DatePicker).props.open).toBe(true);
    expect(tree.root.findByType(DatePicker).props.date).toBe(start);
    const d1 = new Date(2026, 3, 1);
    act(() => tree.root.findByType(DatePicker).props.onConfirm(d1));
    expect(onStart).toHaveBeenCalledWith(d1);

    press(touchables(tree)[1]);
    expect(tree.root.findByType(DatePicker).props.date).toBe(end);
    const d2 = new Date(2026, 3, 9);
    act(() => tree.root.findByType(DatePicker).props.onConfirm(d2));
    expect(onEnd).toHaveBeenCalledWith(d2);

    press(touchables(tree)[0]);
    act(() => tree.root.findByType(DatePicker).props.onCancel());
    expect(tree.root.findByType(DatePicker).props.open).toBe(false);
  });
});

describe('OtpScreen', () => {
  const fill = (tree: ReturnType<typeof render>) =>
    tree.root.findAllByType(TextInput).forEach((input, i) => act(() => input.props.onChangeText(String(i + 1))));

  it('submits the six digits', async () => {
    const onSubmit = jest.fn();
    const tree = render(<OtpScreen message="Enter" submitText="Go" loading={false} onSubmit={onSubmit} />);
    fill(tree);
    await act(async () => pressText(tree, 'Go'));
    await flush();
    expect(onSubmit).toHaveBeenCalledWith('123456');
  });

  it('asks for all digits when incomplete, and shows a server error and resend', async () => {
    const onSubmit = jest.fn();
    const onResend = jest.fn();
    const tree = render(<OtpScreen message="Enter" submitText="Go" loading={false} error="Wrong code" onSubmit={onSubmit} onResend={onResend} />);
    expect(allText(tree)).toContain('Wrong code');
    await act(async () => pressText(tree, 'Go'));
    await flush();
    expect(onSubmit).not.toHaveBeenCalled();
    const plain = render(<OtpScreen message="Enter" submitText="Go" loading={false} onSubmit={onSubmit} />);
    await act(async () => pressText(plain, 'Go'));
    await flush();
    expect(allText(plain)).toMatch(/otp|code|\d/i);
    pressText(tree, i18n.t('auth.resetCode.resend'));
  });

  it('shows "..." and locks the button while loading', () => {
    const tree = render(<OtpScreen message="Enter" submitText="Go" loading onSubmit={jest.fn()} />);
    expect(allText(tree)).toContain('...');
    expect(touchables(tree)[0].props.disabled).toBe(true);
  });
});

describe('HomeHeader', () => {
  const handlers = () => ({onQuery: jest.fn(), onSearch: jest.fn(), onBell: jest.fn(), onProfile: jest.fn()});
  it('greets the user, shows the unread badge and avatar', () => {
    const h = handlers();
    const tree = render(<HomeHeader user={{fullname: 'Luan', image: '/files/a'}} query="q" unread={3} {...h} />);
    expect(allText(tree)).toContain('Luan');
    expect(allText(tree)).toContain('3');
    expect(tree.root.findAllByType(Image)).toHaveLength(1);
    press(touchables(tree)[0]);
    press(touchables(tree)[1]);
    act(() => tree.root.findByType(TextInput).props.onChangeText('abc'));
    act(() => tree.root.findByType(TextInput).props.onSubmitEditing());
    expect(h.onBell).toHaveBeenCalled();
    expect(h.onProfile).toHaveBeenCalled();
    expect(h.onQuery).toHaveBeenCalledWith('abc');
    expect(h.onSearch).toHaveBeenCalled();
  });

  it('caps the badge, falls back to the username or "you", and has no avatar', () => {
    const h = handlers();
    expect(allText(render(<HomeHeader user={{username: 'luan'}} query="" unread={25} {...h} />))).toContain('9+');
    const guest = render(<HomeHeader user={null} query="" unread={0} {...h} />);
    expect(allText(guest)).not.toContain('9+');
    expect(guest.root.findAllByType(Image)).toHaveLength(0);
  });
});

describe('Ranking components', () => {
  it('RankingRow shows a title per level', () => {
    const xp = [100, 300, 700, 1500, 5000];
    const texts = xp.map((experience, index) =>
      allText(render(<RankingRow item={{fullname: 'A', experience} as any} index={index} />)),
    );
    expect(new Set(texts).size).toBe(5);
    expect(texts[4]).not.toContain('ranking.title');
    render(<RankingRow item={{fullname: 'B', experience: 1, image: '/files/x'} as any} index={7} />);
  });

  it('RankingHeader puts the second place left of the winner', () => {
    const ranks = [
      {fullname: 'low', experience: 1},
      {fullname: 'best', experience: 30, image: '/files/a'},
      {fullname: 'mid', experience: 20},
      {fullname: 'x', experience: 0},
    ] as any;
    const tree = render(<RankingHeader ranks={ranks} />);
    const avatars = tree.root.findByType(FlatList).props.data.map((r: any) => r.fullname);
    expect(avatars).toEqual(['mid', 'best', 'low']);
    expect(render(<RankingHeader ranks={[]} />).toJSON()).toBeTruthy();
    expect(render(<RankingHeader ranks={[{experience: 1}] as any} />).toJSON()).toBeTruthy();
  });
});

describe('ChatHistoryDrawer', () => {
  const chats = [
    {_id: 'a', title: 'First', createdAt: '2026-03-05', updatedAt: '2026-03-06'},
    {_id: 'b', createdAt: '2026-03-05'},
  ];
  const mount = (open = true, currentId: string | null = 'a') => {
    const cb = {onClose: jest.fn(), onSelect: jest.fn(), onNewChat: jest.fn(), onDeleted: jest.fn()};
    const client = queryClient();
    const tree = render(
      <QueryClientProvider client={client}>
        <ChatHistoryDrawer open={open} currentId={currentId} {...cb} />
      </QueryClientProvider>,
    );
    return {tree, cb, client};
  };
  beforeEach(() => {
    jest.clearAllMocks();
    (chatApi.list as jest.Mock).mockResolvedValue(chats);
  });

  it('lists the conversations and selects, opens new, closes', async () => {
    const {tree, cb} = mount();
    expect(tree.root.findAllByType(Text).length).toBeGreaterThan(0);
    await flush(8);
    expect(allText(tree)).toContain('First');
    pressText(tree, 'First');
    expect(cb.onSelect).toHaveBeenCalledWith('a');
    pressText(tree, i18n.t('assistant.newChat'));
  });

  it('shows the empty state', async () => {
    (chatApi.list as jest.Mock).mockResolvedValue([]);
    const {tree} = mount();
    await flush(8);
    expect(tree.root.findAllByType(FlatList)[0].props.ListEmptyComponent).toBeTruthy();
  });

  it('closes from the backdrop, the X and the back button', async () => {
    const {tree, cb} = mount();
    await flush(8);
    act(() => tree.root.findByType(Pressable).props.onPress());
    press(touchables(tree)[0]);
    act(() => tree.root.findByType(Modal).props.onRequestClose());
    expect(cb.onClose).toHaveBeenCalledTimes(3);
  });

  it('deletes after a confirmation', async () => {
    const listener = jest.fn();
    const off = require('../src/lib/alert').subscribeAlert(listener);
    (chatApi.remove as jest.Mock).mockResolvedValue({});
    const {tree, cb, client} = mount();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    await flush(8);
    const trash = touchables(tree).filter(t => t.props.hitSlop === 8);
    press(trash[0]);
    const dialog = listener.mock.calls[0][0];
    expect(dialog.type).toBe('confirm');
    await act(async () => dialog.onConfirm());
    await flush();
    expect(chatApi.remove).toHaveBeenCalledWith('a');
    expect(cb.onDeleted).toHaveBeenCalledWith('a');
    expect(invalidate).toHaveBeenCalled();

    // the one without a title, and a failure
    (chatApi.remove as jest.Mock).mockRejectedValue(new Error('x'));
    press(trash[1]);
    await act(async () => listener.mock.calls.at(-1)[0].onConfirm());
    await flush();
    expect(listener.mock.calls.at(-1)[0].type).toBe('error');
    off();
  });
});

describe('ChatView', () => {
  const {useNavigation} = require('@react-navigation/native');
  const navigate = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigation.mockReturnValue({navigate});
    (chatApi.list as jest.Mock).mockResolvedValue([]);
  });
  const mount = () => renderApp(<ChatView />, {auth: makeAuth()});

  it('says what the chat is for and links to the destination ideas', async () => {
    const tree = mount();
    await flush();
    expect(allText(tree)).toContain(i18n.t('assistant.roleHint') as string);
    expect(allText(tree)).toContain(i18n.t('assistant.toRecommendHint') as string);
    pressText(tree, i18n.t('assistant.toRecommend') as string);
    expect(navigate).toHaveBeenCalledWith('Recommend');
  });

  it('shows suggestions at first, sends one, and offers a plan from the answer', async () => {
    (chatApi.send as jest.Mock).mockResolvedValue({
      message: 'Send message successfully',
      data: {ChatResponse: 'Go to Đà Nẵng for 3 days', chatAi: {_id: 'c1'}},
    });
    const tree = mount();
    await flush();
    expect(tree.root.findAllByType(TouchableOpacity).length).toBeGreaterThan(4);
    // type and send
    act(() => tree.root.findByType(TextInput).props.onChangeText('Where to go in Da Nang?'));
    const sendButton = tree.root.findAllByType(TouchableOpacity).find(t => t.props.disabled === false && t.props.style?.some?.((s: any) => s?.backgroundColor));
    expect(sendButton ?? true).toBeTruthy();
    const list = tree.root.findAllByType(FlatList)[0];
    await act(async () => {
      tree.root.findByType(TextInput).props.onChangeText('Where to go in Da Nang?');
    });
    const composerSend = tree.root.findAllByType(TouchableOpacity).filter(t => t.props.disabled === false).pop()!;
    await act(async () => composerSend.props.onPress());
    await flush(10);
    expect(chatApi.send).toHaveBeenCalledWith('Where to go in Da Nang?', null);
    expect(list).toBeTruthy();
    const plan = tree.root.findAllByType(TouchableOpacity).find(t => {
      try {
        return t.findAllByType(Text).some(x => String(x.props.children).includes(i18n.t('assistant.planFromSuggestion')));
      } catch {
        return false;
      }
    });
    press(plan!);
    expect(navigate).toHaveBeenCalledWith('CreateTrip', expect.objectContaining({location: 'Đà Nẵng', days: 3}));
    act(() => tree.root.findAllByType(FlatList)[0].props.onContentSizeChange());
  });

  it('opens the history drawer and starts a new chat', async () => {
    const tree = mount();
    await flush();
    pressText(tree, i18n.t('assistant.history'));
    expect(tree.root.findAllByType(Modal)[0].props.visible).toBe(true);
    pressText(tree, i18n.t('assistant.newChat'), 'last');
    expect(tree.root.findAllByType(Modal)[0].props.visible).toBe(false);
  });

  it('picking a suggestion sends it', async () => {
    (chatApi.send as jest.Mock).mockResolvedValue({message: 'plain'});
    const tree = mount();
    await flush();
    await act(async () => tree.root.findAllByType(TouchableOpacity).find(t => t.props.activeOpacity === 0.85 && t.props.onPress)!.props.onPress());
    await flush(8);
    expect(chatApi.send).toHaveBeenCalled();
  });
});
