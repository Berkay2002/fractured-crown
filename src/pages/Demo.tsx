import { useState, useCallback, useMemo } from 'react';
import GameBoard from '@/components/game/GameBoard';
import GameOverScreen from '@/components/game/GameOverScreen';
import DebugPanel, { type DebugState } from '@/components/game/DebugPanel';
import {
  MOCK_PLAYERS,
  MOCK_GAME_STATE_ELECTION,
  MOCK_ROUND,
  MOCK_EVENTS,
  MOCK_CHAT_MESSAGES,
  MOCK_ROLE_LOYALIST,
  MOCK_ALL_ROLES,
  MOCK_VOTES_REVEALED,
} from '@/lib/tutorialMockData';
import type { Tables } from '@/integrations/supabase/types';
import type { GameRoomState, ActiveReaction } from '@/hooks/useGameRoom';

type GameState = Tables<'game_state'>;

const INITIAL_DEBUG: DebugState = {
  phase: 'election',
  shadowEdicts: 0,
  loyalistEdicts: 0,
  electionTracker: 0,
  heraldId: 1,
  lordCommanderId: null,
  vetoUnlocked: false,
  activePower: null,
  winner: null,
  deadPlayerIds: new Set(),
  decayOverride: null,
  heraldHand: null,
  chancellorHand: null,
};

const Demo = () => {
  const [debug, setDebug] = useState<DebugState>(INITIAL_DEBUG);

  const handleChange = useCallback((patch: Partial<DebugState>) => {
    setDebug(prev => ({ ...prev, ...patch }));
  }, []);

  // Build synthetic game state from debug controls
  const gameState: GameState = useMemo(() => ({
    ...MOCK_GAME_STATE_ELECTION,
    current_phase: debug.phase,
    shadow_edicts_passed: debug.shadowEdicts,
    loyalist_edicts_passed: debug.loyalistEdicts,
    election_tracker: debug.electionTracker,
    current_herald_id: debug.heraldId,
    current_lord_commander_id: debug.lordCommanderId,
    veto_unlocked: debug.vetoUnlocked,
    active_power: debug.activePower,
    winner: debug.winner,
  }), [debug]);

  // Apply dead players
  const players = useMemo(() =>
    MOCK_PLAYERS.map(p => ({
      ...p,
      is_alive: !debug.deadPlayerIds.has(p.id),
    })),
  [debug.deadPlayerIds]);

  const noopSendChat = useCallback(async (content: string) => {
    console.log('[Demo] sendChat:', content);
  }, []);

  const noopSendReaction = useCallback((reaction: string) => {
    console.log('[Demo] sendReaction:', reaction);
  }, []);

  const emptyReactions = useMemo(() => new Map<number, ActiveReaction>(), []);
  const onlinePlayers = useMemo(() => new Set(players.map(p => p.id)), [players]);

  const mockRoomState: GameRoomState = useMemo(() => ({
    gameState,
    currentRound: MOCK_ROUND,
    players,
    myRole: MOCK_ROLE_LOYALIST,
    votes: debug.phase === 'election' && debug.lordCommanderId ? MOCK_VOTES_REVEALED : [],
    events: MOCK_EVENTS,
    chatMessages: MOCK_CHAT_MESSAGES,
    loading: false,
    sendChat: noopSendChat,
    heraldHand: debug.heraldHand,
    setHeraldHand: (hand) => handleChange({ heraldHand: hand }),
    chancellorHand: debug.chancellorHand,
    setChancellorHand: (hand) => handleChange({ chancellorHand: hand }),
    allRoles: MOCK_ALL_ROLES,
    disconnected: false,
    activeReactions: emptyReactions,
    sendReaction: noopSendReaction,
    roomSettings: null,
  }), [gameState, players, debug.phase, debug.lordCommanderId, debug.heraldHand, debug.chancellorHand, noopSendChat, noopSendReaction, emptyReactions, handleChange]);

  const isGameOver = debug.phase === 'game_over' && debug.winner;

  return (
    <div className="relative min-h-screen bg-background">
      {isGameOver ? (
        <GameOverScreen
          gameState={gameState}
          players={players}
          events={MOCK_EVENTS}
          allRoles={MOCK_ALL_ROLES}
          isHost={true}
          room={{ id: 1, room_code: 'DEMO' }}
        />
      ) : (
        <GameBoard
          {...mockRoomState}
          roomCode="DEMO"
          currentPlayerId={1}
          onlinePlayers={onlinePlayers}
          decayStageOverride={debug.decayOverride ?? undefined}
        />
      )}

      <DebugPanel
        state={debug}
        onChange={handleChange}
        players={MOCK_PLAYERS}
      />
    </div>
  );
};

export default Demo;
