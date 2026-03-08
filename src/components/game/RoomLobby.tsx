import { Button } from '@/components/ui/button';
import { Crown, Copy, Link, Users, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import HowToPlayModal from './HowToPlayModal';

interface Player {
  id: number;
  user_id: string;
  display_name: string;
  seat_order: number;
  joined_at: string;
}

interface Room {
  id: number;
  room_code: string;
  host_player_id: number | null;
  status: string;
  player_count: number;
}

interface RoomLobbyProps {
  room: Room;
  players: Player[];
  currentPlayerId: number | null;
  onlinePlayers: Set<number>;
}

const RoomLobby = ({ room, players, currentPlayerId, onlinePlayers }: RoomLobbyProps) => {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [transferringTo, setTransferringTo] = useState<number | null>(null);
  const [confirmingTransfer, setConfirmingTransfer] = useState<number | null>(null);
  const isHost = currentPlayerId && room.host_player_id === currentPlayerId;
  const canStart = isHost && players.length >= 5 && players.length <= 10;
  const showTransferUI = isHost && players.length > 1;

  const copyCode = () => {
    navigator.clipboard.writeText(room.room_code);
    toast({ title: 'Copied!', description: 'Room code copied to clipboard' });
  };

  const copyLink = () => {
    const url = `${window.location.origin}/join/${room.room_code}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied!', description: 'Invite link copied to clipboard' });
  };

  const handleStartGame = async () => {
    setStarting(true);
    const { data, error } = await supabase.functions.invoke('start-game', {
      body: { room_id: room.id },
    });
    setStarting(false);
    if (error || data?.error) {
      toast({ title: 'Error', description: data?.error || error?.message || 'Failed to start game', variant: 'destructive' });
    }
  };

  const handleTransferHost = async (targetPlayerId: number) => {
    setTransferringTo(targetPlayerId);
    const { data, error } = await supabase.functions.invoke('transfer-host', {
      body: { room_id: room.id, new_host_player_id: targetPlayerId },
    });
    setTransferringTo(null);
    setConfirmingTransfer(null);
    if (error || data?.error) {
      toast({ title: 'Transfer Failed', description: data?.error || error?.message || 'Could not transfer the crown', variant: 'destructive' });
    } else {
      toast({ title: 'Crown Transferred', description: 'The host role has been passed on.' });
    }
  };

  return (
    <div className="noise-overlay relative flex min-h-screen flex-col items-center bg-background px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <Crown className="mx-auto mb-2 h-8 w-8 text-primary" />
        <h1 className="font-display text-2xl font-bold tracking-wider text-primary">
          The Council Gathers
        </h1>
      </motion.div>

      {/* Room Code */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8 rounded-lg border border-border bg-card p-6 text-center"
      >
        <p className="mb-2 text-sm text-muted-foreground">Room Code</p>
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono text-4xl tracking-[0.4em] text-primary">
            {room.room_code}
          </span>
          <button
            onClick={copyCode}
            className="rounded p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Copy code"
          >
            <Copy className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={copyLink}
          className="mt-3 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary mx-auto"
        >
          <Link className="h-4 w-4" />
          Copy invite link
        </button>
      </motion.div>

      {/* How to Play */}
      <div className="mb-6">
        <HowToPlayModal />
      </div>

      {/* Player Count */}
      <div className="mb-6 flex items-center gap-2 text-muted-foreground">
        <Users className="h-5 w-5" />
        <span className="font-body text-lg">
          {players.length} / 10 players
        </span>
      </div>

      {players.length < 5 && (
        <p className="mb-6 text-sm italic text-muted-foreground">
          Waiting for at least {5 - players.length} more player{5 - players.length !== 1 ? 's' : ''} to begin...
        </p>
      )}

      {/* Player List */}
      <div className="mb-8 grid w-full max-w-md grid-cols-2 gap-3 sm:grid-cols-3">
        {players.map((player, idx) => {
          const isPlayerHost = room.host_player_id === player.id;
          const isOnline = onlinePlayers.has(player.id);
          const isConfirming = confirmingTransfer === player.id;
          const isTransferring = transferringTo === player.id;
          const canTransferTo = showTransferUI && !isPlayerHost && !transferringTo;
          const initials = player.display_name
            .split(' ')
            .map(w => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              className="group relative flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4"
            >
              <div className="absolute right-2 top-2">
                {isOnline ? (
                  <Wifi className="h-3 w-3 text-primary" />
                ) : (
                  <WifiOff className="h-3 w-3 text-muted-foreground/50" />
                )}
              </div>

              <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                isPlayerHost ? 'border-primary bg-primary/10' : 'border-border bg-muted'
              }`}>
                <span className={`font-display text-sm font-bold ${
                  isPlayerHost ? 'text-primary' : 'text-foreground'
                }`}>
                  {initials}
                </span>
              </div>

              {/* Host crown badge with glow + animate on change */}
              <AnimatePresence mode="wait">
                {isPlayerHost && (
                  <motion.div
                    key={`crown-${player.id}`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.4 }}
                    className="absolute -top-2 left-1/2 -translate-x-1/2"
                  >
                    <motion.div
                      animate={{ boxShadow: ['0 0 6px hsl(var(--primary) / 0.4)', '0 0 14px hsl(var(--primary) / 0.7)', '0 0 6px hsl(var(--primary) / 0.4)'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="flex h-5 w-5 items-center justify-center rounded-full"
                    >
                      <Crown className="h-4 w-4 text-primary drop-shadow-[0_0_4px_hsl(var(--primary)/0.6)]" />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <span className="text-center font-body text-sm text-foreground">
                {player.display_name}
              </span>

              {/* Transfer crown button — host-only, hover-revealed */}
              {canTransferTo && !isConfirming && (
                <button
                  onClick={() => setConfirmingTransfer(player.id)}
                  className="absolute left-2 top-2 rounded p-1 text-primary/0 transition-all duration-200 hover:bg-primary/10 group-hover:text-primary/70 hover:!text-primary"
                  title={`Transfer host to ${player.display_name}`}
                >
                  <Crown className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Inline transfer confirmation */}
              <AnimatePresence>
                {isConfirming && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="w-full overflow-hidden"
                  >
                    <div className="mt-1 rounded border-t-2 border-t-primary bg-muted/60 px-2 py-2 text-center">
                      <p className="mb-2 font-display text-[10px] uppercase tracking-widest text-primary">
                        Transfer Crown?
                      </p>
                      <div className="flex justify-center gap-2">
                        <Button
                          size="sm"
                          disabled={isTransferring}
                          onClick={() => handleTransferHost(player.id)}
                          className="h-6 px-2 font-display text-[10px] tracking-wider text-primary-foreground"
                        >
                          {isTransferring ? '...' : 'Transfer'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isTransferring}
                          onClick={() => setConfirmingTransfer(null)}
                          className="h-6 px-2 font-display text-[10px] tracking-wider text-muted-foreground"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Host controls */}
      {isHost && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            disabled={!canStart || starting}
            className="gold-shimmer h-14 px-8 font-display text-lg tracking-wider text-primary-foreground disabled:opacity-40"
            size="lg"
            onClick={handleStartGame}
          >
            {starting ? 'Starting...' : 'Begin the Council'}
          </Button>
        </motion.div>
      )}

      {!isHost && currentPlayerId && (
        <div className="flex flex-col items-center gap-3">
          <p className="italic text-muted-foreground font-body">
            Waiting for the host to begin...
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                await supabase
                  .from('players')
                  .delete()
                  .eq('room_id', room.id)
                  .eq('user_id', user.id);
              }
              navigate('/');
            }}
            className="border-border font-display text-xs tracking-wider text-muted-foreground hover:text-foreground"
          >
            Leave Room
          </Button>
        </div>
      )}

      {!currentPlayerId && (
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">You are not in this room.</p>
          <Button
            variant="outline"
            onClick={() => navigate(`/join/${room.room_code}`)}
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            Join this room
          </Button>
        </div>
      )}
    </div>
  );
};

export default RoomLobby;
