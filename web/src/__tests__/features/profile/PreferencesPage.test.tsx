import {screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {saveSession} from '@/features/auth/store/session';
import {profileApi} from '@/features/profile/api/profileApi';
import PreferencesPage from '@/features/profile/pages/PreferencesPage';
import ProfilePage from '@/features/profile/pages/ProfilePage';
import {preferencesErrorKey} from '@/features/profile/preferences';
import {networkError, pending, renderWithProviders, t} from '../../utils/render';

vi.mock('@/features/profile/api/profileApi');

const empty = {categories: [], notes: '', updatedAt: null};
const stored = {categories: ['nature', 'food'], notes: 'ít người', updatedAt: '2026-03-01T00:00:00.000Z'};
const chip = (key: string) => screen.getByRole('button', {name: t(`profile.preferences.category.${key}`)});

beforeEach(() => {
  vi.resetAllMocks();
});

describe('preferencesErrorKey', () => {
  it('needs a group or a note, and a short note', () => {
    expect(preferencesErrorKey([], '  ')).toBe('profile.preferences.errors.empty');
    expect(preferencesErrorKey(['food'], '')).toBeNull();
    expect(preferencesErrorKey([], 'x')).toBeNull();
    expect(preferencesErrorKey(['food'], 'x'.repeat(301))).toBe('profile.preferences.errors.notesLong');
    expect(preferencesErrorKey([], 'x'.repeat(300))).toBeNull();
  });
});

describe('PreferencesPage', () => {
  it('shows the five groups, none chosen, when nothing is saved (preferences are optional)', async () => {
    vi.mocked(profileApi.preferences).mockResolvedValue(empty);
    renderWithProviders(<PreferencesPage />, {route: '/profile/preferences'});

    for (const key of ['nature', 'food', 'culture', 'shopping', 'discovery']) {
      expect(await screen.findByRole('button', {name: t(`profile.preferences.category.${key}`)})).toHaveAttribute('aria-pressed', 'false');
    }
    // nothing to delete yet
    expect(screen.queryByRole('button', {name: t('profile.preferences.delete')})).not.toBeInTheDocument();
  });

  it('starts from the saved preferences', async () => {
    vi.mocked(profileApi.preferences).mockResolvedValue(stored as never);
    renderWithProviders(<PreferencesPage />, {route: '/profile/preferences'});

    await waitFor(() => expect(chip('nature')).toHaveAttribute('aria-pressed', 'true'));
    expect(chip('food')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('culture')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText(t('profile.preferences.notes'))).toHaveValue('ít người');
  });

  it('saves the chosen groups and the note', async () => {
    vi.mocked(profileApi.preferences).mockResolvedValue(empty);
    vi.mocked(profileApi.savePreferences).mockResolvedValue({message: 'ok', preferences: {categories: ['culture'], notes: 'di tích', updatedAt: 'x'}} as never);
    renderWithProviders(<PreferencesPage />, {route: '/profile/preferences'});

    await userEvent.click(await screen.findByRole('button', {name: t('profile.preferences.category.culture')}));
    await userEvent.type(screen.getByLabelText(t('profile.preferences.notes')), '  di tích ');
    await userEvent.click(screen.getByRole('button', {name: t('profile.save')}));

    await waitFor(() => expect(profileApi.savePreferences).toHaveBeenCalledWith({categories: ['culture'], notes: 'di tích'}));
    expect(await screen.findByText(t('profile.preferences.saved'))).toBeInTheDocument();
    // once saved, the preferences can be deleted
    expect(await screen.findByRole('button', {name: t('profile.preferences.delete')})).toBeInTheDocument();
  });

  it('does not save an empty form', async () => {
    vi.mocked(profileApi.preferences).mockResolvedValue(empty);
    renderWithProviders(<PreferencesPage />, {route: '/profile/preferences'});

    await userEvent.click(await screen.findByRole('button', {name: t('profile.save')}));

    expect(await screen.findByText(t('profile.preferences.errors.empty'))).toBeInTheDocument();
    expect(profileApi.savePreferences).not.toHaveBeenCalled();
  });

  it('lets the user unselect a group', async () => {
    vi.mocked(profileApi.preferences).mockResolvedValue(stored as never);
    vi.mocked(profileApi.savePreferences).mockResolvedValue({message: 'ok', preferences: stored} as never);
    renderWithProviders(<PreferencesPage />, {route: '/profile/preferences'});

    await waitFor(() => expect(chip('food')).toHaveAttribute('aria-pressed', 'true'));
    await userEvent.click(chip('food'));
    expect(chip('food')).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', {name: t('profile.save')}));

    await waitFor(() => expect(profileApi.savePreferences).toHaveBeenCalledWith({categories: ['nature'], notes: 'ít người'}));
  });

  it('says so when saving fails', async () => {
    vi.mocked(profileApi.preferences).mockResolvedValue(stored as never);
    vi.mocked(profileApi.savePreferences).mockRejectedValue(new Error('boom'));
    renderWithProviders(<PreferencesPage />, {route: '/profile/preferences'});

    await waitFor(() => expect(chip('nature')).toHaveAttribute('aria-pressed', 'true'));
    await userEvent.click(screen.getByRole('button', {name: t('profile.save')}));

    expect(await screen.findByText(t('profile.preferences.saveFailed'))).toBeInTheDocument();
  });

  it('asks for confirmation before deleting, then deletes', async () => {
    vi.mocked(profileApi.preferences).mockResolvedValue(stored as never);
    vi.mocked(profileApi.deletePreferences).mockResolvedValue({message: 'ok', preferences: empty} as never);
    renderWithProviders(<PreferencesPage />, {route: '/profile/preferences'});

    await userEvent.click(await screen.findByRole('button', {name: t('profile.preferences.delete')}));
    expect(screen.getByText(t('profile.preferences.deleteTitle'))).toBeInTheDocument();
    expect(profileApi.deletePreferences).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', {name: t('common.delete')}));

    await waitFor(() => expect(profileApi.deletePreferences).toHaveBeenCalled());
    expect(await screen.findByText(t('profile.preferences.deleted'))).toBeInTheDocument();
    await waitFor(() => expect(chip('nature')).toHaveAttribute('aria-pressed', 'false'));
  });

  it('keeps the preferences when the user cancels the deletion', async () => {
    vi.mocked(profileApi.preferences).mockResolvedValue(stored as never);
    renderWithProviders(<PreferencesPage />, {route: '/profile/preferences'});

    await userEvent.click(await screen.findByRole('button', {name: t('profile.preferences.delete')}));
    await userEvent.click(screen.getByRole('button', {name: t('common.cancel')}));

    expect(screen.queryByText(t('profile.preferences.deleteTitle'))).not.toBeInTheDocument();
    expect(profileApi.deletePreferences).not.toHaveBeenCalled();
  });

  it('says so when the deletion fails', async () => {
    vi.mocked(profileApi.preferences).mockResolvedValue(stored as never);
    vi.mocked(profileApi.deletePreferences).mockRejectedValue(networkError());
    renderWithProviders(<PreferencesPage />, {route: '/profile/preferences'});

    await userEvent.click(await screen.findByRole('button', {name: t('profile.preferences.delete')}));
    await userEvent.click(screen.getByRole('button', {name: t('common.delete')}));

    expect(await screen.findByText(t('common.networkError'))).toBeInTheDocument();
  });

  it('shows a loading state, then an error with a retry', async () => {
    vi.mocked(profileApi.preferences).mockReturnValue(pending());
    const {unmount} = renderWithProviders(<PreferencesPage />, {route: '/profile/preferences'});
    expect(await screen.findByText(t('common.loading'))).toBeInTheDocument();
    unmount();

    vi.mocked(profileApi.preferences).mockRejectedValueOnce(new Error('x')).mockResolvedValue(empty);
    renderWithProviders(<PreferencesPage />, {route: '/profile/preferences'});
    await userEvent.click(await screen.findByRole('button', {name: t('common.retry')}));
    expect(await screen.findByRole('button', {name: t('profile.preferences.category.nature')})).toBeInTheDocument();
  });
});

describe('ProfilePage', () => {
  it('links to the travel preferences', async () => {
    saveSession({accessToken: 't', data: {username: 'lan'}});
    renderWithProviders(<ProfilePage />, {route: '/profile'});

    expect(await screen.findByRole('link', {name: t('profile.preferences.link')})).toHaveAttribute('href', '/profile/preferences');
  });
});
