import { Crown, Sword, Wifi, WifiOff, Skull } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Tables } from '@/integrations/supabase/types';

type Player = Tables<'players'>;
type GameState = Tables<'game_state'>;

interface PlayerCouncilProps {
  players: Player[];
  gameState: GameState | null;
  onlinePlayers: Set<number>;
  onPlayerClick?: (playerId: number) => void;
  selectablePlayerIds?: number[];
  currentPlayerId: number | null;
}

const PlayerCouncil = ({
  players,
  gameState,
  onlinePlayers,
  onPlayerClick,
  selectablePlayerIds,
  currentPlayerId,
}: PlayerCouncilProps) => {
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {players.map((player, idx) => {
        const isHerald = gameState?.current_herald_id === player.id;
        const isLC = gameState?.current_lord_commander_id === player.id;
        const isOnline = onlinePlayers.has(player.id);
        const isSelectable = selectablePlayerIds?.includes(player.id);
        const isMe = currentPlayerId === player.id;
        const initials = player.display_name
          .split(' ')
          .map(w => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        return (
          <motion.button
            key={player.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            disabled={!isSelectable && !onPlayerClick}
            onClick={() => onPlayerClick?.(player.id)}
            className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-all ${
              !player.is_alive
                ? 'border-border/50 bg-card/30 opacity-50'
                : isHerald
                ? 'border-primary bg-primary/5 shadow-[0_0_12px_hsl(var(--primary)/0.2)] herald-glow'
                : isLC
                ? 'border-muted-foreground bg-muted/50'
                : isSelectable
                ? 'border-primary/50 bg-card cursor-pointer hover:border-primary hover:bg-primary/10'
                : 'border-border bg-card'
            } ${isMe ? 'ring-1 ring-primary/30' : ''}`}
          >
            {/* Online dot */}
            <div className="absolute right-1.5 top-1.5">
              {isOnline ? (
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              ) : (
                <WifiOff className="h-2.5 w-2.5 text-muted-foreground/40" />
              )}
            </div>

            {/* Role badge */}
            {isHerald && <Crown className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 text-primary" />}
            {isLC && <Sword className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 text-muted-foreground" />}

            {/* Avatar */}
            <div className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${
              !player.is_alive
                ? 'border-border bg-muted'
                : isHerald
                ? 'border-primary bg-primary/10'
                : isLC
                ? 'border-muted-foreground bg-muted'
                : 'border-border bg-muted'
            }`}>
              {!player.is_alive ? (
                <Skull className="h-5 w-5 text-muted-foreground/60" />
              ) : (
                <span className={`font-display text-xs font-bold ${
                  isHerald ? 'text-primary' : 'text-foreground'
                }`}>{initials}</span>
              )}
            </div>

            <span className="max-w-[70px] truncate text-center font-body text-xs text-foreground">
              {player.display_name}
            </span>

            {isHerald && (
              <span className="text-[10px] uppercase tracking-wider text-primary font-display">Herald</span>
            )}
            {isLC && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">Commander</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default PlayerCouncil;
