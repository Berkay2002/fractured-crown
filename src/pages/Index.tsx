import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Crown, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';

type Mode = 'landing' | 'create' | 'join';

const Index = () => {
  usePageTitle('Fractured Crown');
  const { user, loading, signInAnonymous } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('landing');
  const [displayName, setDisplayName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  const handleSignIn = async () => {
    setAuthenticating(true);
    try {
      await signInAnonymous();
    } catch {
      toast({ title: 'Error', description: 'Failed to enter. Please try again.', variant: 'destructive' });
    } finally {
      setAuthenticating(false);
    }
  };

  const handleCreate = async () => {
    if (!displayName.trim() || !user) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-room', {
        body: { display_name: displayName.trim() },
      });
      if (error || data?.error) {
        toast({ title: 'Error', description: data?.error || error?.message || 'Failed to create room', variant: 'destructive' });
        return;
      }
      navigate(`/room/${data.room_code}`);
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoin = async () => {
    if (!displayName.trim() || !roomCode.trim() || !user) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('join-room', {
        body: { room_code: roomCode.trim().toUpperCase(), display_name: displayName.trim() },
      });
      if (error || data?.error) {
        toast({ title: 'Error', description: data?.error || error?.message || 'Failed to join room', variant: 'destructive' });
        return;
      }
      navigate(`/room/${roomCode.trim().toUpperCase()}`);
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground font-display text-lg tracking-widest animate-pulse">
          Entering the kingdom...
        </div>
      </div>
    );
  }

  const needsAuth = !user;

  return (
    <div className="noise-overlay relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background">
      <div className="smoke-layer-1 pointer-events-none absolute inset-0 bg-gradient-radial from-smoke/30 via-transparent to-transparent" />
      <div className="smoke-layer-2 pointer-events-none absolute inset-0 bg-gradient-radial from-crimson/10 via-transparent to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center gap-8 px-4"
      >
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <Crown className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h1 className="font-display text-4xl font-bold tracking-wider text-primary sm:text-5xl md:text-6xl">
              Fractured Crown
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-4 max-w-md font-body text-lg italic text-muted-foreground text-center"
          >
            In the kingdom of lies, loyalty is the rarest currency.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="w-full max-w-sm"
        >
          {needsAuth ? (
            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={handleSignIn}
                disabled={authenticating}
                className="gold-shimmer h-14 font-display text-lg tracking-wider text-primary-foreground"
                size="lg"
              >
                <Crown className="mr-2 h-5 w-5" />
                {authenticating ? 'Entering...' : 'Enter the Kingdom'}
              </Button>
            </div>
          ) : (
            <>
              {mode === 'landing' && (
                <div className="flex flex-col gap-4">
                  <Button
                    onClick={() => setMode('create')}
                    className="gold-shimmer h-14 font-display text-lg tracking-wider text-primary-foreground"
                    size="lg"
                  >
                    <Crown className="mr-2 h-5 w-5" />
                    Create Game
                  </Button>
                  <Button
                    onClick={() => setMode('join')}
                    variant="outline"
                    className="h-14 border-primary/30 font-display text-lg tracking-wider text-primary hover:bg-primary/10"
                    size="lg"
                  >
                    <Users className="mr-2 h-5 w-5" />
                    Join Game
                  </Button>
                </div>
              )}

              {mode === 'create' && (
                <div className="flex flex-col gap-4">
                  <Input
                    placeholder="Your name, herald..."
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={30}
                    className="h-12 border-border bg-card font-body text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                    autoFocus
                  />
                  <Button
                    onClick={handleCreate}
                    disabled={!displayName.trim() || submitting}
                    className="gold-shimmer h-12 font-display tracking-wider text-primary-foreground"
                  >
                    {submitting ? 'Forging...' : 'Forge the Council'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setMode('landing')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ← Back
                  </Button>
                </div>
              )}

              {mode === 'join' && (
                <div className="flex flex-col gap-4">
                  <Input
                    placeholder="Your name, herald..."
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={30}
                    className="h-12 border-border bg-card font-body text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                    autoFocus
                  />
                  <Input
                    placeholder="Room code (e.g. KNGHTX)"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="h-12 border-border bg-card font-mono text-center text-xl tracking-[0.3em] text-primary placeholder:text-muted-foreground placeholder:tracking-normal placeholder:text-sm focus-visible:ring-primary"
                  />
                  <Button
                    onClick={handleJoin}
                    disabled={!displayName.trim() || roomCode.trim().length !== 6 || submitting}
                    className="gold-shimmer h-12 font-display tracking-wider text-primary-foreground"
                  >
                    {submitting ? 'Entering...' : 'Enter the Council'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setMode('landing')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ← Back
                  </Button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>

      <footer className="absolute bottom-4 z-10 flex gap-3 font-body text-xs text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        <span>·</span>
        <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
      </footer>
    </div>
  );
};

export default Index;
