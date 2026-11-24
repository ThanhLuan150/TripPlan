import React from 'react';
import {Keyboard} from 'react-native';
import {chatApi} from '../src/api';
import ChatHistoryDrawer from '../src/components/ChatHistoryDrawer';
import ChatView from '../src/components/ChatView';
import {formatDate} from '../src/lib/date';
import Assistant from '../src/screens/Assistant';
import {AuthContext} from '../src/store/session';
import {useKeyboardVisible} from '../src/hooks/useKeyboard';
import {resetNav} from './helpers/nav';
import {act, flush, makeAuth, render, renderApp} from './helpers/render';

jest.mock('@react-navigation/native', () => require('./helpers/nav').navModule);
jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  chatApi: {send: jest.fn(), messages: jest.fn(), list: jest.fn(), remove: jest.fn()},
  tripsApi: {list: jest.fn()},
}));
jest.mock('react-native-tab-view', () => {
  const R = require('react');
  return {
    SceneMap: (scenes: Record<string, any>) => scenes,
    TabView: ({navigationState, renderScene, renderTabBar, onIndexChange}: any) => {
      const route = navigationState.routes[navigationState.index];
      const Scene = renderScene[route.key];
      return R.createElement(
        R.Fragment,
        null,
        renderTabBar({navigationState}),
        R.createElement(Scene),
        R.createElement('Switch', {onPress: () => onIndexChange(1)}),
      );
    },
    TabBar: (props: any) => R.createElement('TabBar', props),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  resetNav();
  (chatApi.list as jest.Mock).mockResolvedValue([]);
});

describe('Assistant', () => {
  it('has a chat and a plans tab, and can switch between them', async () => {
    const {tripsApi} = require('../src/api');
    tripsApi.list.mockResolvedValue([]);
    const tree = renderApp(<Assistant />);
    await flush();
    const bar = tree.root.findByType('TabBar' as any);
    expect(bar.props.options.chat.labelStyle).toBeTruthy();
    expect(bar.props.options.plans.labelStyle).toBeTruthy();
    act(() => tree.root.findByType('Switch' as any).props.onPress());
    await flush();
    expect(tree.root.findByType('TabBar' as any)).toBeTruthy();
  });
});

describe('ChatView drawer wiring', () => {
  it('selects, starts a new chat, and resets only when the open chat was deleted', async () => {
    (chatApi.messages as jest.Mock).mockResolvedValue([{role: 'user', text: 'hi', createdAt: ''}]);
    const tree = renderApp(<ChatView />, {auth: makeAuth()});
    await flush();
    const drawer = () => tree.root.findByType(ChatHistoryDrawer);
    await act(async () => drawer().props.onSelect('c1'));
    await flush();
    expect(drawer().props.currentId).toBe('c1');
    act(() => drawer().props.onDeleted('other'));
    expect(drawer().props.currentId).toBe('c1');
    act(() => drawer().props.onDeleted('c1'));
    expect(drawer().props.currentId).toBeNull();
    await act(async () => drawer().props.onSelect('c2'));
    await flush();
    act(() => drawer().props.onNewChat());
    expect(drawer().props.currentId).toBeNull();
    act(() => drawer().props.onClose());
  });
});

describe('useKeyboardVisible', () => {
  it('stops listening when unmounted', () => {
    const remove = jest.fn();
    jest.spyOn(Keyboard, 'addListener').mockReturnValue({remove} as any);
    const Probe = () => {
      useKeyboardVisible();
      return null;
    };
    const tree = render(<Probe />);
    act(() => tree.unmount());
    expect(remove).toHaveBeenCalledTimes(2);
    jest.restoreAllMocks();
  });
});

describe('small helpers', () => {
  it('formatDate uses the language of the app', () => {
    expect(formatDate('2026-03-05', 'en')).toMatch(/2026/);
    expect(formatDate('2026-03-05', 'vi')).toMatch(/2026/);
  });

  it('the default auth context does nothing', async () => {
    let value: any;
    const Probe = () => {
      value = React.useContext(AuthContext);
      return null;
    };
    render(<Probe />);
    expect(value.user).toBeNull();
    await expect(value.signIn({accessToken: '', data: {}})).resolves.toBeUndefined();
    await expect(value.signOut()).resolves.toBeUndefined();
  });

  it('the API url ends without a slash and defaults to the dev machine', () => {
    const {API_URL} = require('../src/lib/config');
    expect(API_URL).toMatch(/^http:\/\/(localhost|10\.0\.2\.2):8080$/);
  });

  it('uses the Android emulator address on Android and the .env value when present', () => {
    const load = (os: string, env: string | undefined) => {
      let url = '';
      jest.isolateModules(() => {
        jest.doMock('react-native', () => ({Platform: {OS: os}}));
        jest.doMock('@env', () => ({API_URL: env}), {virtual: true});
        url = require('../src/lib/config').API_URL;
      });
      jest.dontMock('react-native');
      jest.dontMock('@env');
      return url;
    };
    expect(load('android', undefined)).toBe('http://10.0.2.2:8080');
    expect(load('ios', undefined)).toBe('http://localhost:8080');
    expect(load('ios', 'https://api.example.com//')).toBe('https://api.example.com');
  });
});
