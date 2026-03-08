import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Skull, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PolicyCard = 'loyalist' | 'shadow';

interface PolicyPeekOverlayProps {
  cards: PolicyCard[];
  onClose: () => void;
}

const PolicyPeekOverlay = ({ cards, onClose }: PolicyPeekOverlayProps) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[hsl(var(--background))]/90 backdrop-blur-sm"
    >
      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="mb-2 font-display text-2xl tracking-wider text-primary sm:text-3xl"
      >
        The Raven's Eye Reveals...
      </motion.h2>

      <div className="mt-8 flex gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ rotateY: 180, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.4, duration: 0.6, ease: 'easeOut' }}
            className={`card-flip flex h-44 w-28 flex-col items-center justify-center gap-3 rounded-lg border-2 sm:h-52 sm:w-32 ${
              card === 'loyalist'
                ? 'border-primary bg-primary/10 shadow-[0_0_24px_hsl(var(--primary)/0.35)]'
                : 'border-accent bg-accent/10 shadow-[0_0_24px_hsl(var(--accent)/0.35)]'
            }`}
          >
            {card === 'loyalist' ? (
              <Shield className="h-10 w-10 text-primary" />
            ) : (
              <Skull className="h-10 w-10 text-accent-foreground" />
            )}
            <div className="text-center">
              <p className={`font-display text-[10px] uppercase tracking-widest ${
                card === 'loyalist' ? 'text-primary' : 'text-accent-foreground'
              }`}>
                Royal Edict
              </p>
              <p className={`font-display text-xs font-semibold ${
                card === 'loyalist' ? 'text-primary' : 'text-accent-foreground'
              }`}>
                {card === 'loyalist' ? 'Loyalist' : 'Shadow'}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 + cards.length * 0.4 + 0.3 }}
        className="mt-8 max-w-sm text-center font-body text-sm italic text-muted-foreground"
      >
        These are the next three edicts in the deck. Only you can see this.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 + cards.length * 0.4 + 0.6 }}
      >
        <Button
          onClick={onClose}
          variant="outline"
          className="mt-6 border-primary/30 font-display tracking-wider text-primary hover:bg-primary/10"
        >
          <X className="mr-2 h-4 w-4" />
          Close
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default PolicyPeekOverlay;
