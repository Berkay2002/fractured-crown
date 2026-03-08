import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface CursorPresence {
  playerId: string;
  username: string;
  sigil: string;
  x: number;
  y: number;
}

/**
 * Lobby cursor presence using two Realtime primitives on a single channel:
 * - **Presence** for join/leave awareness (who's in the lobby)
 * - **Broadcast** for cursor position updates (instant, no server reconciliation delay)
 */
export function useLobbyPresence(
  roomCode: string,
  myPlayer: { id: string | number; username: string; sigil: string } | null
) {
  const [cursors, setCursors] = useState<Record<string, CursorPresence>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSendTime = useRef(0);
  const myPlayerRef = useRef(myPlayer);
  myPlayerRef.current = myPlayer;

  const myIdStr = myPlayer ? String(myPlayer.id) : null;

  useEffect(() => {
    if (!roomCode || !myIdStr) return;

    const channel = supabase.channel(`lobby-cursors:${roomCode}`, {
      config: { presence: { key: myIdStr } },
    });

    // --- Presence: join/leave awareness only (no coordinates) ---
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      // Add any newly joined players we haven't seen via broadcast yet
      setCursors((prev) => {
        const next = { ...prev };
        // Remove players no longer in presence
        for (const key of Object.keys(next)) {
          if (!state[key]) delete next[key];
        }
        // Seed new players at center if we haven't seen their broadcast yet
        for (const [key, presences] of Object.entries(state)) {
          if (key === myIdStr) continue;
          if (!next[key] && presences[0]) {
            const p = presences[0] as unknown as { playerId: string; username: string; sigil: string };
            next[key] = { playerId: p.playerId, username: p.username, sigil: p.sigil, x: -10, y: -10 };
          }
        }
        return next;
      });
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      setCursors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    });

    // --- Broadcast: instant cursor position updates ---
    channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      if (!payload || payload.playerId === myIdStr) return;
      const cursor = payload as CursorPresence;
      setCursors((prev) => ({
        ...prev,
        [cursor.playerId]: cursor,
      }));
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const p = myPlayerRef.current;
        if (p) {
          // Track presence with identity info only (no coords)
          await channel.track({
            playerId: String(p.id),
            username: p.username,
            sigil: p.sigil,
          });
        }
      }
    });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode, myIdStr]);

  const updateCursor = useCallback((x: number, y: number) => {
    const now = Date.now();
    const p = myPlayerRef.current;
    if (!channelRef.current || !p || now - lastSendTime.current < 50) return;
    lastSendTime.current = now;

    // Broadcast is fire-and-forget, instant delivery via WebSocket
    channelRef.current.send({
      type: 'broadcast',
      event: 'cursor',
      payload: {
        playerId: String(p.id),
        username: p.username,
        sigil: p.sigil,
        x,
        y,
      },
    });
  }, []);

  return { cursors, updateCursor };
}
