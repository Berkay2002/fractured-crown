import { createContext, useContext, ReactNode } from 'react';
import { useDiscord } from '@/hooks/useDiscord';

interface DiscordContextValue {
  isDiscord: boolean;
  ready: boolean;
  setActivity: (activity: { details: string; state: string; instance: boolean }) => Promise<void>;
}

const DiscordContext = createContext<DiscordContextValue>({
  isDiscord: false,
  ready: false,
  setActivity: async () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useDiscordContext = () => useContext(DiscordContext);

export function DiscordProvider({ children }: { children: ReactNode }) {
  const discord = useDiscord();
  return (
    <DiscordContext.Provider value={discord}>
      {children}
    </DiscordContext.Provider>
  );
}
