import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {tripsApi} from '@/features/trips/api/tripsApi';
import {aiEditErrorKey} from '@/features/trips/aiEditValidation';
import AiEditPanel from '@/features/trips/components/AiEditPanel';
import type {AiEditProposal, TripDay} from '@/features/trips/types';
import {httpError, pending, renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

const days: TripDay[] = [
  {
    title: 'Ngày 1',
    date: '2026-03-01',
    challenges: [
      {
        _id: 'c1',
        challengeSummary: 'Đi dạo',
        nameLocation: 'Hồ Xuân Hương',
        points: 20,
      },
    ],
  },
];

const proposal: AiEditProposal = {
  id: 'p1',
  days: [
    {
      title: 'Ngày 1 mới',
      activities: [
        {
          name_location: 'Hồ Xuân Hương',
          challenge_summary: 'Đi dạo',
          level_of_difficult: 20,
        },
        {
          name_location: 'Quán cà phê Mê Linh',
          challenge_summary: 'Uống cà phê',
          level_of_difficult: 10,
        },
      ],
      transportCost: 1000,
      foodCost: 2000,
      otherCost: 0,
    },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
});

const render = () => renderWithProviders(<AiEditPanel tripId="t1" days={days} />);
const ask = async (text = 'Thêm quán cà phê') => {
  await userEvent.type(screen.getByRole('textbox'), text);
  await userEvent.click(screen.getByRole('button', {name: t('trips.aiEdit.ask')}));
};

describe('aiEditErrorKey', () => {
  it('accepts text, rejects empty and too long', () => {
    expect(aiEditErrorKey('hello')).toBeNull();
    expect(aiEditErrorKey('   ')).toBe('trips.aiEdit.required');
    expect(aiEditErrorKey('a'.repeat(501))).toBe('trips.aiEdit.tooLong');
  });
});

describe('AiEditPanel', () => {
  it('does not call the AI for an empty request', async () => {
    render();

    await userEvent.click(screen.getByRole('button', {name: t('trips.aiEdit.ask')}));

    expect(await screen.findByText(t('trips.aiEdit.required'))).toBeInTheDocument();
    expect(tripsApi.proposeAiEdit).not.toHaveBeenCalled();
  });

  it('shows a preview (new places marked) and saves nothing until Accept', async () => {
    vi.mocked(tripsApi.proposeAiEdit).mockResolvedValue(proposal);
    render();

    await ask();

    expect(await screen.findByText(t('trips.aiEdit.previewTitle'))).toBeInTheDocument();
    expect(tripsApi.proposeAiEdit).toHaveBeenCalledWith('t1', 'Thêm quán cà phê');
    expect(screen.getByText('Quán cà phê Mê Linh')).toBeInTheDocument();
    expect(screen.getAllByText(t('trips.aiEdit.newPlace'))).toHaveLength(1);
    expect(tripsApi.applyAiEdit).not.toHaveBeenCalled();
  });

  it('marks a completed place the AI left out as kept, not as new', async () => {
    vi.mocked(tripsApi.proposeAiEdit).mockResolvedValue({
      id: 'p2',
      days: [
        {
          ...proposal.days[0],
          activities: [
            {
              name_location: 'Hồ Xuân Hương',
              challenge_summary: 'Đi dạo',
              level_of_difficult: 20,
              kept: true,
            },
          ],
        },
      ],
    });
    render();

    await ask();

    expect(await screen.findByText(t('trips.aiEdit.kept'))).toBeInTheDocument();
    expect(screen.queryByText(t('trips.aiEdit.newPlace'))).toBeNull();
  });

  it('Enter sends the request, Shift+Enter only adds a line', async () => {
    vi.mocked(tripsApi.proposeAiEdit).mockResolvedValue(proposal);
    render();

    await userEvent.type(screen.getByRole('textbox'), 'Thêm quán{Shift>}{Enter}{/Shift}cà phê');
    expect(tripsApi.proposeAiEdit).not.toHaveBeenCalled();

    await userEvent.type(screen.getByRole('textbox'), '{Enter}');

    expect(await screen.findByText(t('trips.aiEdit.previewTitle'))).toBeInTheDocument();
    expect(tripsApi.proposeAiEdit).toHaveBeenCalledWith('t1', 'Thêm quán\ncà phê');
  });

  it('Enter on an empty request shows the error and does not call the AI', async () => {
    render();

    await userEvent.type(screen.getByRole('textbox'), '{Enter}');

    expect(await screen.findByText(t('trips.aiEdit.required'))).toBeInTheDocument();
    expect(tripsApi.proposeAiEdit).not.toHaveBeenCalled();
  });

  it('shows a loading state while the AI works', async () => {
    vi.mocked(tripsApi.proposeAiEdit).mockReturnValue(pending());
    render();

    await ask();

    expect(await screen.findByText(t('trips.aiEdit.loading'))).toBeInTheDocument();
  });

  it('Accept sends the proposal, confirms and closes the preview', async () => {
    vi.mocked(tripsApi.proposeAiEdit).mockResolvedValue(proposal);
    vi.mocked(tripsApi.applyAiEdit).mockResolvedValue({});
    render();
    await ask();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.aiEdit.accept')}));

    expect(tripsApi.applyAiEdit).toHaveBeenCalledWith('t1', 'p1');
    expect(await screen.findByText(t('trips.aiEdit.applied'))).toBeInTheDocument();
    expect(screen.queryByText(t('trips.aiEdit.previewTitle'))).toBeNull();
  });

  it('Reject drops the proposal without saving anything', async () => {
    vi.mocked(tripsApi.proposeAiEdit).mockResolvedValue(proposal);
    render();
    await ask();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.aiEdit.reject')}));

    expect(screen.queryByText(t('trips.aiEdit.previewTitle'))).toBeNull();
    expect(await screen.findByText(t('trips.aiEdit.rejected'))).toBeInTheDocument();
    expect(tripsApi.rejectAiEdit).toHaveBeenCalledWith('t1', 'p1');
    expect(tripsApi.applyAiEdit).not.toHaveBeenCalled();
  });

  it('tells the user when the AI fails or answers badly, and shows no preview', async () => {
    vi.mocked(tripsApi.proposeAiEdit).mockRejectedValue(httpError(502, {code: 'AI_INVALID_RESPONSE'}));
    render();

    await ask();

    expect(await screen.findByText(t('trips.aiEdit.invalid'))).toBeInTheDocument();
    expect(screen.queryByText(t('trips.aiEdit.previewTitle'))).toBeNull();
    expect(tripsApi.applyAiEdit).not.toHaveBeenCalled();
  });

  it('keeps the preview when saving fails (expired or stale proposal) so the user can retry', async () => {
    vi.mocked(tripsApi.proposeAiEdit).mockResolvedValue(proposal);
    vi.mocked(tripsApi.applyAiEdit).mockRejectedValue(httpError(409));
    render();
    await ask();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.aiEdit.accept')}));

    expect(await screen.findByText(t('trips.aiEdit.applyInvalid'))).toBeInTheDocument();
    expect(screen.getByText(t('trips.aiEdit.previewTitle'))).toBeInTheDocument();
  });
});
