import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';

const TermsOfService = () => {
  usePageTitle('Terms of Service — Fractured Crown', 'Terms of Service for Fractured Crown, a free browser-based social deduction game. No account required.');

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[720px] px-6 py-16">
        <Link
          to="/"
          className="mb-10 inline-block font-body text-sm text-primary hover:text-primary/80 transition-colors"
        >
          ← Back to home
        </Link>

        <h1 className="font-display text-3xl font-bold tracking-wider text-primary sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 font-body text-sm text-muted-foreground italic">
          Last updated: March 2026
        </p>

        <hr className="my-8 border-primary/40" />

        <section className="space-y-4">
          <h2 className="font-display text-xl tracking-wide text-primary">
            About the Service
          </h2>
          <p className="font-body text-base leading-relaxed text-foreground">
            Fractured Crown is a free social deduction game available at{' '}
            <span className="text-primary">fractured-crown.lovable.app</span>.
            No account creation is required — all sessions are anonymous.
          </p>
        </section>

        <hr className="my-8 border-primary/40" />

        <section className="space-y-4">
          <h2 className="font-display text-xl tracking-wide text-primary">
            Age Requirement
          </h2>
          <p className="font-body text-base leading-relaxed text-foreground">
            Players must be 13 years of age or older to use Fractured Crown,
            consistent with Discord's minimum age requirement.
          </p>
        </section>

        <hr className="my-8 border-primary/40" />

        <section className="space-y-4">
          <h2 className="font-display text-xl tracking-wide text-primary">
            Acceptable Use
          </h2>
          <p className="font-body text-base leading-relaxed text-foreground">
            Players must not use harmful, abusive, or offensive usernames.
            Misuse of the service — including but not limited to harassment,
            exploitation of bugs, or disruption of other players' experience
            — may result in immediate session termination.
          </p>
        </section>

        <hr className="my-8 border-primary/40" />

        <section className="space-y-4">
          <h2 className="font-display text-xl tracking-wide text-primary">
            Service Availability
          </h2>
          <p className="font-body text-base leading-relaxed text-foreground">
            Fractured Crown is provided as-is with no guarantees of uptime,
            availability, or uninterrupted service. The operator reserves the
            right to reset or remove any game room at any time without prior
            notice.
          </p>
        </section>

        <hr className="my-8 border-primary/40" />

        <section className="space-y-4">
          <h2 className="font-display text-xl tracking-wide text-primary">
            Liability
          </h2>
          <p className="font-body text-base leading-relaxed text-foreground">
            The operator is not liable for any loss or damage arising from the
            use of this service. By using Fractured Crown, you agree to these
            terms.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
