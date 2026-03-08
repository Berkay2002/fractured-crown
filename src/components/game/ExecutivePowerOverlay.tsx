import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Search, Vote, Skull, Shield, Scroll } from 'lucide-react';
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
  const [peeked, setPeeked] = useState(false);
  const [investigated, setInvestigated] = useState<'loyalist' | 'traitor' | null>(null);

  const isHerald = gameState.current_herald_id === currentPlayerId;
  const power = gameState.active_power;

  const selectablePlayers = players
    .filter(p => p.is_alive && p.id !== currentPlayerId)
    .map(p => p.id);

  const targetName = players.find(p => p.id === selectedTarget)?.display_name ?? '';

  if (!isHerald) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-lg border border-border bg-card p-6 text-center"
      >
        <p className="font-body text-sm italic text-muted-foreground">
          The Herald is exercising executive power...
        </p>
      </motion.div>
    );
  }

  // Policy Peek (Raven's Eye)
  if (power === 'policy_peek') {
    const demoCards: PolicyCard[] = ['shadow', 'loyalist', 'shadow'];
    return (
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
          The top three edicts from the decree pile:
        </p>
        <div className="flex justify-center gap-3">
          {demoCards.map((card, i) => (
            <motion.div
              key={i}
              initial={peeked ? {} : { rotateY: 180 }}
              animate={peeked ? { rotateY: 0 } : {}}
              transition={{ delay: i * 0.2, duration: 0.5 }}
              className={`card-flip flex h-32 w-20 items-center justify-center rounded-lg border-2 ${
                peeked
                  ? card === 'loyalist'
                    ? 'border-primary bg-primary/10'
                    : 'border-accent bg-accent/10'
                  : 'border-border bg-muted'
              }`}
            >
              {peeked ? (
                card === 'loyalist' ? (
                  <Shield className="h-8 w-8 text-primary" />
                ) : (
                  <Skull className="h-8 w-8 text-accent-foreground" />
                )
              ) : (
                <Scroll className="h-8 w-8 text-muted-foreground/30" />
              )}
            </motion.div>
          ))}
        </div>
        {!peeked ? (
          <Button
            onClick={() => setPeeked(true)}
            className="gold-shimmer mt-6 font-display tracking-wider text-primary-foreground"
          >
            Reveal the Edicts
          </Button>
        ) : (
          <Button
            onClick={() => {
              console.log('TODO: Phase 3 edge function — acknowledge_peek');
            }}
            variant="outline"
            className="mt-6 border-primary/30 font-display tracking-wider text-primary hover:bg-primary/10"
          >
            I have seen enough
          </Button>
        )}
      </motion.div>
    );
  }

  // Investigate Loyalty
  if (power === 'investigate_loyalty') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border-2 border-border bg-card p-6 text-center"
      >
        <Search className="mx-auto mb-3 h-8 w-8 text-primary" />
        <h3 className="mb-2 font-display text-sm uppercase tracking-widest text-primary">
          Investigate Loyalty
        </h3>

        {!investigated ? (
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
              onPlayerClick={(id) => {
                setSelectedTarget(id);
                // Demo: random allegiance
                const allegiance = Math.random() > 0.5 ? 'loyalist' : 'traitor';
                setInvestigated(allegiance as 'loyalist' | 'traitor');
                console.log('TODO: Phase 3 edge function — investigate', { target_player_id: id });
              }}
            />
          </>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`mx-auto mt-4 max-w-xs rounded-lg border-2 p-6 ${
              investigated === 'loyalist'
                ? 'border-primary bg-primary/10'
                : 'border-accent bg-accent/10'
            }`}
          >
            <p className="font-display text-lg">
              {targetName} is a{' '}
              <span className={investigated === 'loyalist' ? 'text-primary' : 'text-accent-foreground'}>
                {investigated === 'loyalist' ? 'Loyalist' : 'Member of the Shadow'}
              </span>
            </p>
            <Button
              onClick={() => console.log('TODO: Phase 3 — acknowledge investigation')}
              variant="outline"
              className="mt-4 border-primary/30 font-display text-xs tracking-wider text-primary"
            >
              Understood
            </Button>
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Special Election (Call Conclave)
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
          onPlayerClick={(id) => {
            console.log('TODO: Phase 3 edge function — special_election', { target_player_id: id });
          }}
        />
      </motion.div>
    );
  }

  // Execution (Royal Execution)
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
                onClick={() => {
                  setConfirmOpen(false);
                  console.log('TODO: Phase 3 edge function — execution', {
                    target_player_id: selectedTarget,
                  });
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
