import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {saveSession} from '@/features/auth/store/session';
import {tripsApi} from '@/features/trips/api/tripsApi';
import SaveButton from '@/features/trips/components/SaveButton';
import {httpError, renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

const signIn = () => saveSession({message: 'ok', accessToken: 'a.b.c', data: {username: 'reader', role: 'user'}} as never);

beforeEach(() => vi.resetAllMocks());

describe('SaveButton', () => {
  describe('signed out', () => {
    it('shows a link to sign in, never a button that calls the API', async () => {
      renderWithProviders(<SaveButton tripId="t1" />);

      const link = screen.getByRole('link', {name: t('trips.savePost.signIn')});
      expect(link).toHaveAttribute('href', '/login');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      await userEvent.click(link);
      expect(tripsApi.savePost).not.toHaveBeenCalled();
    });
  });

  describe('signed in', () => {
    beforeEach(signIn);

    it('shows the current state: not saved', () => {
      renderWithProviders(<SaveButton tripId="t1" saved={false} />);

      expect(screen.getByRole('button', {name: t('trips.savePost.save')})).toHaveAttribute('aria-pressed', 'false');
    });

    it('shows the current state: already saved', () => {
      renderWithProviders(<SaveButton tripId="t1" saved />);

      expect(screen.getByRole('button', {name: t('trips.savePost.unsave')})).toHaveAttribute('aria-pressed', 'true');
    });

    it('saves, then shows the state the server answered and refreshes the saved list', async () => {
      vi.mocked(tripsApi.savePost).mockResolvedValue({saved: true});
      const {client} = renderWithProviders(<SaveButton tripId="t1" saved={false} />);
      const invalidate = vi.spyOn(client, 'invalidateQueries');

      await userEvent.click(screen.getByRole('button', {name: t('trips.savePost.save')}));

      expect(tripsApi.savePost).toHaveBeenCalledWith('t1');
      expect(await screen.findByRole('button', {name: t('trips.savePost.unsave')})).toHaveAttribute('aria-pressed', 'true');
      expect(invalidate).toHaveBeenCalledWith({queryKey: ['savedPosts']});
    });

    it('unsaves, then shows the state the server answered', async () => {
      vi.mocked(tripsApi.unsavePost).mockResolvedValue({saved: false});
      renderWithProviders(<SaveButton tripId="t1" saved />);

      await userEvent.click(screen.getByRole('button', {name: t('trips.savePost.unsave')}));

      expect(tripsApi.unsavePost).toHaveBeenCalledWith('t1');
      expect(await screen.findByRole('button', {name: t('trips.savePost.save')})).toHaveAttribute('aria-pressed', 'false');
    });

    it('cannot be pressed twice while the request is running (no duplicate save)', async () => {
      let finish: (value: {saved: boolean}) => void = () => {};
      vi.mocked(tripsApi.savePost).mockReturnValue(new Promise(resolve => (finish = resolve)));
      renderWithProviders(<SaveButton tripId="t1" />);

      await userEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('button')).toBeDisabled();
      await userEvent.click(screen.getByRole('button'));
      expect(tripsApi.savePost).toHaveBeenCalledTimes(1);

      finish({saved: true});
      await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('keeps the old state and says so when the post is gone (404)', async () => {
      vi.mocked(tripsApi.savePost).mockRejectedValue(httpError(404, {message: 'Post not found'}));
      renderWithProviders(<SaveButton tripId="t1" saved={false} />);

      await userEvent.click(screen.getByRole('button', {name: t('trips.savePost.save')}));

      expect(await screen.findByText(t('trips.savePost.unavailable'))).toBeInTheDocument();
      expect(screen.getByRole('button', {name: t('trips.savePost.save')})).toHaveAttribute('aria-pressed', 'false');
    });

    it('keeps the old state and shows a generic error for other failures', async () => {
      vi.mocked(tripsApi.unsavePost).mockRejectedValue(httpError(500));
      renderWithProviders(<SaveButton tripId="t1" saved />);

      await userEvent.click(screen.getByRole('button', {name: t('trips.savePost.unsave')}));

      expect(await screen.findByText(t('trips.savePost.failed'))).toBeInTheDocument();
      expect(screen.getByRole('button', {name: t('trips.savePost.unsave')})).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
