import { Button } from '@/components/ui/button';
import { Crown, Copy, Link, Users, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

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
  const isHost = currentPlayerId && room.host_player_id === currentPlayerId;
  const canStart = isHost && players.length >= 5 && players.length <= 10;

  const copyCode = () => {
    navigator.clipboard.writeText(room.room_code);
    toast({ title: 'Copied!', description: 'Room code copied to clipboard' });
  };

  const copyLink = () => {
    const url = `${window.location.origin}/join/${room.room_code}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied!', description: 'Invite link copied to clipboard' });
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
              className="relative flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-4 pb-4 pt-6"
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

              {isPlayerHost && (
                <Crown className="absolute -top-1 left-1/2 h-4 w-4 -translate-x-1/2 text-primary" />
              )}

              <span className="text-center font-body text-sm text-foreground">
                {player.display_name}
              </span>
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
            disabled={!canStart}
            className="gold-shimmer h-14 px-8 font-display text-lg tracking-wider text-primary-foreground disabled:opacity-40"
            size="lg"
            onClick={() => {
              console.log('TODO: Phase 3 — start-game Edge Function');
              toast({ title: 'Coming soon', description: 'Game start will be implemented in Phase 3' });
            }}
          >
            Begin the Council
          </Button>
        </motion.div>
      )}

      {!isHost && currentPlayerId && (
        <p className="italic text-muted-foreground font-body">
          Waiting for the host to begin...
        </p>
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
