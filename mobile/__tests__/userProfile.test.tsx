import {communityApi} from '../src/api';
import UserProfile from '../src/screens/UserProfile';
import i18n from '../src/i18n';
import {nav, resetNav, route} from './helpers/nav';
import {act, allText, flush, press, pressText, queryClient, renderApp} from './helpers/render';
import {TouchableOpacity} from 'react-native';

jest.mock('@react-navigation/native', () => require('./helpers/nav').navModule);
jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  communityApi: {profile: jest.fn(), follow: jest.fn(), unfollow: jest.fn()},
}));

const t = (key: string) => (i18n.t as any)(key) as string;
const user = (extra: any = {}) => ({
  id: 'u2',
  fullname: 'Lan Anh',
  image: 'http://img/2',
  experience: 120,
  isSelf: false,
  following: false,
  followersCount: 4,
  followingCount: 1,
  ...extra,
});
const mount = async (data: any = user()) => {
  (communityApi.profile as jest.Mock).mockResolvedValue(data);
  const tree = renderApp(<UserProfile />);
  await flush();
  return tree;
};
const followers = (tree: any) => allText(tree);
const httpError = (status: number, message: string) => ({response: {status, data: {message}}});

beforeEach(() => {
  jest.clearAllMocks();
  resetNav({id: 'u2'});
  route.name = 'UserProfile';
});

describe('UserProfile screen', () => {
  it('shows the profile, the followers count and a Follow button', async () => {
    const tree = await mount();

    expect(communityApi.profile).toHaveBeenCalledWith('u2');
    expect(allText(tree)).toContain('Lan Anh');
    expect(tree.root.findByProps({testID: 'followers-count'})).toBeTruthy();
    expect(followers(tree)).toContain('4');
    expect(allText(tree)).toContain(t('community.follow'));
    expect(allText(tree)).not.toContain(t('community.unfollow'));
  });

  it('follows, then shows Following and the new followers count', async () => {
    (communityApi.follow as jest.Mock).mockResolvedValue({message: 'ok', following: true, followersCount: 5, followingCount: 1});
    const tree = await mount();

    await act(async () => pressText(tree, t('community.follow')));
    await flush();

    expect(communityApi.follow).toHaveBeenCalledWith('u2');
    expect(allText(tree)).toContain(t('community.unfollow'));
    expect(allText(tree)).not.toContain(t('community.follow') + t('community.unfollow'));
    expect(followers(tree)).toContain('5');
  });

  it('shows Following for a followed account and unfollows', async () => {
    (communityApi.unfollow as jest.Mock).mockResolvedValue({message: 'ok', following: false, followersCount: 4, followingCount: 1});
    const tree = await mount(user({following: true, followersCount: 5}));
    expect(allText(tree)).toContain(t('community.unfollow'));

    await act(async () => pressText(tree, t('community.unfollow')));
    await flush();

    expect(communityApi.unfollow).toHaveBeenCalledWith('u2');
    expect(allText(tree)).toContain(t('community.follow'));
    expect(allText(tree)).not.toContain(t('community.unfollow'));
  });

  it('sends you to your own Profile tab when the profile is yours', async () => {
    const tree = await mount(user({isSelf: true}));

    expect(nav.popToTop).toHaveBeenCalled();
    expect(nav.navigate).toHaveBeenCalledWith('Tabs', {screen: 'Profile'});
    expect(allText(tree)).not.toContain(t('community.follow'));
  });

  it('does not leave for somebody else', async () => {
    await mount();

    expect(nav.popToTop).not.toHaveBeenCalled();
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  it('shows the backend message and keeps the button when following fails', async () => {
    (communityApi.follow as jest.Mock).mockRejectedValue(httpError(403, 'This account is suspended'));
    const tree = await mount();

    await act(async () => pressText(tree, t('community.follow')));
    await flush();

    expect(allText(tree)).toContain('This account is suspended');
    expect(allText(tree)).toContain(t('community.follow'));
    expect(followers(tree)).toContain('4');
  });

  it('keeps Unfollow and the counts when unfollowing fails', async () => {
    (communityApi.unfollow as jest.Mock).mockRejectedValue(httpError(404, 'User not found'));
    const tree = await mount(user({following: true, followersCount: 5}));

    await act(async () => pressText(tree, t('community.unfollow')));
    await flush();

    expect(allText(tree)).toContain('User not found');
    expect(allText(tree)).toContain(t('community.unfollow'));
    expect(followers(tree)).toContain('5');
  });

  it('refreshes your own Profile counts after unfollowing', async () => {
    (communityApi.unfollow as jest.Mock).mockResolvedValue({message: 'ok', following: false, followersCount: 4, followingCount: 1});
    (communityApi.profile as jest.Mock).mockResolvedValue(user({following: true, followersCount: 5}));
    const client = queryClient();
    const spy = jest.spyOn(client, 'invalidateQueries');
    const tree = renderApp(<UserProfile />, {client});
    await flush();

    await act(async () => pressText(tree, t('community.unfollow')));
    await flush();

    expect(spy).toHaveBeenCalledWith({queryKey: ['communityUser', 'me']});
  });

  it('says so and offers a retry when the profile cannot be loaded', async () => {
    (communityApi.profile as jest.Mock).mockRejectedValueOnce(httpError(404, 'User not found'));
    const tree = renderApp(<UserProfile />);
    await flush();
    expect(allText(tree)).toContain(t('community.loadFailed'));
    expect(allText(tree)).not.toContain(t('community.follow'));

    (communityApi.profile as jest.Mock).mockResolvedValue(user());
    await act(async () => pressText(tree, t('common.retry')));
    await flush();

    expect(allText(tree)).toContain('Lan Anh');
  });

  it('goes back from the header', async () => {
    const tree = await mount();

    press(tree.root.findAllByType(TouchableOpacity)[0]);

    expect(nav.goBack).toHaveBeenCalled();
  });
});
