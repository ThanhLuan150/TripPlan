import {MAX_NOTE_LENGTH} from './types';

// Error key for a note text, or null when it can be saved (not empty, not too long).
export const noteErrorKey = (text: string): 'trips.notes.required' | 'trips.notes.tooLong' | null => {
  const value = text.trim();
  if (!value) {
    return 'trips.notes.required';
  }
  return value.length > MAX_NOTE_LENGTH ? 'trips.notes.tooLong' : null;
};
