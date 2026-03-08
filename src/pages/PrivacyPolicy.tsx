import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';

const PrivacyPolicy = () => {
  usePageTitle('Privacy Policy — Fractured Crown', 'Learn how Fractured Crown handles your data. No emails, passwords, or personal information collected — only anonymous game sessions.');

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
          Privacy Policy
        </h1>
        <p className="mt-2 font-body text-sm text-muted-foreground italic">
          Last updated: March 2026
        </p>

        <hr className="my-8 border-primary/40" />

        <section className="space-y-4">
          <h2 className="font-display text-xl tracking-wide text-primary">
            What Data We Collect
          </h2>
          <p className="font-body text-base leading-relaxed text-foreground">
            Fractured Crown collects only the display name you choose when
            creating or joining a game, and an anonymous session identifier
            generated automatically by the application. We do not collect
            email addresses, passwords, real names, or any other personal
            identifiers.
          </p>
        </section>

        <hr className="my-8 border-primary/40" />

        <section className="space-y-4">
          <h2 className="font-display text-xl tracking-wide text-primary">
            How Data Is Used
          </h2>
          <p className="font-body text-base leading-relaxed text-foreground">
            Your chosen display name and anonymous session ID are used solely
            to identify you within an active game session. This data is not
            used for analytics, advertising, profiling, or any purpose beyond
            facilitating gameplay.
          </p>
        </section>

        <hr className="my-8 border-primary/40" />

        <section className="space-y-4">
          <h2 className="font-display text-xl tracking-wide text-primary">
            Data Retention
          </h2>
          <p className="font-body text-base leading-relaxed text-foreground">
            Player records and game data are automatically deleted after the
            session ends. Game rooms expire within hours via an automated
            cleanup process. No long-term storage of player data occurs.
          </p>
        </section>

        <hr className="my-8 border-primary/40" />

        <section className="space-y-4">
          <h2 className="font-display text-xl tracking-wide text-primary">
            Third Parties
          </h2>
          <p className="font-body text-base leading-relaxed text-foreground">
            The application is hosted on Supabase (EU region) and Lovable.
            When launched as a Discord Activity, Discord OAuth is used to
            authenticate the session within Discord's platform. No data is
            shared with or sold to any other third parties.
          </p>
        </section>

        <hr className="my-8 border-primary/40" />

        <section className="space-y-4">
          <h2 className="font-display text-xl tracking-wide text-primary">
            Data Deletion
          </h2>
          <p className="font-body text-base leading-relaxed text-foreground">
            Because no personal data is stored beyond ephemeral game sessions,
            there is no persistent data to request deletion of. All records
            are purged automatically when sessions expire.
          </p>
        </section>

        <hr className="my-8 border-primary/40" />

        <section className="space-y-4">
          <h2 className="font-display text-xl tracking-wide text-primary">
            Cookies
          </h2>
          <p className="font-body text-base leading-relaxed text-foreground">
            Fractured Crown does not use tracking cookies. The only
            client-side storage used is the anonymous session token required
            for the application to function.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
