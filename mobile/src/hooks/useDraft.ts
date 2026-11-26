import {useEffect, useState} from 'react';
import {Draft, drafts} from '../lib/drafts';

const SAVE_DELAY_MS = 400;

// Keeps the form in `value` as a draft while the user works, and offers an earlier draft back.
//  - on mount an existing draft becomes `pending` (the screen shows "Continue / Start new")
//  - until the user chose (and while the draft is still loading) nothing is saved, so the offer is never
//    overwritten by the blank form
//  - an empty form is never saved, and clears the draft once the user emptied it
//  - `enabled: false` turns everything off (e.g. the form was opened already filled from a suggestion)
export function useDraft<T>(
  name: string,
  value: T,
  isEmpty: boolean,
  enabled = true,
) {
  const [pending, setPending] = useState<Draft<T> | null>(null);
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let alive = true;
    drafts.load<T>(name).then(draft => {
      if (!alive) {
        return;
      }
      if (draft) {
        setPending(draft);
      } else {
        setReady(true);
      }
    });
    return () => {
      alive = false;
    };
  }, [name, enabled]);

  useEffect(() => {
    if (!enabled || !ready) {
      return;
    }
    if (isEmpty) {
      drafts.clear(name);
      return;
    }
    const timer = setTimeout(() => drafts.save(name, value), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [name, value, isEmpty, enabled, ready]);

  return {
    pending,
    // take the draft: the caller puts its value back into the form
    resume: () => {
      const draft = pending;
      setReady(true);
      setPending(null);
      return draft?.value;
    },
    // start new: the draft is thrown away
    discard: () => {
      drafts.clear(name);
      setReady(true);
      setPending(null);
    },
    clear: () => drafts.clear(name),
  };
}
