import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearSession,
  getAccessToken,
  loadSession,
  saveSession,
  updateAccessToken,
} from '../src/store/session';

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearSession();
});

describe('session store', () => {
  it('has no session at first', async () => {
    expect(await loadSession()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('saves a session and loads it back', async () => {
    await saveSession({accessToken: 'tok', data: {username: 'luan'}});
    expect(getAccessToken()).toBe('tok');
    await clearSession();
    await AsyncStorage.setItem('AccessToken', 'tok');
    await AsyncStorage.setItem('user', JSON.stringify({username: 'luan'}));
    expect(await loadSession()).toEqual({
      accessToken: 'tok',
      data: {username: 'luan'},
    });
    expect(getAccessToken()).toBe('tok');
  });

  it('returns null when only one of token and user is stored', async () => {
    await AsyncStorage.setItem('AccessToken', 'tok');
    expect(await loadSession()).toBeNull();
  });

  it('returns null when the stored user is not JSON', async () => {
    await AsyncStorage.setItem('AccessToken', 'tok');
    await AsyncStorage.setItem('user', '{broken');
    expect(await loadSession()).toBeNull();
  });

  it('updates the access token only', async () => {
    await saveSession({accessToken: 'old', data: {username: 'a'}});
    await updateAccessToken('new');
    expect(getAccessToken()).toBe('new');
    expect(await AsyncStorage.getItem('AccessToken')).toBe('new');
    expect(await AsyncStorage.getItem('user')).toBe('{"username":"a"}');
  });

  it('clears everything', async () => {
    await saveSession({accessToken: 'tok', data: {}});
    await clearSession();
    expect(getAccessToken()).toBeNull();
    expect(await AsyncStorage.getItem('AccessToken')).toBeNull();
    expect(await AsyncStorage.getItem('user')).toBeNull();
  });
});
