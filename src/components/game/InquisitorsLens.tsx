import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, AlertTriangle, Loader2 } from 'lucide-react';
import { useRoundHistory, type RoundHistoryEntry } from '@/hooks/useRoundHistory';
import EdictCard from './EdictCard';
import SigilAvatar from './SigilAvatar';
import type { Tables } from '@/integrations/supabase/types';

type Player = Tables<'players'>;

interface InquisitorsLensProps {
  roomId: number;
  players: Player[];
  gameOver: boolean;
}

const InquisitorsLens = ({ roomId, players, gameOver }: InquisitorsLensProps) => {
  const { rounds, isLoading, error } = useRoundHistory(roomId, gameOver);
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [unlocking, setUnlocking] = useState<number | null>(null);

  const getPlayer = (id: number) => players.find(p => p.id === id);

  const handleReveal = (roundNumber: number) => {
    if (expandedRound === roundNumber) {
      setExpandedRound(null);
      return;
    }
    // Brief shake animation before reveal
    setUnlocking(roundNumber);
    setTimeout(() => {
      setUnlocking(null);
      setExpandedRound(roundNumber);
    }, 400);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="font-body text-sm italic">Unsealing the archives...</span>
      </div>
    );
  }

  if (error || rounds.length === 0) return null;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-5 text-center">
        <h2 className="font-display text-sm uppercase tracking-widest text-primary">
          The Inquisitor's Lens
        </h2>
        <p className="mt-1 font-body text-xs italic text-muted-foreground">
          The truth behind every closed door.
        </p>
      </div>

      {/* Round timeline */}
      <div className="space-y-2">
        {rounds.map((round) => (
          <RoundEntry
            key={round.round_id}
            round={round}
            herald={getPlayer(round.herald_id)}
            lordCommander={round.lord_commander_id ? getPlayer(round.lord_commander_id) : null}
            isExpanded={expandedRound === round.round_number}
            isUnlocking={unlocking === round.round_number}
            onToggle={() => handleReveal(round.round_number)}
          />
        ))}
      </div>
    </div>
  );
};

/* ─── Per-round entry ─── */

interface RoundEntryProps {
  round: RoundHistoryEntry;
  herald: Player | undefined;
  lordCommander: Player | null | undefined;
  isExpanded: boolean;
  isUnlocking: boolean;
  onToggle: () => void;
}

const RoundEntry = ({ round, herald, lordCommander, isExpanded, isUnlocking, onToggle }: RoundEntryProps) => {
  const enacted = round.enacted_policy;
  const isChaos = round.chaos_policy;
  const summaryColor = enacted === 'loyalist' ? 'text-primary' : 'text-accent-foreground';

  const summaryText = isChaos
    ? 'Chaos — top edict drawn'
    : enacted
    ? `${enacted === 'loyalist' ? 'Loyalist' : 'Shadow'} Edict enacted`
    : 'No edict enacted';

  return (
    <div className="rounded-lg border border-border/50 bg-card/80">
      {/* Collapsed row */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/30 sm:px-4"
      >
        {/* Round number badge */}
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-display text-xs text-primary">
          {round.round_number}
        </span>

        {/* Names */}
        <div className="flex flex-1 flex-col gap-0.5 overflow-hidden sm:flex-row sm:items-center sm:gap-2">
          <div className="flex items-center gap-1.5 truncate">
            {herald && (
              <SigilAvatar sigil={herald.sigil ?? 'crown'} displayName={herald.display_name} size="h-5 w-5" />
            )}
            <span className="truncate font-body text-xs text-foreground/80">
              {herald?.display_name ?? 'Unknown'}
            </span>
          </div>
          {lordCommander && (
            <>
              <span className="hidden text-muted-foreground/40 sm:inline">→</span>
              <div className="flex items-center gap-1.5 truncate">
                <SigilAvatar sigil={lordCommander.sigil ?? 'crown'} displayName={lordCommander.display_name} size="h-5 w-5" />
                <span className="truncate font-body text-xs text-foreground/80">
                  {lordCommander.display_name}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Summary */}
        <span className={`hidden whitespace-nowrap font-body text-xs italic sm:inline ${summaryColor}`}>
          {summaryText}
        </span>

        {/* Lock icon */}
        <motion.div
          animate={isUnlocking ? { rotate: [0, -8, 8, -8, 0] } : {}}
          transition={{ duration: 0.35 }}
        >
          {isExpanded ? (
            <Unlock className="h-4 w-4 flex-shrink-0 text-primary" />
          ) : (
            <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          )}
        </motion.div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30 px-3 py-4 sm:px-4">
              {isChaos ? (
                <ChaosView enacted={enacted} />
              ) : (
                <LegislativeView round={round} herald={herald} lordCommander={lordCommander} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Chaos banner ─── */

const ChaosView = ({ enacted }: { enacted: 'loyalist' | 'shadow' | null }) => (
  <div className="flex flex-col items-center gap-3 py-2">
    <div className="flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-1.5">
      <AlertTriangle className="h-4 w-4 text-accent-foreground" />
      <span className="font-display text-xs uppercase tracking-wider text-accent-foreground">
        Chaos Reigned — The Top Edict Was Drawn
      </span>
    </div>
    {enacted && (
      <EdictCard type={enacted} state="enacted" delay={0.3} />
    )}
  </div>
);

/* ─── Normal legislative view ─── */

interface LegislativeViewProps {
  round: RoundHistoryEntry;
  herald: Player | undefined;
  lordCommander: Player | null | undefined;
}

const LegislativeView = ({ round, herald, lordCommander }: LegislativeViewProps) => {
  const heraldHand = round.herald_hand ?? [];
  const lcHand = round.chancellor_hand ?? [];
  const enacted = round.enacted_policy;

  // Determine which cards were discarded by the Herald
  // The LC hand is what was passed, so cards in heraldHand but not in lcHand were discarded
  const getHeraldCardStates = (): ('enacted' | 'discarded' | 'normal')[] => {
    const lcTypes = [...lcHand];
    return heraldHand.map((card) => {
      const passedIdx = lcTypes.indexOf(card);
      if (passedIdx >= 0) {
        lcTypes.splice(passedIdx, 1);
        return 'normal'; // was passed to LC
      }
      return 'discarded';
    });
  };

  const getLcCardStates = (): ('enacted' | 'discarded')[] => {
    return lcHand.map((card) => card === enacted ? 'enacted' : 'discarded');
  };

  // Deception analysis
  const hadChoice = heraldHand.some(c => c === 'loyalist') && heraldHand.some(c => c === 'shadow');
  const deceptionText = hadChoice
    ? 'The Herald had a choice.'
    : "The Herald's hand was forced.";

  const heraldStates = getHeraldCardStates();
  const lcStates = getLcCardStates();

  return (
    <div className="space-y-4">
      {/* Herald's hand */}
      {heraldHand.length > 0 && (
        <div>
          <p className="mb-2 font-body text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/70">{herald?.display_name ?? 'Herald'}</span> was dealt:
          </p>
          <div className="flex items-center gap-2">
            {heraldHand.map((card, i) => (
              <EdictCard
                key={i}
                type={card}
                state={heraldStates[i]}
                delay={i * 0.15}
              />
            ))}
          </div>
        </div>
      )}

      {/* Veto banner */}
      {round.veto_requested && (
        <div className={`flex items-center gap-2 rounded-md border px-3 py-1.5 ${
          round.veto_approved
            ? 'border-primary/30 bg-primary/10'
            : 'border-accent/30 bg-accent/10'
        }`}>
          <span className={`font-display text-[10px] uppercase tracking-wider ${
            round.veto_approved ? 'text-primary' : 'text-accent-foreground'
          }`}>
            {round.veto_approved ? 'Veto Approved — Edicts Discarded' : 'Veto Denied'}
          </span>
        </div>
      )}

      {/* Lord Commander's hand */}
      {lcHand.length > 0 && (
        <div>
          <p className="mb-2 font-body text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/70">{lordCommander?.display_name ?? 'Lord Commander'}</span> received:
          </p>
          <div className="flex items-center gap-2">
            {lcHand.map((card, i) => (
              <EdictCard
                key={i}
                type={card}
                state={lcStates[i]}
                delay={0.45 + i * 0.15}
              />
            ))}
          </div>
        </div>
      )}

      {/* Deception indicator */}
      {heraldHand.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className={`font-body text-xs italic ${
            hadChoice ? 'text-accent-foreground' : 'text-muted-foreground'
          }`}
        >
          {deceptionText}
        </motion.p>
      )}
    </div>
  );
};

export default InquisitorsLens;
