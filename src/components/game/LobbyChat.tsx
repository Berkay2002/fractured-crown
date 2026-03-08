import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { sigilImageUrl } from './SigilAvatar';

interface Player {
  id: number;
  display_name: string;
  sigil?: string;
}

export interface LobbyMessage {
  id: number;
  room_id: number;
  player_id: number;
  content: string;
  created_at: string;
  phase: string;
}

interface LobbyChatProps {
  messages: LobbyMessage[];
  currentPlayerId: number | null;
  players: Player[];
  onSendMessage: (content: string) => Promise<void>;
  className?: string;
}

const LobbyChat = ({ messages, currentPlayerId, players, onSendMessage, className }: LobbyChatProps) => {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || !currentPlayerId || sending) return;
    const content = input.trim().slice(0, 200);
    setInput('');
    setSending(true);

    await onSendMessage(content);
    setSending(false);
  };

  const getPlayerInfo = (playerId: number) => {
    return players.find(p => p.id === playerId);
  };

  return (
    <div className={`w-full rounded-lg border border-primary/20 bg-card flex flex-col ${className ?? ''}`}>
      <div className="border-b border-border px-4 py-3 flex-shrink-0">
        <h3 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
          Council Whispers
        </h3>
      </div>
      <div className="flex-1 min-h-0 h-48 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-3">
          {messages.length === 0 && (
            <p className="py-6 text-center text-sm italic text-muted-foreground">
              No whispers yet...
            </p>
          )}
          {messages.map((msg) => {
            const player = getPlayerInfo(msg.player_id);
            const displayName = player?.display_name || 'Unknown';
            const sigil = player?.sigil || 'crown';
            const isOwn = msg.player_id === currentPlayerId;
            return (
              <div key={msg.id} className="flex items-start gap-2.5">
                <img
                  src={sigilImageUrl(sigil)}
                  alt=""
                  className="mt-0.5 h-7 w-7 rounded-full object-cover flex-shrink-0 border border-border"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`font-display text-xs uppercase tracking-wider ${isOwn ? 'text-primary' : 'text-primary/70'}`}>
                      {displayName}
                    </span>
                    <span className="text-[9px] text-muted-foreground/50 font-mono">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="font-body text-sm text-foreground/85 break-words leading-snug mt-0.5">
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
        <div className="flex gap-2 border-t border-border px-4 py-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 200))}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Whisper to the council..."
            className="h-9 border-border bg-muted/50 font-body text-sm placeholder:text-muted-foreground/50"
            maxLength={200}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="h-9 w-9 p-0 text-primary-foreground"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default LobbyChat;
