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
  const [peeked, setPeeked] = useState(false);
  const [peekedCards, setPeekedCards] = useState<PolicyCard[]>([]);
  const [investigated, setInvestigated] = useState<'loyalist' | 'shadow_court' | null>(null);
  const [acting, setActing] = useState(false);

  const isHerald = gameState.current_herald_id === currentPlayerId;
  const power = gameState.active_power;

  const selectablePlayers = players
    .filter(p => p.is_alive && p.id !== currentPlayerId)
    .map(p => p.id);

  const targetName = players.find(p => p.id === selectedTarget)?.display_name ?? '';

  if (!isHerald) {
    const powerDescriptions: Record<string, { icon: React.ReactNode; title: string; desc: string }> = {
      policy_peek: {
        icon: <Eye className="mx-auto mb-3 h-8 w-8 text-primary" />,
        title: "Raven's Eye",
        desc: 'The Herald is secretly viewing the top 3 edicts from the decree pile. This gives them insider knowledge of upcoming policies.',
      },
      investigate_loyalty: {
        icon: <Search className="mx-auto mb-3 h-8 w-8 text-primary" />,
        title: 'Loyalty Investigation',
        desc: 'The Herald is investigating a player\'s party allegiance. They will learn whether the target is Loyalist or Shadow Court.',
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
        <div className="flex justify-center gap-4">
          {(peeked ? peekedCards : [null, null, null]).map((card, i) => (
            <motion.div
              key={i}
              initial={peeked ? { rotateY: 180, opacity: 0 } : {}}
              animate={peeked ? { rotateY: 0, opacity: 1 } : {}}
              transition={{ delay: i * 0.3, duration: 0.6 }}
              className={`card-flip flex h-36 w-24 flex-col items-center justify-center gap-2 rounded-lg border-2 ${
                peeked && card
                  ? card === 'loyalist'
                    ? 'border-primary bg-primary/10 shadow-[0_0_16px_hsl(var(--primary)/0.3)]'
                    : 'border-accent bg-accent/10 shadow-[0_0_16px_hsl(var(--accent)/0.3)]'
                  : 'border-border bg-muted'
              }`}
            >
              {peeked && card ? (
                <>
                  {card === 'loyalist' ? (
                    <Shield className="h-8 w-8 text-primary" />
                  ) : (
                    <Skull className="h-8 w-8 text-accent-foreground" />
                  )}
                  <span className={`font-display text-[10px] uppercase tracking-wider ${
                    card === 'loyalist' ? 'text-primary' : 'text-accent-foreground'
                  }`}>
                    {card === 'loyalist' ? 'Loyalist' : 'Shadow'}
                  </span>
                </>
              ) : (
                <>
                  <Scroll className="h-8 w-8 text-muted-foreground/30" />
                  <span className="font-display text-[10px] uppercase tracking-wider text-muted-foreground/30">
                    Edict
                  </span>
                </>
              )}
            </motion.div>
          ))}
        </div>
        {!peeked ? (
          <Button
            onClick={async () => {
              const data = await invokeResolve('policy_peek');
              if (data?.peeked_cards) {
                setPeekedCards(data.peeked_cards);
                setPeeked(true);
              }
            }}
            disabled={acting}
            className="gold-shimmer mt-6 font-display tracking-wider text-primary-foreground"
          >
            Reveal the Edicts
          </Button>
        ) : (
          <p className="mt-6 text-sm italic text-muted-foreground">
            The next Herald will begin their turn shortly...
          </p>
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
              onPlayerClick={async (id) => {
                setSelectedTarget(id);
                const data = await invokeResolve('investigate_loyalty', id);
                if (data?.team) {
                  setInvestigated(data.team);
                }
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
                {investigated === 'loyalist' ? 'Loyalist' : 'Member of the Shadow Court'}
              </span>
            </p>
            <p className="mt-4 text-sm italic text-muted-foreground">
              The next Herald will begin their turn shortly...
            </p>
          </motion.div>
        )}
      </motion.div>
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
