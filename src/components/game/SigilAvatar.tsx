import { useState } from 'react';

const SIGIL_BASE = 'https://jbsivexwgtjkcyifgmow.supabase.co/storage/v1/object/public/sigils';

/** All available sigils — the canonical list used everywhere */
export const SIGILS = ['crown', 'sword', 'shield', 'wolf', 'raven', 'rose', 'flame', 'anchor', 'dragon', 'skull'] as const;
export type SigilName = (typeof SIGILS)[number];

/** Resolves sigil name → storage URL */
export const sigilImageUrl = (sigil: string): string =>
  `${SIGIL_BASE}/${sigil}.webp`;

interface SigilAvatarProps {
  sigil: string;
  displayName: string;
  /** Tailwind size classes, e.g. "h-11 w-11" */
  size?: string;
  className?: string;
}

const SigilAvatar = ({ sigil, displayName, size = 'h-11 w-11', className = '' }: SigilAvatarProps) => {
  const [failed, setFailed] = useState(false);
  const initials = displayName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (failed) {
    return (
      <span className="font-display text-xs font-bold text-foreground">
        {initials}
      </span>
    );
  }

  return (
    <img
      src={sigilImageUrl(sigil ?? 'crown')}
      alt={sigil ?? 'crown'}
      className={`${size} rounded-full object-cover ring-1 ring-primary/40 ${className}`}
      onError={() => setFailed(true)}
    />
  );
};

export default SigilAvatar;
