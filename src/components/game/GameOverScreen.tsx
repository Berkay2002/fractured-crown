import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Swords, Skull, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Tables } from '@/integrations/supabase/types';

type GameState = Tables<'game_state'>;
type Player = Tables<'players'>;
type EventLog = Tables<'event_log'>;

interface PlayerRoleReveal {
  player: Player;
  role: 'loyalist' | 'traitor' | 'usurper';
}

interface GameOverScreenProps {
  gameState: GameState;
  players: Player[];
  events: EventLog[];
  roleReveals?: PlayerRoleReveal[];
}

const winMessages: Record<string, { title: string; subtitle: string; color: string }> = {
  loyalists_edicts: {
    title: 'The Crown Endures',
    subtitle: 'Five loyalist edicts have been enacted. Order is restored.',
    color: 'text-primary',
  },
  usurper_executed: {
    title: 'The Usurper Falls',
    subtitle: 'The traitors\' leader has been executed. The crown is safe.',
    color: 'text-primary',
  },
  traitors_edicts: {
    title: 'Shadows Consume the Realm',
    subtitle: 'Six shadow edicts have been enacted. Darkness reigns.',
    color: 'text-accent-foreground',
  },
  usurper_crowned: {
    title: 'The Usurper Seizes the Throne',
    subtitle: 'The usurper was elected Lord Commander. The crown has fallen.',
    color: 'text-purple-400',
  },
};

const roleIcons = {
  loyalist: Crown,
  traitor: Swords,
  usurper: Skull,
};

const roleColors = {
  loyalist: 'border-primary text-primary',
  traitor: 'border-accent text-accent-foreground',
  usurper: 'border-purple-600 text-purple-400',
};

const GameOverScreen = ({ gameState, players, events, roleReveals }: GameOverScreenProps) => {
  const navigate = useNavigate();
  const winCondition = gameState.winner ?? 'loyalists_edicts';
  const msg = winMessages[winCondition] || winMessages.loyalists_edicts;

  // Demo role reveals if not provided
  const reveals: PlayerRoleReveal[] = roleReveals ?? players.map((p, i) => ({
    player: p,
    role: i === 0 ? 'usurper' : i < 3 ? 'traitor' : 'loyalist',
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/98 p-4"
    >
      <div className="flex w-full max-w-2xl flex-col items-center gap-8 py-8">
        {/* Winner Announcement */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center"
        >
          <Shield className={`mx-auto mb-4 h-16 w-16 ${msg.color}`} />
          <h1 className={`font-display text-3xl font-bold tracking-wider ${msg.color} sm:text-4xl`}>
            {msg.title}
          </h1>
          <p className="mt-3 max-w-md font-body text-lg italic text-foreground/70">
            {msg.subtitle}
          </p>
        </motion.div>

        {/* Role Reveals */}
        <div className="w-full">
          <h2 className="mb-4 text-center font-display text-sm uppercase tracking-widest text-muted-foreground">
            True Allegiances Revealed
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {reveals.map(({ player, role }, idx) => {
              const Icon = roleIcons[role];
              return (
                <motion.div
                  key={player.id}
                  initial={{ rotateY: 180, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.3, duration: 0.6 }}
                  className={`card-flip flex flex-col items-center gap-2 rounded-lg border-2 bg-card p-4 ${roleColors[role]}`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="font-display text-sm font-semibold">
                    {player.display_name}
                  </span>
                  <span className="text-xs uppercase tracking-wider opacity-70">
                    {role}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Event Summary */}
        <div className="w-full rounded-lg border border-border bg-card">
          <h3 className="border-b border-border px-4 py-2 font-display text-xs uppercase tracking-widest text-muted-foreground">
            Chronicle Summary
          </h3>
          <ScrollArea className="h-48">
            <div className="flex flex-col gap-1 p-3">
              {events.map((event) => (
                <p key={event.id} className="font-body text-xs text-foreground/70">
                  {event.description}
                </p>
              ))}
              {events.length === 0 && (
                <p className="py-4 text-center text-xs italic text-muted-foreground">
                  No events recorded.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={() => navigate('/')}
            className="gold-shimmer font-display tracking-wider text-primary-foreground"
          >
            Play Again
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="border-border font-display tracking-wider text-muted-foreground hover:text-foreground"
          >
            Leave
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default GameOverScreen;
