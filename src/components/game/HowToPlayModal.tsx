import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import HowToPlayTutorial from './HowToPlayTutorial';

interface HowToPlayModalProps {
  trigger?: React.ReactNode;
}

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
      <DialogContent className="max-h-[85vh] max-w-lg border-primary/30 bg-card p-0 sm:max-w-2xl">
        <ScrollArea className="max-h-[80vh] p-5 sm:p-6">
          <HowToPlayTutorial mode="embedded" onClose={() => setOpen(false)} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default HowToPlayModal;
