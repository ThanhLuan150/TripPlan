import {useEffect, useRef, useState} from 'react';
import {drafts, type Draft} from '@/lib/drafts';

const SAVE_DELAY_MS = 400;

// Keeps the form in `value` as a draft while the user works, and offers an earlier draft back.
//  - on the first render an existing draft becomes `pending` (the page shows "Continue / Start new")
//  - while a draft is pending nothing is saved, so the offer is never overwritten by the blank form
//  - an empty form is never saved, and clears the draft once the user emptied it
//  - `enabled: false` turns everything off (e.g. the form was opened already filled from a suggestion)
export function useDraft<T>(name: string, value: T, isEmpty: boolean, enabled = true) {
  const [pending, setPending] = useState<Draft<T> | null>(() => (enabled ? drafts.load<T>(name) : null));
  // the pending draft is not offered again after the user chose
  const decided = useRef(!pending);

  useEffect(() => {
    if (!enabled || !decided.current) {
      return;
    }
    if (isEmpty) {
      drafts.clear(name);
      return;
    }
    const timer = window.setTimeout(() => drafts.save(name, value), SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [name, value, isEmpty, enabled]);

  return {
    pending,
    // take the draft: the caller puts its value back into the form
    resume: () => {
      const draft = pending;
      decided.current = true;
      setPending(null);
      return draft?.value;
    },
    // start new: the draft is thrown away
    discard: () => {
      decided.current = true;
      drafts.clear(name);
      setPending(null);
    },
    clear: () => drafts.clear(name),
  };
}
