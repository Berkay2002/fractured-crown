import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Crown } from 'lucide-react';
import { motion } from 'framer-motion';

const JoinRoom = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleJoin = async () => {
    if (!displayName.trim() || !roomCode || !user) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('join-room', {
        body: {
          room_code: roomCode.toUpperCase(),
          display_name: displayName.trim(),
        },
      });
      if (error || data?.error) {
        toast({
          title: 'Cannot join',
          description: data?.error || error?.message || 'Failed to join room',
          variant: 'destructive',
        });
        return;
      }
      navigate(`/room/${roomCode.toUpperCase()}`);
    } catch (e) {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground font-display text-lg tracking-widest animate-pulse">
          Entering the kingdom...
        </div>
      </div>
    );
  }

  return (
    <div className="noise-overlay relative flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <Crown className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-wider text-primary">
            Join the Council
          </h1>
          <p className="mt-2 font-mono text-2xl tracking-[0.3em] text-primary/80">
            {roomCode?.toUpperCase()}
          </p>
        </div>

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
            onClick={handleJoin}
            disabled={!displayName.trim() || submitting}
            className="gold-shimmer h-12 font-display tracking-wider text-primary-foreground"
          >
            {submitting ? 'Entering...' : 'Enter the Council'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back to home
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default JoinRoom;
