import React from 'react';
import {Image, Linking, TextInput, TouchableOpacity} from 'react-native';
import {launchImageLibrary} from 'react-native-image-picker';
import i18n from '../src/i18n';
import {profileApi} from '../src/api';
import {alert, subscribeAlert} from '../src/lib/alert';
import {uploadImage} from '../src/lib/upload';
import EditProfile from '../src/screens/EditProfile';
import Profile from '../src/screens/Profile';
import {saveSession, clearSession} from '../src/store/session';
import {nav, resetNav} from './helpers/nav';
import {act, allText, flush, makeAuth, press, pressText, renderApp} from './helpers/render';

jest.mock('@react-navigation/native', () => require('./helpers/nav').navModule);
jest.mock('../src/lib/upload', () => ({uploadImage: jest.fn()}));
jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  profileApi: {update: jest.fn(), notifications: jest.fn()},
}));

const t = (key: string, opts?: object) => (i18n.t as any)(key, opts) as string;
type Tree = ReturnType<typeof renderApp>;
const touchables = (tree: Tree) => tree.root.findAllByType(TouchableOpacity);
const inputs = (tree: Tree) => tree.root.findAllByType(TextInput);

let alerts: any[] = [];
let off: () => void;
beforeEach(async () => {
  jest.clearAllMocks();
  resetNav();
  alerts = [];
  off = subscribeAlert(a => alerts.push(a));
  await clearSession();
});
afterEach(() => off());

describe('Profile', () => {
  const user = {username: 'luan', fullname: 'Luan Le', email: 'luan@example.com', image: '/files/a', experience: 120};

  it('shows the account and navigates from every entry', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    const tree = renderApp(<Profile />, {auth: makeAuth({user})});
    expect(allText(tree)).toContain('Luan Le');
    expect(allText(tree)).toContain('luan@example.com');
    expect(allText(tree)).toContain('120');
    expect(tree.root.findAllByType(Image).length).toBeGreaterThan(2);
    const targets: Array<[string | null, string, any?]> = [
      [null, 'EditProfile'],
      [t('profile.notifications'), 'Notifications'],
      [t('profile.plans'), 'Tabs', {screen: 'Assistant'}],
      [t('profile.preferences.link'), 'Preferences'],
      [t('profile.whatIs'), 'WhatAloca'],
      [t('profile.genzTitle'), 'Benefit'],
    ];
    targets.forEach(([label, screen, params]) => {
      if (label) {
        pressText(tree, label);
      } else {
        press(touchables(tree)[0]);
      }
      expect(nav.navigate).toHaveBeenLastCalledWith(...(params ? [screen, params] : [screen]));
    });
    pressText(tree, t('profile.hotline'));
    expect(open).toHaveBeenCalledWith('tel:19001009');
    open.mockRestore();
  });

  it('signs out', () => {
    const auth = makeAuth({user});
    const tree = renderApp(<Profile />, {auth});
    pressText(tree, t('profile.logout'));
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('copes with a minimal account', () => {
    const tree = renderApp(<Profile />, {auth: makeAuth({user: {username: 'luan'}})});
    expect(allText(tree)).toContain('luan');
    expect(allText(tree)).not.toContain('⭐');
    renderApp(<Profile />, {auth: makeAuth({user: null})});
  });
});

describe('EditProfile', () => {
  const user = {username: 'luan', fullname: 'Luan', email: 'luan@example.com', phone: '0901234567', address: 'Da Nang', image: '/files/a'};
  const mount = (u: any = user) => {
    const auth = makeAuth({user: u});
    return {tree: renderApp(<EditProfile />, {auth}), auth};
  };
  const submit = async (tree: Tree) => {
    await act(async () => pressText(tree, t('profile.save')));
    await flush(6);
  };
  const photo = {uri: 'file:///new.jpg', fileName: 'new.jpg', type: 'image/jpeg', fileSize: 1000};

  it('saves the changes, keeps the session and goes back', async () => {
    await saveSession({accessToken: 'tok', data: user});
    (profileApi.update as jest.Mock).mockResolvedValue({});
    const {tree, auth} = mount();
    act(() => inputs(tree)[0].props.onChangeText('  New Name '));
    act(() => inputs(tree)[2].props.onChangeText('09 0123-4567'));
    act(() => inputs(tree)[3].props.onChangeText(' Hue '));
    await submit(tree);
    expect(profileApi.update).toHaveBeenCalledWith({
      fullname: 'New Name', email: 'luan@example.com', phone: '0901234567', address: 'Hue', image: '/files/a',
    });
    expect(auth.signIn).toHaveBeenCalledWith({
      accessToken: 'tok',
      data: expect.objectContaining({fullname: 'New Name', address: 'Hue'}),
    });
    expect(alerts.at(-1)).toMatchObject({type: 'success'});
    expect(nav.goBack).toHaveBeenCalled();
  });

  it('uploads a newly picked photo with the save', async () => {
    (launchImageLibrary as jest.Mock).mockResolvedValue({assets: [photo]});
    (uploadImage as jest.Mock).mockResolvedValue('/files/new');
    (profileApi.update as jest.Mock).mockResolvedValue({});
    const {tree, auth} = mount();
    await act(async () => press(touchables(tree)[1]));
    expect(tree.root.findAllByType(Image).some(i => i.props.source?.uri === 'file:///new.jpg')).toBe(true);
    await submit(tree);
    expect(uploadImage).toHaveBeenCalledWith(photo);
    expect(profileApi.update).toHaveBeenCalledWith(expect.objectContaining({image: '/files/new'}));
    expect(auth.signIn).toHaveBeenCalledWith({accessToken: '', data: expect.objectContaining({image: '/files/new'})});
  });

  it('has an upload button besides the camera badge', async () => {
    (launchImageLibrary as jest.Mock).mockResolvedValue({});
    const {tree} = mount();
    await act(async () => pressText(tree, t('profile.uploadPhoto')));
    expect(launchImageLibrary).toHaveBeenCalledWith(expect.objectContaining({mediaType: 'photo', selectionLimit: 1}));
    expect(tree.root.findAllByType(Image)).toHaveLength(1);
  });

  it('refuses a photo over 5 MB', async () => {
    (launchImageLibrary as jest.Mock).mockResolvedValue({assets: [{...photo, fileSize: 6 * 1024 * 1024}]});
    const {tree} = mount();
    await act(async () => press(touchables(tree)[1]));
    expect(allText(tree)).toContain(t('common.imageTooLarge'));
    expect(tree.root.findAllByType(Image).some(i => i.props.source?.uri === 'file:///new.jpg')).toBe(false);
    // a photo without a size is accepted and clears the message
    (launchImageLibrary as jest.Mock).mockResolvedValue({assets: [{uri: 'content://x'}]});
    await act(async () => press(touchables(tree)[1]));
    expect(allText(tree)).not.toContain(t('common.imageTooLarge'));
  });

  it('validates the fields', async () => {
    const {tree} = mount({username: 'x', email: 'x@y.z'});
    expect(inputs(tree)[2].props.value).toBe('');
    [0, 2, 3].forEach(i => act(() => inputs(tree)[i].props.onBlur({target: {}})));
    await submit(tree);
    const txt = allText(tree);
    expect(txt).toContain(t('profile.errors.fullname'));
    expect(txt).toContain(t('profile.errors.phone'));
    expect(txt).toContain(t('profile.errors.address'));
    expect(profileApi.update).not.toHaveBeenCalled();
    act(() => inputs(tree)[2].props.onChangeText('123'));
    await flush(3);
    expect(allText(tree)).toContain(t('profile.invalidPhone'));
  });

  it('shows the error of the backend and goes back', async () => {
    (profileApi.update as jest.Mock).mockRejectedValue({response: {data: {message: 'Nope'}}});
    const {tree} = mount();
    await submit(tree);
    expect(allText(tree)).toContain('Nope');
    press(touchables(tree)[0]);
    expect(nav.goBack).toHaveBeenCalled();
  });

  it('shows a placeholder without a picture', () => {
    const {tree} = mount({username: 'luan'});
    expect(tree.root.findAllByType(Image)).toHaveLength(0);
    expect(alert).toBeTruthy();
  });
});
