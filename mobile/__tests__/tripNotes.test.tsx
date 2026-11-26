import {TextInput, TouchableOpacity} from 'react-native';
import i18n from '../src/i18n';
import {MAX_NOTE_LENGTH, tripsApi} from '../src/api';
import ConfirmModal from '../src/components/ConfirmModal';
import TripNotes, {noteErrorKey} from '../src/components/TripNotes';
import {subscribeAlert} from '../src/lib/alert';
import {act, allText, flush, press, renderApp} from './helpers/render';

jest.mock('../src/api', () => ({
  ...jest.requireActual('../src/api'),
  tripsApi: {notes: jest.fn(), addNote: jest.fn(), updateNote: jest.fn(), removeNote: jest.fn()},
}));

const t = (key: string, opts?: object) => (i18n.t as any)(key, opts) as string;
type Tree = ReturnType<typeof renderApp>;

const note = (over: object = {}) => ({
  _id: 'n1',
  tripId: 't1',
  content: 'Pack a coat',
  createdAt: '2026-03-02T09:00:00.000Z',
  updatedAt: '2026-03-02T09:00:00.000Z',
  ...over,
});

const button = (tree: Tree, label: string) =>
  tree.root.findAll(n => n.props.accessibilityLabel === label && n.props.onPress && n.type === TouchableOpacity)[0];
const input = (tree: Tree, i = 0) => tree.root.findAllByType(TextInput)[i];
const type = (tree: Tree, text: string, i = 0) => act(() => input(tree, i).props.onChangeText(text));
const mount = async () => {
  const tree = renderApp(<TripNotes tripId="t1" />);
  await flush();
  return tree;
};
const deleteModal = (tree: Tree) => tree.root.findAllByType(ConfirmModal)[0];

let alerts: any[] = [];
let off: () => void;
beforeEach(() => {
  jest.clearAllMocks();
  (tripsApi.notes as jest.Mock).mockResolvedValue([note()]);
  alerts = [];
  off = subscribeAlert(a => alerts.push(a));
});
afterEach(() => off());

describe('noteErrorKey', () => {
  it('accepts text, rejects empty and too long', () => {
    expect(noteErrorKey('hello')).toBeNull();
    expect(noteErrorKey('a'.repeat(MAX_NOTE_LENGTH))).toBeNull();
    expect(noteErrorKey('   ')).toBe('trips.notesRequired');
    expect(noteErrorKey('a'.repeat(MAX_NOTE_LENGTH + 1))).toBe('trips.notesTooLong');
  });
});

describe('TripNotes', () => {
  it('shows the notes of the trip and that they are private', async () => {
    const tree = await mount();
    expect(tripsApi.notes).toHaveBeenCalledWith('t1');
    expect(allText(tree)).toContain('Pack a coat');
    expect(allText(tree)).toContain(t('trips.notesHint'));
    expect(allText(tree)).not.toContain(t('trips.notesEdited'));
  });

  it('says so when there are no notes, and when they cannot be loaded', async () => {
    (tripsApi.notes as jest.Mock).mockResolvedValue([]);
    expect(allText(await mount())).toContain(t('trips.notesEmpty'));
    (tripsApi.notes as jest.Mock).mockRejectedValue(new Error('x'));
    expect(allText(await mount())).toContain(t('trips.notesLoadFailed'));
  });

  it('marks a note that was edited', async () => {
    (tripsApi.notes as jest.Mock).mockResolvedValue([note({updatedAt: '2026-03-03T09:00:00.000Z'})]);
    expect(allText(await mount())).toContain(t('trips.notesEdited'));
  });

  it('adds a trimmed note, empties the box and reloads the list', async () => {
    (tripsApi.addNote as jest.Mock).mockResolvedValue(note({_id: 'n2'}));
    const tree = await mount();
    (tripsApi.notes as jest.Mock).mockResolvedValue([note({_id: 'n2', content: 'Rent a scooter'}), note()]);

    type(tree, '  Rent a scooter ');
    press(button(tree, t('trips.notesAdd')));
    await flush();

    expect(tripsApi.addNote).toHaveBeenCalledWith('t1', 'Rent a scooter');
    expect(allText(tree)).toContain('Rent a scooter');
    expect(input(tree).props.value).toBe('');
  });

  it('does not send an empty note or one over the limit, and shows why', async () => {
    const tree = await mount();

    press(button(tree, t('trips.notesAdd')));
    expect(allText(tree)).toContain(t('trips.notesRequired'));

    type(tree, 'a'.repeat(MAX_NOTE_LENGTH + 1));
    press(button(tree, t('trips.notesAdd')));
    expect(allText(tree)).toContain(t('trips.notesTooLong', {max: MAX_NOTE_LENGTH}));
    expect(allText(tree)).toContain(`${MAX_NOTE_LENGTH + 1}/${MAX_NOTE_LENGTH}`);
    expect(tripsApi.addNote).not.toHaveBeenCalled();
  });

  it('keeps what was typed and tells the user when saving fails', async () => {
    (tripsApi.addNote as jest.Mock).mockRejectedValue(new Error('x'));
    const tree = await mount();

    type(tree, 'Keep me');
    press(button(tree, t('trips.notesAdd')));
    await flush();

    expect(alerts.some(a => a.title === t('trips.notesSaveFailed') || a.message === t('trips.notesSaveFailed'))).toBe(true);
    expect(input(tree).props.value).toBe('Keep me');
  });

  it('edits a note and shows the new text', async () => {
    (tripsApi.updateNote as jest.Mock).mockResolvedValue(note({content: 'Pack two coats'}));
    const tree = await mount();

    press(button(tree, t('trips.notesEdit')));
    expect(input(tree, 1).props.value).toBe('Pack a coat');
    type(tree, 'Pack two coats', 1);
    (tripsApi.notes as jest.Mock).mockResolvedValue([note({content: 'Pack two coats'})]);
    press(button(tree, t('trips.notesSave')));
    await flush();

    expect(tripsApi.updateNote).toHaveBeenCalledWith('t1', 'n1', 'Pack two coats');
    expect(allText(tree)).toContain('Pack two coats');
    expect(tree.root.findAllByType(TextInput)).toHaveLength(1);
  });

  it('cancelling an edit changes nothing, and an empty edit is refused', async () => {
    const tree = await mount();

    press(button(tree, t('trips.notesEdit')));
    type(tree, '', 1);
    press(button(tree, t('trips.notesSave')));
    expect(allText(tree)).toContain(t('trips.notesRequired'));
    expect(tripsApi.updateNote).not.toHaveBeenCalled();

    press(button(tree, t('common.cancel')));
    expect(tree.root.findAllByType(TextInput)).toHaveLength(1);
    expect(allText(tree)).toContain('Pack a coat');
  });

  it('tells the user when an edit fails and stays in edit mode', async () => {
    (tripsApi.updateNote as jest.Mock).mockRejectedValue(new Error('x'));
    const tree = await mount();

    press(button(tree, t('trips.notesEdit')));
    type(tree, 'Pack a coat!', 1);
    press(button(tree, t('trips.notesSave')));
    await flush();

    expect(alerts.length).toBeGreaterThan(0);
    expect(input(tree, 1).props.value).toBe('Pack a coat!');
  });

  it('deletes a note only after the user confirms', async () => {
    (tripsApi.removeNote as jest.Mock).mockResolvedValue({});
    const tree = await mount();

    press(button(tree, t('trips.notesRemove')));
    expect(deleteModal(tree).props.visible).toBe(true);
    expect(tripsApi.removeNote).not.toHaveBeenCalled();

    // cancel keeps it
    act(() => deleteModal(tree).props.onCancel());
    expect(deleteModal(tree).props.visible).toBe(false);
    expect(tripsApi.removeNote).not.toHaveBeenCalled();

    press(button(tree, t('trips.notesRemove')));
    (tripsApi.notes as jest.Mock).mockResolvedValue([]);
    await act(async () => deleteModal(tree).props.onConfirm());
    await flush();

    expect(tripsApi.removeNote).toHaveBeenCalledWith('t1', 'n1');
    expect(allText(tree)).toContain(t('trips.notesEmpty'));
  });

  it('tells the user when deleting fails', async () => {
    (tripsApi.removeNote as jest.Mock).mockRejectedValue(new Error('x'));
    const tree = await mount();

    press(button(tree, t('trips.notesRemove')));
    await act(async () => deleteModal(tree).props.onConfirm());
    await flush();

    expect(alerts.length).toBeGreaterThan(0);
    expect(allText(tree)).toContain('Pack a coat');
  });
});
