import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { CrackIntensity } from './decayConfig';

interface StoneBorderFrameProps {
  intensity: CrackIntensity;
}

/** Crack path sets — each stage adds paths cumulatively */
const CRACK_PATHS: Record<Exclude<CrackIntensity, 'none'>, string[]> = {
  hairline: [
    // Top-left corner hairline
    'M 30,2 L 35,18 L 28,25',
    // Bottom-right subtle
    'M 970,998 L 965,982 L 972,975',
  ],
  moderate: [
    // Top-right branching
    'M 920,3 L 915,22 L 925,35 M 915,22 L 905,30',
    // Left side
    'M 2,300 L 18,295 L 25,310 L 15,320',
    // Bottom-left
    'M 80,998 L 75,980 L 85,970',
  ],
  severe: [
    // All four corners
    'M 50,2 L 60,40 L 45,55',
    'M 950,2 L 940,45 L 955,60',
    'M 2,700 L 20,695 L 30,710 L 18,725',
    'M 998,700 L 980,695 L 970,710',
  ],
  broken: [
    // Larger fractures with gaps
    'M 200,2 L 195,30 L 210,50 L 200,65',
    'M 800,2 L 805,35 L 790,55',
    'M 2,500 L 30,505 L 45,495 L 55,510',
    'M 998,400 L 970,405 L 960,395',
    // Corner chunks — wide cracks
    'M 10,10 L 40,15 L 50,40 L 35,50 L 15,35 Z',
    'M 990,990 L 960,985 L 950,960 L 965,950 L 985,965 Z',
  ],
  shattered: [
    // Dense network
    'M 150,2 L 145,50 L 160,80 L 140,100',
    'M 500,2 L 505,25 L 495,45',
    'M 850,2 L 845,55 L 860,75',
    'M 2,200 L 35,210 L 50,195 L 60,220',
    'M 2,800 L 40,790 L 55,810',
    'M 998,200 L 965,210 L 955,195',
    'M 998,600 L 960,605 L 950,590 L 965,575',
    // Additional chunk-outs
    'M 5,5 L 60,10 L 70,60 L 50,70 L 10,50 Z',
    'M 995,5 L 940,10 L 930,60 L 950,70 L 990,50 Z',
    'M 5,995 L 60,990 L 70,940 L 50,930 L 10,950 Z',
    'M 995,995 L 940,990 L 930,940 L 950,930 L 990,950 Z',
  ],
};

const INTENSITY_ORDER: Exclude<CrackIntensity, 'none'>[] = [
  'hairline', 'moderate', 'severe', 'broken', 'shattered',
];

const StoneBorderFrame = memo(({ intensity }: StoneBorderFrameProps) => {
  if (intensity === 'none') return null;

  const idx = INTENSITY_ORDER.indexOf(intensity);
  const activeLevels = INTENSITY_ORDER.slice(0, idx + 1);

  // Cumulative paths grouped by their level for staggered animation
  const pathGroups = useMemo(() => {
    return activeLevels.map((level) => ({
      level,
      paths: CRACK_PATHS[level],
    }));
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const isChunked = intensity === 'broken' || intensity === 'shattered';

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {pathGroups.map((group) =>
        group.paths.map((d, i) => {
          const isFill = d.endsWith('Z');
          return (
            <motion.path
              key={`${group.level}-${i}`}
              d={d}
              fill={isFill ? 'hsl(var(--foreground) / 0.06)' : 'none'}
              stroke={isFill ? 'none' : 'hsl(var(--foreground) / 0.12)'}
              strokeWidth={
                intensity === 'hairline' ? 0.8
                : intensity === 'moderate' ? 1.2
                : intensity === 'severe' ? 1.5
                : 2
              }
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { duration: 1.2, ease: [0.25, 1, 0.5, 1], delay: i * 0.1 },
                opacity: { duration: 0.3, delay: i * 0.1 },
              }}
            />
          );
        })
      )}

      {/* Missing stone chunks — border segments that fade out */}
      {isChunked && (
        <>
          <motion.rect
            x="0" y="0" width="70" height="4"
            fill="hsl(var(--background))"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          />
          <motion.rect
            x="930" y="996" width="70" height="4"
            fill="hsl(var(--background))"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          />
          {intensity === 'shattered' && (
            <>
              <motion.rect
                x="0" y="0" width="4" height="70"
                fill="hsl(var(--background))"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ duration: 0.8, delay: 0.9 }}
              />
              <motion.rect
                x="996" y="930" width="4" height="70"
                fill="hsl(var(--background))"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.8 }}
                transition={{ duration: 0.8, delay: 1.1 }}
              />
            </>
          )}
        </>
      )}
    </svg>
  );
});

StoneBorderFrame.displayName = 'StoneBorderFrame';

export default StoneBorderFrame;
