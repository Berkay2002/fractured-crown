import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Player = Tables<'players'>;
type Vote = Tables<'votes'>;

interface VotingPanelProps {
  players: Player[];
  votes: Vote[];
  currentRoundId: number | null;
  currentPlayerId: number | null;
  nominatedPlayerName?: string;
  roomId: number;
  isHerald: boolean;
  onHeraldHand: (hand: string[]) => void;
}

const VotingPanel = ({
  players,
  votes,
  currentRoundId,
  currentPlayerId,
  nominatedPlayerName,
  roomId,
  isHerald,
  onHeraldHand,
}: VotingPanelProps) => {
  const [hasVoted, setHasVoted] = useState(false);
  const [serverHasVoted, setServerHasVoted] = useState(false);
  const [castCount, setCastCount] = useState(0);
  const [aliveCount, setAliveCount] = useState(0);
  const [voting, setVoting] = useState(false);

  const roundVotes = votes.filter(v => v.round_id === currentRoundId);
  const alivePlayers = players.filter(p => p.is_alive);
  const allRevealed = roundVotes.length > 0 && roundVotes.every(v => v.revealed);
  const hasSubmittedVote = hasVoted || serverHasVoted;

  const fetchVoteStatus = useCallback(async () => {
    if (!currentRoundId || !currentPlayerId) return;

    const { data, error } = await supabase.functions.invoke('vote-status', {
      body: { room_id: roomId, round_id: currentRoundId },
    });

    if (error || data?.error) return;

    setCastCount(data.cast_count ?? 0);
    setAliveCount(data.alive_count ?? alivePlayers.length);
    setServerHasVoted(Boolean(data.has_voted));
  }, [roomId, currentRoundId, currentPlayerId, alivePlayers.length]);

  useEffect(() => {
    setHasVoted(false);
    setServerHasVoted(false);
    setCastCount(0);
    setAliveCount(alivePlayers.length);
  }, [currentRoundId, alivePlayers.length]);

  useEffect(() => {
    fetchVoteStatus();

    if (!currentRoundId || allRevealed) return;

    const intervalId = window.setInterval(() => {
      fetchVoteStatus();
    }, 1500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchVoteStatus, currentRoundId, allRevealed]);

  const handleVote = async (choice: 'ja' | 'nein') => {
    setVoting(true);
    const { data, error } = await supabase.functions.invoke('submit-vote', {
      body: { room_id: roomId, vote: choice },
    });
    setVoting(false);

    if (error || data?.error) {
      if ((data?.error || error?.message || '').toLowerCase().includes('already voted')) {
        setServerHasVoted(true);
        return;
      }
      toast({ title: 'Vote failed', description: data?.error || error?.message, variant: 'destructive' });
      return;
    }

    setHasVoted(true);
    setCastCount(prev => Math.max(prev, 1));

    // If herald and response contains hand, pass it up
    if (data?.herald_hand && isHerald) {
      onHeraldHand(data.herald_hand);
    }

    fetchVoteStatus();
  };

  const shownCastCount = allRevealed ? roundVotes.length : castCount;
  const shownAliveCount = allRevealed ? alivePlayers.length : aliveCount || alivePlayers.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-4"
    >
      <h3 className="mb-3 text-center font-display text-sm uppercase tracking-widest text-muted-foreground">
        Council Vote
      </h3>

      {nominatedPlayerName && (
        <p className="mb-4 text-center font-body text-foreground">
          Shall <span className="font-semibold text-primary">{nominatedPlayerName}</span> serve as Lord Commander?
        </p>
      )}

      {/* Vote buttons */}
      {!hasSubmittedVote && !allRevealed && (
        <div className="flex justify-center gap-4">
          <Button
            onClick={() => handleVote('ja')}
            disabled={voting}
            className="gold-shimmer h-12 w-24 font-display text-lg tracking-wider text-primary-foreground"
          >
            Ja
          </Button>
          <Button
            onClick={() => handleVote('nein')}
            disabled={voting}
            variant="destructive"
            className="h-12 w-24 font-display text-lg tracking-wider"
          >
            Nein
          </Button>
        </div>
      )}

      {hasSubmittedVote && !allRevealed && (
        <p className="text-center text-sm italic text-muted-foreground">
          Your vote has been cast. Waiting for others...
        </p>
      )}

      {/* Vote progress */}
      <div className="mt-3 text-center text-xs text-muted-foreground">
        {shownCastCount} / {shownAliveCount} votes cast
      </div>

      {/* Revealed votes */}
      <AnimatePresence>
        {allRevealed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 flex flex-wrap justify-center gap-2"
          >
            {roundVotes.map((vote) => {
              const player = players.find(p => p.id === vote.player_id);
              return (
                <motion.div
                  key={vote.id}
                  initial={{ scale: 0, rotateY: 180 }}
                  animate={{ scale: 1, rotateY: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`rounded border px-3 py-1.5 text-xs font-display ${
                    vote.vote === 'ja'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-accent bg-accent/10 text-accent-foreground'
                  }`}
                >
                  {player?.display_name}: {vote.vote === 'ja' ? 'Ja' : 'Nein'}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default VotingPanel;
