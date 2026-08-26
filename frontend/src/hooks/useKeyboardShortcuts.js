import { useEffect } from 'react';

export const useKeyboardShortcuts = (shortcuts) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if focus is on inputs, textareas, or contenteditables
      const activeEl = document.activeElement;
      const isInput =
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable;

      if (isInput) return;

      const key = e.key.toLowerCase();
      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};
