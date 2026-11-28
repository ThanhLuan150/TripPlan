import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {communityApi} from '@/features/community/api/communityApi';
import UserProfilePage from '@/features/community/pages/UserProfilePage';
import type {CommunityUser} from '@/features/community/types';
import {currentPath, httpError, networkError, pending, renderWithProviders, t} from '../../utils/render';

vi.mock('@/features/community/api/communityApi');

const user = (extra: Partial<CommunityUser> = {}): CommunityUser => ({
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
const open = () => renderWithProviders(<UserProfilePage />, {route: '/user/u2', path: '/user/:id'});
const followButton = () => screen.findByRole('button', {name: t('community.follow')});

beforeEach(() => {
  vi.resetAllMocks();
});

describe('UserProfilePage', () => {
  it('shows the profile, the followers count and a Follow button', async () => {
    vi.mocked(communityApi.profile).mockResolvedValue(user());
    open();

    expect(await screen.findByTestId('followers-count')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', {name: 'Lan Anh'}).length).toBeGreaterThan(0);
    expect(communityApi.profile).toHaveBeenCalledWith('u2');
    expect(screen.getByTestId('followers-count')).toHaveTextContent('4');
    expect(await followButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('follows, then shows Following and the new followers count', async () => {
    vi.mocked(communityApi.profile).mockResolvedValue(user());
    vi.mocked(communityApi.follow).mockResolvedValue({message: 'ok', following: true, followersCount: 5, followingCount: 1});
    open();

    await userEvent.click(await followButton());

    expect(communityApi.follow).toHaveBeenCalledWith('u2');
    expect(await screen.findByRole('button', {name: t('community.unfollow')})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: t('community.follow')})).not.toBeInTheDocument();
    expect(screen.getByTestId('followers-count')).toHaveTextContent('5');
  });

  it('shows Following when the account is already followed, and unfollows', async () => {
    vi.mocked(communityApi.profile).mockResolvedValue(user({following: true, followersCount: 5}));
    vi.mocked(communityApi.unfollow).mockResolvedValue({message: 'ok', following: false, followersCount: 4, followingCount: 1});
    open();

    await userEvent.click(await screen.findByRole('button', {name: t('community.unfollow')}));

    expect(communityApi.unfollow).toHaveBeenCalledWith('u2');
    expect(await followButton()).toBeInTheDocument();
    expect(screen.getByTestId('followers-count')).toHaveTextContent('4');
  });

  it('keeps Unfollow and the counts when unfollowing fails', async () => {
    vi.mocked(communityApi.profile).mockResolvedValue(user({following: true, followersCount: 5}));
    vi.mocked(communityApi.unfollow).mockRejectedValue(httpError(500, {message: 'boom'}));
    open();

    await userEvent.click(await screen.findByRole('button', {name: t('community.unfollow')}));

    expect(await screen.findByText(t('community.failed'))).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t('community.unfollow')})).toBeEnabled();
    expect(screen.getByTestId('followers-count')).toHaveTextContent('5');
  });

  it('explains a missing account when unfollowing', async () => {
    vi.mocked(communityApi.profile).mockResolvedValue(user({following: true}));
    vi.mocked(communityApi.unfollow).mockRejectedValue(httpError(404, {message: 'User not found'}));
    open();

    await userEvent.click(await screen.findByRole('button', {name: t('community.unfollow')}));

    expect(await screen.findByText(t('community.notFound'))).toBeInTheDocument();
  });

  it('refreshes your own Profile counts after unfollowing', async () => {
    vi.mocked(communityApi.profile).mockResolvedValue(user({following: true, followersCount: 5}));
    vi.mocked(communityApi.unfollow).mockResolvedValue({message: 'ok', following: false, followersCount: 4, followingCount: 1});
    const {client} = open();
    const spy = vi.spyOn(client, 'invalidateQueries');

    await userEvent.click(await screen.findByRole('button', {name: t('community.unfollow')}));

    await waitFor(() => expect(spy).toHaveBeenCalledWith({queryKey: ['community-user', 'me']}));
  });

  it('disables the button while the request is pending (no double follow)', async () => {
    vi.mocked(communityApi.profile).mockResolvedValue(user());
    vi.mocked(communityApi.follow).mockReturnValue(pending());
    open();

    await userEvent.click(await followButton());

    await waitFor(() => expect(screen.getByRole('button', {name: t('community.follow')})).toBeDisabled());
    expect(communityApi.follow).toHaveBeenCalledTimes(1);
  });

  it('sends you to your own Profile page when the profile is yours', async () => {
    vi.mocked(communityApi.profile).mockResolvedValue(user({isSelf: true}));
    open();

    expect(await currentPath()).toBe('/profile');
    expect(screen.queryByRole('button', {name: t('community.follow')})).not.toBeInTheDocument();
  });

  it('keeps the button and tells the user when following fails', async () => {
    vi.mocked(communityApi.profile).mockResolvedValue(user());
    vi.mocked(communityApi.follow).mockRejectedValue(httpError(400, {message: 'You cannot follow yourself'}));
    open();

    await userEvent.click(await followButton());

    expect(await screen.findByText(t('community.failed'))).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t('community.follow')})).toBeEnabled();
    expect(screen.getByTestId('followers-count')).toHaveTextContent('4');
  });

  it('explains a blocked account when following', async () => {
    vi.mocked(communityApi.profile).mockResolvedValue(user());
    vi.mocked(communityApi.follow).mockRejectedValue(httpError(403, {message: 'This account is suspended'}));
    open();

    await userEvent.click(await followButton());

    expect(await screen.findByText(t('community.blocked'))).toBeInTheDocument();
  });

  it('explains a network error when following', async () => {
    vi.mocked(communityApi.profile).mockResolvedValue(user());
    vi.mocked(communityApi.unfollow).mockRejectedValue(networkError());
    vi.mocked(communityApi.follow).mockRejectedValue(networkError());
    open();

    await userEvent.click(await followButton());

    expect(await screen.findByText(t('common.networkError'))).toBeInTheDocument();
  });

  it('says so when the account does not exist', async () => {
    vi.mocked(communityApi.profile).mockRejectedValue(httpError(404, {message: 'User not found'}));
    open();

    expect(await screen.findByText(t('community.notFound'))).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: t('community.follow')})).not.toBeInTheDocument();
  });

  it('says so when the account is suspended', async () => {
    vi.mocked(communityApi.profile).mockRejectedValue(httpError(403));
    open();

    expect(await screen.findByText(t('community.blocked'))).toBeInTheDocument();
  });

  it('offers a retry when the profile cannot be loaded', async () => {
    vi.mocked(communityApi.profile).mockRejectedValueOnce(httpError(500)).mockResolvedValue(user());
    open();

    await userEvent.click(await screen.findByRole('button', {name: t('common.retry')}));

    expect(await screen.findByTestId('followers-count')).toBeInTheDocument();
  });

  it('goes back to where the user came from', async () => {
    vi.mocked(communityApi.profile).mockResolvedValue(user());
    renderWithProviders(<UserProfilePage />, {route: '/user/u2', path: '/user/:id', history: ['/ranking']});
    await screen.findByTestId('followers-count');

    await userEvent.click(screen.getByRole('button', {name: t('common.back')}));

    expect(await currentPath()).toBe('/ranking');
  });

  it('uses the first letter when there is no photo', async () => {
    vi.mocked(communityApi.profile).mockResolvedValue(user({image: undefined}));
    open();

    expect(await screen.findByText('L')).toBeInTheDocument();
  });
});
