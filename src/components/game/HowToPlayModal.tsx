import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Crown, Vote, Scroll, Eye, Search, Skull, Shield, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HowToPlayModalProps {
  trigger?: React.ReactNode;
}

const sections = [
  {
    title: 'Objective',
    icon: Crown,
    content: `The realm is divided between **Loyalists** and **Traitors**. Hidden among the Traitors is the **Usurper** — the shadow leader who seeks the throne.

**Loyalists win** by enacting 5 Loyalist Edicts or by executing the Usurper.

**Traitors win** by enacting 6 Shadow Edicts or by electing the Usurper as Lord Commander after 3 Shadow Edicts have passed.

No one knows who to trust. Deception is your sharpest blade.`,
  },
  {
    title: 'The Election',
    icon: Vote,
    content: `Each round, the **Herald** (rotating clockwise) nominates a **Lord Commander** from the council.

The entire council then votes **Ja** (yes) or **Nein** (no). A simple majority passes the election.

If the vote fails, the Herald token moves to the next player and the Election Tracker advances. The previous Herald and Lord Commander are term-limited for the next round.`,
  },
  {
    title: 'The Legislature',
    icon: Scroll,
    content: `When an election passes, the legislative session begins.

The **Herald** draws 3 Royal Edicts from the deck (face-down) and **discards one** in secret. The remaining 2 are passed to the **Lord Commander**.

The Lord Commander then **enacts one** of the two edicts. The enacted policy is revealed to all.

Neither player may show their cards or make binding promises about what they hold.`,
  },
  {
    title: 'Presidential Powers',
    icon: Eye,
    content: `When a **Shadow Edict** is enacted, the Herald may unlock an executive power (depending on player count):

• **Raven's Eye** — The Herald secretly views the top 3 cards of the deck.
• **Investigate Loyalty** — The Herald secretly views one player's faction membership.
• **Call Conclave** — The Herald chooses the next Herald for a special election.
• **Royal Execution** — The Herald executes a player, eliminating them from the game. If the Usurper is executed, Loyalists win immediately.`,
  },
  {
    title: 'The Veto',
    icon: Swords,
    content: `After **5 Shadow Edicts** have been enacted, the veto power is unlocked.

During the legislative session, the Lord Commander may propose a veto instead of enacting a policy. The Herald must agree for the veto to pass.

If the veto is accepted, both cards are discarded and the Election Tracker advances by one. If rejected, the Lord Commander must enact one of the two cards.`,
  },
  {
    title: 'Election Tracker',
    icon: Shield,
    content: `Each time an election fails, the tracker advances by one.

If the tracker reaches **3**, a **chaos policy** is enacted: the top card of the deck is flipped and enacted immediately, regardless of type. No executive power is triggered.

The tracker then resets to zero and term limits are cleared.`,
  },
];

const HowToPlayModal = ({ trigger }: HowToPlayModalProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="border-primary/30 font-display text-xs tracking-wider text-primary hover:bg-primary/10"
          >
            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            How to Play
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg border-primary/30 bg-card p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="font-display text-lg tracking-wider text-primary">
            How to Play — Fractured Crown
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] px-6 py-4">
          <div className="flex flex-col gap-6">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.title}>
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-primary">
                      {section.title}
                    </h3>
                  </div>
                  <div className="font-body text-sm leading-relaxed text-foreground/80">
                    {section.content.split('\n\n').map((paragraph, i) => (
                      <p key={i} className="mb-2 last:mb-0">
                        {paragraph.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return (
                              <span key={j} className="font-semibold text-foreground">
                                {part.slice(2, -2)}
                              </span>
                            );
                          }
                          return part;
                        })}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default HowToPlayModal;
