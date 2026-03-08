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

// ── Extended mock data for Demo simulation ──

export const MOCK_ALL_ROLES: PlayerRole[] = [
  { id: 1, player_id: 1, room_id: 1, role: 'loyalist', revealed_allies: [] },
  { id: 2, player_id: 2, room_id: 1, role: 'traitor', revealed_allies: [5] },
  { id: 3, player_id: 3, room_id: 1, role: 'loyalist', revealed_allies: [] },
  { id: 4, player_id: 4, room_id: 1, role: 'loyalist', revealed_allies: [] },
  { id: 5, player_id: 5, room_id: 1, role: 'usurper', revealed_allies: [] },
  { id: 6, player_id: 6, room_id: 1, role: 'traitor', revealed_allies: [5] },
  { id: 7, player_id: 7, room_id: 1, role: 'loyalist', revealed_allies: [] },
];

type EventLog = Tables<'event_log'>;
type ChatMessage = Tables<'chat_messages'>;
type Round = Tables<'rounds'>;

export const MOCK_ROUND: Round = {
  id: 1,
  room_id: 1,
  round_number: 1,
  herald_id: 1,
  lord_commander_id: 3,
  herald_hand: null,
  chancellor_hand: null,
  enacted_policy: null,
  power_triggered: null,
  veto_requested: false,
  veto_approved: null,
  chaos_policy: false,
  created_at: now,
};

export const MOCK_EVENTS: EventLog[] = [
  { id: 1, room_id: 1, round_id: 1, event_type: 'nomination', description: 'Aldric nominated Caius as Lord Commander.', metadata: null, created_at: now },
  { id: 2, room_id: 1, round_id: 1, event_type: 'vote_passed', description: 'The council voted Ja — Caius is Lord Commander.', metadata: null, created_at: now },
  { id: 3, room_id: 1, round_id: 1, event_type: 'policy_enacted', description: 'A Loyalist Edict was enacted.', metadata: null, created_at: now },
  { id: 4, room_id: 1, round_id: 1, event_type: 'vote_failed', description: 'The council voted Nein — nomination rejected.', metadata: null, created_at: now },
  { id: 5, room_id: 1, round_id: 1, event_type: 'policy_enacted', description: 'A Shadow Edict was enacted.', metadata: null, created_at: now },
  { id: 6, room_id: 1, round_id: 1, event_type: 'executive_power', description: 'Aldric used Investigate Loyalty on Brenna.', metadata: null, created_at: now },
  { id: 7, room_id: 1, round_id: 1, event_type: 'execution', description: 'Elric was executed by the Herald.', metadata: null, created_at: now },
  { id: 8, room_id: 1, round_id: 1, event_type: 'chaos_policy', description: 'The election tracker reached 3 — a chaos edict was enacted.', metadata: null, created_at: now },
];

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  { id: 1, room_id: 1, player_id: 1, content: 'I trust Caius. He should be Lord Commander.', created_at: now, phase: 'game' },
  { id: 2, room_id: 1, player_id: 2, content: 'Something feels wrong about that vote...', created_at: now, phase: 'game' },
  { id: 3, room_id: 1, player_id: 4, content: 'Two shadow edicts already? We need to be careful.', created_at: now, phase: 'game' },
  { id: 4, room_id: 1, player_id: 7, content: 'I say we investigate Brenna next round.', created_at: now, phase: 'game' },
];

export const MOCK_ROUND_HISTORY = [
  {
    round_id: 1, round_number: 1, herald_id: 1, lord_commander_id: 3,
    herald_hand: ['loyalist', 'shadow', 'loyalist'], chancellor_hand: ['loyalist', 'loyalist'],
    enacted_policy: 'loyalist' as const, power_triggered: null,
    veto_requested: false, veto_approved: false, chaos_policy: false, created_at: now,
  },
  {
    round_id: 2, round_number: 2, herald_id: 2, lord_commander_id: 4,
    herald_hand: ['shadow', 'shadow', 'loyalist'], chancellor_hand: ['shadow', 'loyalist'],
    enacted_policy: 'shadow' as const, power_triggered: null,
    veto_requested: false, veto_approved: false, chaos_policy: false, created_at: now,
  },
  {
    round_id: 3, round_number: 3, herald_id: 3, lord_commander_id: 6,
    herald_hand: ['shadow', 'loyalist', 'shadow'], chancellor_hand: ['shadow', 'shadow'],
    enacted_policy: 'shadow' as const, power_triggered: 'investigate_loyalty' as const,
    veto_requested: false, veto_approved: false, chaos_policy: false, created_at: now,
  },
  {
    round_id: 4, round_number: 4, herald_id: 4, lord_commander_id: 1,
    herald_hand: ['loyalist', 'loyalist', 'shadow'], chancellor_hand: ['loyalist', 'loyalist'],
    enacted_policy: 'loyalist' as const, power_triggered: null,
    veto_requested: false, veto_approved: false, chaos_policy: false, created_at: now,
  },
];
