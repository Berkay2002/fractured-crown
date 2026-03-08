import { useEffect, useRef } from 'react';
import { animate } from 'framer-motion';
import { DECAY_STAGES } from './decayConfig';

interface GoldTarnishProps {
  decayStage: number;
}

/**
 * Invisible component that smoothly interpolates the --primary CSS variable
 * on :root to tarnish all gold elements as decay progresses.
 *
 * Base gold: hsl(43, 50%, 54%)
 * At stage 6: hsl(18, 0%, 54%) — cold iron grey
 */
const GoldTarnish = ({ decayStage }: GoldTarnishProps) => {
  const prevStage = useRef(decayStage);

  useEffect(() => {
    const root = document.documentElement;
    const cfg = DECAY_STAGES[decayStage] ?? DECAY_STAGES[0];
    const prev = DECAY_STAGES[prevStage.current] ?? DECAY_STAGES[0];

    const baseHue = 43;
    const baseSat = 50;

    const fromHue = baseHue + prev.goldHueShift;
    const toHue = baseHue + cfg.goldHueShift;
    const fromSat = baseSat * prev.goldSaturation;
    const toSat = baseSat * cfg.goldSaturation;

    const ctrl = animate(0, 1, {
      duration: 2,
      ease: [0.25, 1, 0.5, 1],
      onUpdate: (t) => {
        const h = fromHue + (toHue - fromHue) * t;
        const s = fromSat + (toSat - fromSat) * t;
        root.style.setProperty('--primary', `${h} ${s}% 54%`);
        // Also tarnish the ring and gold-glow tokens
        root.style.setProperty('--ring', `${h} ${s}% 54%`);
        root.style.setProperty('--gold', `${h} ${s}% 54%`);
        root.style.setProperty('--gold-glow', `${h} ${Math.min(s + 10, 60)}% 65%`);
      },
    });

    prevStage.current = decayStage;

    return () => ctrl.stop();
  }, [decayStage]);

  // Cleanup: restore original values on unmount
  useEffect(() => {
    return () => {
      const root = document.documentElement;
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--gold');
      root.style.removeProperty('--gold-glow');
    };
  }, []);

  return null;
};

export default GoldTarnish;
