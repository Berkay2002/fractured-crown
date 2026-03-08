import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import type { Tables } from '@/integrations/supabase/types';

type Player = Tables<'players'>;
type Vote = Tables<'votes'>;

interface VotingPanelProps {
  players: Player[];
  votes: Vote[];
  currentRoundId: number | null;
  currentPlayerId: number | null;
  nominatedPlayerName?: string;
}

const VotingPanel = ({
  players,
  votes,
  currentRoundId,
  currentPlayerId,
  nominatedPlayerName,
}: VotingPanelProps) => {
  const [hasVoted, setHasVoted] = useState(false);
  const roundVotes = votes.filter(v => v.round_id === currentRoundId);
  const alivePlayers = players.filter(p => p.is_alive);
  const allRevealed = roundVotes.length > 0 && roundVotes.every(v => v.revealed);

  const handleVote = (choice: 'ja' | 'nein') => {
    console.log('TODO: Phase 3 edge function — cast_vote', {
      round_id: currentRoundId,
      player_id: currentPlayerId,
      vote: choice,
    });
    setHasVoted(true);
  };

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
      {!hasVoted && !allRevealed && (
        <div className="flex justify-center gap-4">
          <Button
            onClick={() => handleVote('ja')}
            className="gold-shimmer h-12 w-24 font-display text-lg tracking-wider text-primary-foreground"
          >
            Ja
          </Button>
          <Button
            onClick={() => handleVote('nein')}
            variant="destructive"
            className="h-12 w-24 font-display text-lg tracking-wider"
          >
            Nein
          </Button>
        </div>
      )}

      {hasVoted && !allRevealed && (
        <p className="text-center text-sm italic text-muted-foreground">
          Your vote has been cast. Waiting for others...
        </p>
      )}

      {/* Vote progress */}
      <div className="mt-3 text-center text-xs text-muted-foreground">
        {roundVotes.length} / {alivePlayers.length} votes cast
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
