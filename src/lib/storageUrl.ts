const SUPABASE_HOST = 'https://jbsivexwgtjkcyifgmow.supabase.co';

const isDiscordActivity =
  typeof window !== 'undefined' &&
  (window.location.hostname.includes('discordsays.com') ||
    window.location.hostname.includes('discord.com') ||
    !!window.location.pathname.match(/^\/channels/));

/**
 * Returns the correct Supabase storage URL, proxied when inside a Discord Activity.
 */
export const storageUrl = (path: string): string => {
  if (isDiscordActivity) {
    return `/.proxy/storage${path}`;
  }
  return `${SUPABASE_HOST}/storage${path}`;
};

/**
 * Shorthand for sigil storage assets.
 */
export const sigilUrl = (filename: string): string =>
  storageUrl(`/v1/object/public/sigils/${filename}`);
