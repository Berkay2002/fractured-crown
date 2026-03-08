
-- ============================================================
-- Fractured Crown: Full Schema Migration (Phase 1)
-- ============================================================

-- Enums
create type room_status as enum ('lobby', 'in_progress', 'finished');
create type game_phase as enum ('election', 'legislative', 'executive_action', 'game_over');
create type player_role as enum ('loyalist', 'traitor', 'usurper');
create type policy_type as enum ('loyalist', 'shadow');
create type pile_type as enum ('draw', 'discard');
create type vote_choice as enum ('ja', 'nein');
create type executive_power as enum ('policy_peek', 'investigate_loyalty', 'special_election', 'execution');
create type win_condition as enum ('loyalists_edicts', 'usurper_executed', 'traitors_edicts', 'usurper_crowned');

-- ============================================================
-- rooms (create without cross-table policy first)
-- ============================================================
create table rooms (
  id bigint generated always as identity primary key,
  room_code text not null unique,
  host_player_id bigint,
  status room_status not null default 'lobby',
  player_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table rooms enable row level security;
alter table rooms force row level security;

create policy rooms_read on rooms for select to authenticated using (true);

create index rooms_room_code_idx on rooms (room_code);
create index rooms_host_player_id_idx on rooms (host_player_id);

-- ============================================================
-- players
-- ============================================================
create table players (
  id bigint generated always as identity primary key,
  room_id bigint not null references rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  seat_order int not null, -- placeholder; reshuffled randomly on game start
  is_alive boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id),
  unique (room_id, seat_order)
);

alter table players enable row level security;
alter table players force row level security;

create policy players_read on players for select to authenticated using (
  room_id in (
    select p.room_id from players p where p.user_id = (select auth.uid())
  )
);

create policy players_insert on players for insert to authenticated with check (
  user_id = (select auth.uid())
);

create index players_room_id_idx on players (room_id);
create index players_user_id_idx on players (user_id);
create index players_alive_idx on players (room_id) where is_alive = true;

-- Now add the deferred rooms update policy (players table exists now)
create policy rooms_host_update on rooms for update to authenticated using (
  (select auth.uid()) = (
    select user_id from players where id = rooms.host_player_id
  )
);

-- Add FK constraint for host_player_id now that players exists
alter table rooms add constraint rooms_host_player_id_fk foreign key (host_player_id) references players(id) on delete set null;

-- ============================================================
-- player_roles
-- ============================================================
create table player_roles (
  id bigint generated always as identity primary key,
  player_id bigint not null references players(id) on delete cascade,
  room_id bigint not null references rooms(id) on delete cascade,
  role player_role not null,
  revealed_allies jsonb not null default '[]',
  unique (player_id, room_id)
);

alter table player_roles enable row level security;
alter table player_roles force row level security;

create policy player_roles_own_only on player_roles for select to authenticated using (
  player_id in (
    select id from players where user_id = (select auth.uid())
  )
);

create index player_roles_player_id_idx on player_roles (player_id);
create index player_roles_room_id_idx on player_roles (room_id);

-- ============================================================
-- game_state
-- ============================================================
create table game_state (
  id bigint generated always as identity primary key,
  room_id bigint not null unique references rooms(id) on delete cascade,
  current_phase game_phase not null default 'election',
  current_herald_id bigint references players(id),
  current_lord_commander_id bigint references players(id),
  last_elected_herald_id bigint references players(id),
  last_elected_lord_commander_id bigint references players(id),
  election_tracker int not null default 0,
  shadow_edicts_passed int not null default 0,
  loyalist_edicts_passed int not null default 0,
  veto_unlocked boolean not null default false,
  active_power executive_power,
  winner win_condition,
  updated_at timestamptz not null default now()
);

alter table game_state enable row level security;
alter table game_state force row level security;

create policy game_state_read on game_state for select to authenticated using (
  room_id in (
    select room_id from players where user_id = (select auth.uid())
  )
);

create index game_state_room_id_idx on game_state (room_id);
create index game_state_current_herald_id_idx on game_state (current_herald_id);
create index game_state_current_lord_cmd_id_idx on game_state (current_lord_commander_id);

-- ============================================================
-- rounds
-- ============================================================
create table rounds (
  id bigint generated always as identity primary key,
  room_id bigint not null references rooms(id) on delete cascade,
  round_number int not null,
  herald_id bigint not null references players(id),
  lord_commander_id bigint references players(id),
  herald_hand jsonb,
  chancellor_hand jsonb,
  enacted_policy policy_type,
  power_triggered executive_power,
  veto_requested boolean not null default false,
  veto_approved boolean,
  chaos_policy boolean not null default false,
  created_at timestamptz not null default now(),
  unique (room_id, round_number)
);

alter table rounds enable row level security;
alter table rounds force row level security;

create policy rounds_read on rounds for select to authenticated using (
  room_id in (
    select room_id from players where user_id = (select auth.uid())
  )
);

create index rounds_room_id_idx on rounds (room_id);
create index rounds_herald_id_idx on rounds (herald_id);
create index rounds_lord_commander_id_idx on rounds (lord_commander_id);

-- ============================================================
-- policy_deck
-- ============================================================
create table policy_deck (
  id bigint generated always as identity primary key,
  room_id bigint not null references rooms(id) on delete cascade,
  pile pile_type not null,
  card_type policy_type not null,
  position int not null,
  unique (room_id, pile, position)
);

alter table policy_deck enable row level security;
alter table policy_deck force row level security;

create index policy_deck_room_id_idx on policy_deck (room_id);
create index policy_deck_room_pile_idx on policy_deck (room_id, pile);

-- ============================================================
-- votes
-- ============================================================
create table votes (
  id bigint generated always as identity primary key,
  round_id bigint not null references rounds(id) on delete cascade,
  room_id bigint not null references rooms(id) on delete cascade,
  player_id bigint not null references players(id) on delete cascade,
  vote vote_choice not null,
  revealed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (round_id, player_id)
);

alter table votes enable row level security;
alter table votes force row level security;

create policy votes_read_revealed on votes for select to authenticated using (
  revealed = true and room_id in (
    select room_id from players where user_id = (select auth.uid())
  )
);

create policy votes_insert_own on votes for insert to authenticated with check (
  player_id in (
    select id from players where user_id = (select auth.uid())
  )
);

create index votes_round_id_idx on votes (round_id);
create index votes_room_id_idx on votes (room_id);
create index votes_player_id_idx on votes (player_id);
create index votes_unrevealed_idx on votes (round_id) where revealed = false;

-- ============================================================
-- presidential_actions
-- ============================================================
create table presidential_actions (
  id bigint generated always as identity primary key,
  room_id bigint not null references rooms(id) on delete cascade,
  round_id bigint not null references rounds(id) on delete cascade,
  acting_player_id bigint not null references players(id),
  action_type executive_power not null,
  target_player_id bigint references players(id),
  result jsonb,
  created_at timestamptz not null default now()
);

alter table presidential_actions enable row level security;
alter table presidential_actions force row level security;

create policy presidential_actions_own on presidential_actions for select to authenticated using (
  acting_player_id in (
    select id from players where user_id = (select auth.uid())
  )
);

create index presidential_actions_room_id_idx on presidential_actions (room_id);
create index presidential_actions_round_id_idx on presidential_actions (round_id);
create index presidential_actions_acting_player_id_idx on presidential_actions (acting_player_id);
create index presidential_actions_target_player_id_idx on presidential_actions (target_player_id);

-- ============================================================
-- event_log
-- ============================================================
create table event_log (
  id bigint generated always as identity primary key,
  room_id bigint not null references rooms(id) on delete cascade,
  round_id bigint references rounds(id),
  event_type text not null,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table event_log enable row level security;
alter table event_log force row level security;

create policy event_log_read on event_log for select to authenticated using (
  room_id in (
    select room_id from players where user_id = (select auth.uid())
  )
);

create index event_log_room_id_idx on event_log (room_id);
create index event_log_room_created_at_idx on event_log (room_id, created_at desc);

-- ============================================================
-- chat_messages
-- ============================================================
create table chat_messages (
  id bigint generated always as identity primary key,
  room_id bigint not null references rooms(id) on delete cascade,
  player_id bigint not null references players(id) on delete cascade,
  content text not null check (char_length(content) <= 500),
  created_at timestamptz not null default now()
);

alter table chat_messages enable row level security;
alter table chat_messages force row level security;

create policy chat_read on chat_messages for select to authenticated using (
  room_id in (
    select room_id from players where user_id = (select auth.uid())
  )
);

create policy chat_insert_own on chat_messages for insert to authenticated with check (
  player_id in (
    select id from players where user_id = (select auth.uid())
  )
);

create index chat_messages_room_id_idx on chat_messages (room_id);
create index chat_messages_room_created_at_idx on chat_messages (room_id, created_at desc);

-- ============================================================
-- Enable Realtime
-- ============================================================
alter publication supabase_realtime add table game_state;
alter publication supabase_realtime add table rounds;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table event_log;
alter publication supabase_realtime add table chat_messages;
