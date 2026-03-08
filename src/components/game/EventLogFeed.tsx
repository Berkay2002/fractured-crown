import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Scroll, Swords, Vote, Crown, Skull, Eye, Search } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type EventLog = Tables<'event_log'>;

interface EventLogFeedProps {
  events: EventLog[];
}

const eventIcon = (type: string) => {
  switch (type) {
    case 'nomination': return <Crown className="h-3.5 w-3.5 text-primary" />;
    case 'vote': return <Vote className="h-3.5 w-3.5 text-muted-foreground" />;
    case 'policy': return <Scroll className="h-3.5 w-3.5 text-primary" />;
    case 'execution': return <Skull className="h-3.5 w-3.5 text-accent" />;
    case 'investigation': return <Search className="h-3.5 w-3.5 text-muted-foreground" />;
    case 'peek': return <Eye className="h-3.5 w-3.5 text-muted-foreground" />;
    default: return <Swords className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

const EventLogFeed = ({ events }: EventLogFeedProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card">
      <h3 className="border-b border-border px-3 py-2 font-display text-xs uppercase tracking-widest text-muted-foreground">
        Chronicle
      </h3>
      <ScrollArea className="h-48">
        <div className="flex flex-col gap-1 p-2">
          {events.length === 0 && (
            <p className="px-2 py-4 text-center text-xs italic text-muted-foreground">
              The chronicle awaits...
            </p>
          )}
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-2 px-1 py-1">
              <div className="mt-0.5 shrink-0">{eventIcon(event.event_type)}</div>
              <p className="font-body text-xs leading-relaxed text-foreground/80">
                {event.description}
              </p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
};

export default EventLogFeed;
