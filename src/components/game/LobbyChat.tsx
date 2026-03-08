import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import SigilAvatar, { sigilImageUrl } from './SigilAvatar';

interface Player {
  id: number;
  display_name: string;
  sigil?: string;
}

interface LobbyMessage {
  id: number;
  room_id: number;
  player_id: number;
  content: string;
  created_at: string;
  phase: string;
  players?: { display_name: string; sigil: string } | null;
}

interface LobbyChatProps {
  roomId: number;
  currentPlayerId: number | null;
  players: Player[];
  className?: string;
}

const LobbyChat = ({ roomId, currentPlayerId, players, className }: LobbyChatProps) => {
  const [messages, setMessages] = useState<LobbyMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch existing lobby messages
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*, players(display_name, sigil)')
        .eq('room_id', roomId)
        .eq('phase', 'lobby')
        .order('created_at', { ascending: true });
      if (data) setMessages(data as unknown as LobbyMessage[]);
    };
    fetch();
  }, [roomId]);

  // Subscribe to new lobby messages
  useEffect(() => {
    const channel = supabase
      .channel(`lobby-chat:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const msg = payload.new as LobbyMessage;
          if (msg.phase !== 'lobby') return;
          setMessages(prev => {
            // Deduplicate optimistic messages
            if (prev.some(m => m.id === msg.id)) return prev;
            // Replace optimistic message
            const filtered = prev.filter(m => !(m.id < 0 && m.player_id === msg.player_id && m.content === msg.content));
            return [...filtered, msg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || !currentPlayerId || sending) return;
    const content = input.trim().slice(0, 200);
    setInput('');
    setSending(true);

    // Optimistic
    const optimistic: LobbyMessage = {
      id: -Date.now(),
      room_id: roomId,
      player_id: currentPlayerId,
      content,
      created_at: new Date().toISOString(),
      phase: 'lobby',
    };
    setMessages(prev => [...prev, optimistic]);

    await supabase.from('chat_messages').insert({
      room_id: roomId,
      player_id: currentPlayerId,
      content,
      phase: 'lobby',
    });
    setSending(false);
  };

  const getPlayerInfo = (playerId: number) => {
    return players.find(p => p.id === playerId);
  };

  return (
    <div className={`w-full rounded-lg border border-primary/20 bg-card flex flex-col ${className ?? ''}`}>
      <div className="border-b border-border px-4 py-2 flex-shrink-0">
        <h3 className="font-display text-xs uppercase tracking-widest text-muted-foreground">
          Council Whispers
        </h3>
      </div>
      <div className="flex-1 min-h-0 h-48 overflow-y-auto px-3 py-2">
        <div className="flex flex-col gap-1.5">
          {messages.length === 0 && (
            <p className="py-4 text-center text-xs italic text-muted-foreground">
              No whispers yet...
            </p>
          )}
          {messages.map((msg) => {
            const player = msg.players || getPlayerInfo(msg.player_id);
            const displayName = player ? ('display_name' in player ? player.display_name : '') : 'Unknown';
            const sigil = player ? ('sigil' in player ? player.sigil : 'crown') : 'crown';
            return (
              <div key={msg.id} className="flex items-start gap-2">
                <img
                  src={sigilImageUrl(sigil || 'crown')}
                  alt=""
                  className="mt-0.5 h-5 w-5 rounded-full object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <span className="font-display text-[10px] uppercase tracking-wider text-primary/70">
                    {displayName}
                  </span>
                  <p className="font-body text-xs text-foreground/80 break-words">
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>
      {currentPlayerId && (
        <div className="flex gap-2 border-t border-border px-3 py-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 200))}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Whisper to the council..."
            className="h-8 border-border bg-muted/50 font-body text-xs placeholder:text-muted-foreground/50"
            maxLength={200}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="h-8 w-8 p-0 text-primary-foreground"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default LobbyChat;
