import {screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {tripsApi} from '@/features/trips/api/tripsApi';
import TripNotes from '@/features/trips/components/TripNotes';
import {noteErrorKey} from '@/features/trips/noteValidation';
import type {TripNote} from '@/features/trips/types';
import {httpError, renderWithProviders, t} from '../../../utils/render';

vi.mock('@/features/trips/api/tripsApi');

const note = (extra: Partial<TripNote> = {}): TripNote => ({
  _id: 'n1',
  tripId: 't1',
  content: 'Pack a coat',
  createdAt: '2026-03-02T09:00:00.000Z',
  updatedAt: '2026-03-02T09:00:00.000Z',
  ...extra,
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(tripsApi.notes).mockResolvedValue([note()]);
});

const render = () => renderWithProviders(<TripNotes tripId="t1" />);
const addBox = () => screen.getAllByRole('textbox')[0];

describe('noteErrorKey', () => {
  it('accepts text, rejects empty and too long', () => {
    expect(noteErrorKey('hello')).toBeNull();
    expect(noteErrorKey('a'.repeat(2000))).toBeNull();
    expect(noteErrorKey('   ')).toBe('trips.notes.required');
    expect(noteErrorKey('a'.repeat(2001))).toBe('trips.notes.tooLong');
  });
});

describe('TripNotes', () => {
  it('shows the notes of the trip and that they are private', async () => {
    render();

    expect(await screen.findByText('Pack a coat')).toBeInTheDocument();
    expect(tripsApi.notes).toHaveBeenCalledWith('t1');
    expect(screen.getByText(t('trips.notes.hint'))).toBeInTheDocument();
    expect(screen.queryByText(t('trips.notes.edited'), {exact: false})).toBeNull();
  });

  it('says so when there are no notes', async () => {
    vi.mocked(tripsApi.notes).mockResolvedValue([]);
    render();

    expect(await screen.findByText(t('trips.notes.empty'))).toBeInTheDocument();
  });

  it('marks a note that was edited', async () => {
    vi.mocked(tripsApi.notes).mockResolvedValue([note({updatedAt: '2026-03-03T09:00:00.000Z'})]);
    render();

    expect(await screen.findByText(t('trips.notes.edited'), {exact: false})).toBeInTheDocument();
  });

  it('offers to retry when the notes cannot be loaded', async () => {
    vi.mocked(tripsApi.notes).mockRejectedValueOnce(httpError(500)).mockResolvedValue([note()]);
    render();

    await userEvent.click(await screen.findByRole('button', {name: t('trips.notes.retry')}));

    expect(await screen.findByText('Pack a coat')).toBeInTheDocument();
  });

  it('adds a note (trimmed), empties the box and reloads the list', async () => {
    vi.mocked(tripsApi.addNote).mockResolvedValue(note({_id: 'n2', content: 'Rent a scooter'}));
    render();
    await screen.findByText('Pack a coat');
    vi.mocked(tripsApi.notes).mockResolvedValue([note({_id: 'n2', content: 'Rent a scooter'}), note()]);

    await userEvent.type(addBox(), '  Rent a scooter ');
    await userEvent.click(screen.getByRole('button', {name: t('trips.notes.add')}));

    expect(tripsApi.addNote).toHaveBeenCalledWith('t1', 'Rent a scooter');
    expect(await screen.findByText('Rent a scooter')).toBeInTheDocument();
    expect(addBox()).toHaveValue('');
  });

  it('does not send an empty note and shows why', async () => {
    render();
    await screen.findByText('Pack a coat');

    await userEvent.click(screen.getByRole('button', {name: t('trips.notes.add')}));

    expect(screen.getByRole('alert')).toHaveTextContent(t('trips.notes.required'));
    expect(tripsApi.addNote).not.toHaveBeenCalled();
  });

  it('does not send a note over the limit and shows the counter', async () => {
    render();
    await screen.findByText('Pack a coat');

    await userEvent.click(addBox());
    await userEvent.paste('a'.repeat(2001));
    expect(screen.getByText(t('trips.notes.counter', {length: 2001, max: 2000}))).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: t('trips.notes.add')}));

    expect(screen.getByRole('alert')).toHaveTextContent(t('trips.notes.tooLong', {max: 2000}));
    expect(tripsApi.addNote).not.toHaveBeenCalled();
  });

  it('keeps what was typed when saving fails', async () => {
    vi.mocked(tripsApi.addNote).mockRejectedValue(httpError(500));
    render();
    await screen.findByText('Pack a coat');

    await userEvent.type(addBox(), 'Keep me');
    await userEvent.click(screen.getByRole('button', {name: t('trips.notes.add')}));

    expect(await screen.findByText(t('trips.notes.saveFailed'))).toBeInTheDocument();
    expect(addBox()).toHaveValue('Keep me');
  });

  it('edits a note and shows the new text', async () => {
    vi.mocked(tripsApi.updateNote).mockResolvedValue(note({content: 'Pack two coats'}));
    render();
    await userEvent.click(await screen.findByRole('button', {name: t('trips.notes.edit')}));

    const box = screen.getByDisplayValue('Pack a coat');
    await userEvent.clear(box);
    await userEvent.type(box, 'Pack two coats');
    vi.mocked(tripsApi.notes).mockResolvedValue([note({content: 'Pack two coats'})]);
    await userEvent.click(screen.getByRole('button', {name: t('trips.notes.save')}));

    expect(tripsApi.updateNote).toHaveBeenCalledWith('t1', 'n1', 'Pack two coats');
    expect(await screen.findByText('Pack two coats')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Pack two coats')).toBeNull();
  });

  it('cancelling an edit changes nothing', async () => {
    render();
    await userEvent.click(await screen.findByRole('button', {name: t('trips.notes.edit')}));

    await userEvent.type(screen.getByDisplayValue('Pack a coat'), ' more');
    await userEvent.click(screen.getByRole('button', {name: t('common.cancel')}));

    expect(tripsApi.updateNote).not.toHaveBeenCalled();
    expect(screen.getByText('Pack a coat')).toBeInTheDocument();
  });

  it('refuses to save an edit that is empty', async () => {
    render();
    await userEvent.click(await screen.findByRole('button', {name: t('trips.notes.edit')}));

    await userEvent.clear(screen.getByDisplayValue('Pack a coat'));
    await userEvent.click(screen.getByRole('button', {name: t('trips.notes.save')}));

    expect(tripsApi.updateNote).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(t('trips.notes.required'));
  });

  it('shows an error when an edit fails and stays in edit mode', async () => {
    vi.mocked(tripsApi.updateNote).mockRejectedValue(httpError(404));
    render();
    await userEvent.click(await screen.findByRole('button', {name: t('trips.notes.edit')}));

    await userEvent.type(screen.getByDisplayValue('Pack a coat'), '!');
    await userEvent.click(screen.getByRole('button', {name: t('trips.notes.save')}));

    expect(await screen.findByText(t('trips.notes.saveFailed'))).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pack a coat!')).toBeInTheDocument();
  });

  it('deletes a note only after the user confirms', async () => {
    vi.mocked(tripsApi.removeNote).mockResolvedValue({});
    render();
    await userEvent.click(await screen.findByRole('button', {name: t('trips.notes.remove')}));

    expect(screen.getByText(t('trips.notes.deleteTitle'))).toBeInTheDocument();
    expect(tripsApi.removeNote).not.toHaveBeenCalled();

    // cancel keeps it
    await userEvent.click(screen.getByRole('button', {name: t('common.cancel')}));
    expect(tripsApi.removeNote).not.toHaveBeenCalled();
    expect(screen.queryByText(t('trips.notes.deleteTitle'))).toBeNull();

    await userEvent.click(screen.getByRole('button', {name: t('trips.notes.remove')}));
    vi.mocked(tripsApi.notes).mockResolvedValue([]);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: t('common.delete')}));

    expect(tripsApi.removeNote).toHaveBeenCalledWith('t1', 'n1');
    expect(await screen.findByText(t('trips.notes.empty'))).toBeInTheDocument();
  });

  it('shows an error when deleting fails', async () => {
    vi.mocked(tripsApi.removeNote).mockRejectedValue(httpError(500));
    render();
    await userEvent.click(await screen.findByRole('button', {name: t('trips.notes.remove')}));

    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: t('common.delete')}));

    expect(await screen.findByText(t('trips.notes.deleteFailed'))).toBeInTheDocument();
    expect(screen.getByText('Pack a coat')).toBeInTheDocument();
  });
});
