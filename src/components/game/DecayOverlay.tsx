import { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DECAY_STAGES } from './decayConfig';
import StoneBorderFrame from './StoneBorderFrame';

interface DecayOverlayProps {
  decayStage: number;
}

/** CSS-only ash particle with randomised position/delay */
const AshParticle = memo(({ index, rising }: { index: number; rising?: boolean }) => {
  const style = useMemo(() => {
    const left = ((index * 37 + 13) % 100);
    const delay = ((index * 53 + 7) % 8);
    const duration = 6 + (index % 5) * 2;
    const size = 1.5 + (index % 3);
    return {
      left: `${left}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      width: `${size}px`,
      height: `${size}px`,
    };
  }, [index]);

  return (
    <div
      className={`absolute rounded-full bg-foreground/20 ${rising ? 'decay-ember-rise' : 'decay-ash-fall'}`}
      style={style}
    />
  );
});
AshParticle.displayName = 'AshParticle';

const DecayOverlay = memo(({ decayStage }: DecayOverlayProps) => {
  const cfg = DECAY_STAGES[decayStage] ?? DECAY_STAGES[0];

  if (decayStage === 0) return null;

  const isStage6 = decayStage >= 6;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 5 }}
      aria-hidden="true"
    >
      {/* Layer 1: Ambient glow from below */}
      {cfg.ambientGlow !== 'none' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: cfg.ambientGlow === 'ember' ? 0.08
              : cfg.ambientGlow === 'fire' ? 0.15
              : 0.25, // inferno
          }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 80% 40% at 50% 100%, hsl(var(--accent)) 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Layer 2: Additional background darkening */}
      {cfg.backgroundDarken > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: cfg.backgroundDarken }}
          transition={{ duration: 2 }}
          className="absolute inset-0 bg-background"
        />
      )}

      {/* Layer 3: Ash / ember particles */}
      <AnimatePresence>
        {cfg.ashParticleCount > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            {Array.from({ length: cfg.ashParticleCount }, (_, i) => (
              <AshParticle key={i} index={i} rising={decayStage >= 5} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layer 4: Deepening vignette */}
      {cfg.vignetteIntensity > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: cfg.vignetteIntensity }}
          transition={{ duration: 2 }}
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 55% 55% at 50% 50%, transparent 0%, hsl(var(--background)) 100%)`,
          }}
        />
      )}

      {/* Layer 5: Crimson corner bleed */}
      {cfg.crimsonBleed > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: cfg.crimsonBleed }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <div className="absolute top-0 left-0 h-1/3 w-1/3" style={{ background: 'radial-gradient(ellipse at 0% 0%, hsl(var(--accent) / 0.4) 0%, transparent 70%)' }} />
          <div className="absolute top-0 right-0 h-1/3 w-1/3" style={{ background: 'radial-gradient(ellipse at 100% 0%, hsl(var(--accent) / 0.4) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 left-0 h-1/3 w-1/3" style={{ background: 'radial-gradient(ellipse at 0% 100%, hsl(var(--accent) / 0.4) 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 right-0 h-1/3 w-1/3" style={{ background: 'radial-gradient(ellipse at 100% 100%, hsl(var(--accent) / 0.4) 0%, transparent 70%)' }} />
        </motion.div>
      )}

      {/* Layer 6: "SHADOW REIGNS" watermark */}
      {cfg.watermarkOpacity > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: cfg.watermarkOpacity }}
          transition={{ duration: 2, delay: 0.5 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span
            className="select-none whitespace-nowrap font-display text-4xl uppercase tracking-[0.3em] text-accent-foreground sm:text-6xl lg:text-7xl"
            style={{ transform: 'rotate(-25deg)' }}
          >
            Shadow Reigns
          </span>
        </motion.div>
      )}

      {/* Layer 7: Stone border cracks */}
      <StoneBorderFrame intensity={cfg.borderCrackIntensity} />

      {/* Stage 6: dramatic screen-shake */}
      {isStage6 && (
        <motion.div
          initial={{ x: 0, y: 0 }}
          animate={{
            x: [0, -4, 4, -3, 3, -1, 0],
            y: [0, 2, -2, 1, -1, 0],
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute inset-0 bg-accent/10"
        />
      )}

      {/* Stage transition pulse — crimson edge flash */}
      <motion.div
        key={decayStage}
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 border-4 border-accent/60 rounded-sm"
      />
    </div>
  );
});

DecayOverlay.displayName = 'DecayOverlay';

export default DecayOverlay;
