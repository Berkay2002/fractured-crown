import { motion } from 'framer-motion';
import { Scroll } from 'lucide-react';
import edictLoyalist from '@/assets/edict-loyalist.png';
import edictShadow from '@/assets/edict-shadow.png';

export type PolicyCard = 'loyalist' | 'shadow';

interface PolicyCardUIProps {
  type: PolicyCard;
  faceUp: boolean;
  onClick?: () => void;
  disabled?: boolean;
  keyHint?: string;
}

const PolicyCardUI = ({ type, faceUp, onClick, disabled, keyHint }: PolicyCardUIProps) => (
  <div className="flex flex-col items-center gap-1">
    <motion.button
      whileHover={!disabled ? { scale: 1.08, y: -4 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`card-flip relative flex h-40 w-28 flex-col items-center justify-center rounded-lg border-2 transition-all duration-200 ${
        !faceUp
          ? 'border-border bg-card cursor-pointer hover:border-primary/50 hover:shadow-[0_0_20px_hsl(var(--primary)/0.25)]'
          : type === 'loyalist'
          ? 'border-primary bg-primary/10 shadow-[0_0_16px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_24px_hsl(var(--primary)/0.5)]'
          : 'border-accent bg-accent/10 shadow-[0_0_16px_hsl(var(--accent)/0.3)] hover:shadow-[0_0_24px_hsl(var(--accent)/0.5)]'
      }`}
    >
      {faceUp ? (
        <motion.div
          initial={{ rotateY: 90 }}
          animate={{ rotateY: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-2"
        >
          <img
            src={type === 'loyalist' ? edictLoyalist : edictShadow}
            alt={type === 'loyalist' ? 'Loyalist Edict' : 'Shadow Edict'}
            className="h-24 w-24 object-contain"
          />
          <span className={`font-display text-xs uppercase tracking-wider ${
            type === 'loyalist' ? 'text-primary' : 'text-accent-foreground'
          }`}>
            {type === 'loyalist' ? 'Loyalist' : 'Shadow'}
          </span>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Scroll className="h-10 w-10 text-muted-foreground/40" />
          <span className="font-display text-[10px] uppercase tracking-wider text-muted-foreground/40">
            Edict
          </span>
        </div>
      )}
    </motion.button>
    {keyHint && !disabled && (
      <span className="font-mono text-[10px] text-muted-foreground/50">({keyHint})</span>
    )}
  </div>
);

export default PolicyCardUI;
