const SUPABASE_RENDER = 'https://jbsivexwgtjkcyifgmow.supabase.co/storage/v1/render/image/public/sigils';

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;
const isTablet = () => typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024;

export const bgUrl = (filename: string): string => {
  const base = `${SUPABASE_RENDER}/${filename}`;
  if (isMobile()) return `${base}?format=webp&quality=80&width=828`;
  if (isTablet()) return `${base}?format=webp&quality=82&width=1200`;
  return `${base}?format=webp&quality=85&width=1920`;
};

export const BACKGROUNDS = {
  lobby: 'lobby-background.png',
  inGame: 'in-game-background.png',
  loyalistWin: 'loyalist-victory-background.png',
  traitorWin: 'traitor-victory-background.png',
} as const;
