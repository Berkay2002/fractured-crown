import { useState } from 'react';

const SIGIL_BASE = 'https://jbsivexwgtjkcyifgmow.supabase.co/storage/v1/object/public/sigils';

export const sigilImageUrl = (sigil: string) =>
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
      className={`${size} rounded-full object-cover ring-1 ring-[hsl(45,50%,54%)]/40 ${className}`}
      onError={() => setFailed(true)}
    />
  );
};

export default SigilAvatar;
