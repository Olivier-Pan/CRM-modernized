import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

// Initialisation depuis le localStorage pour mémoriser le choix de l'utilisateur
let currentTheme: Theme = (localStorage.getItem('crm-theme') as Theme) || 'dark';
const listeners = new Set<(theme: Theme) => void>();

export const toggleTheme = () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('crm-theme', currentTheme);
  // Met à jour tous les composants qui utilisent ce hook instantanément
  listeners.forEach(fn => fn(currentTheme));
};

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    listeners.add(setTheme);
    return () => {
      listeners.delete(setTheme);
    };
  }, []);

  return theme;
};