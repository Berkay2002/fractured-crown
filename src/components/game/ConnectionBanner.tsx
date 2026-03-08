import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConnectionBannerProps {
  disconnected: boolean;
}

const ConnectionBanner = ({ disconnected }: ConnectionBannerProps) => (
  <AnimatePresence>
    {disconnected && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="flex items-center justify-center gap-2 border-b border-accent/30 bg-accent/10 px-4 py-1.5"
      >
        <WifiOff className="h-3.5 w-3.5 text-accent-foreground" />
        <span className="font-body text-xs text-accent-foreground">
          Connection lost — attempting to reconnect…
        </span>
      </motion.div>
    )}
  </AnimatePresence>
);

export default ConnectionBanner;
