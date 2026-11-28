import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {saveSession} from '@/features/auth/store/session';
import {tripsApi} from '@/features/trips/api/tripsApi';
import LikeButton from '@/features/trips/components/LikeButton';
import {httpError, renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

const signIn = () => saveSession({message: 'ok', accessToken: 'a.b.c', data: {username: 'reader', role: 'user'}} as never);

beforeEach(() => vi.resetAllMocks());

describe('LikeButton', () => {
  describe('signed out', () => {
    it('shows the total and a link to sign in, never a button that calls the API', async () => {
      renderWithProviders(<LikeButton tripId="t1" likesCount={7} />);

      const link = screen.getByRole('link', {name: t('trips.like.signIn')});
      expect(link).toHaveAttribute('href', '/login');
      expect(screen.getByTestId('likes-count')).toHaveTextContent('7');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      await userEvent.click(link);
      expect(tripsApi.likePublic).not.toHaveBeenCalled();
    });
  });

  describe('signed in', () => {
    beforeEach(signIn);

    it('shows the current state: not liked, with the total', () => {
      renderWithProviders(<LikeButton tripId="t1" liked={false} likesCount={3} />);

      expect(screen.getByRole('button', {name: t('trips.like.like')})).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTestId('likes-count')).toHaveTextContent('3');
    });

    it('shows the current state: already liked', () => {
      renderWithProviders(<LikeButton tripId="t1" liked likesCount={3} />);

      expect(screen.getByRole('button', {name: t('trips.like.unlike')})).toHaveAttribute('aria-pressed', 'true');
    });

    it('likes, then shows the count the server answered', async () => {
      vi.mocked(tripsApi.likePublic).mockResolvedValue({liked: true, likesCount: 4});
      renderWithProviders(<LikeButton tripId="t1" liked={false} likesCount={3} />);

      await userEvent.click(screen.getByRole('button', {name: t('trips.like.like')}));

      expect(tripsApi.likePublic).toHaveBeenCalledWith('t1');
      expect(await screen.findByRole('button', {name: t('trips.like.unlike')})).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('likes-count')).toHaveTextContent('4');
    });

    it('unlikes, then shows the count the server answered', async () => {
      vi.mocked(tripsApi.unlikePublic).mockResolvedValue({liked: false, likesCount: 2});
      renderWithProviders(<LikeButton tripId="t1" liked likesCount={3} />);

      await userEvent.click(screen.getByRole('button', {name: t('trips.like.unlike')}));

      expect(tripsApi.unlikePublic).toHaveBeenCalledWith('t1');
      expect(await screen.findByRole('button', {name: t('trips.like.like')})).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTestId('likes-count')).toHaveTextContent('2');
    });

    it('cannot be pressed twice while the request is running (no duplicate like)', async () => {
      let finish: (value: {liked: boolean; likesCount: number}) => void = () => {};
      vi.mocked(tripsApi.likePublic).mockReturnValue(new Promise(resolve => (finish = resolve)));
      renderWithProviders(<LikeButton tripId="t1" likesCount={0} />);

      await userEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('button')).toBeDisabled();
      await userEvent.click(screen.getByRole('button'));
      expect(tripsApi.likePublic).toHaveBeenCalledTimes(1);

      finish({liked: true, likesCount: 1});
      await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
      expect(screen.getByTestId('likes-count')).toHaveTextContent('1');
    });

    it('keeps the old state and says so when the post is gone (404)', async () => {
      vi.mocked(tripsApi.likePublic).mockRejectedValue(httpError(404, {message: 'Post not found'}));
      renderWithProviders(<LikeButton tripId="t1" liked={false} likesCount={3} />);

      await userEvent.click(screen.getByRole('button', {name: t('trips.like.like')}));

      expect(await screen.findByText(t('trips.like.unavailable'))).toBeInTheDocument();
      expect(screen.getByRole('button', {name: t('trips.like.like')})).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTestId('likes-count')).toHaveTextContent('3');
    });

    it('keeps the old state and shows a generic error for other failures', async () => {
      vi.mocked(tripsApi.unlikePublic).mockRejectedValue(httpError(500));
      renderWithProviders(<LikeButton tripId="t1" liked likesCount={3} />);

      await userEvent.click(screen.getByRole('button', {name: t('trips.like.unlike')}));

      expect(await screen.findByText(t('trips.like.failed'))).toBeInTheDocument();
      expect(screen.getByTestId('likes-count')).toHaveTextContent('3');
    });

  });
});
