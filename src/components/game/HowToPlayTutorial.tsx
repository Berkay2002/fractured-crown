import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Crown, Swords, Skull, Shield, Vote, Scroll, Eye, Search, BookOpen } from 'lucide-react';
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
  MOCK_GAME_STATE_VOTING,
  MOCK_GAME_STATE_LEGISLATIVE,
  MOCK_GAME_STATE_VETO,
  MOCK_GAME_STATE_EXECUTIVE,
  MOCK_GAME_STATE_LOYALIST_WIN,
  MOCK_GAME_STATE_TRAITOR_WIN,
  MOCK_VOTES_REVEALED,
} from '@/lib/tutorialMockData';

/* ─── Annotation callout ─── */
const Annotation = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-4 border-l-2 border-primary/50 pl-4 font-body text-sm leading-relaxed text-foreground/70">
    {children}
  </div>
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
          <div className="grid grid-cols-3 gap-4">
            {([
              { role: 'loyalist', icon: Crown, label: 'Loyalist', color: 'text-primary', border: 'border-primary', bg: 'bg-primary/10', glow: 'shadow-[0_0_24px_hsl(var(--primary)/0.2)]' },
              { role: 'traitor', icon: Swords, label: 'Traitor', color: 'text-accent-foreground', border: 'border-accent', bg: 'bg-accent/10', glow: 'shadow-[0_0_24px_hsl(var(--accent)/0.2)]' },
              { role: 'usurper', icon: Skull, label: 'Usurper', color: 'text-purple-400', border: 'border-purple-600', bg: 'bg-purple-900/20', glow: 'shadow-[0_0_24px_rgba(147,51,234,0.2)]' },
            ] as const).map(({ icon: Icon, label, color, border, bg, glow }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`flex flex-col items-center gap-3 rounded-xl border-2 ${border} ${bg} ${glow} p-6`}
              >
                <Icon className={`h-12 w-12 ${color}`} />
                <span className={`font-display text-sm uppercase tracking-widest ${color}`}>{label}</span>
              </motion.div>
            ))}
          </div>
          <Annotation>
            At the start of each game, roles are dealt secretly. Loyalists don't know each other. Traitors know their allies. The Usurper knows who the Traitors are — but they don't know the Usurper.
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
          <div className="overflow-hidden rounded-lg border border-border bg-card/50 p-4">
            <PlayerCouncil
              players={MOCK_PLAYERS}
              gameState={MOCK_GAME_STATE_ELECTION}
              onlinePlayers={new Set(MOCK_PLAYERS.map(p => p.id))}
              currentPlayerId={1}
              selectablePlayerIds={[]}
            />
          </div>
          <Annotation>
            The <span className="font-semibold text-primary">Herald</span> (gold crown badge) rotates clockwise each round. They hold the power of nomination and any executive powers that are triggered.
          </Annotation>
        </div>
      ),
    },

    /* 3 — Edict Trackers */
    {
      title: 'The Edict Trackers',
      icon: Scroll,
      description: 'Three trackers govern the game's progress: Loyalist Edicts, Shadow Edicts, and the Election Tracker.',
      render: () => (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-card/50 p-4">
            <EdictTracker type="loyalist" count={2} playerCount={7} />
            <EdictTracker type="shadow" count={3} playerCount={7} />
            <EdictTracker type="election" count={1} />
          </div>
          <Annotation>
            <strong className="text-primary">5 Loyalist Edicts</strong> = Loyalists win. <strong className="text-accent-foreground">6 Shadow Edicts</strong> = Traitors win. Shadow Edict slots unlock executive powers based on player count. If the <strong className="text-foreground">Election Tracker</strong> hits 3, a chaos policy is enacted from the top of the deck.
          </Annotation>
        </div>
      ),
    },

    /* 4 — Nomination */
    {
      title: 'Nomination',
      icon: Crown,
      description: 'The Herald must nominate a Lord Commander from the eligible members of the council.',
      render: () => {
        const selectableIds = MOCK_PLAYERS.filter(p => p.id !== 1).map(p => p.id);
        return (
          <div className="flex flex-col gap-4">
            <p className="text-center font-body text-sm text-muted-foreground">
              Try clicking a player to nominate them:
            </p>
            <div className="overflow-hidden rounded-lg border border-border bg-card/50 p-4">
              <PlayerCouncil
                players={MOCK_PLAYERS}
                gameState={MOCK_GAME_STATE_NOMINATION}
                onlinePlayers={new Set(MOCK_PLAYERS.map(p => p.id))}
                currentPlayerId={1}
                selectablePlayerIds={selectableIds}
                onPlayerClick={(id) => setSelectedNominee(id)}
              />
            </div>
            {selectedNominee && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center font-body text-sm text-primary"
              >
                You nominated <strong>{MOCK_PLAYERS.find(p => p.id === selectedNominee)?.display_name}</strong> as Lord Commander!
              </motion.p>
            )}
            <Annotation>
              The previous Herald and Lord Commander are <strong className="text-foreground">term-limited</strong> — they cannot be nominated for the next round (unless a failed election clears term limits).
            </Annotation>
          </div>
        );
      },
    },

    /* 5 — The Vote */
    {
      title: 'The Vote',
      icon: Vote,
      description: 'Once nominated, the entire council votes Ja (yes) or Nein (no). A simple majority is needed to approve.',
      render: () => (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-card/50 p-6">
            <h4 className="mb-3 text-center font-display text-sm uppercase tracking-widest text-muted-foreground">Council Vote</h4>
            <p className="mb-4 text-center font-body text-foreground">
              Shall <span className="font-semibold text-primary">Caius</span> serve as Lord Commander?
            </p>
            <div className="flex justify-center gap-4">
              <Button className="gold-shimmer h-12 w-24 font-display text-lg tracking-wider text-primary-foreground" disabled>Ja</Button>
              <Button variant="destructive" className="h-12 w-24 font-display text-lg tracking-wider" disabled>Nein</Button>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">3 / 7 votes cast</p>
          </div>
          <Annotation>
            Votes are cast secretly and revealed simultaneously once everyone has voted. Use keyboard shortcuts <span className="font-mono text-foreground">J</span> and <span className="font-mono text-foreground">N</span> for quick voting.
          </Annotation>
        </div>
      ),
    },

    /* 6 — Vote Results */
    {
      title: 'Vote Results',
      icon: Vote,
      description: 'When all votes are in, the seals are broken and every vote is revealed at once.',
      render: () => (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-card/50 p-6">
            <h4 className="mb-3 text-center font-display text-sm uppercase tracking-widest text-muted-foreground">Council Vote</h4>
            <div className="flex flex-wrap justify-center gap-2">
              {MOCK_VOTES_REVEALED.map((vote, idx) => {
                const player = MOCK_PLAYERS.find(p => p.id === vote.player_id);
                return (
                  <motion.div
                    key={vote.id}
                    initial={{ scale: 0, rotateY: 180 }}
                    animate={{ scale: 1, rotateY: 0 }}
                    transition={{ delay: idx * 0.15, duration: 0.5 }}
                    className={`rounded border px-3 py-1.5 text-xs font-display ${
                      vote.vote === 'ja'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-accent bg-accent/10 text-accent-foreground'
                    }`}
                  >
                    {player?.display_name}: {vote.vote === 'ja' ? 'Ja' : 'Nein'}
                  </motion.div>
                );
              })}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">4 Ja — 3 Nein · Election passes!</p>
          </div>
          <Annotation>
            If the vote <strong className="text-foreground">passes</strong> (majority Ja), the legislative session begins. If it <strong className="text-foreground">fails</strong>, the Herald token moves clockwise and the Election Tracker advances by one.
          </Annotation>
        </div>
      ),
    },

    /* 7 — Legislative (Herald) */
    {
      title: 'Herald\'s Chamber',
      icon: Scroll,
      description: 'The Herald draws 3 Royal Edicts and must discard one in secret, passing the remaining 2 to the Lord Commander.',
      render: () => {
        const cards = ['shadow', 'loyalist', 'shadow'] as const;
        return (
          <div className="flex flex-col gap-4">
            <p className="text-center font-body text-sm text-muted-foreground">
              Click a card to discard it:
            </p>
            <div className="flex justify-center gap-4">
              {cards.map((card, i) => (
                <motion.div
                  key={i}
                  animate={heraldDiscard === i ? { opacity: 0.3, scale: 0.9, y: 8 } : {}}
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
            {heraldDiscard !== null && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center font-body text-sm italic text-muted-foreground">
                You discarded the {cards[heraldDiscard] === 'loyalist' ? 'Loyalist' : 'Shadow'} Edict. The remaining 2 pass to the Lord Commander.
              </motion.p>
            )}
            <Annotation>
              The Herald may <strong className="text-foreground">not</strong> reveal their cards or make binding promises. Lying and deception are fair game — this is where the social deduction happens.
            </Annotation>
          </div>
        );
      },
    },

    /* 8 — Legislative (Lord Commander) */
    {
      title: 'Lord Commander\'s Decree',
      icon: Scroll,
      description: 'The Lord Commander receives 2 edicts and must enact one. The enacted policy is revealed to the entire council.',
      render: () => {
        const cards = ['loyalist', 'shadow'] as const;
        return (
          <div className="flex flex-col gap-4">
            <p className="text-center font-body text-sm text-muted-foreground">
              Click a card to enact it:
            </p>
            <div className="flex justify-center gap-4">
              {cards.map((card, i) => (
                <motion.div
                  key={i}
                  animate={lcEnact === i ? { scale: 1.05, boxShadow: '0 0 30px hsl(var(--primary) / 0.5)' } : lcEnact !== null ? { opacity: 0.3, scale: 0.9 } : {}}
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
            {lcEnact !== null && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center font-body text-sm text-primary">
                A <strong>{cards[lcEnact] === 'loyalist' ? 'Loyalist' : 'Shadow'}</strong> Edict has been enacted!
              </motion.p>
            )}
            <Annotation>
              Conflicts between the Herald and Lord Commander about what cards were available create the core tension. "I gave you two Loyalist Edicts!" "You only gave me Shadow ones!" — Who's lying?
            </Annotation>
          </div>
        );
      },
    },

    /* 9 — Raven's Eye */
    {
      title: 'Shadow Powers: Raven\'s Eye',
      icon: Eye,
      description: 'After certain Shadow Edicts, the Herald gains an executive power. Raven\'s Eye lets them secretly peek at the top 3 cards of the deck.',
      render: () => (
        <div className="flex flex-col gap-4">
          <div className="flex justify-center gap-4">
            {(['shadow', 'loyalist', 'shadow'] as const).map((card, i) => (
              <motion.div
                key={i}
                initial={{ rotateY: 180, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.2 }}
              >
                <PolicyCardUI type={card} faceUp={true} disabled />
              </motion.div>
            ))}
          </div>
          <Annotation>
            The Herald sees these cards but must <strong className="text-foreground">not share them</strong> — at least not truthfully. You might bluff about what you saw to manipulate the council's trust.
          </Annotation>
        </div>
      ),
    },

    /* 10 — Investigate & Execute */
    {
      title: 'Shadow Powers: Investigate & Execute',
      icon: Skull,
      description: 'Other powers let the Herald investigate a player\'s loyalty or execute a player outright.',
      render: () => (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card/50 p-4">
              <Search className="h-8 w-8 text-primary" />
              <span className="font-display text-xs uppercase tracking-widest text-primary">Investigate</span>
              <p className="text-center font-body text-xs text-muted-foreground">
                Secretly view one player's faction card. You learn if they are Loyalist or Traitor — but you may lie about the result.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 rounded-lg border border-accent/30 bg-card/50 p-4">
              <Skull className="h-8 w-8 text-accent-foreground" />
              <span className="font-display text-xs uppercase tracking-widest text-accent-foreground">Execute</span>
              <p className="text-center font-body text-xs text-muted-foreground">
                Eliminate a player from the game. If you execute the Usurper, Loyalists win immediately.
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-card/50 p-4">
            <PlayerCouncil
              players={MOCK_PLAYERS_WITH_DEAD}
              gameState={MOCK_GAME_STATE_EXECUTIVE}
              onlinePlayers={new Set(MOCK_PLAYERS.map(p => p.id))}
              currentPlayerId={1}
              selectablePlayerIds={[]}
            />
          </div>
          <Annotation>
            Executed players are removed from the council (shown with crossed swords). There is also a <strong className="text-foreground">Special Election</strong> power that lets the Herald choose the next Herald directly.
          </Annotation>
        </div>
      ),
    },

    /* 11 — The Veto */
    {
      title: 'The Veto',
      icon: Swords,
      description: 'After 5 Shadow Edicts, the Lord Commander gains the power to propose a veto during the legislative session.',
      render: () => (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border-2 border-border bg-card p-6 text-center">
            <h4 className="mb-2 font-display text-sm uppercase tracking-widest text-primary">Veto Requested</h4>
            <p className="mb-6 font-body text-sm text-muted-foreground">
              The Lord Commander wishes to veto this agenda. Do you accept?
            </p>
            <div className="flex justify-center gap-4">
              <Button className="gold-shimmer font-display tracking-wider text-primary-foreground" disabled>Accept Veto</Button>
              <Button variant="destructive" className="font-display tracking-wider" disabled>Reject Veto</Button>
            </div>
          </div>
          <Annotation>
            If the Herald <strong className="text-foreground">accepts</strong>, both cards are discarded and the Election Tracker advances. If <strong className="text-foreground">rejected</strong>, the Lord Commander must enact one of the two cards. The veto is a last resort — use it wisely.
          </Annotation>
        </div>
      ),
    },

    /* 12 — Victory & Defeat */
    {
      title: 'Victory & Defeat',
      icon: Shield,
      description: 'There are four ways the game can end. Know them well — your strategy depends on it.',
      render: () => (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <h5 className="mb-2 font-display text-xs uppercase tracking-widest text-primary">Loyalist Victory</h5>
              <EdictTracker type="loyalist" count={5} playerCount={7} />
              <p className="mt-2 font-body text-xs text-muted-foreground">Enact 5 Loyalist Edicts</p>
            </div>
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
              <h5 className="mb-2 font-display text-xs uppercase tracking-widest text-accent-foreground">Traitor Victory</h5>
              <EdictTracker type="shadow" count={6} playerCount={7} />
              <p className="mt-2 font-body text-xs text-muted-foreground">Enact 6 Shadow Edicts</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center">
              <Skull className="mx-auto mb-2 h-8 w-8 text-primary" />
              <p className="font-display text-xs uppercase tracking-widest text-primary">Usurper Executed</p>
              <p className="mt-1 font-body text-xs text-muted-foreground">Loyalists win instantly</p>
            </div>
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 text-center">
              <Crown className="mx-auto mb-2 h-8 w-8 text-accent-foreground" />
              <p className="font-display text-xs uppercase tracking-widest text-accent-foreground">Usurper Crowned</p>
              <p className="mt-1 font-body text-xs text-muted-foreground">Elected as Lord Commander after 3+ Shadow Edicts</p>
            </div>
          </div>
          <Annotation>
            As more Shadow Edicts pass, the stakes rise. After 3 Shadow Edicts, electing the Usurper as Lord Commander means <strong className="text-accent-foreground">instant defeat</strong> for the Loyalists. Choose your allies carefully.
          </Annotation>
        </div>
      ),
    },
  ];
};

/* ─── Tutorial Component ─── */
const HowToPlayTutorial = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const steps = useSteps();
  const step = steps[currentStep];

  return (
    <div className="relative min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="font-display text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
          >
            ← Back
          </button>
          <span className="font-display text-xs uppercase tracking-widest text-muted-foreground">
            {currentStep + 1} / {steps.length}
          </span>
          <BookOpen className="h-4 w-4 text-primary" />
        </div>

        {/* Step dots */}
        <div className="mx-auto flex max-w-3xl justify-center gap-1.5 px-4 pb-3">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? 'w-6 bg-primary'
                  : i < currentStep
                  ? 'w-1.5 bg-primary/40'
                  : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step header */}
            <div className="mb-6 flex items-center gap-3">
              <step.icon className="h-6 w-6 text-primary" />
              <h2 className="font-display text-xl uppercase tracking-wider text-primary">
                {step.title}
              </h2>
            </div>

            <p className="mb-8 font-body text-base leading-relaxed text-foreground/80">
              {step.description}
            </p>

            {/* Live component preview */}
            <div className="rounded-xl border border-border bg-card/30 p-4 sm:p-6">
              {step.render()}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(s => s - 1)}
            disabled={currentStep === 0}
            className="border-primary/30 font-display text-xs tracking-wider text-primary hover:bg-primary/10"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>

          {currentStep === steps.length - 1 ? (
            <Button
              onClick={() => navigate(-1)}
              className="gold-shimmer font-display tracking-wider text-primary-foreground"
            >
              Return to the Realm
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentStep(s => s + 1)}
              className="gold-shimmer font-display text-xs tracking-wider text-primary-foreground"
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HowToPlayTutorial;
