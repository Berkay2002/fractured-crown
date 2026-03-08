import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';

interface TurnTimerProps {
  timerSeconds: number;
  phase: string;
  roundId: number | null;
}

const TurnTimer = ({ timerSeconds, phase, roundId }: TurnTimerProps) => {
  const [remaining, setRemaining] = useState(timerSeconds);
  const startTimeRef = useRef(Date.now());

  // Reset timer on phase or round change
  useEffect(() => {
    startTimeRef.current = Date.now();
    setRemaining(timerSeconds);
  }, [phase, roundId, timerSeconds]);

  // Countdown interval
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const left = Math.max(0, timerSeconds - elapsed);
      setRemaining(left);
      if (left <= 0) clearInterval(interval);
    }, 250);

    return () => clearInterval(interval);
  }, [phase, roundId, timerSeconds]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isUrgent = remaining <= 30 && remaining > 0;
  const isExpired = remaining === 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-sm tracking-wider ${
        isExpired
          ? 'border-accent/30 bg-accent/10 text-accent-foreground'
          : isUrgent
          ? 'border-accent/30 bg-accent/10 text-accent-foreground'
          : 'border-primary/20 bg-primary/5 text-primary'
      }`}
    >
      <motion.div
        animate={isUrgent && !isExpired ? { scale: [1, 1.2, 1] } : {}}
        transition={isUrgent && !isExpired ? { duration: 1, repeat: Infinity } : {}}
      >
        <Timer className="h-3.5 w-3.5" />
      </motion.div>
      {isExpired ? (
        <span className="font-display text-xs uppercase tracking-widest">Time&apos;s Up!</span>
      ) : (
        <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
      )}
    </motion.div>
  );
};

export default TurnTimer;
