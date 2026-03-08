import { useState, useEffect } from 'react';
import { useSoundContext } from '@/contexts/SoundContext';

const phaseMessages: Record<string, string> = {
  election: 'The Council Convenes — Nominations are open',
  legislative: 'The Herald draws from the Deck',
  executive_action: 'Presidential Power Awakens',
  game_over: "The Kingdom's Fate is Sealed",
};

interface PhaseTransitionBannerProps {
  phase: string;
}

const PhaseTransitionBanner = ({ phase }: PhaseTransitionBannerProps) => {
  const [displayedPhase, setDisplayedPhase] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const sound = useSoundContext();

  useEffect(() => {
    if (phase && phase !== displayedPhase) {
      setDisplayedPhase(phase);
      setVisible(true);
      sound.playPhaseTransition();
      const timer = setTimeout(() => setVisible(false), 2600);
      return () => clearTimeout(timer);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible || !displayedPhase) return null;

  const message = phaseMessages[displayedPhase] ?? displayedPhase;

  return (
    <div
      key={displayedPhase}
      className="phase-banner pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-center border-y px-6 py-4"
      style={{
        backgroundColor: 'hsl(18 22% 9%)',
        borderColor: 'hsl(43 50% 54%)',
      }}
    >
      <span className="font-display text-lg tracking-[0.2em] text-primary sm:text-xl">
        {message}
      </span>
    </div>
  );
};

export default PhaseTransitionBanner;
