import {fireEvent, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {challengeApi, tripsApi} from '@/features/trips/api/tripsApi';
import TripDetailPage from '@/features/trips/pages/TripDetailPage';
import type {Challenge} from '@/features/trips/types';
import {uploadImage} from '@/lib/upload';
import {currentPath, httpError, pending, renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');
vi.mock('@/lib/upload', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/upload')>()),
  uploadImage: vi.fn(),
}));
// The real dialog (location check) has its own tests: here it hands a photo
// back and closes, like the real one does.
vi.mock('@/features/trips/components/ChallengeLocationDialog', () => ({
  default: ({challenge, onClose, onPhoto}: {challenge: Challenge; onClose: () => void; onPhoto: (f: File) => void}) => (
    <div role="dialog" aria-label="location check">
      <p>{challenge.challengeSummary}</p>
      <button
        type="button"
        onClick={() => {
          onPhoto(new File(['x'], 'photo.jpg', {type: 'image/jpeg'}));
          onClose();
        }}>
        send photo
      </button>
      <button type="button" onClick={onClose}>
        close dialog
      </button>
    </div>
  ),
}));

const trip = {
  location: 'Lâm Đồng',
  startDate: '2026-03-02T09:00:00',
  endDate: '2026-03-03T09:00:00',
  dataTripDays: [
    {
      title: 'Trung tâm Đà Lạt',
      date: '2026-03-02T09:00:00',
      transportCost: 100000,
      foodCost: 200000,
      otherCost: 0,
      challenges: [
        {_id: 'c1', challengeSummary: 'Chụp ảnh Hồ Xuân Hương', location: 'Hồ Xuân Hương, Đà Lạt', points: 20, completed: true, imageUrl: 'http://img/c1.jpg'},
        {_id: 'c2', challengeSummary: 'Ăn bánh tráng nướng', points: 10},
      ],
    },
    {
      title: 'Langbiang',
      date: '2026-03-03T09:00:00',
      transportCost: 50000,
      foodCost: 150000,
      otherCost: 300000,
      challenges: [{_id: 'c3', challengeSummary: 'Leo núi Langbiang', points: 80}],
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(tripsApi.get).mockResolvedValue(trip as never);
});

const render = () =>
  renderWithProviders(<TripDetailPage />, {route: '/assistant/trips/t1', path: '/assistant/trips/:idTrip'});

// value of a stat card ("challenges", "points earned", "days")
const stat = (labelKey: string) => screen.getByText(t(labelKey)).previousElementSibling?.textContent;

describe('TripDetailPage', () => {
  it('shows placeholders while loading', () => {
    vi.mocked(tripsApi.get).mockReturnValue(pending());
    const {container} = render();

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(tripsApi.get).toHaveBeenCalledWith('t1');
  });

  it('offers to go back to the list when the trip cannot be loaded', async () => {
    vi.mocked(tripsApi.get).mockRejectedValue(httpError(404));
    const user = userEvent.setup();
    render();

    expect(await screen.findByText(t('trips.detail.loadFailed'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: t('trips.detail.backToList')}));

    expect(await currentPath()).toBe('/assistant/trips');
  });

  it('shows the trip, its progress and the first day', async () => {
    render();

    expect(await screen.findByRole('heading', {name: 'Lâm Đồng'})).toBeInTheDocument();
    expect(screen.getByText('2/3/2026 - 3/3/2026')).toBeInTheDocument();
    expect(stat('trips.detail.challenges')).toBe('1/3');
    expect(stat('trips.detail.pointsEarned')).toBe('20/110');
    expect(stat('trips.detail.days')).toBe('2');

    // day 1 open: its challenges and costs (no "other" cost when 0)
    expect(screen.getByText('Chụp ảnh Hồ Xuân Hương')).toBeInTheDocument();
    expect(screen.getByTitle('Hồ Xuân Hương, Đà Lạt')).toBeInTheDocument();
    expect(screen.getByText('200.000 VND')).toBeInTheDocument();
    expect(screen.queryByText(t('trips.detail.other'))).toBeNull();
    // day 2 closed
    expect(screen.queryByText('Leo núi Langbiang')).toBeNull();
  });

  it('opens and closes the days', async () => {
    const user = userEvent.setup();
    render();
    const day2 = await screen.findByRole('button', {name: /Langbiang/});

    expect(day2).toHaveAttribute('aria-expanded', 'false');
    await user.click(day2);
    expect(day2).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Leo núi Langbiang')).toBeInTheDocument();
    expect(screen.getByText(t('trips.detail.other'))).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: /Trung tâm Đà Lạt/}));
    expect(screen.queryByText('Chụp ảnh Hồ Xuân Hương')).toBeNull();
  });

  it('a completed challenge shows its photo and cannot be retaken', async () => {
    render();

    const photo = await screen.findByRole('img', {name: 'Chụp ảnh Hồ Xuân Hương'});
    expect(photo).toHaveAttribute('src', 'http://img/c1.jpg');
    expect(photo.closest('button')).toBeDisabled();
  });

  it('completes a challenge with a photo and awards its points', async () => {
    vi.mocked(uploadImage).mockResolvedValue('http://api/files/p2');
    vi.mocked(challengeApi.complete).mockResolvedValue({});
    const user = userEvent.setup();
    render();

    await user.click(await screen.findByRole('button', {name: t('trips.detail.addPhoto')}));
    const dialog = screen.getByRole('dialog', {name: 'location check'});
    expect(dialog).toHaveTextContent('Ăn bánh tráng nướng');
    await user.click(within(dialog).getByRole('button', {name: 'send photo'}));

    expect(await screen.findByText(t('trips.detail.earned', {points: 10}))).toBeInTheDocument();
    expect(uploadImage).toHaveBeenCalledWith(expect.objectContaining({name: 'photo.jpg'}));
    expect(challengeApi.complete).toHaveBeenCalledWith('c2', 'http://api/files/p2');
    expect(screen.getByRole('img', {name: 'Ăn bánh tráng nướng'})).toHaveAttribute('src', 'http://api/files/p2');
    expect(stat('trips.detail.challenges')).toBe('2/3');
    expect(stat('trips.detail.pointsEarned')).toBe('30/110');
    // the trip is reloaded from the backend
    await vi.waitFor(() => expect(tripsApi.get).toHaveBeenCalledTimes(2));
  });

  it('a new photo can be retaken after a confirmation', async () => {
    vi.mocked(uploadImage).mockResolvedValue('http://api/files/p2');
    vi.mocked(challengeApi.complete).mockResolvedValue({});
    const user = userEvent.setup();
    render();
    await user.click(await screen.findByRole('button', {name: t('trips.detail.addPhoto')}));
    await user.click(screen.getByRole('button', {name: 'send photo'}));
    const photo = await screen.findByRole('img', {name: 'Ăn bánh tráng nướng'});

    await user.click(photo.closest('button')!);
    expect(screen.getByRole('dialog')).toHaveTextContent(t('trips.detail.retakeTitle'));
    await user.click(screen.getByRole('button', {name: t('common.confirm')}));

    expect(screen.getByRole('dialog', {name: 'location check'})).toHaveTextContent('Ăn bánh tráng nướng');
  });

  it('retake can be cancelled; the location dialog can be closed', async () => {
    vi.mocked(uploadImage).mockResolvedValue('http://api/files/p2');
    vi.mocked(challengeApi.complete).mockResolvedValue({});
    const user = userEvent.setup();
    render();
    await user.click(await screen.findByRole('button', {name: t('trips.detail.addPhoto')}));
    await user.click(screen.getByRole('button', {name: 'close dialog'}));
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(screen.getByRole('button', {name: t('trips.detail.addPhoto')}));
    await user.click(screen.getByRole('button', {name: 'send photo'}));
    const photo = await screen.findByRole('img', {name: 'Ăn bánh tráng nướng'});
    await user.click(photo.closest('button')!);
    await user.click(screen.getByRole('button', {name: t('common.cancel')}));

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each([
    [httpError(413, {code: 'IMAGE_TOO_LARGE'}), 'common.imageTooLarge'],
    [httpError(500), 'trips.detail.updateFailed'],
  ])('explains a failed upload', async (error, key) => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.mocked(uploadImage).mockRejectedValue(error);
    const user = userEvent.setup();
    render();

    await user.click(await screen.findByRole('button', {name: t('trips.detail.addPhoto')}));
    await user.click(screen.getByRole('button', {name: 'send photo'}));

    expect(await screen.findByText(t(key))).toBeInTheDocument();
    expect(screen.getByRole('button', {name: t('trips.detail.addPhoto')})).toBeInTheDocument();
  });

  it('shows a spinner during the upload', async () => {
    vi.mocked(uploadImage).mockReturnValue(pending());
    const user = userEvent.setup();
    render();

    await user.click(await screen.findByRole('button', {name: t('trips.detail.addPhoto')}));
    await user.click(screen.getByRole('button', {name: 'send photo'}));

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('links to the map and back to the list', async () => {
    const user = userEvent.setup();
    render();

    await user.click(await screen.findByRole('button', {name: t('trips.detail.viewMap')}));
    expect(await currentPath()).toBe('/assistant/trips/t1/map');
  });

  it('the back arrow returns to the list', async () => {
    const user = userEvent.setup();
    render();

    await user.click(await screen.findByRole('button', {name: t('trips.detail.backToList')}));
    expect(await currentPath()).toBe('/assistant/trips');
  });

  it('hides the cover photo when it fails to load', async () => {
    const {container} = render();
    await screen.findByRole('heading', {name: 'Lâm Đồng'});
    const cover = container.querySelector('img[alt=""]')!;

    fireEvent.error(cover);

    expect(container.querySelector(`img[src="${cover.getAttribute('src')}"]`)).toBeNull();
  });

  it('counts a challenge without points as 0', async () => {
    const day = {...trip.dataTripDays[0], challenges: [{_id: 'c9', challengeSummary: 'Tự do'}]};
    vi.mocked(tripsApi.get).mockResolvedValue({...trip, dataTripDays: [day]} as never);
    render();

    await screen.findByText('Tự do');
    expect(stat('trips.detail.pointsEarned')).toBe('0/0');
  });

  it('handles a trip without challenges', async () => {
    vi.mocked(tripsApi.get).mockResolvedValue({...trip, location: 'Nowhere', dataTripDays: []} as never);
    render();

    await screen.findByRole('heading', {name: 'Nowhere'});
    expect(stat('trips.detail.challenges')).toBe('0/0');
    expect(stat('trips.detail.days')).toBe('0');
  });
});
