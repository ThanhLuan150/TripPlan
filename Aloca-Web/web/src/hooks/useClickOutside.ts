import {useEffect, useRef} from 'react';

// Calls onOutside when the user clicks outside the returned ref's element.
export const useClickOutside = <T extends HTMLElement = HTMLDivElement>(
  onOutside: () => void,
) => {
  const ref = useRef<T>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onOutside]);
  return ref;
};
