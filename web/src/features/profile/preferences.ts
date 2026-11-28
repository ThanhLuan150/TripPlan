// Travel preferences the AI personalizes with (same groups and limits as the backend).
export const PREFERENCE_CATEGORIES = ['nature', 'food', 'culture', 'shopping', 'discovery'] as const;
export type PreferenceCategory = (typeof PREFERENCE_CATEGORIES)[number];
export const MAX_PREFERENCE_NOTES = 300;

export interface TravelPreferences {
  categories: PreferenceCategory[];
  notes: string;
  updatedAt: string | null;
}

// i18n key of the problem with the form, or null when it can be saved
export const preferencesErrorKey = (categories: PreferenceCategory[], notes: string): string | null => {
  if (notes.trim().length > MAX_PREFERENCE_NOTES) {
    return 'profile.preferences.errors.notesLong';
  }
  if (categories.length === 0 && !notes.trim()) {
    return 'profile.preferences.errors.empty';
  }
  return null;
};

export const PREFERENCES_KEY = ['travelPreferences'];
