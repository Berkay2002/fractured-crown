import { motion } from 'framer-motion';
import edictLoyalist from '@/assets/edict-loyalist.png';
import edictShadow from '@/assets/edict-shadow.png';

interface EdictCardProps {
  type: 'loyalist' | 'shadow';
  state: 'normal' | 'discarded' | 'enacted';
  /** Stagger delay in seconds */
  delay?: number;
  /** Whether to play the flip animation */
  animate?: boolean;
}

const EdictCard = ({ type, state, delay = 0, animate = true }: EdictCardProps) => {
  const isLoyalist = type === 'loyalist';
  const img = isLoyalist ? edictLoyalist : edictShadow;
  const label = isLoyalist ? 'Loyalist Edict' : 'Shadow Edict';

  return (
    <motion.div
      initial={animate ? { rotateY: 180, opacity: 0 } : false}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
      style={{ perspective: 800 }}
      className="relative flex flex-col items-center"
    >
      <div
        className={`relative flex h-28 w-20 flex-col items-center justify-center rounded-md border-2 sm:h-32 sm:w-24 ${
          state === 'enacted'
            ? isLoyalist
              ? 'border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.4)]'
              : 'border-accent bg-accent/10 shadow-[0_0_20px_hsl(var(--accent)/0.4)]'
            : state === 'discarded'
            ? 'border-border/40 bg-card/50 opacity-40'
            : 'border-border bg-card'
        }`}
      >
        <img
          src={img}
          alt={label}
          className={`h-14 w-14 object-contain sm:h-16 sm:w-16 ${state === 'discarded' ? 'grayscale' : ''}`}
        />
        <span
          className={`mt-1 font-display text-[9px] uppercase tracking-wider sm:text-[10px] ${
            isLoyalist ? 'text-primary' : 'text-accent-foreground'
          } ${state === 'discarded' ? 'opacity-50' : ''}`}
        >
          {isLoyalist ? 'Loyalist' : 'Shadow'}
        </span>

        {/* Quill-slash for discarded */}
        {state === 'discarded' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-[120%] w-0.5 rotate-45 bg-accent-foreground/30" />
          </div>
        )}

        {/* Enacted glow pulse */}
        {state === 'enacted' && (
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className={`absolute inset-0 rounded-md ${
              isLoyalist
                ? 'bg-primary/5'
                : 'bg-accent/5'
            }`}
          />
        )}
      </div>
    </motion.div>
  );
};

export default EdictCard;
