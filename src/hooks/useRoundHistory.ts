import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RoundHistoryEntry {
  round_id: number;
  round_number: number;
  herald_id: number;
  lord_commander_id: number;
  herald_hand: ('loyalist' | 'shadow')[] | null;
  chancellor_hand: ('loyalist' | 'shadow')[] | null;
  enacted_policy: 'loyalist' | 'shadow' | null;
  power_triggered: string | null;
  veto_requested: boolean;
  veto_approved: boolean | null;
  chaos_policy: boolean;
  created_at: string;
}

interface UseRoundHistoryResult {
  rounds: RoundHistoryEntry[];
  isLoading: boolean;
  error: string | null;
}

export function useRoundHistory(roomId: number | null, gameOver: boolean): UseRoundHistoryResult {
  const [rounds, setRounds] = useState<RoundHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId || !gameOver) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    supabase
      .rpc('get_round_history', { _room_id: roomId })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) {
          setError(rpcError.message);
        } else {
          setRounds((data as unknown as RoundHistoryEntry[]) ?? []);
        }
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [roomId, gameOver]);

  return { rounds, isLoading, error };
}
