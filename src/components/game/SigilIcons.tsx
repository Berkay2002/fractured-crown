// Inline SVG sigil icons for the medieval theme
// Each returns a sized SVG element

interface SigilProps {
  className?: string;
  size?: number;
}

// Re-export canonical list from SigilAvatar for backward compat
export { SIGILS as sigils } from './SigilAvatar';
export type { SigilName as SigilType } from './SigilAvatar';

const CrownSigil = ({ className, size = 24 }: SigilProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 17l3-9 5 5 2-8 2 8 5-5 3 9H2z" />
    <path d="M2 17h20v3H2z" />
  </svg>
);

const SwordSigil = ({ className, size = 24 }: SigilProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2l1 10h-2L12 2z" />
    <path d="M12 12l-6 6M12 12l6 6" />
    <path d="M8 16h8" />
    <path d="M12 16v6" />
  </svg>
);

const ShieldSigil = ({ className, size = 24 }: SigilProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3L4 7v5c0 5.25 3.4 10.15 8 11 4.6-.85 8-5.75 8-11V7l-8-4z" />
    <path d="M12 8v5M10 11h4" />
  </svg>
);

const WolfSigil = ({ className, size = 24 }: SigilProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 4l3 8-2 4 5-2 2 8 2-8 5 2-2-4 3-8-5 4H9L4 4z" />
    <circle cx="10" cy="10" r="1" fill="currentColor" />
    <circle cx="14" cy="10" r="1" fill="currentColor" />
  </svg>
);

const RavenSigil = ({ className, size = 24 }: SigilProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 8c2-4 6-5 9-4 2 0 4 2 5 4l-2 1c1 3 0 6-2 8l-3 1-2 3-1-3c-3 0-6-3-6-7l2-3z" />
    <circle cx="15" cy="9" r="1" fill="currentColor" />
    <path d="M18 8l3-2" />
  </svg>
);

const RoseSigil = ({ className, size = 24 }: SigilProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="10" r="3" />
    <path d="M12 7c-1-3 1-5 3-5-1 2 0 4 2 4-2 1-4 0-5 1z" />
    <path d="M12 7c1-3-1-5-3-5 1 2 0 4-2 4 2 1 4 0 5 1z" />
    <path d="M9 10c-3-1-5 1-5 3 2-1 4 0 4 2 1-2 0-4 1-5z" />
    <path d="M15 10c3-1 5 1 5 3-2-1-4 0-4 2-1-2 0-4-1-5z" />
    <path d="M12 16v6" />
    <path d="M10 19l-2 1M14 19l2 1" />
  </svg>
);

const FlameSigil = ({ className, size = 24 }: SigilProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22c-4 0-7-3-7-7 0-3 2-5 4-8 1-1.5 2-3 2-5 1 2 2 3 3 5 2 3 5 5 5 8 0 4-3 7-7 7z" />
    <path d="M12 22c-2 0-3-2-3-4s1-3 2-5c.5 1 1 2 1.5 3 .8 1.5 2.5 2.5 2.5 4s-1 2-3 2z" />
  </svg>
);

const AnchorSigil = ({ className, size = 24 }: SigilProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v13" />
    <path d="M5 13h2c0 4 2.5 6 5 7 2.5-1 5-3 5-7h2" />
    <path d="M9 13h6" />
  </svg>
);

const DragonSigil = ({ className, size = 24 }: SigilProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 18c0-3 2-5 4-6-1-2-1-5 1-7 1 2 3 3 5 3 1-2 3-3 5-3-1 3-1 5 0 7l-3 3c-1 1-3 2-5 3-3-1-5-2-7 0z" />
    <circle cx="14" cy="10" r="1" fill="currentColor" />
  </svg>
);

const SkullSigil = ({ className, size = 24 }: SigilProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2C8 2 5 5 5 9c0 2.5 1 4.5 3 6v3h8v-3c2-1.5 3-3.5 3-6 0-4-3-7-7-7z" />
    <circle cx="9.5" cy="9" r="1.5" />
    <circle cx="14.5" cy="9" r="1.5" />
    <path d="M10 18v2M14 18v2" />
  </svg>
);

const sigilComponents: Record<string, React.FC<SigilProps>> = {
  crown: CrownSigil,
  sword: SwordSigil,
  shield: ShieldSigil,
  wolf: WolfSigil,
  raven: RavenSigil,
  rose: RoseSigil,
  flame: FlameSigil,
  anchor: AnchorSigil,
  dragon: DragonSigil,
  skull: SkullSigil,
};

export const SigilIcon = ({ sigil, className, size }: { sigil: string } & SigilProps) => {
  const Component = sigilComponents[sigil] || CrownSigil;
  return <Component className={className} size={size} />;
};

export default SigilIcon;
