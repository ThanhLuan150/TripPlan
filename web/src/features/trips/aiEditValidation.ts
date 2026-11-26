import {MAX_AI_EDIT_LENGTH} from './types';

// Error key for an AI edit request, or null when it can be sent (not empty, not too long).
export const aiEditErrorKey = (text: string): 'trips.aiEdit.required' | 'trips.aiEdit.tooLong' | null => {
  const value = text.trim();
  if (!value) {
    return 'trips.aiEdit.required';
  }
  return value.length > MAX_AI_EDIT_LENGTH ? 'trips.aiEdit.tooLong' : null;
};
