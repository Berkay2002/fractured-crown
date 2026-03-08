const SUPABASE_STORAGE = 'https://jbsivexwgtjkcyifgmow.supabase.co/storage/v1/object/public/sigils';

export const bgUrl = (filename: string): string => {
  return `${SUPABASE_STORAGE}/${filename}`;
};

export const BACKGROUNDS = {
  lobby: 'lobby-background.png',
  inGame: 'in-game-background.png',
  loyalistWin: 'loyalist-victory-background.png',
  traitorWin: 'traitor-victory-background.png',
} as const;
