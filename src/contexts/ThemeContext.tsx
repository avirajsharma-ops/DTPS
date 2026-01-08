'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkModeState] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize dark mode from localStorage and device preference
  useEffect(() => {
    // Set mounted immediately to prevent hydration mismatch
    setMounted(true);
    
    const savedTheme = localStorage.getItem('dtps-theme');
    
    let prefersDark: boolean;
    
    if (savedTheme) {
      // Use saved preference
      prefersDark = savedTheme === 'dark';
    } else {
      // Check device preference
      prefersDark = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
    }

    setIsDarkModeState(prefersDark);
    applyTheme(prefersDark);
  }, []);

  // Listen for system dark mode changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem('dtps-theme');
      // Only apply system preference if user hasn't manually set a preference
      if (!savedTheme) {
        setIsDarkModeState(e.matches);
        applyTheme(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const applyTheme = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#0a0a0a';
      document.body.style.backgroundColor = '#0a0a0a';
      document.body.style.color = '#ffffff';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#ffffff';
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#000000';
    }
  };

  const setIsDarkMode = (isDark: boolean) => {
    setIsDarkModeState(isDark);
    localStorage.setItem('dtps-theme', isDark ? 'dark' : 'light');
    applyTheme(isDark);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Always return provider to ensure useTheme() works
  // Before mounting, isDarkMode is false (light mode as default)
  return (
    <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
