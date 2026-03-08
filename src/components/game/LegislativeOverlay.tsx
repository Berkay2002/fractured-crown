import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Scroll, Shield, Skull } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import type { Tables } from '@/integrations/supabase/types';

type GameState = Tables<'game_state'>;
type Round = Tables<'rounds'>;

interface LegislativeOverlayProps {
  gameState: GameState;
  currentRound: Round | null;
  currentPlayerId: number | null;
  onClose: () => void;
  heraldHand: string[] | null;
  setHeraldHand: (hand: string[] | null) => void;
  chancellorHand: string[] | null;
  setChancellorHand: (hand: string[] | null) => void;
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
    whileHover={!disabled ? { scale: 1.08, y: -4 } : undefined}
    whileTap={!disabled ? { scale: 0.95 } : undefined}
    onClick={onClick}
    disabled={disabled}
    className={`card-flip relative flex h-40 w-28 flex-col items-center justify-center rounded-lg border-2 transition-all duration-200 ${
      !faceUp
        ? 'border-border bg-card cursor-pointer hover:border-primary/50 hover:shadow-[0_0_20px_hsl(var(--primary)/0.25)]'
        : type === 'loyalist'
        ? 'border-primary bg-primary/10 shadow-[0_0_16px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_24px_hsl(var(--primary)/0.5)]'
        : 'border-accent bg-accent/10 shadow-[0_0_16px_hsl(var(--accent)/0.3)] hover:shadow-[0_0_24px_hsl(var(--accent)/0.5)]'
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
  heraldHand,
  setHeraldHand,
  chancellorHand,
  setChancellorHand,
}: LegislativeOverlayProps) => {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [acting, setActing] = useState(false);
  const isHerald = gameState.current_herald_id === currentPlayerId;
  const isLC = gameState.current_lord_commander_id === currentPlayerId;

  // Auto-fetch hand from edge function when waiting for cards
  const fetchingRef = useRef(false);
  const fetchHand = useCallback(async () => {
    if (!isHerald && !isLC) return;
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data, error } = await supabase.functions.invoke('fetch-hand', {
        body: { room_id: gameState.room_id },
      });
      if (!error && data?.hand) {
        if (data.role === 'herald') {
          setHeraldHand(data.hand);
        } else if (data.role === 'lord_commander') {
          setChancellorHand(data.hand);
        }
      }
    } catch {
      // silent retry
    } finally {
      fetchingRef.current = false;
    }
  }, [gameState.room_id, isHerald, isLC, setHeraldHand, setChancellorHand]);

  useEffect(() => {
    const heraldAlreadyPassed = isHerald && !!currentRound?.chancellor_hand;
    const needsHeraldHand = isHerald && !heraldHand && !(currentRound?.herald_hand) && !heraldAlreadyPassed;
    const needsLCHand = isLC && !chancellorHand && !(currentRound?.chancellor_hand);
    if (!needsHeraldHand && !needsLCHand) return;

    fetchHand();
    const intervalId = window.setInterval(fetchHand, 1500);
    return () => window.clearInterval(intervalId);
  }, [fetchHand, isHerald, isLC, heraldHand, chancellorHand, currentRound?.herald_hand, currentRound?.chancellor_hand]);

  const vetoRequested = currentRound?.veto_requested === true;
  const vetoResolved = currentRound?.veto_approved !== null;

  // Resolve hands: prefer local state, fall back to round data from DB
  const resolvedHeraldHand = (heraldHand ?? (currentRound?.herald_hand as string[] | null)) as PolicyCard[] | null;
  const resolvedChancellorHand = (chancellorHand ?? (currentRound?.chancellor_hand as string[] | null)) as PolicyCard[] | null;

  const heraldAlreadyPassed = isHerald && !resolvedHeraldHand && !!resolvedChancellorHand;

  // Determine which cards to show
  const cards: PolicyCard[] = isHerald
    ? resolvedHeraldHand || []
    : isLC
    ? resolvedChancellorHand || []
    : [];

  const waitingForCards = ((isHerald && !resolvedHeraldHand && !heraldAlreadyPassed) || (isLC && !resolvedChancellorHand));

  const instruction = isHerald
    ? heraldAlreadyPassed
      ? 'You have passed your edicts. Waiting for the Lord Commander...'
      : resolvedHeraldHand
      ? 'Choose one edict to discard'
      : 'Waiting for cards...'
    : isLC
    ? resolvedChancellorHand ? 'Choose one edict to enact' : 'Waiting for the Herald...'
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

  // Herald: handle veto response
  if (isHerald && vetoRequested && !vetoResolved) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border-2 border-border bg-card p-6 text-center"
      >
        <h3 className="mb-2 font-display text-sm uppercase tracking-widest text-primary">
          Veto Requested
        </h3>
        <p className="mb-6 font-body text-sm text-muted-foreground">
          The Lord Commander wishes to veto this agenda. Do you accept?
        </p>
        <div className="flex justify-center gap-4">
          <Button
            onClick={async () => {
              setActing(true);
              const { data, error } = await supabase.functions.invoke('respond-veto', {
                body: { room_id: gameState.room_id, accept: true },
              });
              setActing(false);
              if (error || data?.error) toast({ title: 'Error', description: data?.error || error?.message, variant: 'destructive' });
            }}
            disabled={acting}
            className="gold-shimmer font-display tracking-wider text-primary-foreground"
          >
            Accept Veto
          </Button>
          <Button
            onClick={async () => {
              setActing(true);
              const { data, error } = await supabase.functions.invoke('respond-veto', {
                body: { room_id: gameState.room_id, accept: false },
              });
              setActing(false);
              if (error || data?.error) toast({ title: 'Error', description: data?.error || error?.message, variant: 'destructive' });
            }}
            disabled={acting}
            variant="destructive"
            className="font-display tracking-wider"
          >
            Reject Veto
          </Button>
        </div>
      </motion.div>
    );
  }

  const handleCardAction = async (index: number) => {
    setSelectedCard(index);
    setActing(true);

    if (isHerald) {
      const { data, error } = await supabase.functions.invoke('herald-discard', {
        body: { room_id: gameState.room_id, card_index: index },
      });
      setActing(false);
      if (error || data?.error) {
        toast({
          title: 'Error',
          description: data?.error || error?.message,
          variant: 'destructive',
          action: <ToastAction altText="Try again" onClick={() => handleCardAction(index)}>Try Again</ToastAction>,
        });
        return;
      }
      // The chancellor_hand will come via Realtime round update for LC
      // But also set it locally if we got it in response (for LC's client when they fetch)
      if (data?.chancellor_hand) {
        setChancellorHand(data.chancellor_hand);
      }
    } else if (isLC) {
      const { data, error } = await supabase.functions.invoke('enact-policy', {
        body: { room_id: gameState.room_id, card_index: index },
      });
      setActing(false);
      if (error || data?.error) {
        toast({ title: 'Error', description: data?.error || error?.message, variant: 'destructive' });
        setSelectedCard(null);
        return;
      }
    }
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

      {waitingForCards ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm italic text-muted-foreground animate-pulse">
            Awaiting edicts...
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={acting}
            className="border-primary/30 font-display text-xs tracking-wider text-primary hover:bg-primary/10"
            onClick={() => {
              fetchingRef.current = false;
              fetchHand();
            }}
          >
            <Scroll className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      ) : (
        <div className="flex justify-center gap-4">
          {cards.map((card, i) => (
            <PolicyCardUI
              key={i}
              type={card}
              faceUp={true}
              onClick={() => handleCardAction(i)}
              disabled={selectedCard !== null || acting}
            />
          ))}
        </div>
      )}

      {selectedCard !== null && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center text-xs italic text-muted-foreground"
        >
          Your choice has been made...
        </motion.p>
      )}

      {isLC && gameState.veto_unlocked && selectedCard === null && !waitingForCards && !vetoRequested && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            disabled={acting}
            className="border-accent/30 font-display text-xs tracking-wider text-accent-foreground hover:bg-accent/10"
            onClick={async () => {
              setActing(true);
              const { data, error } = await supabase.functions.invoke('request-veto', {
                body: { room_id: gameState.room_id },
              });
              setActing(false);
              if (error || data?.error) toast({ title: 'Error', description: data?.error || error?.message, variant: 'destructive' });
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
