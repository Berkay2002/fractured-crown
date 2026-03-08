import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Scroll, Swords, Vote, Crown } from 'lucide-react';
import { powerImageMap } from '@/lib/powerImages';
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
    case 'execution': return <img src={powerImageMap.execution} alt="execution" className="h-3.5 w-3.5 object-contain" />;
    case 'investigation': return <img src={powerImageMap.investigate} alt="investigate" className="h-3.5 w-3.5 object-contain" />;
    case 'peek': return <img src={powerImageMap.peek} alt="peek" className="h-3.5 w-3.5 object-contain" />;
    default: return <Swords className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

const EventLogFeed = ({ events }: EventLogFeedProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  return (
    <div className="flex flex-1 min-h-0 flex-col rounded-lg border border-border bg-card lg:rounded-none lg:border-0 lg:bg-transparent">
      <h3 className="flex-shrink-0 border-b border-primary/15 px-3 py-2 font-display text-xs uppercase tracking-widest text-muted-foreground">
        Chronicle
      </h3>
      <ScrollArea className="h-32 md:h-auto md:flex-1 lg:flex-1 lg:h-auto">
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
