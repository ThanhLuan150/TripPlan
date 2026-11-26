import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {tripsApi} from '@/features/trips/api/tripsApi';
import TripVisibilityButton from '@/features/trips/components/TripVisibilityButton';
import {renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

beforeEach(() => vi.resetAllMocks());

describe('TripVisibilityButton', () => {
  it('shows "private" for a private trip', async () => {
    vi.mocked(tripsApi.visibility).mockResolvedValue({visibility: 'private'});
    renderWithProviders(<TripVisibilityButton tripId="t1" />);

    expect(await screen.findByText(t('trips.visibility.private'))).toBeInTheDocument();
  });

  it('makes a private trip public only after the owner confirms', async () => {
    vi.mocked(tripsApi.visibility).mockResolvedValue({visibility: 'private'});
    vi.mocked(tripsApi.setVisibility).mockResolvedValue({visibility: 'public'});
    renderWithProviders(<TripVisibilityButton tripId="t1" />);

    await userEvent.click(await screen.findByRole('button', {name: t('trips.visibility.change')}));
    expect(screen.getByText(t('trips.visibility.confirmPublicTitle'))).toBeInTheDocument();
    expect(tripsApi.setVisibility).not.toHaveBeenCalled();

    // cancelling changes nothing
    await userEvent.click(screen.getByRole('button', {name: t('common.cancel')}));
    expect(screen.queryByText(t('trips.visibility.confirmPublicTitle'))).not.toBeInTheDocument();
    expect(tripsApi.setVisibility).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', {name: t('trips.visibility.change')}));
    await userEvent.click(screen.getByRole('button', {name: t('trips.visibility.confirmPublicAction')}));
    expect(tripsApi.setVisibility).toHaveBeenCalledWith('t1', 'public');
    expect(await screen.findByText(t('trips.visibility.public'))).toBeInTheDocument();
  });

  it('makes a public trip private without asking', async () => {
    vi.mocked(tripsApi.visibility).mockResolvedValue({visibility: 'public'});
    vi.mocked(tripsApi.setVisibility).mockResolvedValue({visibility: 'private'});
    renderWithProviders(<TripVisibilityButton tripId="t1" />);

    await userEvent.click(await screen.findByRole('button', {name: t('trips.visibility.change')}));

    expect(tripsApi.setVisibility).toHaveBeenCalledWith('t1', 'private');
    expect(await screen.findByText(t('trips.visibility.private'))).toBeInTheDocument();
  });

  it('copies the public link only while the trip is public', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {value: {writeText}, configurable: true});
    vi.mocked(tripsApi.visibility).mockResolvedValue({visibility: 'public'});
    renderWithProviders(<TripVisibilityButton tripId="t1" />);

    await userEvent.click(await screen.findByRole('button', {name: t('trips.visibility.copyLink')}));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/trip/t1`);
  });

  it('has no copy link button for a private trip', async () => {
    vi.mocked(tripsApi.visibility).mockResolvedValue({visibility: 'private'});
    renderWithProviders(<TripVisibilityButton tripId="t1" />);

    await screen.findByText(t('trips.visibility.private'));
    expect(screen.queryByRole('button', {name: t('trips.visibility.copyLink')})).not.toBeInTheDocument();
  });
});
