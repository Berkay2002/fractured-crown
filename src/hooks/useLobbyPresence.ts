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

export function useLobbyPresence(
  roomCode: string,
  myPlayer: { id: string | number; username: string; sigil: string } | null
) {
  const [cursors, setCursors] = useState<Record<string, CursorPresence>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastTrackTime = useRef(0);
  const myPlayerRef = useRef(myPlayer);
  myPlayerRef.current = myPlayer;

  const myIdStr = myPlayer ? String(myPlayer.id) : null;

  useEffect(() => {
    if (!roomCode || !myIdStr) return;

    const channel = supabase.channel(`lobby-presence:${roomCode}`, {
      config: { presence: { key: myIdStr } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const flat: Record<string, CursorPresence> = {};
        Object.entries(state).forEach(([key, presences]) => {
          if (presences[0] && key !== myIdStr) {
            flat[key] = presences[0] as unknown as CursorPresence;
          }
        });
        setCursors(flat);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setCursors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const p = myPlayerRef.current;
          if (p) {
            await channel.track({
              playerId: String(p.id),
              username: p.username,
              sigil: p.sigil,
              x: 50,
              y: 50,
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

  const updateCursor = useCallback(async (x: number, y: number) => {
    const now = Date.now();
    const p = myPlayerRef.current;
    if (!channelRef.current || !p || now - lastTrackTime.current < 50) return;
    lastTrackTime.current = now;
    await channelRef.current.track({
      playerId: String(p.id),
      username: p.username,
      sigil: p.sigil,
      x,
      y,
    });
  }, []);

  return { cursors, updateCursor };
}
