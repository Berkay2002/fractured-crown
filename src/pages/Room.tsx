import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useGameRoom } from '@/hooks/useGameRoom';
import GameBoard from '@/components/game/GameBoard';
import GameOverScreen from '@/components/game/GameOverScreen';
import RoomLobby from '@/components/game/RoomLobby';

interface RoomData {
  id: number;
  room_code: string;
  host_player_id: number | null;
  status: string;
  player_count: number;
}

interface PlayerData {
  id: number;
  user_id: string;
  display_name: string;
  seat_order: number;
  joined_at: string;
}

const Room = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<PlayerData[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlinePlayers, setOnlinePlayers] = useState<Set<number>>(new Set());

  // Game room hook — only active when in_progress or finished
  const gameRoom = useGameRoom(
    room?.status === 'in_progress' || room?.status === 'finished' ? room.id : null,
    currentPlayerId
  );

  // Fetch room and players
  const fetchRoomData = useCallback(async () => {
    if (!roomCode) return;

    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .maybeSingle();

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

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground font-display text-lg tracking-widest animate-pulse">
          Entering the council chamber...
        </div>
      </div>
    );
  }

  if (!room) return null;

  // Game Over
  if (room.status === 'finished' && gameRoom.gameState) {
    return (
      <GameOverScreen
        gameState={gameRoom.gameState}
        players={gameRoom.players.length > 0 ? gameRoom.players : lobbyPlayers as any}
        events={gameRoom.events}
        allRoles={gameRoom.allRoles}
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
