import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {tripsApi} from '@/features/trips/api/tripsApi';
import SharePostDialog from '@/features/trips/components/SharePostDialog';
import {httpError, networkError, renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

const off = {isPosted: false, visibility: 'private' as const, content: '', postedAt: null};
const on = {isPosted: true, visibility: 'public' as const, content: 'Old intro', postedAt: '2026-01-01'};

const renderDialog = (onClose = vi.fn()) => {
  renderWithProviders(<SharePostDialog tripId="t1" onClose={onClose} />);
  return onClose;
};
const box = () => screen.getByLabelText(t('trips.post.contentLabel'));

beforeEach(() => vi.resetAllMocks());

describe('SharePostDialog', () => {
  it('explains that posting makes the plan public and shows it is not a post yet', async () => {
    vi.mocked(tripsApi.postStatus).mockResolvedValue(off);
    renderDialog();

    expect(await screen.findByText(t('trips.post.notPosted'))).toBeInTheDocument();
    expect(screen.getByText(t('trips.post.notice'))).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t('trips.post.share')})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: t('trips.post.remove')})).not.toBeInTheDocument();
    expect(tripsApi.postStatus).toHaveBeenCalledWith('t1');
  });

  it('shares the plan with the introduction that was typed (trimmed) and shows the post status', async () => {
    vi.mocked(tripsApi.postStatus).mockResolvedValue(off);
    vi.mocked(tripsApi.sharePost).mockResolvedValue({...on, content: 'Hello'});
    renderDialog();

    await userEvent.type(await screen.findByLabelText(t('trips.post.contentLabel')), '  Hello  ');
    await userEvent.click(screen.getByRole('button', {name: t('trips.post.share')}));

    await waitFor(() => expect(tripsApi.sharePost).toHaveBeenCalledWith('t1', 'Hello'));
    expect(await screen.findByText(t('trips.post.posted'))).toBeInTheDocument();
    expect(screen.getByText(t('trips.post.shared'))).toBeInTheDocument();
    expect(screen.getByRole('link', {name: t('trips.post.viewPost')})).toHaveAttribute('href', '/trip/t1');
  });

  it('the introduction is optional', async () => {
    vi.mocked(tripsApi.postStatus).mockResolvedValue(off);
    vi.mocked(tripsApi.sharePost).mockResolvedValue(on);
    renderDialog();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.post.share')}));

    await waitFor(() => expect(tripsApi.sharePost).toHaveBeenCalledWith('t1', ''));
  });

  it('a plan that is already a post shows its introduction and updates it', async () => {
    vi.mocked(tripsApi.postStatus).mockResolvedValue(on);
    vi.mocked(tripsApi.sharePost).mockResolvedValue({...on, content: 'New intro'});
    renderDialog();

    const input = await screen.findByLabelText(t('trips.post.contentLabel'));
    expect(input).toHaveValue('Old intro');
    expect(screen.getByText(t('trips.post.posted'))).toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, 'New intro');
    await userEvent.click(screen.getByRole('button', {name: t('trips.post.update')}));

    await waitFor(() => expect(tripsApi.sharePost).toHaveBeenCalledWith('t1', 'New intro'));
    expect(await screen.findByText(t('trips.post.updated'))).toBeInTheDocument();
  });

  it('counts the characters and refuses an introduction that is too long, without calling the API', async () => {
    vi.mocked(tripsApi.postStatus).mockResolvedValue(off);
    renderDialog();
    await screen.findByLabelText(t('trips.post.contentLabel'));

    await userEvent.click(box());
    await userEvent.paste('a'.repeat(1001));

    expect(screen.getByText(t('trips.post.counter', {count: 1001, max: 1000}))).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(t('trips.post.tooLong', {max: 1000}));
    expect(screen.getByRole('button', {name: t('trips.post.share')})).toBeDisabled();
    expect(tripsApi.sharePost).not.toHaveBeenCalled();
  });

  it('says the plan needs a day when the server refuses an empty plan', async () => {
    vi.mocked(tripsApi.postStatus).mockResolvedValue(off);
    vi.mocked(tripsApi.sharePost).mockRejectedValue(httpError(400, {message: 'Add at least one day to the trip before sharing it'}));
    renderDialog();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.post.share')}));

    expect(await screen.findByText(t('trips.post.noDays'))).toBeInTheDocument();
    expect(screen.getByText(t('trips.post.notPosted'))).toBeInTheDocument();
  });

  it('shows a generic error, and the network error when the server cannot be reached', async () => {
    vi.mocked(tripsApi.postStatus).mockResolvedValue(off);
    vi.mocked(tripsApi.sharePost).mockRejectedValueOnce(httpError(500)).mockRejectedValueOnce(networkError());
    renderDialog();
    const share = await screen.findByRole('button', {name: t('trips.post.share')});

    await userEvent.click(share);
    expect(await screen.findByText(t('trips.post.failed'))).toBeInTheDocument();
    await userEvent.click(share);
    expect(await screen.findByText(t('common.networkError'))).toBeInTheDocument();
  });

  it('removing the post asks first, then makes the plan private again', async () => {
    vi.mocked(tripsApi.postStatus).mockResolvedValue(on);
    vi.mocked(tripsApi.removePost).mockResolvedValue({...off});
    renderDialog();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.post.remove')}));
    expect(tripsApi.removePost).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', {name: t('trips.post.removeAction')}));

    await waitFor(() => expect(tripsApi.removePost).toHaveBeenCalledWith('t1'));
    expect(await screen.findByText(t('trips.post.notPosted'))).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: t('trips.post.remove')})).not.toBeInTheDocument();
  });

  it('cancelling the removal keeps the post', async () => {
    vi.mocked(tripsApi.postStatus).mockResolvedValue(on);
    renderDialog();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.post.remove')}));
    await userEvent.click(screen.getByRole('button', {name: t('common.cancel')}));

    expect(tripsApi.removePost).not.toHaveBeenCalled();
    expect(screen.getByText(t('trips.post.posted'))).toBeInTheDocument();
  });

  it('shows an error when the post cannot be removed', async () => {
    vi.mocked(tripsApi.postStatus).mockResolvedValue(on);
    vi.mocked(tripsApi.removePost).mockRejectedValue(httpError(500));
    renderDialog();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.post.remove')}));
    await userEvent.click(screen.getByRole('button', {name: t('trips.post.removeAction')}));

    expect(await screen.findByText(t('trips.post.removeFailed'))).toBeInTheDocument();
    expect(screen.getByText(t('trips.post.posted'))).toBeInTheDocument();
  });

  it('offers a retry when the status cannot be loaded', async () => {
    vi.mocked(tripsApi.postStatus).mockRejectedValueOnce(httpError(500)).mockResolvedValue(off);
    renderDialog();

    await userEvent.click(await screen.findByRole('button', {name: t('common.retry')}));

    expect(await screen.findByText(t('trips.post.notPosted'))).toBeInTheDocument();
  });

  it('closes with the button and with Escape', async () => {
    vi.mocked(tripsApi.postStatus).mockResolvedValue(off);
    const onClose = renderDialog();
    await screen.findByText(t('trips.post.notPosted'));

    await userEvent.click(screen.getByRole('button', {name: t('common.close')}));
    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
