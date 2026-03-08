import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Crown, Swords, Skull, Shield, Vote, Scroll, Eye, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import EdictTracker from './EdictTracker';
import PlayerCouncil from './PlayerCouncil';
import PolicyCardUI from './PolicyCardUI';
import {
  MOCK_PLAYERS,
  MOCK_PLAYERS_WITH_DEAD,
  MOCK_GAME_STATE_ELECTION,
  MOCK_GAME_STATE_NOMINATION,
  MOCK_GAME_STATE_EXECUTIVE,
  MOCK_VOTES_REVEALED,
} from '@/lib/tutorialMockData';

/* ─── Annotation callout ─── */
const Annotation = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.4, duration: 0.4 }}
    className="mt-5 border-l-2 border-primary/40 pl-4 font-body text-sm leading-relaxed text-foreground/60"
  >
    {children}
  </motion.div>
);

/* ─── Step definitions ─── */
interface TutorialStep {
  title: string;
  icon: React.ElementType;
  description: string;
  render: () => React.ReactNode;
}

const useSteps = (): TutorialStep[] => {
  const [selectedNominee, setSelectedNominee] = useState<number | null>(null);
  const [heraldDiscard, setHeraldDiscard] = useState<number | null>(null);
  const [lcEnact, setLcEnact] = useState<number | null>(null);

  return [
    /* 1 — The Realm */
    {
      title: 'The Realm',
      icon: Crown,
      description: 'The kingdom is torn between Loyalists who protect the throne, Traitors who seek to undermine it, and a hidden Usurper who covets the crown.',
      render: () => (
        <div className="flex flex-col items-center gap-6">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {([
              { icon: Crown, label: 'Loyalist', color: 'text-primary', border: 'border-primary/60', bg: 'bg-primary/5' },
              { icon: Swords, label: 'Traitor', color: 'text-accent-foreground', border: 'border-accent/60', bg: 'bg-accent/5' },
              { icon: Skull, label: 'Usurper', color: 'text-purple-400', border: 'border-purple-600/60', bg: 'bg-purple-900/10' },
            ] as const).map(({ icon: Icon, label, color, border, bg }, idx) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 * idx, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className={`flex flex-col items-center gap-2.5 rounded-lg border ${border} ${bg} p-4 sm:p-5`}
              >
                <Icon className={`h-8 w-8 sm:h-10 sm:w-10 ${color}`} />
                <span className={`font-display text-[10px] sm:text-xs uppercase tracking-widest ${color}`}>{label}</span>
              </motion.div>
            ))}
          </div>
          <Annotation>
            Roles are dealt secretly. Loyalists are blind. Traitors know their allies. The Usurper knows who the Traitors are — but they don&apos;t know the Usurper.
          </Annotation>
        </div>
      ),
    },

    /* 2 — The Council */
    {
      title: 'The Council',
      icon: Crown,
      description: 'Players form the Royal Council. The Herald leads each round and nominates a Lord Commander.',
      render: () => (
        <div className="flex flex-col gap-4">
          <PlayerCouncil
            players={MOCK_PLAYERS}
            gameState={MOCK_GAME_STATE_ELECTION}
            onlinePlayers={new Set(MOCK_PLAYERS.map(p => p.id))}
            currentPlayerId={1}
            selectablePlayerIds={[]}
          />
          <Annotation>
            The <span className="font-semibold text-primary">Herald</span> (gold crown) rotates clockwise. They hold nomination power and any triggered executive powers.
          </Annotation>
        </div>
      ),
    },

    /* 3 — Edict Trackers */
    {
      title: 'The Edict Trackers',
      icon: Scroll,
      description: "Three trackers govern the game\u2019s progress.",
      render: () => (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <EdictTracker type="loyalist" count={2} playerCount={7} />
            <EdictTracker type="shadow" count={3} playerCount={7} />
            <EdictTracker type="election" count={1} />
          </div>
          <Annotation>
            <strong className="text-primary">5 Loyalist Edicts</strong> = Loyalists win. <strong className="text-accent-foreground">6 Shadow Edicts</strong> = Traitors win. Shadow slots unlock executive powers. <strong className="text-foreground">Election Tracker</strong> at 3 = chaos policy from the deck.
          </Annotation>
        </div>
      ),
    },

    /* 4 — Nomination */
    {
      title: 'Nomination',
      icon: Crown,
      description: 'The Herald nominates a Lord Commander from the eligible council members.',
      render: () => {
        const selectableIds = MOCK_PLAYERS.filter(p => p.id !== 1).map(p => p.id);
        return (
          <div className="flex flex-col gap-4">
            <p className="font-body text-xs italic text-muted-foreground">
              Tap a player below to nominate them
            </p>
            <PlayerCouncil
              players={MOCK_PLAYERS}
              gameState={MOCK_GAME_STATE_NOMINATION}
              onlinePlayers={new Set(MOCK_PLAYERS.map(p => p.id))}
              currentPlayerId={1}
              selectablePlayerIds={selectableIds}
              onPlayerClick={(id) => setSelectedNominee(id)}
            />
            <AnimatePresence>
              {selectedNominee && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center font-body text-sm text-primary"
                >
                  You nominated <strong>{MOCK_PLAYERS.find(p => p.id === selectedNominee)?.display_name}</strong>!
                </motion.p>
              )}
            </AnimatePresence>
            <Annotation>
              The previous Herald and Lord Commander are <strong className="text-foreground">term-limited</strong> and cannot be nominated next round.
            </Annotation>
          </div>
        );
      },
    },

    /* 5 — The Vote */
    {
      title: 'The Vote',
      icon: Vote,
      description: 'The entire council votes Ja or Nein. A simple majority is needed.',
      render: () => (
        <div className="flex flex-col gap-5">
          <div className="text-center">
            <p className="mb-3 font-body text-foreground">
              Shall <span className="font-semibold text-primary">Caius</span> serve as Lord Commander?
            </p>
            <div className="flex justify-center gap-4">
              <Button className="gold-shimmer h-11 w-20 font-display text-base tracking-wider text-primary-foreground" disabled>Ja</Button>
              <Button variant="destructive" className="h-11 w-20 font-display text-base tracking-wider" disabled>Nein</Button>
            </div>
            <p className="mt-3 text-center font-mono text-[10px] text-muted-foreground/50">3 / 7 votes cast</p>
          </div>
          <Annotation>
            Votes are secret and revealed simultaneously. Keyboard shortcuts: <span className="font-mono text-foreground/80">J</span> for Ja, <span className="font-mono text-foreground/80">N</span> for Nein.
          </Annotation>
        </div>
      ),
    },

    /* 6 — Vote Results */
    {
      title: 'Vote Results',
      icon: Vote,
      description: 'The seals break and every vote is revealed at once.',
      render: () => (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap justify-center gap-2">
            {MOCK_VOTES_REVEALED.map((vote, idx) => {
              const player = MOCK_PLAYERS.find(p => p.id === vote.player_id);
              return (
                <motion.div
                  key={vote.id}
                  initial={{ scale: 0, rotateY: 180 }}
                  animate={{ scale: 1, rotateY: 0 }}
                  transition={{ delay: idx * 0.12, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className={`rounded border px-3 py-1.5 text-xs font-display ${
                    vote.vote === 'ja'
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-accent/50 bg-accent/10 text-accent-foreground'
                  }`}
                >
                  {player?.display_name}: {vote.vote === 'ja' ? 'Ja' : 'Nein'}
                </motion.div>
              );
            })}
          </div>
          <p className="text-center font-display text-xs tracking-wider text-primary/80">4 Ja — 3 Nein · Election passes</p>
          <Annotation>
            <strong className="text-foreground">Pass</strong> → legislative session begins. <strong className="text-foreground">Fail</strong> → Herald rotates, Election Tracker advances.
          </Annotation>
        </div>
      ),
    },

    /* 7 — Legislative (Herald) */
    {
      title: "Herald\u2019s Chamber",
      icon: Scroll,
      description: 'The Herald draws 3 Royal Edicts and discards one in secret. The remaining 2 pass to the Lord Commander.',
      render: () => {
        const cards = ['shadow', 'loyalist', 'shadow'] as const;
        return (
          <div className="flex flex-col gap-4">
            <p className="font-body text-xs italic text-muted-foreground">
              Click a card to discard it
            </p>
            <div className="flex justify-center gap-3 sm:gap-4">
              {cards.map((card, i) => (
                <motion.div
                  key={i}
                  animate={heraldDiscard === i ? { opacity: 0.25, scale: 0.88, y: 10 } : {}}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <PolicyCardUI
                    type={card}
                    faceUp={true}
                    onClick={() => setHeraldDiscard(i)}
                    disabled={heraldDiscard !== null}
                  />
                </motion.div>
              ))}
            </div>
            <AnimatePresence>
              {heraldDiscard !== null && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center font-body text-sm italic text-muted-foreground">
                  Discarded the {cards[heraldDiscard] === 'loyalist' ? 'Loyalist' : 'Shadow'} Edict. The remaining 2 pass onward.
                </motion.p>
              )}
            </AnimatePresence>
            <Annotation>
              The Herald may <strong className="text-foreground">not</strong> reveal cards or make binding promises. Lying is fair game — this is where social deduction lives.
            </Annotation>
          </div>
        );
      },
    },

    /* 8 — Legislative (Lord Commander) */
    {
      title: "Lord Commander\u2019s Decree",
      icon: Scroll,
      description: 'The Lord Commander receives 2 edicts and enacts one. The result is revealed to all.',
      render: () => {
        const cards = ['loyalist', 'shadow'] as const;
        return (
          <div className="flex flex-col gap-4">
            <p className="font-body text-xs italic text-muted-foreground">
              Click a card to enact it
            </p>
            <div className="flex justify-center gap-3 sm:gap-4">
              {cards.map((card, i) => (
                <motion.div
                  key={i}
                  animate={
                    lcEnact === i
                      ? { scale: 1.06 }
                      : lcEnact !== null
                      ? { opacity: 0.25, scale: 0.88 }
                      : {}
                  }
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <PolicyCardUI
                    type={card}
                    faceUp={true}
                    onClick={() => setLcEnact(i)}
                    disabled={lcEnact !== null}
                  />
                </motion.div>
              ))}
            </div>
            <AnimatePresence>
              {lcEnact !== null && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center font-body text-sm text-primary">
                  A <strong>{cards[lcEnact] === 'loyalist' ? 'Loyalist' : 'Shadow'}</strong> Edict has been enacted!
                </motion.p>
              )}
            </AnimatePresence>
            <Annotation>
              &ldquo;I gave you two Loyalist Edicts!&rdquo; &ldquo;You only gave me Shadow!&rdquo; — The core tension. Who&apos;s lying?
            </Annotation>
          </div>
        );
      },
    },

    /* 9 — Raven's Eye */
    {
      title: "Raven\u2019s Eye",
      icon: Eye,
      description: 'The Herald secretly peeks at the top 3 cards of the deck.',
      render: () => (
        <div className="flex flex-col gap-4">
          <div className="flex justify-center gap-3 sm:gap-4">
            {(['shadow', 'loyalist', 'shadow'] as const).map((card, i) => (
              <motion.div
                key={i}
                initial={{ rotateY: 180, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <PolicyCardUI type={card} faceUp={true} disabled />
              </motion.div>
            ))}
          </div>
          <Annotation>
            The Herald sees these but must <strong className="text-foreground">not share them</strong> truthfully. Bluffing about the deck state is a powerful strategy.
          </Annotation>
        </div>
      ),
    },

    /* 10 — Investigate & Execute */
    {
      title: 'Investigate & Execute',
      icon: Skull,
      description: 'Other executive powers let the Herald investigate loyalty or execute a player.',
      render: () => (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:p-4">
              <Search className="h-6 w-6 text-primary" />
              <span className="font-display text-[10px] uppercase tracking-widest text-primary">Investigate</span>
              <p className="text-center font-body text-[11px] text-muted-foreground leading-snug">
                View one player&apos;s faction secretly. You may lie about what you saw.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3 sm:p-4">
              <Skull className="h-6 w-6 text-accent-foreground" />
              <span className="font-display text-[10px] uppercase tracking-widest text-accent-foreground">Execute</span>
              <p className="text-center font-body text-[11px] text-muted-foreground leading-snug">
                Eliminate a player permanently. Execute the Usurper = instant Loyalist win.
              </p>
            </div>
          </div>
          <PlayerCouncil
            players={MOCK_PLAYERS_WITH_DEAD}
            gameState={MOCK_GAME_STATE_EXECUTIVE}
            onlinePlayers={new Set(MOCK_PLAYERS.map(p => p.id))}
            currentPlayerId={1}
            selectablePlayerIds={[]}
          />
          <Annotation>
            Executed players show crossed swords. A <strong className="text-foreground">Special Election</strong> power also exists, letting the Herald pick the next Herald directly.
          </Annotation>
        </div>
      ),
    },

    /* 11 — The Veto */
    {
      title: 'The Veto',
      icon: Swords,
      description: 'After 5 Shadow Edicts, the Lord Commander can propose a veto during legislation.',
      render: () => (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-card/60 p-5 text-center">
            <p className="mb-1 font-display text-xs uppercase tracking-widest text-primary/70">Veto Requested</p>
            <p className="mb-5 font-body text-sm text-muted-foreground">
              The Lord Commander wishes to veto this agenda.
            </p>
            <div className="flex justify-center gap-3">
              <Button size="sm" className="gold-shimmer font-display text-xs tracking-wider text-primary-foreground" disabled>Accept</Button>
              <Button size="sm" variant="destructive" className="font-display text-xs tracking-wider" disabled>Reject</Button>
            </div>
          </div>
          <Annotation>
            <strong className="text-foreground">Accept</strong> → both cards discarded, Election Tracker advances. <strong className="text-foreground">Reject</strong> → Lord Commander must enact one of the two cards.
          </Annotation>
        </div>
      ),
    },

    /* 12 — Victory & Defeat */
    {
      title: 'Victory & Defeat',
      icon: Shield,
      description: 'Four paths to ending the game. Know them — your strategy depends on it.',
      render: () => (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <EdictTracker type="loyalist" count={5} playerCount={7} />
              <p className="mt-2 font-display text-[10px] uppercase tracking-widest text-primary">5 Loyalist Edicts</p>
            </div>
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
              <EdictTracker type="shadow" count={6} playerCount={7} />
              <p className="mt-2 font-display text-[10px] uppercase tracking-widest text-accent-foreground">6 Shadow Edicts</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <Skull className="h-5 w-5 flex-shrink-0 text-primary" />
              <div>
                <p className="font-display text-[10px] uppercase tracking-widest text-primary">Usurper Executed</p>
                <p className="font-body text-[11px] text-muted-foreground">Loyalists win instantly</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
              <Crown className="h-5 w-5 flex-shrink-0 text-accent-foreground" />
              <div>
                <p className="font-display text-[10px] uppercase tracking-widest text-accent-foreground">Usurper Crowned</p>
                <p className="font-body text-[11px] text-muted-foreground">After 3+ Shadow Edicts</p>
              </div>
            </div>
          </div>
          <Annotation>
            After 3 Shadow Edicts, electing the Usurper as Lord Commander is <strong className="text-accent-foreground">instant defeat</strong>. Choose your allies carefully.
          </Annotation>
        </div>
      ),
    },
  ];
};

/* ─── Tutorial Component ─── */

interface HowToPlayTutorialProps {
  /** 'page' = full-page with sticky nav; 'embedded' = fits inside a dialog/panel */
  mode?: 'page' | 'embedded';
  onClose?: () => void;
}

const HowToPlayTutorial = ({ mode = 'page', onClose }: HowToPlayTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = mode === 'page' ? useNavigate() : undefined;
  const steps = useSteps();
  const step = steps[currentStep];

  const goNext = useCallback(() => setCurrentStep(s => Math.min(s + 1, steps.length - 1)), [steps.length]);
  const goPrev = useCallback(() => setCurrentStep(s => Math.max(s - 1, 0)), []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goNext(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
      if (e.key === 'Escape' && mode === 'embedded' && onClose) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, mode, onClose]);

  const isEmbedded = mode === 'embedded';

  const handleBack = () => {
    if (onClose) onClose();
    else navigate?.(-1);
  };

  const stepIndicator = (
    <div className="flex items-center justify-center gap-1">
      {steps.map((_, i) => (
        <button
          key={i}
          onClick={() => setCurrentStep(i)}
          className={`rounded-full transition-all duration-300 ${
            i === currentStep
              ? 'h-2 w-5 bg-primary'
              : i < currentStep
              ? 'h-1.5 w-1.5 bg-primary/40'
              : 'h-1.5 w-1.5 bg-border'
          }`}
          aria-label={`Step ${i + 1}`}
        />
      ))}
    </div>
  );

  const navigation = (
    <div className="flex items-center justify-between gap-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={goPrev}
        disabled={currentStep === 0}
        className="font-display text-xs tracking-wider text-muted-foreground hover:text-primary disabled:opacity-30"
      >
        <ChevronLeft className="mr-0.5 h-3.5 w-3.5" />
        Prev
      </Button>

      <span className="font-mono text-[10px] text-muted-foreground/50">
        {currentStep + 1}/{steps.length}
      </span>

      {currentStep === steps.length - 1 ? (
        <Button
          size="sm"
          onClick={handleBack}
          className="gold-shimmer font-display text-xs tracking-wider text-primary-foreground"
        >
          {isEmbedded ? 'Done' : 'Return'}
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={goNext}
          className="font-display text-xs tracking-wider text-muted-foreground hover:text-primary"
        >
          Next
          <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );

  const content = (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col"
      >
        {/* Step title */}
        <div className="mb-2 flex items-center gap-2.5">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <step.icon className="h-5 w-5 text-primary" />
          </motion.div>
          <h2 className="font-display text-base sm:text-lg uppercase tracking-wider text-primary leading-none">
            {step.title}
          </h2>
        </div>

        <p className="mb-5 font-body text-sm leading-relaxed text-foreground/70">
          {step.description}
        </p>

        {/* Live preview */}
        {step.render()}
      </motion.div>
    </AnimatePresence>
  );

  /* ── Embedded mode (inside dialog) ── */
  if (isEmbedded) {
    return (
      <div className="flex flex-col gap-4">
        {stepIndicator}
        <div className="min-h-[340px]">{content}</div>
        {navigation}
      </div>
    );
  }

  /* ── Full page mode ── */
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className="font-display text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
          >
            ← Back
          </button>
          {stepIndicator}
          <span className="font-display text-[10px] uppercase tracking-widest text-muted-foreground/50">
            Rules
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 sm:px-6">
        {content}
      </div>

      {/* Footer navigation */}
      <div className="sticky bottom-0 border-t border-border/50 bg-background/90 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-5 py-3 sm:px-6">
          {navigation}
        </div>
      </div>
    </div>
  );
};

export default HowToPlayTutorial;
