import {useCallback, useEffect, useState} from 'react';
import {useClickOutside} from '@/hooks/useClickOutside';

// Open state of a header dropdown: closes on outside click and on Escape.
export const useDropdown = () => {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside(close);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  return {open, toggle: () => setOpen(o => !o), close, ref};
};
