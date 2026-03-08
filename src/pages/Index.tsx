import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Crown, Users, BookOpen } from 'lucide-react';
import HowToPlayModal from '@/components/game/HowToPlayModal';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { sigilUrl } from '@/lib/storageUrl';

type Mode = 'landing' | 'create' | 'join';

const EMBERS = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: `${5 + Math.random() * 90}%`,
  duration: `${6 + Math.random() * 6}s`,
  delay: `${Math.random() * 8}s`,
  opacity: 0.3 + Math.random() * 0.3,
}));

const Index = () => {
  usePageTitle('Fractured Crown — Free Online Social Deduction Game');
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

  const isDiscordActivity =
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('discordsays.com') ||
      window.location.hostname.includes('discord.com') ||
      !!window.location.pathname.match(/^\/channels/) ||
      new URLSearchParams(window.location.search).has('frame_id'));

  const discordAltVideoSrc = isDiscordActivity
    ? '/.proxy/storage/storage/v1/object/public/sigils/landing-page-video-desktop.mp4'
    : null;

  const needsAuth = !user;


  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Video background — untouched */}
      <div className="fixed inset-0 w-screen h-screen overflow-hidden z-0 pointer-events-none">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={sigilUrl('landing-start.png')}
          className="w-full h-full object-cover object-center"
        >
          <source
            src={sigilUrl('landing-page-video-desktop.mp4')}
            type="video/mp4"
          />
          {discordAltVideoSrc && <source src={discordAltVideoSrc} type="video/mp4" />}
        </video>
        <div className="absolute inset-0 bg-[#0f0d0b]/70" />
      </div>

      {/* Floating embers */}
      <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
        {EMBERS.map((e) => (
          <span
            key={e.id}
            className="ember"
            style={{
              left: e.left,
              bottom: '-2%',
              animationDuration: e.duration,
              animationDelay: e.delay,
              opacity: e.opacity,
            }}
          />
        ))}
      </div>

      {/* Radial vignette behind content */}
      <div
        className="fixed inset-0 z-[2] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(15,13,11,0.6) 100%)',
        }}
      />

      {/* Center content */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 px-4 max-w-xs w-full">


          {/* Title */}
          <h1
            className="animate-fadeInUp font-display font-bold text-primary text-center text-5xl sm:text-6xl md:text-8xl tracking-[0.15em]"
            style={{
              animationDelay: '150ms',
              textShadow: '0 0 40px rgba(201,168,76,0.4), 0 0 80px rgba(201,168,76,0.15)',
            }}
          >
            Fractured Crown
          </h1>

          {/* Tagline + ornament */}
          <div className="animate-fadeInUp flex flex-col items-center gap-3 w-full" style={{ animationDelay: '300ms' }}>
            <div className="w-32 border-t border-[#c9a84c]/30" />
            <p className="font-body text-xl md:text-2xl italic tracking-widest text-center" style={{ color: '#b8a47a' }}>
              In the kingdom of lies, loyalty is the rarest currency.
            </p>
            <span className="font-body text-sm tracking-widest" style={{ color: 'rgba(201,168,76,0.5)' }}>⸻ ✦ ⸻</span>
          </div>

          {/* Player count descriptor */}
          <p
            className="animate-fadeInUp text-xs tracking-[0.3em] uppercase text-center"
            style={{ animationDelay: '450ms', color: '#8a7a5e' }}
          >
            For 5 to 10 players · Social Deduction · Dark Fantasy
          </p>

          {/* Buttons / Forms */}
          <div className="animate-fadeInUp w-full max-w-xs" style={{ animationDelay: '600ms' }}>
            {needsAuth ? (
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={handleSignIn}
                  disabled={authenticating}
                  className="w-full max-w-xs h-14 rounded-none font-display text-sm tracking-widest uppercase bg-[#c9a84c] text-[#0f0d0b] border-2 border-[#c9a84c] shadow-[inset_0_0_20px_rgba(201,168,76,0.1)] transition-all duration-300 hover:bg-transparent hover:text-[#c9a84c] disabled:opacity-50"
                >
                  {authenticating ? 'Entering...' : 'Enter the Kingdom'}
                </button>
              </div>
            ) : (
              <>
                {mode === 'landing' && (
                  <div className="flex flex-col gap-4">
                    <button
                      onClick={() => setMode('create')}
                      className="w-full max-w-xs h-14 rounded-none font-display text-sm tracking-widest uppercase bg-[#c9a84c] text-[#0f0d0b] border-2 border-[#c9a84c] shadow-[inset_0_0_20px_rgba(201,168,76,0.1)] transition-all duration-300 hover:bg-transparent hover:text-[#c9a84c] flex items-center justify-center gap-2"
                    >
                      <Crown className="h-4 w-4" />
                      Create Game
                    </button>
                    <button
                      onClick={() => setMode('join')}
                      className="w-full max-w-xs h-14 rounded-none font-display text-sm tracking-widest uppercase bg-transparent text-[#c9a84c] border-2 border-[#c9a84c]/50 transition-all duration-300 hover:border-[#c9a84c] hover:bg-[#c9a84c]/10 flex items-center justify-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      Join Game
                    </button>
                  </div>
                )}

                {mode === 'create' && (
                  <div className="flex flex-col gap-4">
                    <Input
                      placeholder="Your name, herald..."
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={30}
                      className="h-12 rounded-none border-[#c9a84c]/30 bg-[#0f0d0b]/60 font-body text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                      autoFocus
                    />
                    <button
                      onClick={handleCreate}
                      disabled={!displayName.trim() || submitting}
                      className="w-full h-14 rounded-none font-display text-sm tracking-widest uppercase bg-[#c9a84c] text-[#0f0d0b] border-2 border-[#c9a84c] shadow-[inset_0_0_20px_rgba(201,168,76,0.1)] transition-all duration-300 hover:bg-transparent hover:text-[#c9a84c] disabled:opacity-50"
                    >
                      {submitting ? 'Forging...' : 'Forge the Council'}
                    </button>
                    <button
                      onClick={() => setMode('landing')}
                      className="font-body text-xs tracking-widest uppercase transition-colors"
                      style={{ color: '#6b5d47' }}
                    >
                      ← Back
                    </button>
                  </div>
                )}

                {mode === 'join' && (
                  <div className="flex flex-col gap-4">
                    <Input
                      placeholder="Your name, herald..."
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={30}
                      className="h-12 rounded-none border-[#c9a84c]/30 bg-[#0f0d0b]/60 font-body text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                      autoFocus
                    />
                    <Input
                      placeholder="Room code (e.g. KNGHTX)"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="h-12 rounded-none border-[#c9a84c]/30 bg-[#0f0d0b]/60 font-mono text-center text-xl tracking-[0.3em] text-primary placeholder:text-muted-foreground placeholder:tracking-normal placeholder:text-sm focus-visible:ring-primary"
                    />
                    <button
                      onClick={handleJoin}
                      disabled={!displayName.trim() || roomCode.trim().length !== 6 || submitting}
                      className="w-full h-14 rounded-none font-display text-sm tracking-widest uppercase bg-[#c9a84c] text-[#0f0d0b] border-2 border-[#c9a84c] shadow-[inset_0_0_20px_rgba(201,168,76,0.1)] transition-all duration-300 hover:bg-transparent hover:text-[#c9a84c] disabled:opacity-50"
                    >
                      {submitting ? 'Entering...' : 'Enter the Council'}
                    </button>
                    <button
                      onClick={() => setMode('landing')}
                      className="font-body text-xs tracking-widest uppercase transition-colors"
                      style={{ color: '#6b5d47' }}
                    >
                      ← Back
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-6 left-0 right-0 z-10 text-center">
        <div className="inline-flex gap-3 text-xs tracking-widest uppercase">
          <Link
            to="/privacy"
            className="transition-colors hover:text-[#c9a84c]/60"
            style={{ color: '#4a3f2e' }}
          >
            Privacy Policy
          </Link>
          <span style={{ color: '#4a3f2e' }}>·</span>
          <Link
            to="/terms"
            className="transition-colors hover:text-[#c9a84c]/60"
            style={{ color: '#4a3f2e' }}
          >
            Terms of Service
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default Index;
