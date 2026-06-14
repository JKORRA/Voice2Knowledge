import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system';
  });
  
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const isLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    if (storedTheme === 'dark') return 'dark';
    if (storedTheme === 'light') return 'light';
    if (isLight) return 'light';
    return 'dark'; // Default to dark if no strict light preference or system detection fails
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const getResolvedTheme = (): ResolvedTheme => {
      if (theme === 'system') {
        return mediaQuery.matches ? 'dark' : 'light';
      }
      return theme;
    };

    const updateTheme = () => {
      const resolved = getResolvedTheme();
      setResolvedTheme(resolved);
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolved);
    };

    updateTheme();

    const listener = () => updateTheme();
    mediaQuery.addEventListener('change', listener);

    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const toggleTheme = () => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    changeTheme(newTheme);
  };

  return {
    theme,
    resolvedTheme,
    setTheme: changeTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  };
}