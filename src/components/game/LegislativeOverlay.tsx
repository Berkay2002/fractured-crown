import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Scroll, Shield, Skull } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type GameState = Tables<'game_state'>;
type Round = Tables<'rounds'>;

interface LegislativeOverlayProps {
  gameState: GameState;
  currentRound: Round | null;
  currentPlayerId: number | null;
  onClose: () => void;
}

type PolicyCard = 'loyalist' | 'shadow';

const PolicyCardUI = ({
  type,
  faceUp,
  onClick,
  disabled,
}: {
  type: PolicyCard;
  faceUp: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <motion.button
    whileHover={!disabled ? { scale: 1.05 } : undefined}
    whileTap={!disabled ? { scale: 0.95 } : undefined}
    onClick={onClick}
    disabled={disabled}
    className={`card-flip relative flex h-40 w-28 flex-col items-center justify-center rounded-lg border-2 transition-all ${
      !faceUp
        ? 'border-border bg-card cursor-pointer hover:border-muted-foreground'
        : type === 'loyalist'
        ? 'border-primary bg-primary/10 shadow-[0_0_16px_hsl(var(--primary)/0.3)]'
        : 'border-accent bg-accent/10 shadow-[0_0_16px_hsl(var(--accent)/0.3)]'
    }`}
  >
    {faceUp ? (
      <motion.div
        initial={{ rotateY: 90 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-2"
      >
        {type === 'loyalist' ? (
          <Shield className="h-10 w-10 text-primary" />
        ) : (
          <Skull className="h-10 w-10 text-accent-foreground" />
        )}
        <span className={`font-display text-xs uppercase tracking-wider ${
          type === 'loyalist' ? 'text-primary' : 'text-accent-foreground'
        }`}>
          {type === 'loyalist' ? 'Loyalist' : 'Shadow'}
        </span>
      </motion.div>
    ) : (
      <div className="flex flex-col items-center gap-2">
        <Scroll className="h-10 w-10 text-muted-foreground/40" />
        <span className="font-display text-[10px] uppercase tracking-wider text-muted-foreground/40">
          Edict
        </span>
      </div>
    )}
  </motion.button>
);

const LegislativeOverlay = ({
  gameState,
  currentRound,
  currentPlayerId,
  onClose,
}: LegislativeOverlayProps) => {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const isHerald = gameState.current_herald_id === currentPlayerId;
  const isLC = gameState.current_lord_commander_id === currentPlayerId;

  // Parse hand from round data (will be populated by Edge Functions in Phase 3)
  const heraldHand = (currentRound?.herald_hand as PolicyCard[] | null) ?? [];
  const lcHand = (currentRound?.chancellor_hand as PolicyCard[] | null) ?? [];

  // Demo cards for UI preview
  const demoHeraldHand: PolicyCard[] = ['loyalist', 'shadow', 'shadow'];
  const demoLCHand: PolicyCard[] = ['loyalist', 'shadow'];

  const cards = isHerald
    ? (heraldHand.length > 0 ? heraldHand : demoHeraldHand)
    : isLC
    ? (lcHand.length > 0 ? lcHand : demoLCHand)
    : [];

  const instruction = isHerald
    ? 'Choose one edict to discard'
    : isLC
    ? 'Choose one edict to enact'
    : 'The legislative session is in progress...';

  if (!isHerald && !isLC) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-lg border border-border bg-card p-6 text-center"
      >
        <Scroll className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-body text-sm italic text-muted-foreground">{instruction}</p>
      </motion.div>
    );
  }

  const handleCardAction = (index: number) => {
    setSelectedCard(index);
    const action = isHerald ? 'discard' : 'enact';
    console.log('TODO: Phase 3 edge function — legislative_action', {
      action,
      card_index: index,
      card_type: cards[index],
      round_id: currentRound?.id,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border-2 border-border bg-card p-6"
    >
      <h3 className="mb-2 text-center font-display text-sm uppercase tracking-widest text-primary">
        {isHerald ? 'Herald\'s Chamber' : 'Lord Commander\'s Decree'}
      </h3>
      <p className="mb-6 text-center font-body text-sm text-muted-foreground">{instruction}</p>

      <div className="flex justify-center gap-4">
        {cards.map((card, i) => (
          <PolicyCardUI
            key={i}
            type={card}
            faceUp={true}
            onClick={() => handleCardAction(i)}
            disabled={selectedCard !== null}
          />
        ))}
      </div>

      {selectedCard !== null && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center text-xs italic text-muted-foreground"
        >
          Your choice has been made...
        </motion.p>
      )}

      {isLC && gameState.veto_unlocked && selectedCard === null && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            className="border-accent/30 font-display text-xs tracking-wider text-accent-foreground hover:bg-accent/10"
            onClick={() => {
              console.log('TODO: Phase 3 edge function — veto_request', {
                round_id: currentRound?.id,
              });
            }}
          >
            Invoke Veto
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default LegislativeOverlay;
