// Discord Activity Rich Presence payload builder

interface ActivityPayload {
  details: string;
  state: string;
  instance: boolean;
}

interface LobbyParams {
  roomCode: string;
  playerCount: number;
}

interface GameParams {
  round: number;
  phase: 'election' | 'legislative' | 'executive_action' | 'game_over';
}

export function buildLobbyActivity({ roomCode, playerCount }: LobbyParams): ActivityPayload {
  return {
    details: 'Fractured Crown',
    state: `In Lobby · Room ${roomCode} · ${playerCount} players`,
    instance: true,
  };
}

export function buildGameActivity({ round, phase }: GameParams): ActivityPayload {
  const stateMap: Record<string, string> = {
    election: `Round ${round} · The Council Votes`,
    legislative: `Round ${round} · The Herald Deliberates`,
    executive_action: `Round ${round} · Presidential Power`,
    game_over: "The Kingdom's Fate is Sealed",
  };

  return {
    details: 'Fractured Crown',
    state: stateMap[phase] ?? `Round ${round}`,
    instance: true,
  };
}
