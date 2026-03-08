import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scroll } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/types';
import roleLoyalist from '@/assets/role-loyalist.png';
import roleTraitor from '@/assets/role-traitor.png';
import roleUsurper from '@/assets/role-usurper.png';

type PlayerRole = Tables<'player_roles'>;
type Player = Tables<'players'>;

interface RoleRevealProps {
  myRole: PlayerRole;
  players: Player[];
  onDismiss: () => void;
}

const roleConfig = {
  loyalist: {
    title: 'Loyalist',
    tagline: 'Serve the Crown',
    icon: Crown,
    borderColor: 'border-primary',
    bgColor: 'bg-primary/10',
    textColor: 'text-primary',
    glowColor: 'shadow-[0_0_40px_hsl(var(--primary)/0.3)]',
  },
  traitor: {
    title: 'Traitor',
    tagline: 'Serve the Shadow',
    icon: Swords,
    borderColor: 'border-accent',
    bgColor: 'bg-accent/10',
    textColor: 'text-accent-foreground',
    glowColor: 'shadow-[0_0_40px_hsl(var(--accent)/0.3)]',
  },
  usurper: {
    title: 'Usurper',
    tagline: 'Seize the Throne',
    icon: Skull,
    borderColor: 'border-purple-600',
    bgColor: 'bg-purple-900/20',
    textColor: 'text-purple-400',
    glowColor: 'shadow-[0_0_40px_rgba(147,51,234,0.3)]',
  },
};

const RoleReveal = ({ myRole, players, onDismiss }: RoleRevealProps) => {
  const [revealed, setRevealed] = useState(false);
  const config = roleConfig[myRole.role];
  const Icon = config.icon;

  const allies = (myRole.revealed_allies as number[]) || [];
  const allyNames = allies
    .map(id => players.find(p => p.id === id)?.display_name)
    .filter(Boolean);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
      >
        {!revealed ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col items-center gap-6"
          >
            <p className="font-display text-lg tracking-widest text-muted-foreground">
              Your fate has been sealed...
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setRevealed(true)}
              className="rounded-lg border-2 border-primary/30 bg-card px-8 py-6 font-display text-primary transition-colors hover:border-primary"
            >
              <div className="card-flip-inner">
                <Scroll className="mx-auto mb-3 h-12 w-12 text-primary/50" />
                <span className="text-sm uppercase tracking-widest">Break the Seal</span>
              </div>
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.5, rotateY: 180, opacity: 0 }}
            animate={{ scale: 1, rotateY: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className={`flex max-w-sm flex-col items-center gap-6 rounded-xl border-2 ${config.borderColor} ${config.bgColor} ${config.glowColor} p-8`}
          >
            <Icon className={`h-16 w-16 ${config.textColor}`} />

            <div className="text-center">
              <h2 className={`font-display text-3xl font-bold tracking-wider ${config.textColor}`}>
                {config.title}
              </h2>
              <p className="mt-2 font-body text-lg italic text-foreground/70">
                "{config.tagline}"
              </p>
            </div>

            {myRole.role === 'traitor' && allyNames.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded border border-accent/30 bg-accent/5 p-4 text-center"
              >
                <p className="mb-2 font-display text-xs uppercase tracking-widest text-muted-foreground">
                  Your Allies in Shadow
                </p>
                {allyNames.map((name, i) => (
                  <p key={i} className="font-body text-sm text-accent-foreground">{name}</p>
                ))}
              </motion.div>
            )}

            {myRole.role === 'usurper' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded border border-purple-600/30 bg-purple-900/10 p-4 text-center"
              >
                <p className="font-body text-xs text-purple-400/80">
                  You know who the traitors are. They do not know you.
                </p>
              </motion.div>
            )}

            <Button
              onClick={onDismiss}
              className="gold-shimmer mt-4 font-display tracking-wider text-primary-foreground"
            >
              I understand my duty
            </Button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default RoleReveal;
