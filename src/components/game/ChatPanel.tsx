import { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { useSoundContext } from '@/contexts/SoundContext';
import type { Tables } from '@/integrations/supabase/types';
import SigilAvatar from './SigilAvatar';

type ChatMessage = Tables<'chat_messages'>;
type Player = Tables<'players'>;

interface ChatPanelProps {
  messages: ChatMessage[];
  players: Player[];
  sendChat: (content: string) => Promise<void>;
}

const ChatPanel = ({ messages, players, sendChat }: ChatPanelProps) => {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);
  const sound = useSoundContext();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length > prevCountRef.current && prevCountRef.current > 0) {
      sound.playChatReceived();
    }
    prevCountRef.current = messages.length;
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput('');
    try {
      await sendChat(trimmed);
    } finally {
      setSending(false);
    }
  };

  const findPlayer = (playerId: number) => players.find(p => p.id === playerId);
  const playerName = (playerId: number) => findPlayer(playerId)?.display_name ?? 'Unknown';

  return (
    <div className="flex flex-1 min-h-0 flex-col rounded-lg border border-border bg-card lg:rounded-none lg:border-0 lg:bg-transparent">
      <h3 className="flex-shrink-0 border-b border-primary/15 px-3 py-2 font-display text-xs uppercase tracking-widest text-muted-foreground">
        Council Chat
      </h3>
      <ScrollArea className="max-h-40 md:max-h-none md:flex-1 lg:flex-1 lg:h-auto">
        <div className="flex flex-col gap-1 p-2 lg:p-3">
          {messages.length === 0 && (
            <p className="px-2 py-4 text-center text-xs italic text-muted-foreground">
              Silence fills the chamber...
            </p>
          )}
          {messages.map((msg) => {
            const sender = findPlayer(msg.player_id);
            return (
              <div key={msg.id} className="flex items-start gap-1.5 px-1 py-0.5">
                <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full overflow-hidden bg-muted">
                  <SigilAvatar sigil={sender?.sigil ?? 'crown'} displayName={sender?.display_name ?? '?'} size="h-5 w-5" />
                </div>
                <div>
                  <span className="font-display text-xs font-semibold text-primary">
                    {playerName(msg.player_id)}:
                  </span>{' '}
                  <span className="font-body text-xs text-foreground/80">{msg.content}</span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="flex flex-shrink-0 gap-2 border-t border-primary/15 p-2 lg:p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Speak to the council..."
          className="h-8 text-xs"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default ChatPanel;
