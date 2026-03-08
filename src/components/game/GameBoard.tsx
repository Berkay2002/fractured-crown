import { bgStyle, bgUrl, BACKGROUNDS } from '@/lib/backgroundImage';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Crown, Scroll, User, Shield, Skull, Eye, BookOpen, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EdictTracker from './EdictTracker';
import PlayerCouncil from './PlayerCouncil';
import VotingPanel from './VotingPanel';
import LegislativeOverlay from './LegislativeOverlay';
import ExecutivePowerOverlay from './ExecutivePowerOverlay';
import EventLogFeed from './EventLogFeed';
import ChatPanel from './ChatPanel';
import RoleReveal from './RoleReveal';
import PhaseTransitionBanner from './PhaseTransitionBanner';
import MobileActionBar from './MobileActionBar';
import HowToPlayModal from './HowToPlayModal';
import GameBoardSkeleton from './GameBoardSkeleton';
import ConnectionBanner from './ConnectionBanner';
import { useSoundContext } from '@/contexts/SoundContext';
import { useDiscordContext } from '@/contexts/DiscordContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { GameRoomState } from '@/hooks/useGameRoom';

interface GameBoardProps extends GameRoomState {
  roomCode: string;
  currentPlayerId: number | null;
  onlinePlayers: Set<number>;
}

const phaseLabels: Record<string, string> = {
  election: 'Election',
  legislative: 'Legislative Session',
  executive_action: 'Executive Power',
  game_over: 'Game Over',
};

const GameBoard = ({
  gameState,
  currentRound,
  players,
  myRole,
  votes,
  events,
  chatMessages,
  sendChat,
  loading,
  roomCode,
  currentPlayerId,
  onlinePlayers,
  heraldHand,
  setHeraldHand,
  chancellorHand,
  setChancellorHand,
  disconnected,
  activeReactions,
  sendReaction,
}: GameBoardProps) => {
  const [showRoleReveal, setShowRoleReveal] = useState(true);
  const [nominatingLC, setNominatingLC] = useState(false);
  const [nominating, setNominating] = useState(false);
  const [mobileVoting, setMobileVoting] = useState(false);
  const sound = useSoundContext();
  const { isDiscord } = useDiscordContext();

  const isHerald = gameState?.current_herald_id === currentPlayerId;
  const phase = gameState?.current_phase ?? 'election';
  const nominatedLC = players.find(p => p.id === gameState?.current_lord_commander_id);

  // Only show role reveal once
  useEffect(() => {
    const key = `role-seen-${gameState?.room_id}`;
    if (sessionStorage.getItem(key)) {
      setShowRoleReveal(false);
    }
  }, [gameState?.room_id]);

  const dismissRoleReveal = () => {
    setShowRoleReveal(false);
    if (gameState?.room_id) {
      sessionStorage.setItem(`role-seen-${gameState.room_id}`, '1');
    }
  };

  const handleMobileVote = useCallback(async (choice: 'ja' | 'nein') => {
    if (!gameState) return;
    setMobileVoting(true);
    sound.playVoteCast();
    const { data, error } = await supabase.functions.invoke('submit-vote', {
      body: { room_id: gameState.room_id, vote: choice },
    });
    setMobileVoting(false);
    if (error || data?.error) {
      toast({ title: 'Vote failed', description: data?.error || error?.message, variant: 'destructive' });
      return;
    }
    if (data?.herald_hand && isHerald) {
      setHeraldHand(data.herald_hand);
    }
  }, [gameState?.room_id, isHerald, setHeraldHand, sound]);

  if (!gameState || loading) return <GameBoardSkeleton />;

  // Role reveal overlay
  if (showRoleReveal && myRole) {
    return (
      <RoleReveal
        myRole={myRole}
        players={players}
        onDismiss={dismissRoleReveal}
      />
    );
  }

  const selectablePlayers = players
    .filter(p =>
      p.is_alive &&
      p.id !== currentPlayerId &&
      p.id !== gameState.last_elected_lord_commander_id &&
      (players.filter(pl => pl.is_alive).length <= 5 || p.id !== gameState.last_elected_herald_id)
    )
    .map(p => p.id);

  const roundVotes = votes.filter(v => v.round_id === currentRound?.id);
  const allVotesRevealed = roundVotes.length > 0 && roundVotes.every(v => v.revealed);
  const hasVotedAlready = roundVotes.some(v => v.player_id === currentPlayerId);

  const handleNominate = async (nomineeId: number) => {
    setNominatingLC(false);
    setNominating(true);
    const { data, error } = await supabase.functions.invoke('nominate-chancellor', {
      body: { room_id: gameState.room_id, nominee_id: nomineeId },
    });
    setNominating(false);
    if (error || data?.error) {
      toast({ title: 'Nomination failed', description: data?.error || error?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="noise-overlay relative flex min-h-screen flex-col bg-background" style={bgStyle(bgUrl(BACKGROUNDS.inGame))}>
      <div className="absolute inset-0 bg-[hsl(24_22%_6%/0.75)] pointer-events-none z-0" />
      <div className="relative z-10 flex flex-1 flex-col">
      <ConnectionBanner disconnected={disconnected} />
      <PhaseTransitionBanner phase={phase} />
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border px-2 py-2 md:px-4 md:py-3 gap-2">
        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          <Crown className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          <span className="font-mono text-xs md:text-sm tracking-widest text-primary">{roomCode}</span>
          <HowToPlayModal
            trigger={
              <button className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="How to Play">
                <BookOpen className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </button>
            }
          />
          <button
            onClick={sound.toggle}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={sound.enabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {sound.enabled ? <Volume2 className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <VolumeX className="h-3.5 w-3.5 md:h-4 md:w-4" />}
          </button>
          {isDiscord && (
            <span className="flex items-center gap-1 rounded border border-[hsl(235_86%_65%/0.3)] bg-[hsl(235_86%_65%/0.1)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[hsl(235_86%_65%)]">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
              Activity
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 md:gap-3 text-sm text-muted-foreground overflow-hidden">
          {currentRound && (
            <span className="font-display text-[10px] md:text-xs uppercase tracking-wider hidden sm:inline">
              Round {currentRound.round_number}
            </span>
          )}
          <span className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-display text-[10px] md:text-xs uppercase tracking-wider text-primary shrink-0">
            {phaseLabels[phase] ?? phase}
          </span>
          {myRole && (
            <span className={`flex items-center gap-1 shrink-0 rounded border px-1.5 py-0.5 font-display text-[10px] uppercase tracking-wider ${
              myRole.role === 'loyalist'
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-accent/30 bg-accent/10 text-accent-foreground'
            }`}>
              {myRole.role === 'loyalist' ? <Shield className="h-3 w-3" /> : myRole.role === 'usurper' ? <Skull className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              <span className="hidden sm:inline">
                {myRole.role === 'loyalist' ? 'Loyalist' : myRole.role === 'usurper' ? 'Usurper' : 'Traitor'}
              </span>
            </span>
          )}
          {currentPlayerId && players.length > 0 && (
            <span className="hidden md:flex items-center gap-1.5 rounded border border-border bg-muted/50 px-2 py-0.5 font-body text-xs text-foreground">
              <User className="h-3 w-3 text-muted-foreground" />
              {players.find(p => p.id === currentPlayerId)?.display_name ?? ''}
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 p-4 lg:flex-row">
        {/* Left: Game Area */}
        <div className="flex flex-1 flex-col gap-6">
          {/* Edict Trackers */}
          <div className="flex flex-wrap gap-6">
            <EdictTracker
              type="loyalist"
              count={gameState.loyalist_edicts_passed}
            />
            <EdictTracker
              type="shadow"
              count={gameState.shadow_edicts_passed}
              playerCount={players.length}
            />
            <EdictTracker
              type="election"
              count={gameState.election_tracker}
            />
          </div>

          {/* Player Council */}
          <div>
            <h2 className="mb-3 font-display text-xs uppercase tracking-widest text-muted-foreground">
              The Council
            </h2>
            <PlayerCouncil
              players={players}
              gameState={gameState}
              onlinePlayers={onlinePlayers}
              currentPlayerId={currentPlayerId}
              selectablePlayerIds={nominatingLC ? selectablePlayers : undefined}
              onPlayerClick={nominatingLC ? handleNominate : undefined}
              activeReactions={activeReactions}
              onSendReaction={sendReaction}
            />
          </div>

          {/* Active Phase Panel */}
          <div className="mt-2">
            {phase === 'election' && (
              <div className="space-y-4">
                {isHerald && !gameState.current_lord_commander_id && (
                  <div className="text-center">
                    {!nominatingLC ? (
                      <Button
                        onClick={() => setNominatingLC(true)}
                        disabled={nominating}
                        className="gold-shimmer font-display tracking-wider text-primary-foreground"
                      >
                        <Scroll className="mr-2 h-4 w-4" />
                        Nominate Lord Commander
                      </Button>
                    ) : (
                      <p className="font-body text-sm italic text-primary">
                        Select a player above to nominate...
                      </p>
                    )}
                  </div>
                )}

                {gameState.current_lord_commander_id && (
                  <VotingPanel
                    players={players}
                    votes={votes}
                    currentRoundId={currentRound?.id ?? null}
                    currentPlayerId={currentPlayerId}
                    nominatedPlayerName={nominatedLC?.display_name}
                    roomId={gameState.room_id}
                    isHerald={isHerald}
                    onHeraldHand={(hand) => setHeraldHand(hand)}
                  />
                )}
              </div>
            )}

            {phase === 'legislative' && (
              <LegislativeOverlay
                gameState={gameState}
                currentRound={currentRound}
                currentPlayerId={currentPlayerId}
                onClose={() => {}}
                heraldHand={heraldHand}
                setHeraldHand={setHeraldHand}
                chancellorHand={chancellorHand}
                setChancellorHand={setChancellorHand}
              />
            )}

            {phase === 'executive_action' && (
              <ExecutivePowerOverlay
                gameState={gameState}
                players={players}
                currentPlayerId={currentPlayerId}
                onlinePlayers={onlinePlayers}
              />
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="flex w-full flex-col gap-4 lg:w-72">
          <EventLogFeed events={events} />
          <ChatPanel
            messages={chatMessages}
            players={players}
            sendChat={sendChat}
          />
        </div>
      </div>

      {/* Mobile bottom action bar */}
      <MobileActionBar
        gameState={gameState}
        currentPlayerId={currentPlayerId}
        phase={phase}
        hasVoted={hasVotedAlready}
        allVotesRevealed={allVotesRevealed}
        hasNominatedLC={!!gameState.current_lord_commander_id}
        nominatingLC={nominatingLC}
        onVote={handleMobileVote}
        onStartNominate={() => setNominatingLC(true)}
        voting={mobileVoting}
        nominating={nominating}
      />

      {/* Bottom padding for mobile action bar */}
      <div className="h-16 md:hidden" />
      </div>
    </div>
  );
};

export default GameBoard;
