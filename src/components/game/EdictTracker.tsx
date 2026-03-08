import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { powerImageMap } from '@/lib/powerImages';

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
  const img = powerImageMap[power];
  if (!img) return null;
  return <img src={img} alt={power} className="h-3 w-3 object-contain opacity-60" />;
};

const EdictTracker = ({ type, count, playerCount = 5 }: EdictTrackerProps) => {
  const total = type === 'loyalist' ? 5 : type === 'shadow' ? 6 : 3;
  const label = type === 'loyalist' ? 'Loyalist Edicts' : type === 'shadow' ? 'Shadow Edicts' : 'Election Tracker';
  const prevCountRef = useRef(count);
  const animatedSlots = useRef(new Set<number>());
  const [shaking, setShaking] = useState(false);
  const [newlyFilled, setNewlyFilled] = useState<Set<number>>(new Set());

  const powers = type === 'shadow' ? (SHADOW_POWERS[playerCount] || SHADOW_POWERS[5]) : {};

  // Detect new fills
  useEffect(() => {
    const prev = prevCountRef.current;
    if (count > prev) {
      const fresh = new Set<number>();
      for (let i = prev; i < count; i++) {
        if (!animatedSlots.current.has(i)) {
          fresh.add(i);
        }
      }
      if (fresh.size > 0) {
        setNewlyFilled(fresh);
        const timer = setTimeout(() => {
          fresh.forEach(i => animatedSlots.current.add(i));
          setNewlyFilled(new Set());
        }, 1000);
        prevCountRef.current = count;
        return () => clearTimeout(timer);
      }
    }
    prevCountRef.current = count;
  }, [count]);

  // Detect chaos
  useEffect(() => {
    if (type === 'election' && count === 3 && prevCountRef.current <= 3) {
      setShaking(true);
      const timer = setTimeout(() => setShaking(false), 650);
      return () => clearTimeout(timer);
    }
  }, [count, type]);

  return (
    <div className={`flex flex-col gap-2 ${shaking ? 'chaos-shake' : ''}`}>
      <span className="font-display text-[9px] md:text-[10px] lg:text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="flex gap-1 md:gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const filled = i < count;
          const slotIndex = i + 1;
          const power = powers[slotIndex];
          const isNew = newlyFilled.has(i);

          const baseClasses = `relative flex h-7 w-7 md:h-8 md:w-8 lg:h-10 lg:w-10 items-center justify-center rounded border-2 transition-all`;
          const colorClasses = type === 'loyalist'
            ? filled
              ? 'border-primary bg-primary/20 shadow-[0_0_8px_hsl(var(--primary)/0.4)]'
              : 'border-border bg-card'
            : type === 'shadow'
            ? filled
              ? 'border-accent bg-accent/20 shadow-[0_0_8px_hsl(var(--accent)/0.4)]'
              : 'border-border bg-card'
            : filled
            ? 'border-muted-foreground bg-muted-foreground/20'
            : 'border-border bg-card';

          return (
            <motion.div
              key={i}
              initial={isNew ? { opacity: 0, y: -8 } : false}
              animate={
                isNew
                  ? {
                      opacity: 1,
                      y: 0,
                      scale: [1, 1.1, 1],
                      boxShadow:
                        type === 'loyalist'
                          ? [
                              '0 0 0px rgba(201,168,76,0)',
                              '0 0 20px rgba(201,168,76,0.6)',
                              '0 0 0px rgba(201,168,76,0)',
                            ]
                          : type === 'shadow'
                          ? [
                              '0 0 0px rgba(139,26,26,0)',
                              '0 0 20px rgba(139,26,26,0.6)',
                              '0 0 0px rgba(139,26,26,0)',
                            ]
                          : undefined,
                    }
                  : {}
              }
              transition={
                isNew
                  ? {
                      opacity: { duration: 0.3, ease: 'easeOut' },
                      y: { duration: 0.3, ease: 'easeOut' },
                      scale: { delay: 0.3, duration: 0.2, times: [0, 0.5, 1] },
                      boxShadow: { delay: 0.3, duration: 0.6, times: [0, 0.3, 1] },
                    }
                  : undefined
              }
              className={`${baseClasses} ${colorClasses}`}
            >
              {filled && (
                <div className={`h-2.5 w-2.5 md:h-3 md:w-3 lg:h-4 lg:w-4 rounded-full ${
                  type === 'loyalist' ? 'bg-primary edict-fill-loyalist' : type === 'shadow' ? 'bg-accent edict-fill-shadow' : 'bg-muted-foreground'
                }`} />
              )}
              {power && !filled && (
                <span className="text-muted-foreground/60">{powerIcon(power)}</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default EdictTracker;
