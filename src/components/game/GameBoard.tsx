import { useState, useEffect, useCallback } from 'react';
import { Crown, Scroll, User, Shield, Skull, Eye } from 'lucide-react';
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
  roomCode,
  currentPlayerId,
  onlinePlayers,
  heraldHand,
  setHeraldHand,
  chancellorHand,
  setChancellorHand,
}: GameBoardProps) => {
  const [showRoleReveal, setShowRoleReveal] = useState(true);
  const [nominatingLC, setNominatingLC] = useState(false);
  const [nominating, setNominating] = useState(false);
  const [mobileVoting, setMobileVoting] = useState(false);

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

  if (!gameState) return null;

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

  const handleMobileVote = useCallback(async (choice: 'ja' | 'nein') => {
    setMobileVoting(true);
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
  }, [gameState.room_id, isHerald, setHeraldHand]);

  const roundVotes = votes.filter(v => v.round_id === currentRound?.id);
  const allVotesRevealed = roundVotes.length > 0 && roundVotes.every(v => v.revealed);
  const hasVotedAlready = roundVotes.some(v => v.player_id === currentPlayerId);
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
    <div className="noise-overlay flex min-h-screen flex-col bg-background">
      <PhaseTransitionBanner phase={phase} />
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Crown className="h-5 w-5 text-primary" />
          <span className="font-mono text-sm tracking-widest text-primary">{roomCode}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {currentRound && (
            <span className="font-display text-xs uppercase tracking-wider">
              Round {currentRound.round_number}
            </span>
          )}
          <span className="rounded border border-primary/20 bg-primary/5 px-2 py-0.5 font-display text-xs uppercase tracking-wider text-primary">
            {phaseLabels[phase] ?? phase}
          </span>
          {myRole && (
            <span className={`flex items-center gap-1.5 rounded border px-2 py-0.5 font-display text-[10px] uppercase tracking-wider ${
              myRole.role === 'loyalist'
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-accent/30 bg-accent/10 text-accent-foreground'
            }`}>
              {myRole.role === 'loyalist' ? <Shield className="h-3 w-3" /> : myRole.role === 'usurper' ? <Skull className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {myRole.role === 'loyalist' ? 'Loyalist' : myRole.role === 'usurper' ? 'Usurper' : 'Traitor'}
            </span>
          )}
          {currentPlayerId && players.length > 0 && (
            <span className="flex items-center gap-1.5 rounded border border-border bg-muted/50 px-2 py-0.5 font-body text-xs text-foreground">
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
    </div>
  );
};

export default GameBoard;
