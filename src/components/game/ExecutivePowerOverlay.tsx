import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Search, Vote, Skull } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import PlayerCouncil from './PlayerCouncil';
import PolicyPeekOverlay from './PolicyPeekOverlay';
import InvestigationOverlay from './InvestigationOverlay';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type GameState = Tables<'game_state'>;
type Player = Tables<'players'>;

interface ExecutivePowerOverlayProps {
  gameState: GameState;
  players: Player[];
  currentPlayerId: number | null;
  onlinePlayers: Set<number>;
}

type PolicyCard = 'loyalist' | 'shadow';

const ExecutivePowerOverlay = ({
  gameState,
  players,
  currentPlayerId,
  onlinePlayers,
}: ExecutivePowerOverlayProps) => {
  const [selectedTarget, setSelectedTarget] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acting, setActing] = useState(false);

  // Cinematic overlay states
  const [peekedCards, setPeekedCards] = useState<PolicyCard[] | null>(null);
  const [investigationResult, setInvestigationResult] = useState<{
    target: Player;
    team: 'loyalist' | 'shadow_court';
  } | null>(null);

  const isHerald = gameState.current_herald_id === currentPlayerId;
  const power = gameState.active_power;

  const selectablePlayers = players
    .filter(p => p.is_alive && p.id !== currentPlayerId)
    .map(p => p.id);

  const targetName = players.find(p => p.id === selectedTarget)?.display_name ?? '';

  // Non-Herald waiting screen
  if (!isHerald) {
    const powerDescriptions: Record<string, { icon: React.ReactNode; title: string; desc: string }> = {
      policy_peek: {
        icon: <Eye className="mx-auto mb-3 h-8 w-8 text-primary" />,
        title: "Raven's Eye",
        desc: 'The Herald is secretly viewing the top 3 edicts from the decree pile.',
      },
      investigate_loyalty: {
        icon: <Search className="mx-auto mb-3 h-8 w-8 text-primary" />,
        title: 'Loyalty Investigation',
        desc: "The Herald is investigating a player's party allegiance.",
      },
      special_election: {
        icon: <Vote className="mx-auto mb-3 h-8 w-8 text-primary" />,
        title: 'Call Conclave',
        desc: 'The Herald is choosing the next Herald for a special election session.',
      },
      execution: {
        icon: <Skull className="mx-auto mb-3 h-8 w-8 text-accent-foreground" />,
        title: 'Royal Execution',
        desc: 'The Herald is choosing a player to execute. This cannot be undone.',
      },
    };

    const info = power ? powerDescriptions[power] : null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border-2 border-border bg-card p-6 text-center"
      >
        {info?.icon ?? <Eye className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />}
        <h3 className="mb-2 font-display text-sm uppercase tracking-widest text-primary">
          {info?.title ?? 'Executive Power'}
        </h3>
        <p className="font-body text-sm text-muted-foreground">
          {info?.desc ?? 'The Herald is exercising executive power...'}
        </p>
        <p className="mt-4 animate-pulse text-xs italic text-muted-foreground/60">
          Awaiting the Herald's decision...
        </p>
      </motion.div>
    );
  }

  const invokeResolve = async (actionType: string, targetPlayerId?: number) => {
    setActing(true);
    const { data, error } = await supabase.functions.invoke('resolve-power', {
      body: { room_id: gameState.room_id, action_type: actionType, target_player_id: targetPlayerId },
    });
    setActing(false);
    if (error || data?.error) {
      toast({ title: 'Error', description: data?.error || error?.message, variant: 'destructive' });
      return null;
    }
    return data;
  };

  // Policy Peek
  if (power === 'policy_peek') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border-2 border-border bg-card p-6 text-center"
        >
          <Eye className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h3 className="mb-2 font-display text-sm uppercase tracking-widest text-primary">
            Raven's Eye
          </h3>
          <p className="mb-6 font-body text-sm text-muted-foreground">
            Peer into the decree pile to see what fate awaits.
          </p>
          {!peekedCards && (
            <Button
              onClick={async () => {
                const data = await invokeResolve('policy_peek');
                if (data?.peeked_cards) {
                  setPeekedCards(data.peeked_cards as PolicyCard[]);
                }
              }}
              disabled={acting}
              className="gold-shimmer font-display tracking-wider text-primary-foreground"
            >
              Reveal the Edicts
            </Button>
          )}
          {peekedCards && (
            <p className="text-sm italic text-muted-foreground">
              The next Herald will begin their turn shortly...
            </p>
          )}
        </motion.div>

        <AnimatePresence>
          {peekedCards && (
            <PolicyPeekOverlay
              cards={peekedCards}
              onClose={() => setPeekedCards(null)}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // Investigate Loyalty
  if (power === 'investigate_loyalty') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border-2 border-border bg-card p-6 text-center"
        >
          <Search className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h3 className="mb-2 font-display text-sm uppercase tracking-widest text-primary">
            Investigate Loyalty
          </h3>

          {!investigationResult ? (
            <>
              <p className="mb-6 font-body text-sm text-muted-foreground">
                Choose a player to investigate their party allegiance.
              </p>
              <PlayerCouncil
                players={players}
                gameState={gameState}
                onlinePlayers={onlinePlayers}
                currentPlayerId={currentPlayerId}
                selectablePlayerIds={selectablePlayers}
                onPlayerClick={async (id) => {
                  setSelectedTarget(id);
                  const data = await invokeResolve('investigate_loyalty', id);
                  if (data?.team) {
                    const target = players.find(p => p.id === id);
                    if (target) {
                      setInvestigationResult({
                        target,
                        team: data.team as 'loyalist' | 'shadow_court',
                      });
                    }
                  }
                }}
              />
            </>
          ) : (
            <p className="mt-4 text-sm italic text-muted-foreground">
              The next Herald will begin their turn shortly...
            </p>
          )}
        </motion.div>

        <AnimatePresence>
          {investigationResult && (
            <InvestigationOverlay
              targetName={investigationResult.target.display_name}
              targetSigil={investigationResult.target.sigil ?? 'crown'}
              team={investigationResult.team}
              onClose={() => setInvestigationResult(null)}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  // Special Election
  if (power === 'special_election') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border-2 border-border bg-card p-6 text-center"
      >
        <Vote className="mx-auto mb-3 h-8 w-8 text-primary" />
        <h3 className="mb-2 font-display text-sm uppercase tracking-widest text-primary">
          Call Conclave
        </h3>
        <p className="mb-6 font-body text-sm text-muted-foreground">
          Choose the next Herald for a special session.
        </p>
        <PlayerCouncil
          players={players}
          gameState={gameState}
          onlinePlayers={onlinePlayers}
          currentPlayerId={currentPlayerId}
          selectablePlayerIds={selectablePlayers}
          onPlayerClick={async (id) => {
            await invokeResolve('special_election', id);
          }}
        />
      </motion.div>
    );
  }

  // Execution
  if (power === 'execution') {
    return (
      <>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border-2 border-accent/30 bg-card p-6 text-center"
        >
          <Skull className="mx-auto mb-3 h-8 w-8 text-accent-foreground" />
          <h3 className="mb-2 font-display text-sm uppercase tracking-widest text-accent-foreground">
            Royal Execution
          </h3>
          <p className="mb-6 font-body text-sm text-muted-foreground">
            Choose a player to execute. This cannot be undone.
          </p>
          <PlayerCouncil
            players={players}
            gameState={gameState}
            onlinePlayers={onlinePlayers}
            currentPlayerId={currentPlayerId}
            selectablePlayerIds={selectablePlayers}
            onPlayerClick={(id) => {
              setSelectedTarget(id);
              setConfirmOpen(true);
            }}
          />
        </motion.div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="border-accent/50 bg-card">
            <DialogHeader>
              <DialogTitle className="font-display text-accent-foreground">
                Confirm Execution
              </DialogTitle>
              <DialogDescription className="font-body text-muted-foreground">
                You are about to execute <strong className="text-foreground">{targetName}</strong>.
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Stay my hand
              </Button>
              <Button
                variant="destructive"
                disabled={acting}
                onClick={async () => {
                  setConfirmOpen(false);
                  await invokeResolve('execution', selectedTarget!);
                }}
              >
                Execute
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return null;
};

export default ExecutivePowerOverlay;
