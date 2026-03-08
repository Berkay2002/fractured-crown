import { useState, useEffect, useRef } from 'react';
import { Eye, Search, Vote, Skull } from 'lucide-react';

interface EdictTrackerProps {
  type: 'loyalist' | 'shadow' | 'election';
  count: number;
  playerCount?: number;
}

const SHADOW_POWERS: Record<number, Record<number, string>> = {
  5: { 3: 'peek', 4: 'execution', 5: 'execution' },
  6: { 3: 'peek', 4: 'execution', 5: 'execution' },
  7: { 2: 'investigate', 3: 'election', 4: 'execution', 5: 'execution' },
  8: { 2: 'investigate', 3: 'election', 4: 'execution', 5: 'execution' },
  9: { 1: 'investigate', 2: 'investigate', 3: 'election', 4: 'execution', 5: 'execution' },
  10: { 1: 'investigate', 2: 'investigate', 3: 'election', 4: 'execution', 5: 'execution' },
};

const powerIcon = (power: string) => {
  switch (power) {
    case 'peek': return <Eye className="h-3 w-3" />;
    case 'investigate': return <Search className="h-3 w-3" />;
    case 'election': return <Vote className="h-3 w-3" />;
    case 'execution': return <Skull className="h-3 w-3" />;
    default: return null;
  }
};

const EdictTracker = ({ type, count, playerCount = 5 }: EdictTrackerProps) => {
  const total = type === 'loyalist' ? 5 : type === 'shadow' ? 6 : 3;
  const label = type === 'loyalist' ? 'Loyalist Edicts' : type === 'shadow' ? 'Shadow Edicts' : 'Election Tracker';
  const prevCountRef = useRef(count);
  const [shaking, setShaking] = useState(false);

  const powers = type === 'shadow' ? (SHADOW_POWERS[playerCount] || SHADOW_POWERS[5]) : {};

  // Detect chaos: election tracker hits 3
  useEffect(() => {
    if (type === 'election' && count === 3 && prevCountRef.current < 3) {
      setShaking(true);
      const timer = setTimeout(() => setShaking(false), 650);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = count;
  }, [count, type]);

  return (
    <div className={`flex flex-col gap-2 ${shaking ? 'chaos-shake' : ''}`}>
      <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const filled = i < count;
          const slotIndex = i + 1;
          const power = powers[slotIndex];

          return (
            <div
              key={i}
              className={`relative flex h-10 w-10 items-center justify-center rounded border-2 transition-all ${
                type === 'loyalist'
                  ? filled
                    ? 'border-primary bg-primary/20 shadow-[0_0_8px_hsl(var(--primary)/0.4)]'
                    : 'border-border bg-card'
                  : type === 'shadow'
                  ? filled
                    ? 'border-accent bg-accent/20 shadow-[0_0_8px_hsl(var(--accent)/0.4)]'
                    : 'border-border bg-card'
                  : filled
                  ? 'border-muted-foreground bg-muted-foreground/20'
                  : 'border-border bg-card'
              }`}
            >
              {filled && (
                <div className={`h-4 w-4 rounded-full ${
                  type === 'loyalist' ? 'bg-primary edict-fill-loyalist' : type === 'shadow' ? 'bg-accent edict-fill-shadow' : 'bg-muted-foreground'
                }`} />
              )}
              {power && !filled && (
                <span className="text-muted-foreground/60">{powerIcon(power)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EdictTracker;
