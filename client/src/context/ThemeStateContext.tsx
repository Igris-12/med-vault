import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEMES, applyThemeVars, getStoredTheme, type Theme } from './ThemeContext';

interface ThemeStateContextType {
  theme: Theme;
  setThemeById: (id: string) => void;
}

const ThemeStateContext = createContext<ThemeStateContextType>({
  theme: THEMES[0],
  setThemeById: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    applyThemeVars(theme);
  }, [theme]);

  const setThemeById = (id: string) => {
    const t = THEMES.find(x => x.id === id);
    if (t) { setTheme(t); applyThemeVars(t); }
  };

  return (
    <ThemeStateContext.Provider value={{ theme, setThemeById }}>
      {children}
    </ThemeStateContext.Provider>
  );
}

export function useAppTheme() { return useContext(ThemeStateContext); }
