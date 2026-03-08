import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Scroll as ScrollIcon, Vote, Skull, Eye, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/types';

type EventLog = Tables<'event_log'>;
type Player = Tables<'players'>;

interface GameReplayProps {
  events: EventLog[];
  players: Player[];
  onClose: () => void;
}

interface RoundGroup {
  roundId: number | null;
  roundNumber: number;
  events: EventLog[];
}

const eventIcon = (eventType: string) => {
  if (eventType.includes('vote')) return Vote;
  if (eventType.includes('policy') || eventType.includes('edict') || eventType.includes('chaos')) return ScrollIcon;
  if (eventType.includes('execution')) return Skull;
  if (eventType.includes('investigation') || eventType.includes('peek')) return Eye;
  if (eventType.includes('election')) return Zap;
  if (eventType.includes('game_over')) return Shield;
  return ScrollIcon;
};

const GameReplay = ({ events, players, onClose }: GameReplayProps) => {
  const [currentIdx, setCurrentIdx] = useState(0);

  // Group events by round_id
  const rounds: RoundGroup[] = [];
  const roundMap = new Map<number | null, EventLog[]>();
  const roundOrder: (number | null)[] = [];

  for (const event of events) {
    const key = event.round_id;
    if (!roundMap.has(key)) {
      roundMap.set(key, []);
      roundOrder.push(key);
    }
    roundMap.get(key)!.push(event);
  }

  roundOrder.forEach((roundId, idx) => {
    rounds.push({
      roundId,
      roundNumber: idx + 1,
      events: roundMap.get(roundId)!,
    });
  });

  if (rounds.length === 0) return null;

  const totalRounds = rounds.length;
  const current = rounds[currentIdx];

  // Extract Herald/LC from event descriptions
  const findPlayerMention = (keyword: string): string | null => {
    for (const e of current.events) {
      const desc = e.description;
      if (desc.toLowerCase().includes(keyword.toLowerCase())) {
        // Try to extract player name from description
        const player = players.find(p => desc.includes(p.display_name));
        if (player) return player.display_name;
      }
    }
    return null;
  };

  const herald = findPlayerMention('herald');
  const commander = findPlayerMention('commander') || findPlayerMention('lord commander');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      {/* Parchment container */}
      <div className="rounded-lg border border-primary/20 bg-[hsl(25,40%,12%)] p-5">
        {/* Round indicator */}
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(i => i - 1)}
            className="h-8 px-2 text-muted-foreground hover:text-primary disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline ml-1 font-display text-xs tracking-wider">Prev</span>
          </Button>

          <div className="text-center">
            <h3 className="font-display text-sm uppercase tracking-[0.2em] text-primary">
              Round {current.roundNumber}
            </h3>
            <p className="font-body text-[10px] text-muted-foreground">
              of {totalRounds}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            disabled={currentIdx === totalRounds - 1}
            onClick={() => setCurrentIdx(i => i + 1)}
            className="h-8 px-2 text-muted-foreground hover:text-primary disabled:opacity-30"
          >
            <span className="hidden sm:inline mr-1 font-display text-xs tracking-wider">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Round officers */}
        {(herald || commander) && (
          <div className="mb-4 flex justify-center gap-6 border-b border-primary/10 pb-3">
            {herald && (
              <div className="text-center">
                <p className="font-display text-[9px] uppercase tracking-widest text-muted-foreground">Herald</p>
                <p className="font-body text-sm text-primary">{herald}</p>
              </div>
            )}
            {commander && (
              <div className="text-center">
                <p className="font-display text-[9px] uppercase tracking-widest text-muted-foreground">Lord Commander</p>
                <p className="font-body text-sm text-accent-foreground">{commander}</p>
              </div>
            )}
          </div>
        )}

        {/* Events for this round */}
        <div className="flex flex-col gap-0">
          {current.events.map((event, idx) => {
            const Icon = eventIcon(event.event_type);
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="flex items-start gap-3 border-b border-primary/5 py-2.5 last:border-0"
              >
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/5">
                  <Icon className="h-3 w-3 text-primary/70" />
                </div>
                <p className="font-body text-xs leading-relaxed text-foreground/80">
                  {event.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Gold separator */}
        <div className="mt-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* Round dots */}
        <div className="mt-3 flex justify-center gap-1.5">
          {rounds.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              className={`h-2 w-2 rounded-full transition-all ${
                idx === currentIdx
                  ? 'bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="font-display text-xs tracking-wider text-muted-foreground hover:text-foreground"
        >
          Close Replay
        </Button>
      </div>
    </motion.div>
  );
};

export default GameReplay;
