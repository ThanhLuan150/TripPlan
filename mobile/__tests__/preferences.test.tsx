import {TextInput} from 'react-native';
import i18n from '../src/i18n';
import {profileApi} from '../src/api';
import Preferences, {preferencesErrorKey} from '../src/screens/Preferences';
import {subscribeAlert} from '../src/lib/alert';
import {nav, resetNav} from './helpers/nav';
import {act, allText, flush, pressText, renderApp} from './helpers/render';

jest.mock('@react-navigation/native', () => require('./helpers/nav').navModule);
jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  profileApi: {preferences: jest.fn(), savePreferences: jest.fn(), deletePreferences: jest.fn()},
}));

const t = (key: string) => (i18n.t as any)(key) as string;
const cat = (key: string) => t(`profile.preferences.category.${key}`);
const empty = {categories: [], notes: '', updatedAt: null};
const stored = {categories: ['nature', 'food'], notes: 'ít người', updatedAt: '2026-03-01'};

const mount = async (data: any = empty) => {
  (profileApi.preferences as jest.Mock).mockResolvedValue(data);
  const tree = renderApp(<Preferences />);
  await flush();
  return tree;
};
type Tree = Awaited<ReturnType<typeof mount>>;
// a chip is the pressable that carries the selected state
const chipOn = (tree: Tree, key: string) =>
  tree.root
    .findAll(n => n.props.accessibilityState && n.props.onPress)
    .find(n => allText({root: n} as any) === cat(key))!.props.accessibilityState.selected;
const save = async (tree: Tree) => {
  await act(async () => pressText(tree, t('profile.save')));
  await flush();
};

let alerts: any[] = [];
let off: () => void;
beforeEach(() => {
  jest.clearAllMocks();
  resetNav();
  alerts = [];
  off = subscribeAlert(a => alerts.push(a));
});
afterEach(() => off());

describe('preferencesErrorKey', () => {
  it('needs a group or a note, and a short note', () => {
    expect(preferencesErrorKey([], '  ')).toBe('profile.preferences.errors.empty');
    expect(preferencesErrorKey(['food'], '')).toBeNull();
    expect(preferencesErrorKey([], 'x')).toBeNull();
    expect(preferencesErrorKey(['food'], 'x'.repeat(301))).toBe('profile.preferences.errors.notesLong');
  });
});

describe('Preferences screen', () => {
  it('shows the five groups, none chosen, and no delete button when nothing is saved', async () => {
    const tree = await mount();
    for (const key of ['nature', 'food', 'culture', 'shopping', 'discovery']) {
      expect(allText(tree)).toContain(cat(key));
      expect(chipOn(tree, key)).toBe(false);
    }
    expect(allText(tree)).not.toContain(t('profile.preferences.delete'));
  });

  it('starts from the saved preferences', async () => {
    const tree = await mount(stored);
    expect(chipOn(tree, 'nature')).toBe(true);
    expect(chipOn(tree, 'food')).toBe(true);
    expect(chipOn(tree, 'culture')).toBe(false);
    expect(tree.root.findByType(TextInput).props.value).toBe('ít người');
  });

  it('saves the chosen groups and the note', async () => {
    (profileApi.savePreferences as jest.Mock).mockResolvedValue({
      message: 'ok',
      preferences: {categories: ['culture'], notes: 'di tích', updatedAt: 'x'},
    });
    const tree = await mount();
    pressText(tree, cat('culture'));
    act(() => tree.root.findByType(TextInput).props.onChangeText('  di tích '));
    await save(tree);
    expect(profileApi.savePreferences).toHaveBeenCalledWith({categories: ['culture'], notes: 'di tích'});
    expect(alerts.at(-1)).toMatchObject({type: 'success'});
    // once saved, the preferences can be deleted
    expect(allText(tree)).toContain(t('profile.preferences.delete'));
  });

  it('lets the user unselect a group', async () => {
    (profileApi.savePreferences as jest.Mock).mockResolvedValue({message: 'ok', preferences: stored});
    const tree = await mount(stored);
    pressText(tree, cat('food'));
    expect(chipOn(tree, 'food')).toBe(false);
    await save(tree);
    expect(profileApi.savePreferences).toHaveBeenCalledWith({categories: ['nature'], notes: 'ít người'});
  });

  it('does not save an empty form', async () => {
    const tree = await mount();
    await save(tree);
    expect(profileApi.savePreferences).not.toHaveBeenCalled();
    expect(allText(tree)).toContain(t('profile.preferences.errors.empty'));
  });

  it('shows the backend error when saving fails', async () => {
    (profileApi.savePreferences as jest.Mock).mockRejectedValue({response: {data: {message: 'Unknown category'}}});
    const tree = await mount(stored);
    await save(tree);
    expect(allText(tree)).toContain('Unknown category');
  });

  it('asks for confirmation before deleting, then deletes', async () => {
    (profileApi.deletePreferences as jest.Mock).mockResolvedValue({message: 'ok', preferences: empty});
    const tree = await mount(stored);
    pressText(tree, t('profile.preferences.delete'));
    expect(allText(tree)).toContain(t('profile.preferences.deleteTitle'));
    expect(profileApi.deletePreferences).not.toHaveBeenCalled();

    await act(async () => pressText(tree, t('common.delete'), 'last'));
    await flush();

    expect(profileApi.deletePreferences).toHaveBeenCalled();
    expect(alerts.at(-1)).toMatchObject({type: 'success'});
    expect(chipOn(tree, 'nature')).toBe(false);
    expect(allText(tree)).not.toContain(t('profile.preferences.delete'));
  });

  it('keeps the preferences when the user cancels the deletion', async () => {
    const tree = await mount(stored);
    pressText(tree, t('profile.preferences.delete'));
    pressText(tree, t('common.cancel'));
    expect(profileApi.deletePreferences).not.toHaveBeenCalled();
    expect(chipOn(tree, 'nature')).toBe(true);
  });

  it('shows the error of a failed deletion', async () => {
    (profileApi.deletePreferences as jest.Mock).mockRejectedValue({response: {data: {message: 'Cannot delete'}}});
    const tree = await mount(stored);
    pressText(tree, t('profile.preferences.delete'));
    await act(async () => pressText(tree, t('common.delete'), 'last'));
    await flush();
    expect(allText(tree)).toContain('Cannot delete');
  });

  it('offers a retry when the preferences cannot be loaded', async () => {
    (profileApi.preferences as jest.Mock).mockRejectedValueOnce(new Error('x')).mockResolvedValue(empty);
    const tree = renderApp(<Preferences />);
    await flush();
    expect(allText(tree)).toContain(t('profile.preferences.loadFailed'));
    await act(async () => pressText(tree, `${t('profile.preferences.loadFailed')} ${t('common.retry')}`));
    await flush();
    expect(allText(tree)).toContain(cat('nature'));
    expect(nav.goBack).not.toHaveBeenCalled();
  });
});
