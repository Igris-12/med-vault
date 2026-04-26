import React, { createContext, useContext, useState } from 'react';
import type { UserMode } from '../types/api';

interface ModeContextType {
  mode: UserMode;
  setMode: (mode: UserMode) => void;
  isDoctor: boolean;
}

const ModeContext = createContext<ModeContextType>({
  mode: 'patient',
  setMode: () => {},
  isDoctor: false,
});

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<UserMode>(
    () => (localStorage.getItem('mv_mode') as UserMode) || 'patient'
  );

  const setMode = (m: UserMode) => {
    setModeState(m);
    localStorage.setItem('mv_mode', m);
  };

  return (
    <ModeContext.Provider value={{ mode, setMode, isDoctor: mode === 'doctor' }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
