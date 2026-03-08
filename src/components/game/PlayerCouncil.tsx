import { Crown, Sword, Wifi, WifiOff, Skull, Swords } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Tables } from '@/integrations/supabase/types';
import { SigilIcon } from './SigilIcons';
import SigilAvatar from './SigilAvatar';
import type { ActiveReaction } from '@/hooks/useGameRoom';

type Player = Tables<'players'>;
type GameState = Tables<'game_state'>;

const REACTIONS = ['👑', '🗡️', '🔥', '🤫', '😅', '🎭'];

interface PlayerCouncilProps {
  players: Player[];
  gameState: GameState | null;
  onlinePlayers: Set<number>;
  onPlayerClick?: (playerId: number) => void;
  selectablePlayerIds?: number[];
  currentPlayerId: number | null;
  activeReactions?: Map<number, ActiveReaction>;
  onSendReaction?: (reaction: string) => void;
}

const PlayerCouncil = ({
  players,
  gameState,
  onlinePlayers,
  onPlayerClick,
  selectablePlayerIds,
  currentPlayerId,
  activeReactions,
  onSendReaction,
}: PlayerCouncilProps) => {
  return (
    <div>
      {/* Mobile: compact 5-col grid | Tablet: 5-col grid | Desktop: flex-wrap */}
      <div className="grid grid-cols-5 gap-1.5 md:gap-2 lg:grid-cols-5 lg:gap-4 lg:justify-items-center">
        {players.map((player, idx) => {
          const isHerald = gameState?.current_herald_id === player.id;
          const isLC = gameState?.current_lord_commander_id === player.id;
          const isOnline = onlinePlayers.has(player.id);
          const isSelectable = selectablePlayerIds?.includes(player.id);
          const isMe = currentPlayerId === player.id;
          const reaction = activeReactions?.get(player.id);
          const playerSigil = player.sigil || 'crown';

          return (
            <div key={player.id} className="relative flex flex-col items-center">
              {/* Floating reaction */}
              {reaction && (
                <div className="pointer-events-none absolute -top-6 lg:-top-8 left-1/2 z-20 -translate-x-1/2 animate-reaction-float">
                  <span className="text-lg lg:text-2xl">{reaction.reaction}</span>
                </div>
              )}

              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                disabled={!isSelectable && !onPlayerClick}
                onClick={() => onPlayerClick?.(player.id)}
                className={`relative flex w-full flex-col items-center gap-0.5 md:gap-1 lg:gap-2 rounded-lg border p-1.5 md:p-2 lg:p-3 transition-all lg:w-28 ${
                  !player.is_alive
                    ? 'border-accent/20 bg-card/40'
                    : isHerald
                    ? 'border-primary bg-primary/5 shadow-[0_0_12px_hsl(var(--primary)/0.2)] herald-glow lg:ring-2 lg:ring-primary lg:ring-offset-1 lg:ring-offset-background'
                    : isLC
                    ? 'border-accent/60 bg-accent/5 shadow-[0_0_12px_hsl(var(--accent)/0.2)] lc-glow'
                    : isSelectable
                    ? 'border-primary/50 bg-card cursor-pointer hover:border-primary hover:bg-primary/10'
                    : 'border-border bg-card'
                } ${isMe && player.is_alive && !isHerald ? 'ring-1 md:ring-2 ring-primary/40 shadow-[0_0_8px_hsl(var(--primary)/0.15)]' : ''}`}
              >
                {/* Online dot */}
                <div className="absolute right-1 top-1 lg:right-1.5 lg:top-1.5">
                  {isOnline ? (
                    <div className="h-1.5 w-1.5 lg:h-2 lg:w-2 rounded-full bg-primary animate-pulse" />
                  ) : (
                    <WifiOff className="h-2 w-2 lg:h-2.5 lg:w-2.5 text-muted-foreground/40" />
                  )}
                </div>

                {/* Role badge */}
                {isHerald && <Crown className="absolute -top-1.5 lg:-top-2 left-1/2 h-3 w-3 lg:h-4 lg:w-4 -translate-x-1/2 text-primary" />}
                {isLC && <Sword className="absolute -top-1.5 lg:-top-2 left-1/2 h-3 w-3 lg:h-4 lg:w-4 -translate-x-1/2 text-accent-foreground" />}

                {/* Avatar — responsive sizes */}
                <div className={`relative flex h-10 w-10 md:h-12 md:w-12 lg:h-16 lg:w-16 items-center justify-center rounded-full border-2 overflow-hidden ${
                  !player.is_alive
                    ? 'border-accent/40 bg-muted'
                    : isHerald
                    ? 'border-primary bg-primary/10'
                    : isLC
                    ? 'border-accent/50 bg-accent/10'
                    : 'border-border bg-muted'
                }`}>
                  <SigilAvatar sigil={playerSigil} displayName={player.display_name} size="h-10 w-10 md:h-12 md:w-12 lg:h-16 lg:w-16" />
                  {!player.is_alive && (
                    <>
                      <div className="execution-overlay absolute inset-0 rounded-full bg-accent/20" />
                      <Swords className="execution-icon absolute h-4 w-4 lg:h-6 lg:w-6 text-accent-foreground drop-shadow-[0_0_4px_hsl(var(--accent)/0.6)]" />
                    </>
                  )}
                </div>

                {/* Name */}
                <div className="flex items-center gap-0.5 lg:gap-1">
                  <SigilIcon sigil={playerSigil} size={10} className="text-muted-foreground/60 flex-shrink-0 hidden lg:block" />
                  <span className="max-w-[48px] md:max-w-[56px] lg:max-w-[60px] truncate text-center font-body text-[9px] md:text-[10px] lg:text-xs text-foreground">
                    {player.display_name}
                  </span>
                </div>

                {isHerald && (
                  <span className="text-[8px] md:text-[9px] lg:text-[10px] uppercase tracking-wider text-primary font-display">Herald</span>
                )}
                {isLC && (
                  <span className="text-[8px] md:text-[9px] lg:text-[10px] uppercase tracking-wider text-accent-foreground font-display">Commander</span>
                )}
              </motion.button>

              {/* Reaction bar — only for current player */}
              {isMe && onSendReaction && (
                <div className="mt-0.5 lg:mt-1 flex gap-0 lg:gap-0.5">
                  {REACTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => onSendReaction(r)}
                      className="flex h-5 w-5 lg:h-6 lg:w-6 items-center justify-center rounded-full text-xs lg:text-sm transition-transform hover:scale-125 hover:bg-muted/60"
                      title={r}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerCouncil;
