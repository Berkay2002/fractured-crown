import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Crown, Vote, Scroll, Eye, Shield, Swords, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface HowToPlayModalProps {
  trigger?: React.ReactNode;
}

const sections = [
  {
    title: 'Objective',
    icon: Crown,
    content: `The realm is divided between **Loyalists** and **Traitors**. Hidden among the Traitors is the **Usurper** — the shadow leader who seeks the throne.\n\n**Loyalists win** by enacting 5 Loyalist Edicts or by executing the Usurper.\n\n**Traitors win** by enacting 6 Shadow Edicts or by electing the Usurper as Lord Commander after 3 Shadow Edicts have passed.`,
  },
  {
    title: 'The Election',
    icon: Vote,
    content: `Each round, the **Herald** nominates a **Lord Commander**. The council votes **Ja** or **Nein**. A simple majority passes the election.`,
  },
  {
    title: 'The Legislature',
    icon: Scroll,
    content: `The **Herald** draws 3 edicts, discards one, and passes 2 to the **Lord Commander**, who enacts one.`,
  },
  {
    title: 'Executive Powers',
    icon: Eye,
    content: `Shadow Edicts unlock powers: **Raven's Eye** (peek at deck), **Investigate Loyalty**, **Call Conclave** (special election), or **Royal Execution**.`,
  },
  {
    title: 'The Veto',
    icon: Swords,
    content: `After 5 Shadow Edicts, the Lord Commander may propose a veto. The Herald must agree for it to pass.`,
  },
  {
    title: 'Election Tracker',
    icon: Shield,
    content: `Failed elections advance the tracker. At **3**, a chaos policy is enacted from the top of the deck.`,
  },
];

const HowToPlayModal = ({ trigger }: HowToPlayModalProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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

        {/* Interactive tutorial CTA */}
        <div className="border-b border-border px-6 py-4">
          <Button
            onClick={() => {
              setOpen(false);
              navigate('/how-to-play');
            }}
            className="gold-shimmer w-full font-display tracking-wider text-primary-foreground"
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Launch Interactive Tutorial
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="mt-2 text-center font-body text-xs text-muted-foreground">
            12-step walkthrough with live component previews
          </p>
        </div>

        <ScrollArea className="max-h-[55vh] px-6 py-4">
          <div className="flex flex-col gap-5">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.title}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-primary">
                      {section.title}
                    </h3>
                  </div>
                  <div className="font-body text-sm leading-relaxed text-foreground/80">
                    {section.content.split('\n\n').map((paragraph, i) => (
                      <p key={i} className="mb-1.5 last:mb-0">
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
