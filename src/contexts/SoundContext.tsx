import { createContext, useContext } from 'react';
import { useSound } from '@/hooks/useSound';

type SoundContextType = ReturnType<typeof useSound>;

const SoundContext = createContext<SoundContextType | null>(null);

export const SoundProvider = ({ children }: { children: React.ReactNode }) => {
  const sound = useSound();
  return <SoundContext.Provider value={sound}>{children}</SoundContext.Provider>;
};

export const useSoundContext = () => {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSoundContext must be used within SoundProvider');
  return ctx;
};
