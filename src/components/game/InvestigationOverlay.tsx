import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SigilAvatar from './SigilAvatar';

interface InvestigationOverlayProps {
  targetName: string;
  targetSigil: string;
  team: 'loyalist' | 'shadow_court';
  onClose: () => void;
}

const InvestigationOverlay = ({ targetName, targetSigil, team, onClose }: InvestigationOverlayProps) => {
  const [showVerdict, setShowVerdict] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => setShowVerdict(true), 900);
    return () => clearTimeout(timer);
  }, []);

  const isLoyalist = team === 'loyalist';

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
        className="mb-8 font-display text-2xl tracking-wider text-primary sm:text-3xl"
      >
        The Raven's Eye Has Spoken...
      </motion.h2>

      <motion.div
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
        className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-primary/50"
      >
        <SigilAvatar sigil={targetSigil} displayName={targetName} size="h-24 w-24" />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-4 font-display text-xl tracking-wider text-foreground"
      >
        {targetName}
      </motion.p>

      <AnimatePresence>
        {showVerdict && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mt-6 flex flex-col items-center"
          >
            <p
              className={`font-display text-2xl font-bold tracking-wider ${
                isLoyalist ? 'text-primary' : 'text-accent-foreground'
              }`}
              style={{
                textShadow: isLoyalist
                  ? '0 0 30px hsl(var(--primary) / 0.6)'
                  : '0 0 30px hsl(var(--accent) / 0.6)',
              }}
            >
              {isLoyalist ? 'Serves the Crown' : 'Serves the Shadow'}
            </p>

            <p className="mt-6 font-body text-sm italic text-muted-foreground">
              Only you can see this verdict.
            </p>

            <Button
              onClick={onClose}
              variant="outline"
              className="mt-6 border-primary/30 font-display tracking-wider text-primary hover:bg-primary/10"
            >
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default InvestigationOverlay;
