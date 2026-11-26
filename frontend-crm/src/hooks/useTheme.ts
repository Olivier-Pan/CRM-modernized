import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

function applyThemeToDocument(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

let currentTheme: Theme = (localStorage.getItem('crm-theme') as Theme) || 'dark';
applyThemeToDocument(currentTheme);

const listeners = new Set<(theme: Theme) => void>();

export const toggleTheme = () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('crm-theme', currentTheme);
  applyThemeToDocument(currentTheme);
  listeners.forEach((fn) => fn(currentTheme));
};

export const useTheme = (): Theme => {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    applyThemeToDocument(currentTheme);
    listeners.add(setTheme);
    return () => {
      listeners.delete(setTheme);
    };
  }, []);

  return theme;
};