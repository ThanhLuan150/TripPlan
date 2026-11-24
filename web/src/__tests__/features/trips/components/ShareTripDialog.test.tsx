import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {tripsApi} from '@/features/trips/api/tripsApi';
import ShareTripDialog from '@/features/trips/components/ShareTripDialog';
import {httpError, renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

const off = {isShared: false, permission: null, shareToken: null, sharedAt: null};
const on = {isShared: true, permission: 'view' as const, shareToken: 'tok123', sharedAt: '2026-01-01'};

const renderDialog = (onClose = vi.fn()) => {
  renderWithProviders(<ShareTripDialog tripId="t1" onClose={onClose} />);
  return onClose;
};

beforeEach(() => vi.resetAllMocks());

describe('ShareTripDialog', () => {
  it('shows the status "off" with no link', async () => {
    vi.mocked(tripsApi.shareStatus).mockResolvedValue(off);
    renderDialog();

    expect(await screen.findByText(t('trips.share.statusOff'))).toBeInTheDocument();
    expect(screen.queryByLabelText(t('trips.share.linkLabel'))).not.toBeInTheDocument();
  });

  it('turns sharing on and shows the link and the view only permission', async () => {
    vi.mocked(tripsApi.shareStatus).mockResolvedValue(off);
    vi.mocked(tripsApi.enableShare).mockResolvedValue(on);
    renderDialog();

    await userEvent.click(await screen.findByRole('switch'));

    expect(tripsApi.enableShare).toHaveBeenCalledWith('t1');
    const input = await screen.findByLabelText(t('trips.share.linkLabel'));
    expect(input).toHaveValue(`${window.location.origin}/shared/tok123`);
    expect(screen.getByText(t('trips.share.statusOn'))).toBeInTheDocument();
    expect(screen.getByText(t('trips.share.permissionView'))).toBeInTheDocument();
  });

  it('copies the link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {value: {writeText}, configurable: true});
    vi.mocked(tripsApi.shareStatus).mockResolvedValue(on);
    renderDialog();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.share.copy')}));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/shared/tok123`);
    expect(await screen.findByText(t('trips.share.copied'))).toBeInTheDocument();
  });

  it('turns sharing off: the link disappears', async () => {
    vi.mocked(tripsApi.shareStatus).mockResolvedValue(on);
    vi.mocked(tripsApi.disableShare).mockResolvedValue(off);
    renderDialog();

    await userEvent.click(await screen.findByRole('switch'));

    expect(tripsApi.disableShare).toHaveBeenCalledWith('t1');
    await waitFor(() => expect(screen.queryByLabelText(t('trips.share.linkLabel'))).not.toBeInTheDocument());
    expect(screen.getByText(t('trips.share.statusOff'))).toBeInTheDocument();
  });

  it('keeps the old state and tells the user when the change fails', async () => {
    vi.mocked(tripsApi.shareStatus).mockResolvedValue(off);
    vi.mocked(tripsApi.enableShare).mockRejectedValue(httpError(500));
    renderDialog();

    await userEvent.click(await screen.findByRole('switch'));

    expect(await screen.findByText(t('trips.share.failed'))).toBeInTheDocument();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('offers a retry when the status cannot be loaded', async () => {
    vi.mocked(tripsApi.shareStatus).mockRejectedValueOnce(httpError(500)).mockResolvedValue(off);
    renderDialog();

    await userEvent.click(await screen.findByRole('button', {name: t('common.retry')}));

    expect(await screen.findByText(t('trips.share.statusOff'))).toBeInTheDocument();
  });

  it('closes with the close button and with Escape', async () => {
    vi.mocked(tripsApi.shareStatus).mockResolvedValue(off);
    const onClose = renderDialog();

    await userEvent.click(screen.getByRole('button', {name: t('common.close')}));
    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
