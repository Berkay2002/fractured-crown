import React from 'react';

const LOBBY_BG = 'https://jbsivexwgtjkcyifgmow.supabase.co/storage/v1/object/public/sigils/lobby-background.webp';
const INGAME_BG = 'https://jbsivexwgtjkcyifgmow.supabase.co/storage/v1/object/public/sigils/in-game-background.webp';
const LOYALIST_WIN_BG = 'https://jbsivexwgtjkcyifgmow.supabase.co/storage/v1/object/public/sigils/loyalist-victory-background.webp';
const TRAITOR_WIN_BG = 'https://jbsivexwgtjkcyifgmow.supabase.co/storage/v1/object/public/sigils/traitor-victory-background.webp';

const MOBILE_PARAMS = '?width=1200&height=675&resize=cover&quality=75';

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

export const bgUrl = (base: string): string =>
  isMobile() ? `${base}${MOBILE_PARAMS}` : base;

export const bgStyle = (url: string): React.CSSProperties => ({
  backgroundImage: `url(${url})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center center',
  backgroundRepeat: 'no-repeat',
});

export const BACKGROUNDS = {
  lobby: LOBBY_BG,
  inGame: INGAME_BG,
  loyalistWin: LOYALIST_WIN_BG,
  traitorWin: TRAITOR_WIN_BG,
} as const;
