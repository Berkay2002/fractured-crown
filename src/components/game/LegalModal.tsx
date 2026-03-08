import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

type LegalPage = 'privacy' | 'terms';

interface LegalModalProps {
  page: LegalPage;
  trigger: React.ReactNode;
}

const PrivacyContent = () => (
  <div className="space-y-6">
    <div>
      <h2 className="font-display text-3xl font-bold tracking-wider text-primary">Privacy Policy</h2>
      <p className="mt-2 font-body text-sm italic text-muted-foreground">Last updated: March 2026</p>
    </div>

    <hr className="border-primary/40" />

    <section className="space-y-3">
      <h3 className="font-display text-lg tracking-wide text-primary">What Data We Collect</h3>
      <p className="font-body text-sm leading-relaxed text-foreground">
        Fractured Crown collects only the display name you choose when creating or joining a game, and an anonymous session identifier generated automatically by the application. We do not collect email addresses, passwords, real names, or any other personal identifiers.
      </p>
    </section>

    <hr className="border-primary/40" />

    <section className="space-y-3">
      <h3 className="font-display text-lg tracking-wide text-primary">How Data Is Used</h3>
      <p className="font-body text-sm leading-relaxed text-foreground">
        Your chosen display name and anonymous session ID are used solely to identify you within an active game session. This data is not used for analytics, advertising, profiling, or any purpose beyond facilitating gameplay.
      </p>
    </section>

    <hr className="border-primary/40" />

    <section className="space-y-3">
      <h3 className="font-display text-lg tracking-wide text-primary">Data Retention</h3>
      <p className="font-body text-sm leading-relaxed text-foreground">
        Player records and game data are automatically deleted after the session ends. Game rooms expire within hours via an automated cleanup process. No long-term storage of player data occurs.
      </p>
    </section>

    <hr className="border-primary/40" />

    <section className="space-y-3">
      <h3 className="font-display text-lg tracking-wide text-primary">Third Parties</h3>
      <p className="font-body text-sm leading-relaxed text-foreground">
        The application is hosted on Supabase (EU region) and Lovable. When launched as a Discord Activity, Discord OAuth is used to authenticate the session within Discord's platform. No data is shared with or sold to any other third parties.
      </p>
    </section>

    <hr className="border-primary/40" />

    <section className="space-y-3">
      <h3 className="font-display text-lg tracking-wide text-primary">Data Deletion</h3>
      <p className="font-body text-sm leading-relaxed text-foreground">
        Because no personal data is stored beyond ephemeral game sessions, there is no persistent data to request deletion of. All records are purged automatically when sessions expire.
      </p>
    </section>

    <hr className="border-primary/40" />

    <section className="space-y-3">
      <h3 className="font-display text-lg tracking-wide text-primary">Cookies</h3>
      <p className="font-body text-sm leading-relaxed text-foreground">
        Fractured Crown does not use tracking cookies. The only client-side storage used is the anonymous session token required for the application to function.
      </p>
    </section>
  </div>
);

const TermsContent = () => (
  <div className="space-y-6">
    <div>
      <h2 className="font-display text-3xl font-bold tracking-wider text-primary">Terms of Service</h2>
      <p className="mt-2 font-body text-sm italic text-muted-foreground">Last updated: March 2026</p>
    </div>

    <hr className="border-primary/40" />

    <section className="space-y-3">
      <h3 className="font-display text-lg tracking-wide text-primary">About the Service</h3>
      <p className="font-body text-sm leading-relaxed text-foreground">
        Fractured Crown is a free social deduction game available at <span className="text-primary">fractured-crown.lovable.app</span>. No account creation is required — all sessions are anonymous.
      </p>
    </section>

    <hr className="border-primary/40" />

    <section className="space-y-3">
      <h3 className="font-display text-lg tracking-wide text-primary">Age Requirement</h3>
      <p className="font-body text-sm leading-relaxed text-foreground">
        Players must be 13 years of age or older to use Fractured Crown, consistent with Discord's minimum age requirement.
      </p>
    </section>

    <hr className="border-primary/40" />

    <section className="space-y-3">
      <h3 className="font-display text-lg tracking-wide text-primary">Acceptable Use</h3>
      <p className="font-body text-sm leading-relaxed text-foreground">
        Players must not use harmful, abusive, or offensive usernames. Misuse of the service — including but not limited to harassment, exploitation of bugs, or disruption of other players' experience — may result in immediate session termination.
      </p>
    </section>

    <hr className="border-primary/40" />

    <section className="space-y-3">
      <h3 className="font-display text-lg tracking-wide text-primary">Service Availability</h3>
      <p className="font-body text-sm leading-relaxed text-foreground">
        Fractured Crown is provided as-is with no guarantees of uptime, availability, or uninterrupted service. The operator reserves the right to reset or remove any game room at any time without prior notice.
      </p>
    </section>

    <hr className="border-primary/40" />

    <section className="space-y-3">
      <h3 className="font-display text-lg tracking-wide text-primary">Liability</h3>
      <p className="font-body text-sm leading-relaxed text-foreground">
        The operator is not liable for any loss or damage arising from the use of this service. By using Fractured Crown, you agree to these terms.
      </p>
    </section>
  </div>
);

const LegalModal = ({ page, trigger }: LegalModalProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg border-primary/30 bg-card p-0 sm:max-w-2xl">
        <ScrollArea className="max-h-[80vh] p-5 sm:p-6">
          {page === 'privacy' ? <PrivacyContent /> : <TermsContent />}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default LegalModal;
