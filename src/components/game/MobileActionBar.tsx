import { Button } from '@/components/ui/button';
import { Scroll } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

type GameState = Tables<'game_state'>;

interface MobileActionBarProps {
  gameState: GameState;
  currentPlayerId: number | null;
  phase: string;
  hasVoted: boolean;
  allVotesRevealed: boolean;
  hasNominatedLC: boolean;
  nominatingLC: boolean;
  onVote: (choice: 'ja' | 'nein') => void;
  onStartNominate: () => void;
  voting: boolean;
  nominating: boolean;
}

const MobileActionBar = ({
  gameState,
  currentPlayerId,
  phase,
  hasVoted,
  allVotesRevealed,
  hasNominatedLC,
  nominatingLC,
  onVote,
  onStartNominate,
  voting,
  nominating,
}: MobileActionBarProps) => {
  const isHerald = gameState.current_herald_id === currentPlayerId;

  if (phase === 'election') {
    if (isHerald && !hasNominatedLC && !nominatingLC) {
      return (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/30 bg-card/95 px-4 py-3 backdrop-blur-sm lg:hidden">
          <Button
            onClick={onStartNominate}
            disabled={nominating}
            className="gold-shimmer w-full font-display tracking-wider text-primary-foreground"
          >
            <Scroll className="mr-2 h-4 w-4" />
            Nominate Lord Commander
          </Button>
        </div>
      );
    }

    if (hasNominatedLC && !hasVoted && !allVotesRevealed) {
      return (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-primary/30 bg-card/95 px-4 py-3 backdrop-blur-sm lg:hidden">
          <div className="flex gap-3">
            <Button
              onClick={() => onVote('ja')}
              disabled={voting}
              className="gold-shimmer flex-1 font-display text-lg tracking-wider text-primary-foreground"
            >
              Ja
            </Button>
            <Button
              onClick={() => onVote('nein')}
              disabled={voting}
              variant="destructive"
              className="flex-1 font-display text-lg tracking-wider"
            >
              Nein
            </Button>
          </div>
        </div>
      );
    }
  }

  return null;
};

export default MobileActionBar;
