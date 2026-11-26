import { useCallback, useEffect } from 'react';

export function useScrollRestore(storageKey: string, locationSearch: string, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as { search: string; y: number };
      if (saved.search === locationSearch && typeof saved.y === 'number') {
        requestAnimationFrame(() => {
          window.scrollTo({ top: saved.y, behavior: 'auto' });
        });
      }
    } catch {
      // Ignore une valeur corrompue
    } finally {
      sessionStorage.removeItem(storageKey);
    }
  }, [storageKey, locationSearch, ready]);

  const saveScrollPosition = useCallback(() => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({ search: locationSearch, y: window.scrollY })
    );
  }, [storageKey, locationSearch]);

  return { saveScrollPosition };
}