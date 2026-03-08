import { sigilUrl } from '@/lib/storageUrl';

export const bgUrl = (filename: string): string => {
  return sigilUrl(filename);
};

export const BACKGROUNDS = {
  lobby: 'lobby-background.png',
  inGame: 'in-game-background.png',
  loyalistWin: 'loyalist-victory-background.png',
  traitorWin: 'traitor-victory-background.png',
} as const;
