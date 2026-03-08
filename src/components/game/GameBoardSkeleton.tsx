import { motion } from 'framer-motion';

const GameBoardSkeleton = () => {
  const pulseClass = 'animate-pulse rounded bg-muted/60';

  return (
    <div className="noise-overlay flex min-h-screen flex-col bg-background">
      {/* Top Bar skeleton */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`h-5 w-5 rounded ${pulseClass}`} />
          <div className={`h-4 w-20 ${pulseClass}`} />
        </div>
        <div className="flex items-center gap-3">
          <div className={`h-4 w-16 ${pulseClass}`} />
          <div className={`h-5 w-24 rounded ${pulseClass}`} />
          <div className={`h-5 w-20 rounded ${pulseClass}`} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 p-4 lg:flex-row">
        <div className="flex flex-1 flex-col gap-6">
          {/* Edict Trackers skeleton */}
          <div className="flex flex-wrap gap-6">
            {[5, 6, 3].map((count, ti) => (
              <div key={ti} className="flex flex-col gap-2">
                <div className={`h-3 w-24 ${pulseClass}`} />
                <div className="flex gap-1.5">
                  {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className={`h-10 w-10 rounded border-2 border-border ${pulseClass}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Player Council skeleton */}
          <div>
            <div className={`mb-3 h-3 w-20 ${pulseClass}`} />
            <div className="flex flex-wrap justify-center gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3"
                >
                  <div className={`h-11 w-11 rounded-full ${pulseClass}`} />
                  <div className={`h-3 w-14 ${pulseClass}`} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Action panel skeleton */}
          <div className="mt-2">
            <div className={`mx-auto h-12 w-64 rounded-lg ${pulseClass}`} />
          </div>
        </div>

        {/* Right Sidebar skeleton */}
        <div className="flex w-full flex-col gap-4 lg:w-72">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className={`mb-3 h-3 w-16 ${pulseClass}`} />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`mb-2 h-3 w-full ${pulseClass}`} />
            ))}
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className={`mb-3 h-3 w-12 ${pulseClass}`} />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`mb-2 h-3 w-3/4 ${pulseClass}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoardSkeleton;
