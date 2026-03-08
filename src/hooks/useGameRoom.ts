// Phase 3: Game room state management with local hand state
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type GameState = Tables<'game_state'>;
type Round = Tables<'rounds'>;
type Player = Tables<'players'>;
type PlayerRole = Tables<'player_roles'>;
type Vote = Tables<'votes'>;
type EventLog = Tables<'event_log'>;
type ChatMessage = Tables<'chat_messages'>;

export interface GameRoomState {
  gameState: GameState | null;
  currentRound: Round | null;
  players: Player[];
  myRole: PlayerRole | null;
  votes: Vote[];
  events: EventLog[];
  chatMessages: ChatMessage[];
  loading: boolean;
  sendChat: (content: string) => Promise<void>;
  heraldHand: string[] | null;
  setHeraldHand: (hand: string[] | null) => void;
  chancellorHand: string[] | null;
  setChancellorHand: (hand: string[] | null) => void;
  allRoles: PlayerRole[];
  disconnected: boolean;
}

export function useGameRoom(roomId: number | null, currentPlayerId: number | null): GameRoomState {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [myRole, setMyRole] = useState<PlayerRole | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [heraldHand, setHeraldHand] = useState<string[] | null>(null);
  const [chancellorHand, setChancellorHand] = useState<string[] | null>(null);
  const [allRoles, setAllRoles] = useState<PlayerRole[]>([]);
  const [disconnected, setDisconnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchGameState = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('game_state')
      .select('*')
      .eq('room_id', roomId)
      .maybeSingle();
    if (data) {
      setGameState(data);
      if (data.current_phase === 'game_over') {
        const { data: roles } = await supabase
          .from('player_roles')
          .select('*')
          .eq('room_id', roomId);
        if (roles) setAllRoles(roles);
      }
    }
  }, [roomId]);

  const fetchRounds = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('rounds')
      .select('*')
      .eq('room_id', roomId)
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    setCurrentRound(data ?? null);
  }, [roomId]);

  const fetchPlayers = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('seat_order', { ascending: true });
    if (data) setPlayers(data);
  }, [roomId]);

  const fetchMyRole = useCallback(async () => {
    if (!roomId || !currentPlayerId) return;
    const { data } = await supabase
      .from('player_roles')
      .select('*')
      .eq('room_id', roomId)
      .eq('player_id', currentPlayerId)
      .maybeSingle();
    setMyRole(data ?? null);
  }, [roomId, currentPlayerId]);

  const fetchVotes = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('votes')
      .select('*')
      .eq('room_id', roomId)
      .eq('revealed', true)
      .order('created_at', { ascending: true });
    if (data) setVotes(data);
  }, [roomId]);

  const fetchEvents = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('event_log')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    if (data) setEvents(data);
  }, [roomId]);

  const fetchChat = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    if (data) setChatMessages(data);
  }, [roomId]);

  const refreshAll = useCallback(async () => {
    if (!roomId) return;
    await Promise.all([
      fetchGameState(),
      fetchRounds(),
      fetchPlayers(),
      fetchMyRole(),
      fetchVotes(),
      fetchEvents(),
      fetchChat(),
    ]);
  }, [fetchGameState, fetchRounds, fetchPlayers, fetchMyRole, fetchVotes, fetchEvents, fetchChat, roomId]);

  const fetchAll = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    await refreshAll();
    setLoading(false);
  }, [refreshAll, roomId]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!roomId) return;

    fetchAll();

    const channel = supabase
      .channel(`game-room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state', filter: `room_id=eq.${roomId}` }, () => fetchGameState())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rounds', filter: `room_id=eq.${roomId}` }, () => fetchRounds())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, () => fetchPlayers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_roles', filter: `room_id=eq.${roomId}` }, () => fetchMyRole())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `room_id=eq.${roomId}` }, () => fetchVotes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_log', filter: `room_id=eq.${roomId}` }, () => fetchEvents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, () => fetchChat())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setDisconnected(false);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setDisconnected(true);
          refreshAll();
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, fetchAll, refreshAll, fetchGameState, fetchRounds, fetchPlayers, fetchMyRole, fetchVotes, fetchEvents, fetchChat]);

  // Poll fallback for stale realtime channels
  useEffect(() => {
    if (!roomId) return;

    const intervalId = window.setInterval(() => {
      refreshAll();
    }, 2000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [roomId, refreshAll]);

  // Clear hands on phase change
  useEffect(() => {
    if (gameState?.current_phase === 'election') {
      setHeraldHand(null);
      setChancellorHand(null);
    }
  }, [gameState?.current_phase]);

  const sendChat = useCallback(async (content: string) => {
    if (!roomId || !currentPlayerId) return;
    const optimistic: ChatMessage = {
      id: -Date.now(),
      room_id: roomId,
      player_id: currentPlayerId,
      content,
      created_at: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, optimistic]);
    await supabase.from('chat_messages').insert({
      room_id: roomId,
      player_id: currentPlayerId,
      content,
    });
  }, [roomId, currentPlayerId]);

  return {
    gameState, currentRound, players, myRole, votes, events, chatMessages,
    loading, sendChat, heraldHand, setHeraldHand, chancellorHand, setChancellorHand,
    allRoles, disconnected,
  };
}
