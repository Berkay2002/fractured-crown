import { bgUrl, BACKGROUNDS } from '@/lib/backgroundImage';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Swords, Scroll as ScrollIcon, Vote, Eye, Zap, BookOpen } from 'lucide-react';
import roleLoyalistImg from '@/assets/role-loyalist.png';
import roleTraitorImg from '@/assets/role-traitor.png';
import roleUsurperImg from '@/assets/role-usurper.png';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSoundContext } from '@/contexts/SoundContext';
import type { Tables } from '@/integrations/supabase/types';
import GameReplay from './GameReplay';
import SigilAvatar from './SigilAvatar';

type GameState = Tables<'game_state'>;
type Player = Tables<'players'>;
type EventLog = Tables<'event_log'>;
type PlayerRole = Tables<'player_roles'>;

interface PlayerRoleReveal {
  player: Player;
  role: 'loyalist' | 'traitor' | 'usurper';
}

interface GameOverScreenProps {
  gameState: GameState;
  players: Player[];
  events: EventLog[];
  allRoles: PlayerRole[];
  isHost: boolean;
  room: { id: number; room_code: string };
}

const winMessages: Record<string, { title: string; subtitle: string; color: string; isWin: boolean }> = {
  loyalists_edicts: {
    title: 'The Crown Endures',
    subtitle: 'Five loyalist edicts have been enacted. Order is restored.',
    color: 'text-primary',
    isWin: true,
  },
  usurper_executed: {
    title: 'The Usurper Falls',
    subtitle: 'The traitors\' leader has been executed. The crown is safe.',
    color: 'text-primary',
    isWin: true,
  },
  traitors_edicts: {
    title: 'Shadows Consume the Realm',
    subtitle: 'Six shadow edicts have been enacted. Darkness reigns.',
    color: 'text-accent-foreground',
    isWin: false,
  },
  usurper_crowned: {
    title: 'The Usurper Seizes the Throne',
    subtitle: 'The usurper was elected Lord Commander. The crown has fallen.',
    color: 'text-purple-400',
    isWin: false,
  },
};

const roleIcons = {
  loyalist: Crown,
  traitor: Swords,
  usurper: Skull,
};

const roleColors = {
  loyalist: 'border-primary text-primary',
  traitor: 'border-accent text-accent-foreground',
  usurper: 'border-purple-600 text-purple-400',
};

const CHRONICLE_EVENT_TYPES = new Set([
  'vote_passed',
  'vote_failed',
  'policy_enacted',
  'executive_power',
  'execution',
  'veto_approved',
  'veto_rejected',
  'chaos_policy',
  'game_over',
  'investigation',
  'special_election',
  'policy_peek',
]);

const eventIcon = (eventType: string) => {
  if (eventType.includes('vote')) return Vote;
  if (eventType.includes('policy') || eventType.includes('edict') || eventType.includes('chaos')) return ScrollIcon;
  if (eventType.includes('execution')) return Skull;
  if (eventType.includes('investigation') || eventType.includes('peek')) return Eye;
  if (eventType.includes('election')) return Zap;
  if (eventType.includes('game_over')) return Shield;
  return ScrollIcon;
};

interface VoteStats {
  player: Player;
  ja: number;
  nein: number;
}

const GameOverScreen = ({ gameState, players, events, allRoles, isHost, room }: GameOverScreenProps) => {
  const navigate = useNavigate();
  const [resetting, setResetting] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const sound = useSoundContext();
  const winCondition = gameState.winner ?? 'loyalists_edicts';
  const msg = winMessages[winCondition] || winMessages.loyalists_edicts;
  const isLoyalistWin = winCondition === 'loyalists_edicts' || winCondition === 'usurper_executed';
  const endBgUrl = isLoyalistWin ? bgUrl(BACKGROUNDS.loyalistWin) : bgUrl(BACKGROUNDS.traitorWin);

  // Council Ledger stats
  const [voteStats, setVoteStats] = useState<VoteStats[]>([]);
  const [roundCount, setRoundCount] = useState(0);
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    if (msg.isWin) {
      sound.playGameOverWin();
    } else {
      sound.playGameOverLoss();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      const [votesRes, roundsRes] = await Promise.all([
        supabase
          .from('votes')
          .select('player_id, vote')
          .eq('room_id', room.id)
          .eq('revealed', true),
        supabase
          .from('rounds')
          .select('id')
          .eq('room_id', room.id),
      ]);

      if (votesRes.data) {
        const map = new Map<number, { ja: number; nein: number }>();
        for (const v of votesRes.data) {
          const entry = map.get(v.player_id) || { ja: 0, nein: 0 };
          if (v.vote === 'ja') entry.ja++;
          else entry.nein++;
          map.set(v.player_id, entry);
        }
        const stats: VoteStats[] = players
          .map(p => ({
            player: p,
            ja: map.get(p.id)?.ja ?? 0,
            nein: map.get(p.id)?.nein ?? 0,
          }))
          .sort((a, b) => (b.ja + b.nein) - (a.ja + a.nein));
        setVoteStats(stats);
      }

      setRoundCount(roundsRes.data?.length ?? 0);
      setStatsLoaded(true);
    };
    fetchStats();
  }, [room.id, players]);

  const reveals: PlayerRoleReveal[] = allRoles.length > 0
    ? allRoles.map(r => ({
        player: players.find(p => p.id === r.player_id)!,
        role: r.role as 'loyalist' | 'traitor' | 'usurper',
      })).filter(r => r.player)
    : players.map((p, i) => ({
        player: p,
        role: (i === 0 ? 'usurper' : i < 3 ? 'traitor' : 'loyalist') as 'loyalist' | 'traitor' | 'usurper',
      }));

  const chronicleEvents = events.filter(e =>
    CHRONICLE_EVENT_TYPES.has(e.event_type) ||
    e.description.toLowerCase().includes('edict') ||
    e.description.toLowerCase().includes('vote') ||
    e.description.toLowerCase().includes('executed') ||
    e.description.toLowerCase().includes('power') ||
    e.description.toLowerCase().includes('veto') ||
    e.description.toLowerCase().includes('chaos')
  );

  // Find "Most Deceptive" — player who voted nein the most
  const mostDeceptive = voteStats.length > 0
    ? voteStats.reduce((max, s) => s.nein > max.nein ? s : max, voteStats[0])
    : null;

  const handlePlayAgain = async () => {
    setResetting(true);
    const { data, error } = await supabase.functions.invoke('reset-room', {
      body: { room_id: gameState.room_id },
    });
    setResetting(false);
    if (error || data?.error) {
      toast({ title: 'Error', description: data?.error || error?.message, variant: 'destructive' });
      return;
    }
    if (data?.room_code) {
      navigate(`/room/${data.room_code}`);
    }
  };

  const animDelay = reveals.length * 0.3 + 0.5;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
    >
      <div className="fixed inset-0 w-screen h-screen overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
        <img src={endBgUrl} alt="" className="w-full h-full object-cover object-center" aria-hidden="true" />
        <div className={`absolute inset-0 ${isLoyalistWin ? 'bg-[#0f0d0b]/60' : 'bg-[#0f0d0b]/80'}`} />
      </div>
      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-8 py-8">
        {/* Winner Announcement */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center"
        >
          <Shield className={`mx-auto mb-4 h-16 w-16 ${msg.color}`} />
          <h1 className={`font-display text-3xl font-bold tracking-wider ${msg.color} sm:text-4xl`}>
            {msg.title}
          </h1>
          <p className="mt-3 max-w-md font-body text-lg italic text-foreground/70">
            {msg.subtitle}
          </p>
        </motion.div>

        {/* Rematch */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col items-center gap-3"
        >
          {isHost ? (
            <Button
              onClick={handlePlayAgain}
              disabled={resetting}
              className="h-12 bg-primary px-8 font-display text-lg tracking-wider text-primary-foreground hover:bg-primary/90"
            >
              {resetting ? 'Resetting...' : 'Play Again'}
            </Button>
          ) : (
            <p className="font-body text-sm italic text-muted-foreground">
              Waiting for host to start a new game...
            </p>
          )}
        </motion.div>

        {/* Role Reveals */}
        <div className="w-full">
          <h2 className="mb-4 text-center font-display text-sm uppercase tracking-widest text-muted-foreground">
            True Allegiances Revealed
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {reveals.map(({ player, role }, idx) => {
              const Icon = roleIcons[role];
              const isUsurper = role === 'usurper';
              return (
                <motion.div
                  key={player.id}
                  initial={{ rotateY: 180, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.3, duration: 0.6 }}
                  className={`card-flip flex flex-col items-center gap-2 rounded-lg border-2 bg-card p-4 ${roleColors[role]} ${
                    isUsurper ? 'shadow-[0_0_16px_rgba(147,51,234,0.3)]' : ''
                  }`}
                >
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-current overflow-hidden">
                    <SigilAvatar sigil={player.sigil ?? 'crown'} displayName={player.display_name} size="h-12 w-12" />
                    <Icon className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-card p-0.5" />
                  </div>
                  <span className="font-display text-sm font-semibold">
                    {player.display_name}
                  </span>
                  <span className="text-xs uppercase tracking-wider opacity-70">
                    {role}
                  </span>
                  {isUsurper && (
                    <span className="mt-1 rounded border border-purple-600/30 bg-purple-900/20 px-2 py-0.5 text-[9px] uppercase tracking-widest text-purple-400">
                      The Shadow King
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Chronicle of the Council */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: animDelay }}
          className="w-full"
        >
          <h2 className="mb-4 text-center font-display text-sm uppercase tracking-widest text-muted-foreground">
            Chronicle of the Council
          </h2>
          <div className="rounded-lg border border-primary/20 bg-card">
            <ScrollArea className="h-56">
              <div className="flex flex-col gap-0 p-2">
                {chronicleEvents.length > 0 ? (
                  chronicleEvents.map((event, idx) => {
                    const Icon = eventIcon(event.event_type);
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: animDelay + 0.1 + idx * 0.05 }}
                        className="flex items-start gap-2.5 border-b border-border/30 px-3 py-2 last:border-0"
                      >
                        <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                          <Icon className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <p className="font-body text-xs leading-relaxed text-foreground/70">
                          {event.description}
                        </p>
                      </motion.div>
                    );
                  })
                ) : (
                  events.map((event, idx) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: animDelay + 0.1 + idx * 0.05 }}
                      className="flex items-start gap-2.5 border-b border-border/30 px-3 py-2 last:border-0"
                    >
                      <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                        <ScrollIcon className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <p className="font-body text-xs leading-relaxed text-foreground/70">
                        {event.description}
                      </p>
                    </motion.div>
                  ))
                )}
                {events.length === 0 && (
                  <p className="py-4 text-center text-xs italic text-muted-foreground">
                    No events recorded.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {events.length > 0 && !showReplay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: animDelay + 0.5 }}
              className="mt-4 flex justify-center"
            >
              <Button
                variant="outline"
                onClick={() => setShowReplay(true)}
                className="border-primary/30 font-display text-xs tracking-wider text-primary hover:bg-primary/10"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Replay the Chronicle
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Game Replay */}
        {showReplay && (
          <GameReplay
            events={chronicleEvents.length > 0 ? chronicleEvents : events}
            players={players}
            onClose={() => setShowReplay(false)}
          />
        )}

        {/* Council Ledger — Stats */}
        {statsLoaded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: animDelay + 0.8 }}
            className="w-full"
          >
            <h2 className="mb-4 flex items-center justify-center gap-2 text-center font-display text-sm uppercase tracking-widest text-muted-foreground">
              <ScrollIcon className="h-4 w-4" />
              Council Ledger
            </h2>

            <div className="space-y-4">
              {/* Game Summary */}
              <div className="rounded-lg border border-primary/20 bg-card p-4">
                <div className="flex flex-wrap justify-center gap-6 font-body text-sm text-foreground/80">
                  <div className="text-center">
                    <p className="font-display text-2xl text-primary">{roundCount}</p>
                    <p className="text-xs text-muted-foreground">Rounds Played</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-2xl text-primary">{gameState.loyalist_edicts_passed}</p>
                    <p className="text-xs text-muted-foreground">Loyalist Edicts</p>
                  </div>
                  <div className="text-center">
                    <p className="font-display text-2xl text-accent-foreground">{gameState.shadow_edicts_passed}</p>
                    <p className="text-xs text-muted-foreground">Shadow Edicts</p>
                  </div>
                </div>
              </div>

              {/* Voting Record */}
              {voteStats.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-card p-4">
                  <h3 className="mb-3 font-display text-xs uppercase tracking-widest text-muted-foreground">
                    Voting Record
                  </h3>
                  <div className="space-y-2">
                    {voteStats.map((stat, idx) => {
                      const total = stat.ja + stat.nein;
                      const isMostDeceptive = mostDeceptive && stat.player.id === mostDeceptive.player.id && mostDeceptive.nein > 0;
                      return (
                        <motion.div
                          key={stat.player.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: animDelay + 1 + idx * 0.1 }}
                          className="flex items-center gap-3"
                        >
                          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-border">
                            <SigilAvatar sigil={stat.player.sigil ?? 'crown'} displayName={stat.player.display_name} size="h-7 w-7" />
                          </div>
                          <span className="min-w-[80px] truncate font-body text-xs text-foreground/80">
                            {stat.player.display_name}
                          </span>
                          <div className="flex flex-1 items-center gap-2">
                            <span className="text-xs text-primary">✓{stat.ja}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              {total > 0 && (
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${(stat.ja / total) * 100}%` }}
                                />
                              )}
                            </div>
                            <span className="text-xs text-accent-foreground">✗{stat.nein}</span>
                          </div>
                          {isMostDeceptive && (
                            <span className="whitespace-nowrap rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-accent-foreground">
                              Most Deceptive
                            </span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase
                  .from('players')
                  .delete()
                  .eq('room_id', gameState.room_id)
                  .eq('user_id', user.id);
              }
              navigate('/');
            }}
            className="border-border font-display tracking-wider text-muted-foreground hover:text-foreground"
          >
            Leave
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default GameOverScreen;
