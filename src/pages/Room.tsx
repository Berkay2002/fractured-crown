import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDiscordContext } from '@/contexts/DiscordContext';
import { toast } from '@/hooks/use-toast';
import { useGameRoom } from '@/hooks/useGameRoom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { buildLobbyActivity, buildGameActivity } from '@/lib/discordActivity';
import GameBoard from '@/components/game/GameBoard';
import GameOverScreen from '@/components/game/GameOverScreen';
import RoomLobby from '@/components/game/RoomLobby';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface RoomData {
  id: number;
  room_code: string;
  host_player_id: number | null;
  status: string;
  player_count: number;
  settings?: unknown;
}

interface PlayerData {
  id: number;
  user_id: string;
  display_name: string;
  seat_order: number;
  joined_at: string;
}

interface LobbyMessage {
  id: number;
  room_id: number;
  player_id: number;
  content: string;
  created_at: string;
  phase: string;
}

const phaseLabels: Record<string, string> = {
  election: 'Election',
  legislative: 'Legislative',
  executive_action: 'Executive Power',
  game_over: 'Game Over',
};

const Room = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user, loading: authLoading } = useAuth();
  const { isDiscord, setActivity } = useDiscordContext();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<PlayerData[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState<Set<number>>(new Set());
  const [lobbyMessages, setLobbyMessages] = useState<LobbyMessage[]>([]);

  const gameRoom = useGameRoom(
    room?.status === 'in_progress' || room?.status === 'finished' ? room.id : null,
    currentPlayerId
  );

  // Dynamic page title
  const pageTitle = (() => {
    if (!room) return `Fractured Crown — Room ${roomCode?.toUpperCase() ?? ''}`;
    if (room.status === 'finished') return 'Fractured Crown — The Kingdom Has Fallen';
    if (room.status === 'in_progress' && gameRoom.gameState) {
      const phase = phaseLabels[gameRoom.gameState.current_phase] ?? gameRoom.gameState.current_phase;
      return `Fractured Crown — ${phase} | Room ${room.room_code}`;
    }
    return `Fractured Crown — Room ${room.room_code}`;
  })();
  usePageTitle(pageTitle);

  const fetchRoomData = useCallback(async () => {
    if (!roomCode) return;
    setFetchError(false);

    try {
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .maybeSingle();

      if (roomError) {
        setFetchError(true);
        setLoading(false);
        return;
      }

      if (!roomData) {
        toast({ title: 'Room not found', variant: 'destructive' });
        navigate('/');
        return;
      }

      setRoom(roomData as unknown as RoomData);

      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomData.id)
        .order('joined_at', { ascending: true });

      if (playersData) {
        setLobbyPlayers(playersData as unknown as PlayerData[]);
        if (user) {
          const me = (playersData as unknown as PlayerData[]).find(p => p.user_id === user.id);
          if (me) setCurrentPlayerId(me.id);
        }
      }

      const { data: chatData } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomData.id)
        .eq('phase', 'lobby')
        .order('created_at', { ascending: true });

      if (chatData) {
        setLobbyMessages(chatData as unknown as LobbyMessage[]);
      }
    } catch {
      setFetchError(true);
    }

    setLoading(false);
  }, [roomCode, user, navigate]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchRoomData();
    }
  }, [authLoading, user, fetchRoomData]);

  // Realtime subscription for lobby
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` },
        () => {
          supabase
            .from('players')
            .select('*')
            .eq('room_id', room.id)
            .order('joined_at', { ascending: true })
            .then(({ data }) => {
              if (data) setLobbyPlayers(data as unknown as PlayerData[]);
            });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          setRoom(payload.new as unknown as RoomData);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` },
        (payload) => {
          const newMsg = payload.new as LobbyMessage;
          if (newMsg.phase !== 'lobby') return;

          setLobbyMessages(prev => {
            const filtered = prev.filter(
              (m) => !(m.id < 0 && m.player_id === newMsg.player_id && m.content === newMsg.content)
            );
            if (filtered.some(m => m.id === newMsg.id)) return filtered;
            return [...filtered, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room?.id]);

  // Presence tracking
  useEffect(() => {
    if (!room || !currentPlayerId) return;

    const presenceChannel = supabase.channel(`presence:${room.id}`);

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const online = new Set<number>();
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.player_id) online.add(p.player_id);
          });
        });
        setOnlinePlayers(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            player_id: currentPlayerId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [room?.id, currentPlayerId]);

  const handleSendLobbyMessage = useCallback(async (content: string) => {
    if (!room || !currentPlayerId) return;

    const optimistic: LobbyMessage = {
      id: -Date.now(),
      room_id: room.id,
      player_id: currentPlayerId,
      content,
      created_at: new Date().toISOString(),
      phase: 'lobby',
    };

    setLobbyMessages(prev => [...prev, optimistic]);

    const { error } = await supabase.from('chat_messages').insert({
      room_id: room.id,
      player_id: currentPlayerId,
      content,
      phase: 'lobby',
    });

    if (error) {
      setLobbyMessages(prev => prev.filter(m => m.id !== optimistic.id));
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    }
  }, [room, currentPlayerId]);

  // Discord Activity updates
  useEffect(() => {
    if (!isDiscord || !room) return;
    if (room.status === 'lobby') {
      setActivity(buildLobbyActivity({ roomCode: room.room_code, playerCount: lobbyPlayers.length }));
    } else if ((room.status === 'in_progress' || room.status === 'finished') && gameRoom.gameState) {
      const round = gameRoom.currentRound?.round_number ?? 1;
      setActivity(buildGameActivity({ round, phase: gameRoom.gameState.current_phase }));
    }
  }, [isDiscord, room?.status, room?.room_code, lobbyPlayers.length, gameRoom.gameState?.current_phase, gameRoom.currentRound?.round_number]);

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground font-display text-lg tracking-widest animate-pulse">
          Entering the council chamber...
        </div>
      </div>
    );
  }

  // Full-page error state
  if (fetchError) {
    return (
      <div className="noise-overlay flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
        <AlertTriangle className="h-12 w-12 text-accent-foreground" />
        <h1 className="font-display text-2xl font-bold tracking-wider text-foreground">
          Failed to Load Room
        </h1>
        <p className="max-w-sm text-center font-body text-muted-foreground">
          Could not connect to the council chamber. The realm may be experiencing turbulence.
        </p>
        <div className="flex gap-4">
          <Button
            onClick={fetchRoomData}
            className="gold-shimmer font-display tracking-wider text-primary-foreground"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="border-border font-display tracking-wider text-muted-foreground hover:text-foreground"
          >
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  if (!room) return null;

  // Game Over
  if (room.status === 'finished' && gameRoom.gameState) {
    const hostIsMe = currentPlayerId != null && room.host_player_id === currentPlayerId;
    return (
      <GameOverScreen
        gameState={gameRoom.gameState}
        players={gameRoom.players.length > 0 ? gameRoom.players : lobbyPlayers as any}
        events={gameRoom.events}
        allRoles={gameRoom.allRoles}
        isHost={hostIsMe}
      />
    );
  }

  // In Progress — Game Board
  if (room.status === 'in_progress') {
    return (
      <GameBoard
        {...gameRoom}
        roomCode={room.room_code}
        currentPlayerId={currentPlayerId}
        onlinePlayers={onlinePlayers}
      />
    );
  }

  // Lobby
  return (
    <RoomLobby
      room={room}
      players={lobbyPlayers}
      currentPlayerId={currentPlayerId}
      onlinePlayers={onlinePlayers}
    />
  );
};

export default Room;
