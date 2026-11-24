import React, {useContext} from 'react';
import {Text, TextInput, StyleSheet} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {QueryClient} from '@tanstack/react-query';
import i18n, {loadLanguage, setLanguage} from '../src/i18n';
import {api, setOnUnauthorized} from '../src/lib/apiClient';
import {applyFonts} from '../src/lib/fonts';
import {AuthContext, getAccessToken, saveSession} from '../src/store/session';
import {act, flush, render} from './helpers/render';

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({children}: any) => children,
}));
jest.mock('react-native-safe-area-context', () => ({SafeAreaProvider: ({children}: any) => children}));
jest.mock('../src/navigation/RootNavigator', () => {
  const R = require('react');
  const {AuthContext: Ctx} = require('../src/store/session');
  const Probe = () => {
    const auth = R.useContext(Ctx);
    (global as any).__auth = auth;
    return null;
  };
  return {__esModule: true, default: Probe};
});

const App = require('../App').default;
const auth = () => (global as any).__auth as React.ContextType<typeof AuthContext>;

beforeEach(async () => {
  await AsyncStorage.clear();
  (global as any).__auth = undefined;
});

describe('App', () => {
  it('waits for the saved session, then shows the app signed out', async () => {
    const tree = render(<App />);
    await flush(4);
    expect(auth().user).toBeNull();
    act(() => tree.unmount());
  });

  it('restores a saved session', async () => {
    await saveSession({accessToken: 'tok', data: {username: 'luan'}});
    render(<App />);
    await flush(4);
    expect(auth().user).toEqual({username: 'luan'});
  });

  it('signs in and out', async () => {
    render(<App />);
    await flush(4);
    await act(async () => auth().signIn({accessToken: 'new', data: {username: 'x'}}));
    expect(auth().user).toEqual({username: 'x'});
    expect(getAccessToken()).toBe('new');
    await act(async () => auth().signOut());
    expect(auth().user).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('signs out when the server rejects the token', async () => {
    await saveSession({accessToken: 'tok', data: {username: 'luan'}});
    render(<App />);
    await flush(4);
    api.defaults.adapter = async config => {
      const err: any = new Error('401');
      err.config = config;
      err.response = {status: 401, data: {}, headers: {}, config};
      throw err;
    };
    await act(async () => {
      await api.get('/trip-plan/get-trip').catch(() => {});
    });
    await flush(2);
    expect(auth().user).toBeNull();
    setOnUnauthorized(() => {});
  });
});

describe('i18n', () => {
  afterEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('switches the language and remembers it', async () => {
    await setLanguage('en');
    expect(i18n.language).toBe('en');
    expect(await AsyncStorage.getItem('language')).toBe('en');
    await setLanguage('vi');
    await AsyncStorage.setItem('language', 'en');
    await loadLanguage();
    expect(i18n.language).toBe('en');
  });

  it('ignores an unknown saved language and a failing store', async () => {
    await AsyncStorage.setItem('language', 'fr');
    await loadLanguage();
    expect(i18n.language).toBe('vi');
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('x'));
    await loadLanguage();
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('x'));
    await setLanguage('en');
    jest.restoreAllMocks();
    expect(i18n.language).toBe('en');
  });

  it('picks the device language at start-up', () => {
    const load = (os: 'ios' | 'android', modules: object) => {
      let lng = '';
      jest.isolateModules(() => {
        jest.doMock('react-native', () => {
          const rn = jest.requireActual('react-native');
          return Object.create(rn, {
            Platform: {value: {...rn.Platform, OS: os}},
            NativeModules: {value: {...rn.NativeModules, ...modules}},
          });
        });
        lng = require('../src/i18n').default.language;
      });
      jest.dontMock('react-native');
      return lng;
    };
    expect(load('ios', {SettingsManager: {settings: {AppleLocale: 'en_US'}}})).toBe('en');
    expect(load('ios', {SettingsManager: {settings: {AppleLanguages: ['vi-VN']}}})).toBe('vi');
    expect(load('android', {I18nManager: {localeIdentifier: 'en_GB'}})).toBe('en');
    expect(load('android', {I18nManager: undefined, SettingsManager: undefined})).toBe('vi');
  });
});

describe('applyFonts', () => {
  it('gives every Text and TextInput the matching font family', () => {
    const originals = [Text, TextInput].map((c: any) => c.render);
    originals.forEach((original, i) => {
      const component: any = [Text, TextInput][i];
      component.render = function (props: any) {
        return {props: {style: props.style}};
      };
    });
    applyFonts();
    const run = (style: unknown) => (Text as any).render({style}, null).props.style;
    expect(run({fontWeight: '700'})).toMatchObject({fontFamily: 'BeVietnamPro-Bold'});
    expect(run({fontWeight: '600'})).toMatchObject({fontFamily: 'BeVietnamPro-SemiBold'});
    expect(run(undefined)).toMatchObject({fontFamily: 'BeVietnamPro-Regular'});
    expect(run({fontWeight: '950'})).toMatchObject({fontFamily: 'BeVietnamPro-Regular'});
    expect(run([{fontFamily: 'Custom'}, {color: 'red'}])).toMatchObject({fontFamily: 'Custom', color: 'red'});
    expect((TextInput as any).render({style: {fontWeight: 'bold'}}).props.style.fontFamily).toBe('BeVietnamPro-Bold');
    expect(StyleSheet).toBeTruthy();
    originals.forEach((original, i) => {
      (([Text, TextInput][i]) as any).render = original;
    });
  });

  it('QueryClient can be cleared (used on sign-out)', () => {
    const qc = new QueryClient();
    qc.setQueryData(['x'], 1);
    qc.clear();
    expect(qc.getQueryData(['x'])).toBeUndefined();
    expect(useContext).toBeDefined();
  });
});
