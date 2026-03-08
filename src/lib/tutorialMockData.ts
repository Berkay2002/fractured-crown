import type { Tables } from '@/integrations/supabase/types';

type Player = Tables<'players'>;
type GameState = Tables<'game_state'>;
type Vote = Tables<'votes'>;
type PlayerRole = Tables<'player_roles'>;

const now = new Date().toISOString();

export const MOCK_PLAYERS: Player[] = [
  { id: 1, room_id: 1, user_id: 'u1', display_name: 'Aldric', sigil: 'crown', seat_order: 0, is_alive: true, is_ready: true, is_spectator: false, joined_at: now },
  { id: 2, room_id: 1, user_id: 'u2', display_name: 'Brenna', sigil: 'wolf', seat_order: 1, is_alive: true, is_ready: true, is_spectator: false, joined_at: now },
  { id: 3, room_id: 1, user_id: 'u3', display_name: 'Caius', sigil: 'raven', seat_order: 2, is_alive: true, is_ready: true, is_spectator: false, joined_at: now },
  { id: 4, room_id: 1, user_id: 'u4', display_name: 'Dara', sigil: 'shield', seat_order: 3, is_alive: true, is_ready: true, is_spectator: false, joined_at: now },
  { id: 5, room_id: 1, user_id: 'u5', display_name: 'Elric', sigil: 'flame', seat_order: 4, is_alive: true, is_ready: true, is_spectator: false, joined_at: now },
  { id: 6, room_id: 1, user_id: 'u6', display_name: 'Freya', sigil: 'rose', seat_order: 5, is_alive: true, is_ready: true, is_spectator: false, joined_at: now },
  { id: 7, room_id: 1, user_id: 'u7', display_name: 'Gareth', sigil: 'dragon', seat_order: 6, is_alive: true, is_ready: true, is_spectator: false, joined_at: now },
];

export const MOCK_PLAYERS_WITH_DEAD: Player[] = MOCK_PLAYERS.map((p, i) =>
  i === 4 ? { ...p, is_alive: false } : p
);

export const MOCK_GAME_STATE_ELECTION: GameState = {
  id: 1,
  room_id: 1,
  current_phase: 'election',
  current_herald_id: 1,
  current_lord_commander_id: null,
  election_tracker: 0,
  loyalist_edicts_passed: 0,
  shadow_edicts_passed: 0,
  veto_unlocked: false,
  winner: null,
  active_power: null,
  last_elected_herald_id: null,
  last_elected_lord_commander_id: null,
  special_election_herald_pointer: null,
  updated_at: now,
};

export const MOCK_GAME_STATE_NOMINATION: GameState = {
  ...MOCK_GAME_STATE_ELECTION,
  current_herald_id: 1,
  current_lord_commander_id: null,
};

export const MOCK_GAME_STATE_VOTING: GameState = {
  ...MOCK_GAME_STATE_ELECTION,
  current_herald_id: 1,
  current_lord_commander_id: 3,
};

export const MOCK_GAME_STATE_LEGISLATIVE: GameState = {
  ...MOCK_GAME_STATE_ELECTION,
  current_phase: 'legislative',
  current_herald_id: 1,
  current_lord_commander_id: 3,
  loyalist_edicts_passed: 2,
  shadow_edicts_passed: 3,
};

export const MOCK_GAME_STATE_VETO: GameState = {
  ...MOCK_GAME_STATE_LEGISLATIVE,
  shadow_edicts_passed: 5,
  veto_unlocked: true,
};

export const MOCK_GAME_STATE_EXECUTIVE: GameState = {
  ...MOCK_GAME_STATE_ELECTION,
  current_phase: 'executive_action',
  current_herald_id: 1,
  active_power: 'execution',
  shadow_edicts_passed: 4,
  loyalist_edicts_passed: 2,
};

export const MOCK_GAME_STATE_LOYALIST_WIN: GameState = {
  ...MOCK_GAME_STATE_ELECTION,
  current_phase: 'game_over',
  loyalist_edicts_passed: 5,
  shadow_edicts_passed: 2,
  winner: 'loyalists_edicts',
};

export const MOCK_GAME_STATE_TRAITOR_WIN: GameState = {
  ...MOCK_GAME_STATE_ELECTION,
  current_phase: 'game_over',
  loyalist_edicts_passed: 1,
  shadow_edicts_passed: 6,
  winner: 'traitors_edicts',
};

export const MOCK_VOTES_PARTIAL: Vote[] = [
  { id: 1, room_id: 1, round_id: 1, player_id: 1, vote: 'ja', revealed: false, created_at: now },
  { id: 2, room_id: 1, round_id: 1, player_id: 2, vote: 'nein', revealed: false, created_at: now },
  { id: 3, room_id: 1, round_id: 1, player_id: 3, vote: 'ja', revealed: false, created_at: now },
];

export const MOCK_VOTES_REVEALED: Vote[] = [
  { id: 1, room_id: 1, round_id: 1, player_id: 1, vote: 'ja', revealed: true, created_at: now },
  { id: 2, room_id: 1, round_id: 1, player_id: 2, vote: 'nein', revealed: true, created_at: now },
  { id: 3, room_id: 1, round_id: 1, player_id: 3, vote: 'ja', revealed: true, created_at: now },
  { id: 4, room_id: 1, round_id: 1, player_id: 4, vote: 'ja', revealed: true, created_at: now },
  { id: 5, room_id: 1, round_id: 1, player_id: 5, vote: 'nein', revealed: true, created_at: now },
  { id: 6, room_id: 1, round_id: 1, player_id: 6, vote: 'ja', revealed: true, created_at: now },
  { id: 7, room_id: 1, round_id: 1, player_id: 7, vote: 'nein', revealed: true, created_at: now },
];

export const MOCK_ROLE_LOYALIST: PlayerRole = {
  id: 1, player_id: 1, room_id: 1, role: 'loyalist', revealed_allies: [],
};

export const MOCK_ROLE_TRAITOR: PlayerRole = {
  id: 2, player_id: 2, room_id: 1, role: 'traitor', revealed_allies: [5, 6],
};

export const MOCK_ROLE_USURPER: PlayerRole = {
  id: 3, player_id: 5, room_id: 1, role: 'usurper', revealed_allies: [],
};
