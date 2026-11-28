import React from 'react';
import {FlatList, Linking, TextInput, TouchableOpacity} from 'react-native';
import i18n from '../src/i18n';
import {authApi, contentApi, profileApi, rankingApi} from '../src/api';
import {Benefit, WhatAloca} from '../src/screens/About';
import ForgotPassword from '../src/screens/ForgotPassword';
import Landing from '../src/screens/Landing';
import Login from '../src/screens/Login';
import NewPassword from '../src/screens/NewPassword';
import Notifications from '../src/screens/Notifications';
import Ranking from '../src/screens/Ranking';
import Register from '../src/screens/Register';
import ResetCode from '../src/screens/ResetCode';
import Verify from '../src/screens/Verify';
import Videos from '../src/screens/Videos';
import AuthScreen from '../src/layout/AuthScreen';
import Screen from '../src/layout/Screen';
import {nav, resetNav} from './helpers/nav';
import {act, allText, flush, makeAuth, press, pressText, renderApp, render} from './helpers/render';

jest.mock('@react-navigation/native', () => require('./helpers/nav').navModule);
jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  authApi: {
    login: jest.fn(),
    register: jest.fn(),
    confirmAccount: jest.fn(),
    resendCode: jest.fn(),
    forgotPassword: jest.fn(),
    verifyResetCode: jest.fn(),
    resetPassword: jest.fn(),
  },
  rankingApi: {get: jest.fn()},
  profileApi: {notifications: jest.fn(), update: jest.fn()},
  contentApi: {home: jest.fn(), videos: jest.fn()},
}));

const t = (key: string, opts?: object) => (i18n.t as any)(key, opts) as string;
type Tree = ReturnType<typeof render>;
const inputs = (tree: Tree) => tree.root.findAllByType(TextInput);
const type = (tree: Tree, index: number, text: string) => act(() => inputs(tree)[index].props.onChangeText(text));
const blur = (tree: Tree, index: number) => act(() => inputs(tree)[index].props.onBlur({target: {}}));
const submit = async (tree: Tree, title: string) => {
  await act(async () => pressText(tree, title));
  await flush(4);
};

beforeEach(() => {
  jest.clearAllMocks();
  resetNav();
});

describe('Login', () => {
  const mount = (auth = makeAuth()) => ({tree: renderApp(<Login />, {auth}), auth});

  it('shows validation errors for empty fields', async () => {
    const {tree} = mount();
    blur(tree, 0);
    blur(tree, 1);
    await submit(tree, t('auth.login.submit'));
    expect(allText(tree)).toContain(t('validation.usernameRequired'));
    expect(allText(tree)).toContain(t('validation.passwordRequired'));
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('signs in with valid values', async () => {
    const session = {accessToken: 'tok', data: {username: 'luan'}};
    (authApi.login as jest.Mock).mockResolvedValue(session);
    const {tree, auth} = mount();
    type(tree, 0, 'luanle');
    type(tree, 1, 'secret123');
    await submit(tree, t('auth.login.submit'));
    expect(authApi.login).toHaveBeenCalledWith({username: 'luanle', password: 'secret123'});
    expect(auth.signIn).toHaveBeenCalledWith(session, expect.anything(), undefined);
  });

  it('shows the error of the backend', async () => {
    (authApi.login as jest.Mock).mockRejectedValue({response: {data: {message: 'Incorrect password'}}});
    const {tree} = mount();
    type(tree, 0, 'luanle');
    type(tree, 1, 'wrongpass');
    await submit(tree, t('auth.login.submit'));
    expect(allText(tree)).toContain('Incorrect password');
  });

  it('links to forgot password and register', () => {
    const {tree} = mount();
    pressText(tree, t('auth.login.forgot'));
    pressText(tree, t('auth.login.signUp'));
    expect(nav.navigate).toHaveBeenCalledWith('ForgotPassword');
    expect(nav.navigate).toHaveBeenCalledWith('Register');
  });
});

describe('Register', () => {
  const fill = (tree: Tree, over: Partial<Record<'email' | 'username' | 'password' | 'confirm', string>> = {}) => {
    type(tree, 0, over.email ?? 'luan@example.com');
    type(tree, 1, over.username ?? 'luanle');
    type(tree, 2, over.password ?? 'secret123');
    type(tree, 3, over.confirm ?? 'secret123');
  };

  it('registers and goes to the verify screen', async () => {
    (authApi.register as jest.Mock).mockResolvedValue({});
    const tree = renderApp(<Register />);
    fill(tree);
    await submit(tree, t('auth.register.submit'));
    expect(authApi.register).toHaveBeenCalledWith({
      email: 'luan@example.com', username: 'luanle', password: 'secret123', confirmPassword: 'secret123',
    });
    expect(nav.replace).toHaveBeenCalledWith('Verify', {email: 'luan@example.com'});
  });

  it('refuses mismatched passwords before calling the backend', async () => {
    const tree = renderApp(<Register />);
    fill(tree, {confirm: 'different1'});
    blur(tree, 3);
    await flush(3);
    await submit(tree, t('auth.register.submit'));
    expect(allText(tree)).toContain(t('auth.register.passwordMismatch'));
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it('shows field errors and the backend error, and links to login', async () => {
    const tree = renderApp(<Register />);
    [0, 1, 2, 3].forEach(i => blur(tree, i));
    await act(async () => {
      inputs(tree)[0].props.onChangeText('not-an-email');
    });
    await flush(2);
    expect(allText(tree)).toContain(t('validation.emailInvalid'));
    (authApi.register as jest.Mock).mockRejectedValue({response: {data: {message: 'Username or email already exist'}}});
    fill(tree);
    await submit(tree, t('auth.register.submit'));
    expect(allText(tree)).toContain('Username or email already exist');
    pressText(tree, t('auth.register.signIn'));
    expect(nav.navigate).toHaveBeenCalledWith('Login');
  });
});

describe('ForgotPassword', () => {
  it('sends the e-mail and opens the reset code screen', async () => {
    (authApi.forgotPassword as jest.Mock).mockResolvedValue({});
    const tree = renderApp(<ForgotPassword />);
    type(tree, 0, 'luan@example.com');
    await submit(tree, t('common.confirm'));
    expect(authApi.forgotPassword).toHaveBeenCalledWith('luan@example.com');
    expect(nav.navigate).toHaveBeenCalledWith('ResetCode', {email: 'luan@example.com'});
  });

  it('validates the e-mail, shows backend errors and goes back to login', async () => {
    const tree = renderApp(<ForgotPassword />);
    blur(tree, 0);
    await submit(tree, t('common.confirm'));
    expect(allText(tree)).toContain(t('validation.emailRequired'));
    (authApi.forgotPassword as jest.Mock).mockRejectedValue({response: {data: {message: 'The email is not exist'}}});
    type(tree, 0, 'a@b.co');
    await submit(tree, t('common.confirm'));
    expect(allText(tree)).toContain('The email is not exist');
    press(tree.root.findAllByType(TouchableOpacity).pop()!);
    expect(nav.navigate).toHaveBeenCalledWith('Login');
  });
});

describe('Verify and ResetCode (6 digit code)', () => {
  const enterCode = (tree: Tree) => inputs(tree).forEach((input, i) => act(() => input.props.onChangeText(String(i + 1))));

  it('Verify confirms the account then goes to login', async () => {
    resetNav({email: 'luan@example.com'});
    (authApi.confirmAccount as jest.Mock).mockResolvedValue({});
    const tree = renderApp(<Verify />);
    enterCode(tree);
    await submit(tree, t('auth.verify.submit'));
    expect(authApi.confirmAccount).toHaveBeenCalledWith('luan@example.com', '123456');
    expect(nav.replace).toHaveBeenCalledWith('Login');
  });

  it('Verify resends the code and shows errors', async () => {
    resetNav({email: 'luan@example.com'});
    (authApi.resendCode as jest.Mock).mockRejectedValue({response: {data: {message: 'Your account not exist'}}});
    const tree = renderApp(<Verify />);
    await act(async () => pressText(tree, t('auth.resetCode.resend')));
    await flush(3);
    expect(authApi.resendCode).toHaveBeenCalledWith('luan@example.com');
    expect(allText(tree)).toContain('Your account not exist');
  });

  it('ResetCode checks the code then opens the new password screen', async () => {
    resetNav({email: 'luan@example.com'});
    (authApi.verifyResetCode as jest.Mock).mockResolvedValue({});
    const tree = renderApp(<ResetCode />);
    enterCode(tree);
    await submit(tree, t('auth.verify.submit'));
    expect(authApi.verifyResetCode).toHaveBeenCalledWith('luan@example.com', '123456');
    expect(nav.replace).toHaveBeenCalledWith('NewPassword', {email: 'luan@example.com'});
  });

  it('ResetCode resends the code', async () => {
    resetNav({email: 'luan@example.com'});
    (authApi.forgotPassword as jest.Mock).mockResolvedValue({});
    const tree = renderApp(<ResetCode />);
    await act(async () => pressText(tree, t('auth.resetCode.resend')));
    await flush(3);
    expect(authApi.forgotPassword).toHaveBeenCalledWith('luan@example.com');
  });
});

describe('NewPassword', () => {
  beforeEach(() => resetNav({email: 'luan@example.com'}));

  it('saves the new password and goes to login', async () => {
    (authApi.resetPassword as jest.Mock).mockResolvedValue({});
    const tree = renderApp(<NewPassword />);
    type(tree, 0, 'newsecret1');
    type(tree, 1, 'newsecret1');
    await submit(tree, t('auth.newPassword.submit'));
    expect(authApi.resetPassword).toHaveBeenCalledWith('luan@example.com', 'newsecret1', 'newsecret1');
    expect(nav.replace).toHaveBeenCalledWith('Login');
  });

  it('refuses mismatched passwords, shows field and backend errors, links back', async () => {
    const tree = renderApp(<NewPassword />);
    type(tree, 0, 'newsecret1');
    type(tree, 1, 'other12345');
    blur(tree, 1);
    await flush(3);
    await submit(tree, t('auth.newPassword.submit'));
    expect(allText(tree)).toContain(t('auth.newPassword.mismatch'));
    blur(tree, 0);
    blur(tree, 1);
    type(tree, 0, '');
    await flush(2);
    expect(allText(tree)).toContain(t('validation.passwordRequired'));
    (authApi.resetPassword as jest.Mock).mockRejectedValue({response: {data: {message: 'Please verify the code'}}});
    type(tree, 0, 'newsecret1');
    type(tree, 1, 'newsecret1');
    await submit(tree, t('auth.newPassword.submit'));
    expect(allText(tree)).toContain('Please verify the code');
    pressText(tree, t('auth.backToLogin'));
    expect(nav.navigate).toHaveBeenCalledWith('Login');
  });
});

describe('Landing and About', () => {
  it('Landing starts the app', () => {
    const tree = render(<Landing />);
    pressText(tree, t('auth.landing.start'));
    expect(nav.navigate).toHaveBeenCalledWith('Login');
  });

  it('WhatAloca and Benefit show their pages and go back', () => {
    const what = render(<WhatAloca />);
    expect(allText(what)).toContain(t('about.whatHeading'));
    press(what.root.findAllByType(TouchableOpacity)[0]);
    const benefit = render(<Benefit />);
    expect(allText(benefit)).toContain(t('about.benefit1Title'));
    press(benefit.root.findAllByType(TouchableOpacity)[0]);
    expect(nav.goBack).toHaveBeenCalledTimes(2);
  });
});

describe('Ranking', () => {
  it('lists the ranking and switches period', async () => {
    (rankingApi.get as jest.Mock).mockResolvedValue([
      {_id: 'a', fullname: 'Alice', experience: 300},
      {_id: 'b', fullname: 'Bob', experience: 100},
    ]);
    const tree = renderApp(<Ranking />);
    await flush();
    expect(rankingApi.get).toHaveBeenCalledWith('highest');
    expect(allText(tree)).toContain('Alice');
    pressText(tree, t('ranking.weekly'));
    await flush();
    expect(rankingApi.get).toHaveBeenCalledWith('weekly');
  });

  it('opens the public profile of a ranked user', async () => {
    (rankingApi.get as jest.Mock).mockResolvedValue([{_id: 'a', fullname: 'Alice', experience: 300}]);
    const tree = renderApp(<Ranking />);
    await flush();
    pressText(tree, 'Alice');
    expect(nav.navigate).toHaveBeenCalledWith('UserProfile', {id: 'a'});
  });

  it('does not open a profile for a row without an id', async () => {
    (rankingApi.get as jest.Mock).mockResolvedValue([{fullname: 'Ghost', experience: 3}]);
    const tree = renderApp(<Ranking />);
    await flush();
    expect(allText(tree)).toContain('Ghost');
    expect(tree.root.findAllByType(TouchableOpacity).some(n => n.props.disabled)).toBe(true);
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  it('shows the empty text', async () => {
    (rankingApi.get as jest.Mock).mockResolvedValue([]);
    const tree = renderApp(<Ranking />);
    await flush();
    expect(allText(tree)).toContain(t('ranking.empty'));
  });
});

describe('Videos', () => {
  it('goes back and opens a video on YouTube', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    const tree = render(<Videos />);
    press(tree.root.findAllByType(TouchableOpacity)[0]);
    expect(nav.goBack).toHaveBeenCalled();
    press(tree.root.findAllByType(TouchableOpacity)[1]);
    expect(open).toHaveBeenCalledWith(expect.stringContaining('youtube.com'));
    open.mockRestore();
    expect(tree.root.findByType(FlatList).props.numColumns).toBe(2);
  });
});

describe('Notifications', () => {
  it('lists announcements with and without a date', async () => {
    (profileApi.notifications as jest.Mock).mockResolvedValue([
      {id: '1', title: 'Hello', message: 'World', publishAt: '2026-03-05T10:00:00Z'},
      {id: '2', title: 'Second', message: 'No date'},
    ]);
    const tree = renderApp(<Notifications />);
    expect(allText(tree)).toBe(t('profile.notificationsTitle'));
    await flush();
    expect(allText(tree)).toContain('Hello');
    expect(allText(tree)).toContain('No date');
    press(tree.root.findAllByType(TouchableOpacity)[0]);
    expect(nav.goBack).toHaveBeenCalled();
  });

  it('shows the empty and the error states', async () => {
    (profileApi.notifications as jest.Mock).mockResolvedValue([]);
    const empty = renderApp(<Notifications />);
    await flush();
    expect(allText(empty)).toContain(t('profile.noNotifications'));
    (profileApi.notifications as jest.Mock).mockRejectedValue(new Error('x'));
    const failed = renderApp(<Notifications />);
    await flush();
    expect(allText(failed)).toContain(t('profile.notificationsFailed'));
    expect(contentApi.home).not.toHaveBeenCalled();
  });
});

describe('layout', () => {
  it('AuthScreen shows the title and children', () => {
    const tree = render(<AuthScreen title="Hi" logoSize={50}><></></AuthScreen>);
    expect(allText(tree)).toBe('Hi');
    expect(allText(render(<AuthScreen><></></AuthScreen>))).toBe('ALOCA');
  });
  it('Screen renders a scroll view', () => {
    expect(render(<Screen><></></Screen>).toJSON()).toBeTruthy();
  });
});
