# Fractured Crown — Product Requirements Document

> A web-based social deduction game for 5–10 players, based on Secret Hitler, reskinned as a fantasy kingdom betrayal game.

---

## 1. Overview

Fractured Crown is a browser-based real-time social deduction game for 5–10 players, faithfully adapted from the mechanics of Secret Hitler and reskinned in a dark fantasy kingdom setting. Players are secretly divided into two factions: the **Loyalists** (good team) who seek to protect the realm, and the **Traitors** (evil team) who serve the Shadow Court. Hidden among the Traitors is **The Usurper** — a single player whose coronation as Lord Commander spells the kingdom's fall.

Each round, players elect a **Herald** (President) and a **Lord Commander** (Chancellor) who together pass a **Royal Edict** — either a Loyalist decree or a Shadow decree — into law. Traitors work covertly to flood the kingdom with Shadow Edicts, while Loyalists debate, vote, and investigate to root them out. As Shadow Edicts accumulate, the Herald gains powerful executive abilities: spying on loyalty, calling emergency elections, and ordering executions.

The game is played entirely in the browser with no download required. Players join a shared game room via a 6-character room code. One player acts as host and starts the game once all players have joined. There are no bots or AI opponents — this is a game designed for real friends playing together in real time, with all state synchronized live via Supabase Realtime.

---

## 2. Tech Stack

Fractured Crown is built on Lovable's native stack. All of the following should be used as-is with no custom backend server.

- **Frontend:** React with Tailwind CSS, bundled via Vite
- **Database:** Supabase (PostgreSQL) — all game state persisted in relational tables
- **Authentication:** Supabase Auth — anonymous/guest sign-in so players can join without creating an account; optionally email/password for persistent profiles
- **Real-time:** Supabase Realtime — all clients subscribe to live changes on game state tables (inserts, updates, deletes stream instantly to all connected players); no raw WebSockets, no polling
- **Server-side logic:** Supabase Edge Functions (Deno/TypeScript) — used for sensitive game logic that must not run on the client, including: role assignment and shuffling, policy deck management, win condition evaluation, and presidential power resolution
- **Row Level Security (RLS):** Enabled on all Supabase tables — players may only read their own secret role; game state visible to all players in the same room; no player can write directly to authoritative game state (all mutations go through Edge Functions)
- **Hosting:** Lovable's built-in deployment

---

## 3. Data Model

All tables use `bigint generated always as identity` primary keys (SQL-standard, sequential, optimal for a single Postgres instance — no UUID fragmentation). Room codes are a separate human-readable column. All timestamps use `timestamptz`. RLS is enabled and forced on every table. All RLS policies wrap `auth.uid()` in a `SELECT` subquery (`(select auth.uid())`) to prevent per-row function evaluation — a 5–10x performance improvement on frequently queried tables. All foreign key columns have explicit indexes.

---

### Enums

```sql
create type room_status     as enum ('lobby', 'in_progress', 'finished');
create type game_phase      as enum ('election', 'legislative', 'executive_action', 'game_over');
create type player_role     as enum ('loyalist', 'traitor', 'usurper');
create type policy_type     as enum ('loyalist', 'shadow');
create type pile_type       as enum ('draw', 'discard');
create type vote_choice     as enum ('ja', 'nein');
create type executive_power as enum ('policy_peek', 'investigate_loyalty', 'special_election', 'execution');
create type win_condition   as enum ('loyalists_edicts', 'usurper_executed', 'traitors_edicts', 'usurper_crowned');
```

---

### `rooms`
One row per game session.

```sql
create table rooms (
  id             bigint generated always as identity primary key,
  room_code      text not null unique,           -- 6-char human-readable join code
  host_player_id bigint,                         -- FK set after first player inserts
  status         room_status not null default 'lobby',
  player_count   int not null default 0,
  created_at     timestamptz not null default now()
);

alter table rooms enable row level security;
alter table rooms force row level security;

create policy rooms_read on rooms for select to authenticated
  using (true);

create policy rooms_host_update on rooms for update to authenticated
  using (
    (select auth.uid()) = (
      select user_id from players where id = host_player_id
    )
  );

create index rooms_room_code_idx      on rooms (room_code);
create index rooms_host_player_id_idx on rooms (host_player_id);
```

---

### `players`
One row per player per room.

```sql
create table players (
  id           bigint generated always as identity primary key,
  room_id      bigint not null references rooms(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  seat_order   int not null,              -- Clockwise position (0-indexed), assigned at game start
  is_alive     boolean not null default true,
  joined_at    timestamptz not null default now(),
  unique (room_id, user_id),
  unique (room_id, seat_order)
);

alter table players enable row level security;
alter table players force row level security;

create policy players_read on players for select to authenticated
  using (
    room_id in (
      select room_id from players where user_id = (select auth.uid())
    )
  );

create policy players_insert on players for insert to authenticated
  with check (user_id = (select auth.uid()));

create index players_room_id_idx  on players (room_id);
create index players_user_id_idx  on players (user_id);
-- Partial index for fast alive-player lookups during turn order checks
create index players_alive_idx    on players (room_id) where is_alive = true;
```

---

### `player_roles`
Secret role assignment — most RLS-sensitive table. Never readable by other players.

```sql
create table player_roles (
  id        bigint generated always as identity primary key,
  player_id bigint not null references players(id) on delete cascade,
  room_id   bigint not null references rooms(id) on delete cascade,
  role      player_role not null,
  -- In 5-6p, usurper knows their traitor ally. In 7-10p, usurper is blind.
  -- This is encoded in revealed_allies: jsonb array of player_ids the role holder is shown.
  revealed_allies jsonb not null default '[]',
  unique (player_id, room_id)
);

alter table player_roles enable row level security;
alter table player_roles force row level security;

-- Players may ONLY ever read their own role
create policy player_roles_own_only on player_roles for select to authenticated
  using (
    player_id in (
      select id from players where user_id = (select auth.uid())
    )
  );
-- All inserts/updates via Edge Functions (service role) only — no client write policy

create index player_roles_player_id_idx on player_roles (player_id);
create index player_roles_room_id_idx   on player_roles (room_id);
```

---

### `game_state`
One row per room — the single source of truth all clients subscribe to via Realtime.

```sql
create table game_state (
  id                              bigint generated always as identity primary key,
  room_id                         bigint not null unique references rooms(id) on delete cascade,
  current_phase                   game_phase not null default 'election',
  current_herald_id               bigint references players(id),
  current_lord_commander_id       bigint references players(id),    -- Null until nominated
  last_elected_herald_id          bigint references players(id),    -- Term limit: ineligible as chancellor
  last_elected_lord_commander_id  bigint references players(id),    -- Term limit: ineligible as chancellor
  election_tracker                int not null default 0,           -- Resets on success or chaos (max 3)
  shadow_edicts_passed            int not null default 0,           -- 0–6
  loyalist_edicts_passed          int not null default 0,           -- 0–5
  veto_unlocked                   boolean not null default false,
  active_power                    executive_power,                  -- Null until power triggered
  winner                          win_condition,                    -- Null until game ends
  updated_at                      timestamptz not null default now()
);

alter table game_state enable row level security;
alter table game_state force row level security;

create policy game_state_read on game_state for select to authenticated
  using (
    room_id in (
      select room_id from players where user_id = (select auth.uid())
    )
  );
-- All writes via Edge Functions only

create index game_state_room_id_idx               on game_state (room_id);
create index game_state_current_herald_id_idx     on game_state (current_herald_id);
create index game_state_current_lord_cmd_id_idx   on game_state (current_lord_commander_id);
```

---

### `rounds`
One row per round — tracks full election + legislative session lifecycle.

```sql
create table rounds (
  id                bigint generated always as identity primary key,
  room_id           bigint not null references rooms(id) on delete cascade,
  round_number      int not null,
  herald_id         bigint not null references players(id),
  lord_commander_id bigint references players(id),          -- Null until nominated
  herald_hand       jsonb,  -- 3-card private hand; only exposed to herald via Edge Function
  chancellor_hand   jsonb,  -- 2-card hand passed to lord commander
  enacted_policy    policy_type,
  power_triggered   executive_power,
  veto_requested    boolean not null default false,
  veto_approved     boolean,                                -- Null until herald responds
  chaos_policy      boolean not null default false,         -- True if auto-enacted via tracker
  created_at        timestamptz not null default now(),
  unique (room_id, round_number)
);

alter table rounds enable row level security;
alter table rounds force row level security;

create policy rounds_read on rounds for select to authenticated
  using (
    room_id in (
      select room_id from players where user_id = (select auth.uid())
    )
  );

create index rounds_room_id_idx           on rounds (room_id);
create index rounds_herald_id_idx         on rounds (herald_id);
create index rounds_lord_commander_id_idx on rounds (lord_commander_id);
```

---

### `policy_deck`
Ordered draw and discard piles. Clients never read this — managed entirely by Edge Functions.

```sql
create table policy_deck (
  id        bigint generated always as identity primary key,
  room_id   bigint not null references rooms(id) on delete cascade,
  pile      pile_type not null,
  card_type policy_type not null,
  position  int not null,     -- 0 = top of draw pile; ordering within discard is arbitrary
  unique (room_id, pile, position)
);

alter table policy_deck enable row level security;
alter table policy_deck force row level security;
-- No read policy for authenticated role — service role only

create index policy_deck_room_id_idx      on policy_deck (room_id);
create index policy_deck_room_pile_idx    on policy_deck (room_id, pile);
```

---

### `votes`
One row per player per round. Hidden until all votes are cast, then flipped simultaneously.

```sql
create table votes (
  id         bigint generated always as identity primary key,
  round_id   bigint not null references rounds(id) on delete cascade,
  room_id    bigint not null references rooms(id) on delete cascade,
  player_id  bigint not null references players(id) on delete cascade,
  vote       vote_choice not null,
  revealed   boolean not null default false,
  created_at timestamptz not null default now(),
  unique (round_id, player_id)
);

alter table votes enable row level security;
alter table votes force row level security;

-- Players see votes only after reveal
create policy votes_read_revealed on votes for select to authenticated
  using (
    revealed = true
    and room_id in (
      select room_id from players where user_id = (select auth.uid())
    )
  );

create policy votes_insert_own on votes for insert to authenticated
  with check (
    player_id in (
      select id from players where user_id = (select auth.uid())
    )
  );

create index votes_round_id_idx   on votes (round_id);
create index votes_room_id_idx    on votes (room_id);
create index votes_player_id_idx  on votes (player_id);
-- Partial index: fast check for "has everyone voted yet?"
create index votes_unrevealed_idx on votes (round_id) where revealed = false;
```

---

### `presidential_actions`
Log of executive powers. Investigate results are private to the acting Herald.

```sql
create table presidential_actions (
  id               bigint generated always as identity primary key,
  room_id          bigint not null references rooms(id) on delete cascade,
  round_id         bigint not null references rounds(id) on delete cascade,
  acting_player_id bigint not null references players(id),
  action_type      executive_power not null,
  target_player_id bigint references players(id),   -- Null for policy_peek
  result           jsonb,                            -- { "role": "traitor" } for investigate; null otherwise
  created_at       timestamptz not null default now()
);

alter table presidential_actions enable row level security;
alter table presidential_actions force row level security;

-- Only the acting Herald can read their own results
create policy presidential_actions_own on presidential_actions for select to authenticated
  using (
    acting_player_id in (
      select id from players where user_id = (select auth.uid())
    )
  );

create index presidential_actions_room_id_idx          on presidential_actions (room_id);
create index presidential_actions_round_id_idx         on presidential_actions (round_id);
create index presidential_actions_acting_player_id_idx on presidential_actions (acting_player_id);
create index presidential_actions_target_player_id_idx on presidential_actions (target_player_id);
```

---

### `event_log`
Public append-only game history. All clients subscribe to this for the activity feed.

```sql
create table event_log (
  id          bigint generated always as identity primary key,
  room_id     bigint not null references rooms(id) on delete cascade,
  round_id    bigint references rounds(id),
  event_type  text not null,    -- e.g. 'edict_passed', 'player_executed', 'election_failed'
  description text not null,    -- Human-readable UI string
  metadata    jsonb,            -- Structured data for UI rendering (e.g. which power, which edict)
  created_at  timestamptz not null default now()
);

alter table event_log enable row level security;
alter table event_log force row level security;

create policy event_log_read on event_log for select to authenticated
  using (
    room_id in (
      select room_id from players where user_id = (select auth.uid())
    )
  );

create index event_log_room_id_idx            on event_log (room_id);
-- Composite index for paginated feed queries (ORDER BY created_at DESC)
create index event_log_room_created_at_idx    on event_log (room_id, created_at desc);
```

---

### `chat_messages`
In-game discussion chat scoped per room.

```sql
create table chat_messages (
  id         bigint generated always as identity primary key,
  room_id    bigint not null references rooms(id) on delete cascade,
  player_id  bigint not null references players(id) on delete cascade,
  content    text not null check (char_length(content) <= 500),
  created_at timestamptz not null default now()
);

alter table chat_messages enable row level security;
alter table chat_messages force row level security;

create policy chat_read on chat_messages for select to authenticated
  using (
    room_id in (
      select room_id from players where user_id = (select auth.uid())
    )
  );

create policy chat_insert_own on chat_messages for insert to authenticated
  with check (
    player_id in (
      select id from players where user_id = (select auth.uid())
    )
  );

create index chat_messages_room_id_idx         on chat_messages (room_id);
create index chat_messages_room_created_at_idx on chat_messages (room_id, created_at desc);
```

---

### Supabase Realtime

Enable realtime on tables clients need to react to:

```sql
alter publication supabase_realtime add table game_state;
alter publication supabase_realtime add table rounds;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table event_log;
alter publication supabase_realtime add table chat_messages;
```

`policy_deck`, `player_roles`, and `presidential_actions` are intentionally excluded — they contain secret or server-only data managed exclusively by Edge Functions.

---

## 4. Game Mechanics

### 4.1 Roles & Teams

Every player is secretly assigned one of three roles at game start. Role assignment is performed exclusively by an Edge Function and written to `player_roles` — clients never receive any other player's role.

| Role | Fantasy Name | Team | Count by Player Count |
|---|---|---|---|
| Liberal | **Loyalist** | Good | 5p:3, 6p:4, 7p:4, 8p:5, 9p:5, 10p:6 |
| Fascist | **Traitor** | Evil | 5p:1, 6p:1, 7p:2, 8p:2, 9p:3, 10p:3 |
| Hitler | **The Usurper** | Evil | Always 1 |

**Knowledge rules at game start:**
- In 5–6 player games: The Usurper knows who their Traitor ally is. The Traitor knows who the Usurper is.
- In 7–10 player games: Traitors know who each other are and who the Usurper is. The Usurper does NOT know who the Traitors are — they only know they are the Usurper.

This asymmetry is encoded in the `revealed_allies` jsonb field on `player_roles`. The Edge Function populates each player's `revealed_allies` with the player IDs they are allowed to know about.

---

### 4.2 Win Conditions

**Loyalists win if:**
- 5 Loyalist Edicts are enacted, OR
- The Usurper is executed via the Execution presidential power

**Traitors win if:**
- 6 Shadow Edicts are enacted, OR
- The Usurper is elected as Lord Commander at any point after 3 or more Shadow Edicts have been passed

Win conditions are evaluated by Edge Function after every edict enactment, every execution, and every successful government election.

---

### 4.3 The Policy Deck

The deck is initialized by Edge Function at game start:
- **11 Shadow Edict cards** + **6 Loyalist Edict cards** = 17 cards total, shuffled randomly
- Stored in `policy_deck` with `pile = 'draw'` and sequential `position` values

**Reshuffle rule:** If fewer than 3 cards remain in the draw pile at the end of any legislative session, the discard pile is combined with the remaining draw cards, reshuffled, and becomes the new draw pile. Unused cards are never revealed during reshuffle.

---

### 4.4 Round Structure

Each round proceeds through three phases in order:

#### Phase 1 — Election

1. **Herald rotation:** The Herald (President) role passes clockwise to the next living player each round. Seat order is fixed at game start via `seat_order` on `players`.
2. **Nomination:** The current Herald nominates any eligible living player as Lord Commander (Chancellor). Eligibility rules:
   - In games with 6+ living players: neither the last elected Herald nor the last elected Lord Commander may be nominated.
   - In games with 5 or fewer living players: only the last elected Lord Commander is ineligible; the last Herald may be nominated.
   - Term limits are tracked via `last_elected_herald_id` and `last_elected_lord_commander_id` on `game_state`.
3. **Usurper check:** If 3 or more Shadow Edicts have been passed and the nominated Lord Commander is the Usurper, the client prompts the Usurper to either confirm or deny. If the Usurper confirms (or is revealed), Traitors win immediately.
4. **Voting:** All living players simultaneously cast a vote (`ja` or `nein`). Votes are written to the `votes` table with `revealed = false`. Once all living players have voted, the Edge Function flips all `revealed` flags to `true` simultaneously — votes are never visible one by one.
5. **Election result:**
   - **Majority ja (>50%):** Government is elected. Proceed to Legislative Session. Reset election tracker.
   - **Tie or majority nein:** Election fails. Herald placard moves clockwise. Election tracker advances by 1.
6. **Chaos policy:** If the election tracker reaches 3 consecutive failed elections, the top card of the draw pile is revealed and enacted automatically. Any presidential power it would trigger is ignored. Election tracker resets. All term limits are cleared.

#### Phase 2 — Legislative Session

This phase is private between the Herald and Lord Commander. All card data is managed exclusively by Edge Functions — no card information is written to tables in a form readable by other clients.

1. **Herald draws 3 cards:** Edge Function reads the top 3 cards from `policy_deck`, writes them to `rounds.herald_hand` (jsonb, readable only via server-side logic), and removes them from the draw pile.
2. **Herald discards 1:** The Herald sees their 3 cards in the UI and selects 1 to discard. The discard is sent to the Edge Function, which appends it to the discard pile.
3. **Lord Commander receives 2 cards:** Edge Function writes the remaining 2 cards to `rounds.chancellor_hand`. The Lord Commander sees them in UI and selects 1 to enact.
4. **Edict enacted:** The enacted card type is written to `rounds.enacted_policy` and the corresponding tracker on `game_state` is incremented (`shadow_edicts_passed` or `loyalist_edicts_passed`).
5. **Veto (if unlocked):** After 5 Shadow Edicts have been passed, `game_state.veto_unlocked = true`. In this case, before the Lord Commander enacts a policy, they may request a veto by setting `rounds.veto_requested = true`. The Herald then accepts or rejects:
   - If accepted: both cards are discarded, election tracker advances by 1, round ends with no edict enacted.
   - If rejected: Lord Commander must enact one of the two cards as normal.
6. **Communication rule:** Players may say anything during the legislative session, but they may also lie freely. There is no game-enforced truth requirement.

#### Phase 3 — Executive Action

If the enacted edict is a Shadow Edict and the current `shadow_edicts_passed` count triggers a presidential power (see power table in 4.5), the Herald must use that power before the next round begins. The active power is stored in `game_state.active_power` until resolved by Edge Function.

---

### 4.5 Presidential Powers by Player Count

Powers are triggered by Shadow Edict count thresholds, which vary by player count. The board layout differs per game size:

| Shadow Edicts Enacted | 5–6 Players | 7–8 Players | 9–10 Players |
|---|---|---|---|
| 1 | — | — | Investigate Loyalty |
| 2 | — | Investigate Loyalty | Investigate Loyalty |
| 3 | Raven's Eye (Policy Peek) | Call Conclave (Special Election) | Call Conclave (Special Election) |
| 4 | Call Conclave (Special Election) | Royal Execution | Royal Execution |
| 5 | Royal Execution | Royal Execution | Royal Execution |
| 6 | Royal Execution | — | — |

**Power descriptions (fantasy reskin):**

- **Raven's Eye (Policy Peek):** The Herald secretly views the top 3 cards of the draw pile and returns them in the same order. The Herald may tell others what they saw, but may also lie. Result is written privately via Edge Function.
- **Investigate Loyalty** (fantasy name: **Read the Brand**): The Herald selects any living player who has not previously been investigated. The Edge Function reads that player's `player_roles.role` and returns only the team affiliation (`loyalist` or `traitor/usurper` → both shown as "Shadow Court"). The result is stored in `presidential_actions.result` readable only by the acting Herald. The Herald may share or lie about the result.
- **Call Conclave (Special Election):** The Herald selects any living player to become the next Herald. After that special Herald's turn ends, the rotation returns to its normal clockwise order from the original position.
- **Royal Execution:** The Herald selects any living player to execute. That player's `is_alive` is set to `false`. They are removed from voting, nominations, and turn rotation. If the executed player is the Usurper, Loyalists win immediately. If not, their role is NOT revealed to other players.

---

### 4.6 Edge Function Responsibilities

The following game logic must never execute on the client:

| Action | Why Server-Only |
|---|---|
| Role assignment & shuffle | Prevents clients from intercepting role data |
| Policy deck draw & discard | Prevents players from knowing upcoming cards |
| Revealing investigation result | Result only delivered to acting Herald |
| Flipping `votes.revealed` | Simultaneous reveal must be atomic |
| Win condition evaluation | Prevents race conditions or client-side spoofing |
| Veto resolution | Must atomically discard both cards and advance tracker |
| Chaos policy enactment | Must ignore power triggers correctly |
| Reshuffle on deck exhaustion | Must be invisible to all players |

---

## 5. Game State Machine

The game progresses through a strict sequence of phases stored in `game_state.current_phase`. All phase transitions are triggered exclusively by Edge Functions — the client only reads state and renders UI accordingly. No client action directly mutates the phase.

---

### 5.1 Phase Overview

```
LOBBY
  │
  └─► ELECTION (nomination)
        │
        ├─► [vote fails] ──► election_tracker + 1
        │       │
        │       └─► [tracker = 3] ──► CHAOS ──► EDICT_CHECK ──► back to ELECTION
        │
        └─► [vote passes] ──► LEGISLATIVE_HERALD
                │
                └─► LEGISLATIVE_COMMANDER
                      │
                      ├─► [veto requested + approved] ──► election_tracker + 1 ──► back to ELECTION
                      │
                      └─► [edict enacted] ──► EDICT_CHECK
                                │
                                ├─► [win condition met] ──► GAME_OVER
                                │
                                ├─► [power triggered] ──► EXECUTIVE_ACTION
                                │         │
                                │         └─► [power resolved] ──► EDICT_CHECK (re-evaluate)
                                │
                                └─► [no power / power resolved] ──► back to ELECTION
```

---

### 5.2 State Definitions

#### `lobby`
- **Entry:** Room created by host
- **Active:** Players join via room code; host sees a "Start Game" button
- **Exit trigger:** Host clicks Start Game with 5–10 players present
- **Edge Function:** `start-game` — assigns roles, shuffles deck, sets `seat_order`, creates `game_state` row, transitions to `election`

---

#### `election`
- **Entry:** New round begins; Herald placard moves clockwise to next living player
- **Active:**
  - Current Herald nominates a Lord Commander from eligible players
  - All living players vote simultaneously
  - Votes written to `votes` with `revealed = false`
- **Exit triggers:**
  - All living players have submitted a vote → Edge Function `resolve-vote` evaluates result
    - **Majority ja** → transition to `legislative`; reset election tracker; update term limits
    - **Tie or majority nein** → increment `election_tracker`; keep phase as `election`; advance Herald clockwise
    - **election_tracker reaches 3** → enact chaos policy; reset tracker; clear term limits; stay in `election` with new Herald
- **Edge Function:** `submit-vote`, `resolve-vote`

---

#### `legislative`
- **Sub-phase A — Herald's turn (`legislative_herald`):**
  - Entry: `resolve-vote` deals 3 cards to Herald via `rounds.herald_hand`
  - Active: Herald sees 3 cards privately in UI; selects 1 to discard
  - Exit trigger: Herald submits discard → Edge Function `herald-discard`
  - Edge Function: `herald-discard` — removes card from hand, appends to discard pile, delivers 2 remaining cards to Lord Commander via `rounds.chancellor_hand`

- **Sub-phase B — Lord Commander's turn (`legislative_commander`):**
  - Entry: `herald-discard` completes
  - Active: Lord Commander sees 2 cards privately in UI
    - If `veto_unlocked = true`: Lord Commander may request veto (`rounds.veto_requested = true`)
      - Herald must respond: accept or reject
      - **Accept:** both cards discarded, `election_tracker + 1`, round ends, back to `election`
      - **Reject:** Lord Commander must enact one card normally
    - Lord Commander selects 1 card to enact
  - Exit trigger: Lord Commander submits enactment → Edge Function `enact-policy`
  - Edge Function: `enact-policy` — increments edict counter, writes `rounds.enacted_policy`, appends other card to discard, checks reshuffle, evaluates win + power

---

#### `executive_action`
- **Entry:** `enact-policy` detects a power should trigger; sets `game_state.active_power`
- **Active:** Herald performs the required power action in UI (one of four below)
- **Exit trigger:** Herald submits power resolution → Edge Function `resolve-power`
- **Power-specific flows:**

  | Power | Herald Action | Edge Function Behaviour |
  |---|---|---|
  | `policy_peek` | Herald views top 3 cards (UI only, never stored publicly) | Reads deck, delivers result privately; no game state change |
  | `investigate_loyalty` | Herald selects a target player | Reads target's role, writes team affiliation to `presidential_actions.result`; marks player as investigated |
  | `special_election` | Herald selects any living player as next Herald | Sets `game_state.current_herald_id` to chosen player; after their round, rotation reverts to original clockwise order |
  | `execution` | Herald selects a living player to execute | Sets `players.is_alive = false`; checks if target is Usurper → if yes, Loyalists win; if no, role stays hidden |

- **Edge Function:** `resolve-power` — resolves action, clears `game_state.active_power`, transitions to `election` (or `game_over` if execution killed the Usurper)

---

#### `game_over`
- **Entry:** Any win condition is met (evaluated by Edge Functions after every edict enactment, execution, or successful election)
- **Active:** All roles are revealed to all players; win/loss screen shown; event log summarises the game
- **Win condition triggers:**

  | Trigger | Winner | `win_condition` value |
  |---|---|---|
  | 5 Loyalist Edicts enacted | Loyalists | `loyalists_edicts` |
  | Usurper executed | Loyalists | `usurper_executed` |
  | 6 Shadow Edicts enacted | Traitors | `traitors_edicts` |
  | Usurper elected as Lord Commander after 3+ Shadow Edicts | Traitors | `usurper_crowned` |

- **Edge Function:** Any function that changes edict counts or executes a player must call `check-win-condition` as its final step before responding

---

### 5.3 Edge Function Catalogue

| Function | Triggered By | Responsibility |
|---|---|---|
| `start-game` | Host clicks Start | Assign roles, shuffle deck, set seat order, create game_state |
| `submit-vote` | Player submits vote | Write vote to `votes`; check if all players have voted |
| `resolve-vote` | All votes in | Flip `revealed`, evaluate result, transition phase or advance tracker |
| `herald-discard` | Herald submits discard | Remove card from hand, pass 2 to Lord Commander |
| `enact-policy` | Lord Commander submits enactment | Increment edict counter, check reshuffle, trigger power or end round |
| `request-veto` | Lord Commander requests veto | Set `rounds.veto_requested = true` |
| `respond-veto` | Herald accepts or rejects veto | Discard both + advance tracker, or proceed to enactment |
| `resolve-power` | Herald submits power action | Execute power-specific logic, clear `active_power`, advance round |
| `check-win-condition` | Called internally by other functions | Evaluate all four win conditions; set `game_state.winner` if met |

---

### 5.4 Client Rendering Rules

The React client subscribes to `game_state`, `rounds`, `votes`, `players`, `event_log`, and `chat_messages` via Supabase Realtime. On any change, it re-renders based on the following rules:

| `current_phase` | What the UI shows |
|---|---|
| `lobby` | Waiting room: player list, room code, Start button (host only) |
| `election` | Nomination UI (Herald only) + vote buttons (all players) + vote status indicators |
| `legislative` | Card selection UI (Herald or Lord Commander only, based on sub-phase); waiting screen for others |
| `executive_action` | Power UI for Herald only; all others see "The Herald is deliberating..." |
| `game_over` | Role reveal screen, winner announcement, full event log |

Players who are not the active actor during `legislative` or `executive_action` phases see a read-only waiting screen with the event log and chat visible. Executed (dead) players can observe but cannot vote, chat, or take actions.

---

## 6. UI/UX Design

### 6.1 Aesthetic Direction

Fractured Crown should feel like a **dark medieval war room** — candlelit, conspiratorial, tense. The aesthetic is **gothic refinement**: rich deep colors, aged textures, heraldic iconography, and deliberate typography. It should feel nothing like a generic web app. Every screen should evoke the feeling of gathering around a candlelit table in a stone castle.

**Tone:** Dark luxury. Think illuminated manuscripts, wax seals, iron crowns, and shadow. Not cartoonish fantasy — restrained and ominous.

**Color palette:**
- Background: deep near-black parchment `#0f0d0b`
- Surface: dark warm brown `#1c1612`
- Accent gold: `#c9a84c` — used for Loyalist edicts, active states, and heraldic details
- Accent crimson: `#8b1a1a` — used for Shadow edicts, traitor reveals, executions
- Text primary: warm off-white `#e8dcc8`
- Text muted: `#7a6a55`
- Borders/dividers: `#2e2318`

**Typography:**
- Display / headings: a serif with medieval character — `Cinzel` (Google Fonts) for titles, room codes, role names, and win screens
- Body / UI text: `Crimson Text` (Google Fonts) — elegant, readable, period-appropriate
- Monospace (for codes, vote counts): `Courier Prime`
- Never use Inter, Roboto, or system fonts

**Texture and atmosphere:**
- Subtle noise/grain overlay on all backgrounds (CSS `filter` or SVG noise texture)
- Parchment-like card surfaces with slightly irregular borders
- Gold foil shimmer effect on Loyalist edict cards (CSS gradient animation)
- Deep red glow effect on Shadow edict cards
- Candlelight flicker effect on the main game board background (subtle CSS animation)

**Motion:**
- Vote reveal: cards flip face-up simultaneously with a CSS 3D card-flip animation
- Edict enactment: card slides into the tracker with a stamping animation
- Execution: player portrait fades to grayscale with a slow dissolve + ash particle effect
- Role reveal at game end: cards flip one by one with staggered delays
- Phase transitions: crossfade with a brief dark flash

---

### 6.2 Screen Inventory

#### Screen 1 — Landing / Home
- Full-bleed dark background with the Fractured Crown logo centered
- Tagline: *"In the kingdom of lies, loyalty is the rarest currency."*
- Two CTAs: **"Create Game"** and **"Join Game"**
- Animated background: slowly drifting smoke or fog layers (CSS keyframes)
- No navigation, no clutter — pure atmosphere

#### Screen 2 — Create Room
- Player enters their display name
- Room code is generated and displayed prominently in `Cinzel` font with a copy button
- Shareable link auto-generated
- "Waiting for players..." state shows as players join (live via Supabase Realtime on `players` table)
- Player list shows avatar initials in circular medallion style with seat position
- Host sees a **"Begin the Council"** button, enabled only when 5–10 players present

#### Screen 3 — Join Room
- Single input for 6-character room code + display name entry
- Validates room exists and is in `lobby` status before allowing join
- On join, transitions to the waiting room view (same as Screen 2 minus host controls)

#### Screen 4 — Role Reveal (game start)
- Full-screen dramatic reveal: envelope/scroll animation unfurls to show the player's role card
- Role card design:
  - **Loyalist:** gold border, crest of a sword and crown, warm parchment background
  - **Traitor:** crimson border, shadow court sigil, dark background
  - **Usurper:** deep crimson + black, iron crown motif, most dramatic treatment
- For Traitors (and Usurper in 5–6p): after role reveal, a secondary screen shows ally identities with portrait medallions
- "I understand my role" confirmation button before proceeding to game

#### Screen 5 — Main Game Board
The primary game screen. All players see this throughout the game. Layout:

```
┌─────────────────────────────────────────────────────┐
│  EDICT TRACKERS          Round N   Election Tracker  │
│  [■■■□□] Loyalist        [HERALD NAME]   [●●○]       │
│  [■■■■□□] Shadow                                     │
├──────────────────────────┬──────────────────────────┤
│                          │                          │
│   PLAYER COUNCIL         │   ACTIVE PHASE PANEL     │
│   (seat ring layout)     │   (context-sensitive)    │
│   Avatar medallions      │                          │
│   Alive/dead state       │                          │
│   Current Herald crown   │                          │
│   Vote indicators        │                          │
│                          │                          │
├──────────────────────────┴──────────────────────────┤
│  EVENT LOG (scrollable)  │  CHAT                    │
└─────────────────────────────────────────────────────┘
```

**Player council (left panel):** Players arranged in a circular/oval layout representing the council table. Each player has:
- A circular avatar medallion showing their initial or chosen icon
- Name label beneath
- Crown icon if current Herald; scroll icon if current Lord Commander nominee
- Vote result badge (ja/nein) shown after reveal, hidden before
- Greyed-out + skull icon if executed
- Subtle glow if currently the active actor (herald or lord commander)

**Active phase panel (right panel):** Changes based on `current_phase`:
- `election`: Nomination dropdown (Herald only) + "Call to Vote" button; OR voting buttons (all players) with live "X of Y voted" counter
- `legislative_herald`: Card selection UI (Herald only) — 3 cards face-up, pick 1 to discard
- `legislative_commander`: Card selection UI (Lord Commander only) — 2 cards, pick 1 to enact; veto button if unlocked
- `executive_action`: Power-specific UI (Herald only)
- All others: atmospheric waiting message + animated crest

**Edict trackers (top):** Two horizontal progress tracks styled as stone tablets with carved slots. Loyalist slots filled with gold seal icons; Shadow slots filled with dark crimson sigils.

**Event log (bottom left):** Scrollable feed of game events in italic serif text, styled like a scribe's record. Each entry timestamped by round number.

**Chat (bottom right):** Simple message input and scrollable history. Player names in their team color (revealed only at game end — during the game, all names appear in neutral off-white).

#### Screen 6 — Card Selection (legislative phase)
Shown as an overlay/modal on the main board for the active player:
- Cards rendered as large parchment playing cards with face-up edict type
- Loyalist card: gold border, "Royal Edict" text, crown motif
- Shadow card: crimson border, "Shadow Decree" text, eye-in-dark motif
- Hover state: card lifts with shadow
- Selection: card glows and scales up slightly; "Confirm" button activates
- Other players see: "The Herald/Lord Commander is deliberating..." with animated quill

#### Screen 7 — Executive Power Overlays
Each power gets its own dramatic overlay:

- **Raven's Eye:** Three face-down cards animate flipping toward the Herald only; other players see a raven silhouette animation
- **Investigate Loyalty:** Herald selects a player; result appears as a wax-sealed scroll that tears open to reveal "Loyal" or "Shadow Court"
- **Call Conclave:** Herald selects next Herald from a list; transition animation of the crown passing
- **Royal Execution:** Herald selects a target; confirmation modal with ominous language ("Do you sentence [name] to death?"); executed player's medallion shatters and fades to ash

#### Screen 8 — Game Over
- Full-screen dramatic reveal
- Win/loss announcement in large `Cinzel` text with appropriate color (gold for Loyalist win, crimson for Traitor win)
- All player role cards flip face-up one by one with staggered animation
- The Usurper's card flips last, with the most dramatic animation
- Full event log summary below
- "Play Again" button (returns to lobby with same players) and "Leave" button

---

### 6.3 Responsive Design

The game is primarily designed for **desktop/tablet** play (players are sitting together or on a video call). Mobile is supported as a secondary experience with the following adaptations:
- Council ring collapses to a horizontal scrollable player strip
- Active phase panel takes full screen width
- Event log and chat become tab-switched panels at the bottom
- Card selection becomes a full-screen swipe-to-choose interaction

---

### 6.4 Accessibility

- All interactive elements have sufficient contrast ratios (WCAG AA minimum)
- Vote buttons labeled with both icon and text
- Role cards include text labels, not just iconography
- Animations respect `prefers-reduced-motion` — all CSS animations wrapped in `@media (prefers-reduced-motion: no-preference)`
- Focus states visible on all interactive elements

---

## 7. Real-time Architecture

### 7.1 Approach

Fractured Crown uses **Supabase Realtime** exclusively for live state synchronization — no raw WebSockets, no polling, no custom pub/sub. Every client subscribes to database table changes. When an Edge Function mutates a row, Supabase streams the change to all subscribed clients instantly. The React client re-renders based on the new state.

This means the database is the single source of truth. The client is purely a renderer — it never holds authoritative game state locally.

---

### 7.2 Subscriptions Per Client

Each client establishes the following Supabase Realtime subscriptions on join, filtered to their `room_id`:

| Table | Event | What triggers it | Client reaction |
|---|---|---|---|
| `game_state` | `UPDATE` | Any phase transition or edict count change | Re-render entire game board; switch active phase panel |
| `rounds` | `INSERT` / `UPDATE` | New round created; herald/commander hands dealt; edict enacted; veto state changed | Update round context; show card selection UI to active player |
| `players` | `INSERT` / `UPDATE` | Player joins lobby; player executed (`is_alive` flips) | Update player list / council ring; animate execution |
| `votes` | `INSERT` / `UPDATE` | Player submits vote (INSERT); all votes revealed (UPDATE `revealed = true`) | Show "X of Y voted" counter; animate simultaneous vote flip on reveal |
| `event_log` | `INSERT` | Any game event appended | Append new entry to scrollable event feed |
| `chat_messages` | `INSERT` | Player sends message | Append message to chat panel |

---

### 7.3 Subscription Setup (React)

All subscriptions should be initialised in a single `useGameRoom` custom hook, established once on mount and torn down on unmount. Example structure for Lovable to follow:

```typescript
// Single channel per room — more efficient than one channel per table
const channel = supabase
  .channel(`room:${roomId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'game_state',
    filter: `room_id=eq.${roomId}`
  }, (payload) => handleGameStateChange(payload))
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'rounds',
    filter: `room_id=eq.${roomId}`
  }, (payload) => handleRoundChange(payload))
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'players',
    filter: `room_id=eq.${roomId}`
  }, (payload) => handlePlayersChange(payload))
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'votes',
    filter: `room_id=eq.${roomId}`
  }, (payload) => handleVotesChange(payload))
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'event_log',
    filter: `room_id=eq.${roomId}`
  }, (payload) => handleEventLogInsert(payload))
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `room_id=eq.${roomId}`
  }, (payload) => handleChatInsert(payload))
  .subscribe()

// Cleanup on unmount
return () => supabase.removeChannel(channel)
```

All six subscriptions share a single channel (`room:${roomId}`) — this is more efficient than creating one channel per table.

---

### 7.4 Initial State Load

Realtime only delivers changes — it does not backfill history. On mount, the client must fetch current state before activating subscriptions:

```typescript
// Fetch all current state in parallel on room join
const [gameState, rounds, players, votes, eventLog, chatMessages] =
  await Promise.all([
    supabase.from('game_state').select('*').eq('room_id', roomId).single(),
    supabase.from('rounds').select('*').eq('room_id', roomId).order('round_number'),
    supabase.from('players').select('*').eq('room_id', roomId),
    supabase.from('votes').select('*').eq('room_id', roomId).eq('revealed', true),
    supabase.from('event_log').select('*').eq('room_id', roomId).order('created_at'),
    supabase.from('chat_messages').select('*').eq('room_id', roomId).order('created_at')
  ])

// Then activate Realtime subscriptions
```

This ensures a player who joins mid-game or refreshes their browser gets a complete and correct game state immediately.

---

### 7.5 Private Data Delivery

Some game data is private to a single player (card hands, investigation results). These are never delivered via Realtime — they are delivered directly by Edge Function response to the requesting client only:

| Private data | How delivered |
|---|---|
| Herald's 3-card hand | Edge Function `resolve-vote` returns hand directly in response body to Herald's client |
| Lord Commander's 2-card hand | Edge Function `herald-discard` returns hand directly in response body to Lord Commander's client |
| Policy peek result | Edge Function `resolve-power` returns top 3 cards directly in response body to Herald only |
| Investigation result | Edge Function `resolve-power` returns team affiliation directly in response body to Herald only |

These values are stored in `rounds.herald_hand`, `rounds.chancellor_hand`, and `presidential_actions.result` for server-side record-keeping, but RLS ensures no other client can read them via a direct Supabase query.

---

### 7.6 Handling Concurrent Actions

Since all authoritative writes go through Edge Functions (not direct client inserts), race conditions are minimised. Edge Functions run atomically per invocation. Key concurrency notes:

- **Vote submission:** Multiple players submit votes concurrently — this is safe because each player writes to their own `votes` row (unique constraint on `round_id, player_id`). The `resolve-vote` function is triggered only after confirming all living players have voted.
- **Phase transitions:** Only Edge Functions write to `game_state.current_phase`. Clients have no write policy on this column — they cannot trigger a phase change directly.
- **Deck exhaustion:** The reshuffle check in `enact-policy` runs within the same Edge Function invocation as the enactment, preventing any window where the deck could be read as empty by another operation.

---

### 7.7 Connection Loss & Reconnection

Supabase Realtime handles reconnection automatically. On reconnect, the client should re-fetch current state (same parallel fetch as 7.4) before re-subscribing to avoid acting on a stale local state. Implement this in the `useGameRoom` hook by listening to the channel's `CLOSED` → `SUBSCRIBED` transition:

```typescript
channel.on('system', { event: 'reconnect' }, async () => {
  await refetchAllState()
})
```

---

## 8. Auth & Lobby System

### 8.1 Authentication Approach

Fractured Crown uses **Supabase Anonymous Auth**. Players do not need to create an account or provide an email to play. On first visit, the client calls `supabase.auth.signInAnonymously()` — Supabase creates a real authenticated session with a `user_id` (UUID) that persists in `localStorage` for the browser session. This `user_id` is used as the identity anchor for all RLS policies.

This means:
- Every player has a valid `auth.uid()` the moment they land on the site
- RLS policies work identically for anonymous and registered users
- Players who refresh mid-game are automatically re-authenticated and rejoin their session
- No login screen, no email verification, no friction before playing

**Optional upgrade path:** If a player wants a persistent identity across sessions (e.g. to track game history), they can optionally link their anonymous session to an email/password account via `supabase.auth.updateUser()`. This is a non-blocking future feature and should not be built in the initial version.

---

### 8.2 Room Creation Flow

1. Player lands on home screen → anonymous auth session established silently on page load
2. Player enters display name and clicks **"Create Game"**
3. Client calls Edge Function `create-room`:
   - Generates a unique 6-character alphanumeric room code (e.g. `KNGHTX`)
   - Inserts a row into `rooms` with `status = 'lobby'`
   - Inserts the creator as the first row in `players` with `seat_order = 0`
   - Sets `rooms.host_player_id` to the creator's player ID
   - Returns `room_id` and `room_code` to the client
4. Client navigates to `/room/[room_code]` — the waiting lobby screen
5. A shareable URL and the room code are displayed prominently for the host to share

**Room code generation rules:**
- 6 characters, uppercase letters only (no digits to avoid 0/O confusion)
- Exclude visually ambiguous characters: `O`, `I`, `L`
- Regenerate on collision (rare but handled)

---

### 8.3 Room Join Flow

1. Player visits home screen or follows a shared link (`/join/[room_code]`)
2. Anonymous auth session established silently
3. Player enters display name (pre-filled if returning player)
4. Client calls Edge Function `join-room` with `room_code` and `display_name`:
   - Validates room exists and `status = 'lobby'`
   - Validates player count is below 10
   - Validates player is not already in the room (idempotent rejoin)
   - Assigns next available `seat_order`
   - Inserts player row into `players`
   - Increments `rooms.player_count`
   - Returns `room_id` and player's `player_id`
5. Client navigates to `/room/[room_code]` — the same waiting lobby screen as the host

**Rejoin handling:** If a player with the same `user_id` attempts to join a room they're already in (e.g. after a refresh), `join-room` detects the existing row and returns their existing `player_id` without inserting a duplicate. The client resumes from current game state.

---

### 8.4 Lobby Waiting Room

While `rooms.status = 'lobby'`, all players see the waiting room:

- Live list of joined players (via Realtime subscription on `players` table)
- Room code displayed in large `Cinzel` font with a one-click copy button
- Shareable link with copy button
- Player count indicator: e.g. "6 / 10 players"
- Minimum player indicator: "Waiting for at least 5 players to begin"
- **Host only:** "Begin the Council" button — enabled when `player_count >= 5`
- **Non-host:** "Waiting for host to begin..." message

Players can see each other joining in real time. No player can start the game except the host.

---

### 8.5 Game Start Flow

1. Host clicks "Begin the Council"
2. Client calls Edge Function `start-game` with `room_id`:
   - Validates caller is the host (`rooms.host_player_id`)
   - Validates `player_count` is between 5 and 10
   - Validates `rooms.status = 'lobby'`
   - Randomly assigns `seat_order` to all players (shuffles existing assignments)
   - Assigns roles according to player count distribution (Section 4.1)
   - Populates `player_roles` for all players including `revealed_allies`
   - Initialises `policy_deck` with 11 shadow + 6 loyalist cards, shuffled
   - Creates `game_state` row with `current_phase = 'election'`, first Herald chosen randomly
   - Sets `rooms.status = 'in_progress'`
   - Appends a `game_started` event to `event_log`
3. All clients receive the `game_state` INSERT via Realtime and transition to the main game board
4. Each client individually fetches their own role from `player_roles` (RLS ensures they only get their own row)
5. Role reveal screen is shown to each player (Section 6.2, Screen 4)

---

### 8.6 Player Disconnect & Timeout

- If a player closes their tab, their Supabase Realtime connection drops but their `players` row remains. They can rejoin by revisiting the URL.
- There is no automatic timeout or kick for disconnected players in the initial version — the game simply waits for them to act when it's their turn.
- A disconnected player indicator (greyed avatar with a disconnected icon) should be shown in the council ring using Supabase Realtime **Presence**:

```typescript
// Track online presence per room
const channel = supabase.channel(`room:${roomId}`)
channel.track({ player_id: currentPlayerId, online_at: new Date().toISOString() })

channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState()
  // state contains all currently online players — use to show connected/disconnected indicators
})
```

---

### 8.7 Post-Game

After `game_state.winner` is set:
- All players see the game over screen (Section 6.2, Screen 8)
- Host sees a **"Play Again"** button which calls Edge Function `reset-room`:
  - Clears `rounds`, `votes`, `player_roles`, `policy_deck`, `presidential_actions`, `event_log`, `chat_messages` for the room
  - Resets `game_state` to initial values
  - Resets `rooms.status` to `'lobby'`
  - Keeps all existing `players` rows intact so the same group can play again immediately
- Any player can click **"Leave"** which deletes their `players` row and redirects to home
