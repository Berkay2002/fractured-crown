# Fractured Crown — Product Requirements Document

> A web-based social deduction game for 5–10 players, based on Secret Hitler, reskinned as a dark medieval fantasy kingdom betrayal game. Also runs as a Discord Activity.

---

## 1. Overview

Fractured Crown is a browser-based real-time social deduction game for 5–10 players, faithfully adapted from the mechanics of Secret Hitler and reskinned in a dark fantasy kingdom setting. Players are secretly divided into two factions: the **Loyalists** (good team) who seek to protect the realm, and the **Traitors** (evil team) who serve the Shadow Court. Hidden among the Traitors is **The Usurper** — a single player whose coronation as Lord Commander spells the kingdom's fall.

Each round, players elect a **Herald** (President) and a **Lord Commander** (Chancellor) who together pass a **Royal Edict** — either a Loyalist decree or a Shadow decree — into law. Traitors work covertly to flood the kingdom with Shadow Edicts, while Loyalists debate, vote, and investigate to root them out. As Shadow Edicts accumulate, the Herald gains powerful executive abilities: spying on loyalty, calling emergency elections, and ordering executions.

The game is played entirely in the browser with no download required. Players join a shared game room via a 6-character room code. One player acts as host and starts the game once all players have joined. There are no bots or AI opponents — this is a game designed for real friends playing together in real time, with all state synchronized live via Supabase Realtime.

Fractured Crown also runs as a **Discord Activity** (embedded app) within Discord voice channels, using the Discord Embedded App SDK.

---

## 2. Tech Stack

- **Frontend:** React 18 + TypeScript (strict mode), Tailwind CSS, bundled via Vite
- **UI Components:** shadcn/ui (Radix primitives + CVA variants)
- **Animation:** Framer Motion
- **Database:** Supabase (PostgreSQL) — all game state persisted in relational tables
- **Authentication:** Supabase Anonymous Auth — players join without creating an account; every visitor gets an anonymous session via `supabase.auth.signInAnonymously()`
- **Real-time:** Supabase Realtime (Postgres Changes + Broadcast + Presence) — single channel per game room; 2-second polling fallback for resilience
- **Server-side logic:** Supabase Edge Functions (Deno/TypeScript) — all sensitive game logic runs server-side
- **Row Level Security (RLS):** Enabled on all tables; all SELECT policies are PERMISSIVE (required for Realtime delivery)
- **Asset storage:** Supabase Storage (sigil images in `sigils` bucket)
- **Discord Integration:** `@discord/embedded-app-sdk` for Activity embedding, Rich Presence, and proxy routing
- **Hosting:** Lovable's built-in deployment; published at `fractured-crown.lovable.app`

---

## 3. Data Model

All tables use `bigint generated always as identity` primary keys. All timestamps use `timestamptz`. RLS is enabled on every table. All foreign key columns have explicit indexes. All tables use `REPLICA IDENTITY FULL` (required for Realtime).

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

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` (identity PK) | |
| `room_code` | `text unique` | 6-char uppercase join code |
| `host_player_id` | `bigint` FK → players | Set after first player inserts |
| `status` | `room_status` | Default `'lobby'` |
| `player_count` | `int` | Default `0` |
| `settings` | `jsonb` | Room settings (turn timer, spectators enabled, etc.) |
| `created_at` | `timestamptz` | |

---

### `players`
One row per player per room.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` (identity PK) | |
| `room_id` | `bigint` FK → rooms | |
| `user_id` | `uuid` | From `auth.users(id)` |
| `display_name` | `text` | Editable in lobby |
| `seat_order` | `int` | Clockwise position (0-indexed) |
| `sigil` | `text` | Chosen avatar icon (crown, sword, shield, wolf, raven, rose, flame, anchor, dragon, skull) |
| `is_alive` | `boolean` | Default `true` |
| `is_ready` | `boolean` | Lobby ready-up status |
| `is_spectator` | `boolean` | Spectator mode |
| `joined_at` | `timestamptz` | |

Unique constraints: `(room_id, user_id)`, `(room_id, seat_order)`.

---

### `player_roles`
Secret role assignment — most RLS-sensitive table. Each player can only read their own role (until `game_phase = 'game_over'`, when all roles become visible).

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` (identity PK) | |
| `player_id` | `bigint` FK → players | |
| `room_id` | `bigint` FK → rooms | |
| `role` | `player_role` | `loyalist`, `traitor`, or `usurper` |
| `revealed_allies` | `jsonb` | Array of player IDs this role holder can see |

Not published via Realtime. No client-facing write policy.

---

### `game_state`
One row per room — the single source of truth all clients subscribe to via Realtime.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` (identity PK) | |
| `room_id` | `bigint` unique FK → rooms | |
| `current_phase` | `game_phase` | Default `'election'` |
| `current_herald_id` | `bigint` FK → players | |
| `current_lord_commander_id` | `bigint` FK → players | Null until nominated |
| `last_elected_herald_id` | `bigint` FK → players | Term limit tracking |
| `last_elected_lord_commander_id` | `bigint` FK → players | Term limit tracking |
| `election_tracker` | `int` | 0–3, resets on success or chaos |
| `shadow_edicts_passed` | `int` | 0–6 |
| `loyalist_edicts_passed` | `int` | 0–5 |
| `veto_unlocked` | `boolean` | Unlocked after 5 Shadow Edicts |
| `active_power` | `executive_power` | Null until power triggered |
| `special_election_herald_pointer` | `int` | Tracks return position after special election |
| `winner` | `win_condition` | Null until game ends |
| `updated_at` | `timestamptz` | |

---

### `rounds`
One row per round — tracks full election + legislative session lifecycle.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` (identity PK) | |
| `room_id` | `bigint` FK → rooms | |
| `round_number` | `int` | |
| `herald_id` | `bigint` FK → players | |
| `lord_commander_id` | `bigint` FK → players | Null until nominated |
| `herald_hand` | `jsonb` | 3-card private hand (server-only) |
| `chancellor_hand` | `jsonb` | 2-card hand (server-only) |
| `enacted_policy` | `policy_type` | |
| `power_triggered` | `executive_power` | |
| `veto_requested` | `boolean` | Default `false` |
| `veto_approved` | `boolean` | Null until Herald responds |
| `chaos_policy` | `boolean` | Default `false` |
| `created_at` | `timestamptz` | |

Unique: `(room_id, round_number)`.

---

### `policy_deck`
Ordered draw and discard piles. **No client SELECT policy** — managed entirely by Edge Functions via service role.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` (identity PK) | |
| `room_id` | `bigint` FK → rooms | |
| `pile` | `pile_type` | `'draw'` or `'discard'` |
| `card_type` | `policy_type` | `'loyalist'` or `'shadow'` |
| `position` | `int` | 0 = top of draw pile |

---

### `votes`
One row per player per round. Hidden until all votes are cast, then flipped simultaneously.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` (identity PK) | |
| `round_id` | `bigint` FK → rounds | |
| `room_id` | `bigint` FK → rooms | |
| `player_id` | `bigint` FK → players | |
| `vote` | `vote_choice` | `'ja'` or `'nein'` |
| `revealed` | `boolean` | Default `false` |
| `created_at` | `timestamptz` | |

Unique: `(round_id, player_id)`. RLS: players see votes only after `revealed = true`.

---

### `presidential_actions`
Log of executive powers. Investigate results are private to the acting Herald.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` (identity PK) | |
| `room_id` | `bigint` FK → rooms | |
| `round_id` | `bigint` FK → rounds | |
| `acting_player_id` | `bigint` FK → players | |
| `action_type` | `executive_power` | |
| `target_player_id` | `bigint` FK → players | Null for policy_peek |
| `result` | `jsonb` | e.g. `{ "role": "traitor" }` for investigate |
| `created_at` | `timestamptz` | |

---

### `event_log`
Public append-only game history. All clients subscribe for the activity feed.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` (identity PK) | |
| `room_id` | `bigint` FK → rooms | |
| `round_id` | `bigint` FK → rounds | Optional |
| `event_type` | `text` | e.g. `'edict_passed'`, `'player_executed'` |
| `description` | `text` | Human-readable UI string |
| `metadata` | `jsonb` | Structured data for UI rendering |
| `created_at` | `timestamptz` | |

---

### `chat_messages`
In-game and lobby discussion chat scoped per room.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` (identity PK) | |
| `room_id` | `bigint` FK → rooms | |
| `player_id` | `bigint` FK → players | |
| `content` | `text` | Max 500 chars |
| `phase` | `text` | `'lobby'` or `'game'` — separates lobby chat from in-game chat |
| `created_at` | `timestamptz` | |

---

### Supabase Realtime Publication

The `supabase_realtime` publication includes: `rooms`, `players`, `game_state`, `rounds`, `votes`, `event_log`, `chat_messages`.

**Never included:** `policy_deck` (secret deck data) and `player_roles` (secret role data).

---

### Helper Functions

| Function | Purpose |
|---|---|
| `is_player_in_room(_room_id, _user_id)` | RLS helper — checks membership |
| `get_user_room_ids(_user_id)` | Returns room IDs for a user |
| `cleanup_stale_rooms()` | Periodic cleanup of abandoned rooms |

---

## 4. Game Mechanics

### 4.1 Roles & Teams

Every player is secretly assigned one of three roles at game start. Role assignment is performed exclusively by an Edge Function and written to `player_roles`.

| Role | Fantasy Name | Team | Count by Player Count |
|---|---|---|---|
| Liberal | **Loyalist** | Good | 5p:3, 6p:4, 7p:4, 8p:5, 9p:5, 10p:6 |
| Fascist | **Traitor** | Evil | 5p:1, 6p:1, 7p:2, 8p:2, 9p:3, 10p:3 |
| Hitler | **The Usurper** | Evil | Always 1 |

**Knowledge rules at game start:**
- In 5–6 player games: The Usurper knows who their Traitor ally is. The Traitor knows who the Usurper is.
- In 7–10 player games: Traitors know each other and who the Usurper is. The Usurper does NOT know who the Traitors are.

This asymmetry is encoded in the `revealed_allies` jsonb field on `player_roles`.

---

### 4.2 Win Conditions

**Loyalists win if:**
- 5 Loyalist Edicts are enacted (`loyalists_edicts`), OR
- The Usurper is executed via Royal Execution (`usurper_executed`)

**Traitors win if:**
- 6 Shadow Edicts are enacted (`traitors_edicts`), OR
- The Usurper is elected as Lord Commander after 3+ Shadow Edicts have been passed (`usurper_crowned`)

---

### 4.3 The Policy Deck

Initialised by Edge Function `start-game`:
- **11 Shadow Edict cards** + **6 Loyalist Edict cards** = 17 cards total, shuffled randomly
- Stored in `policy_deck` with `pile = 'draw'` and sequential `position` values

**Reshuffle rule:** If fewer than 3 cards remain in the draw pile, the discard pile is combined with remaining draw cards, reshuffled, and becomes the new draw pile.

---

### 4.4 Round Structure

Each round proceeds through three phases in order:

#### Phase 1 — Election

1. **Herald rotation:** The Herald role passes clockwise to the next living player each round.
2. **Nomination:** The current Herald nominates an eligible living player as Lord Commander via Edge Function `nominate-chancellor`.
3. **Voting:** All living players vote simultaneously (`ja`/`nein`). Votes written with `revealed = false`. Edge Function `submit-vote` handles individual votes and triggers resolution when all votes are in.
4. **Election result:**
   - **Majority ja (>50%):** Government elected. Proceed to Legislative. Reset election tracker.
   - **Tie or majority nein:** Election fails. Herald advances clockwise. Election tracker +1.
5. **Chaos policy:** If election tracker reaches 3, the top card is auto-enacted. Powers are ignored. Term limits cleared.

#### Phase 2 — Legislative Session

Private between Herald and Lord Commander. All card data managed exclusively by Edge Functions.

1. **Herald draws 3 cards:** Edge Function `fetch-hand` delivers 3 cards in response body (stored in local React state `heraldHand`, never in Realtime-published columns).
2. **Herald discards 1:** Edge Function `herald-discard` processes the discard and delivers 2 remaining cards to Lord Commander (stored in local React state `chancellorHand`).
3. **Lord Commander enacts 1:** Edge Function `enact-policy` increments the edict counter and checks win conditions / power triggers.
4. **Veto (if unlocked):** After 5 Shadow Edicts, Lord Commander may request veto via `request-veto`. Herald responds via `respond-veto`.

#### Phase 3 — Executive Action

If a Shadow Edict triggers a presidential power, `game_state.active_power` is set. The Herald resolves it via Edge Function `resolve-power`.

---

### 4.5 Presidential Powers by Player Count

| Shadow Edicts Enacted | 5–6 Players | 7–8 Players | 9–10 Players |
|---|---|---|---|
| 1 | — | — | Investigate Loyalty |
| 2 | — | Investigate Loyalty | Investigate Loyalty |
| 3 | Raven's Eye (Policy Peek) | Call Conclave (Special Election) | Call Conclave (Special Election) |
| 4 | Call Conclave (Special Election) | Royal Execution | Royal Execution |
| 5 | Royal Execution | Royal Execution | Royal Execution |
| 6 | Royal Execution | — | — |

**Power descriptions:**
- **Raven's Eye (Policy Peek):** Herald secretly views top 3 cards of draw pile.
- **Investigate Loyalty (Read the Brand):** Herald selects a player; result shows "Loyal" or "Shadow Court". Stored privately in `presidential_actions.result`.
- **Call Conclave (Special Election):** Herald selects any living player as next Herald. `special_election_herald_pointer` tracks the return position for normal rotation.
- **Royal Execution:** Herald selects a living player to execute. If the Usurper, Loyalists win immediately.

---

### 4.6 Edge Function Catalogue

| Function | Triggered By | Responsibility |
|---|---|---|
| `create-room` | Player clicks "Create Game" | Generate room code, insert room + host player |
| `join-room` | Player enters room code | Validate room, insert player, handle idempotent rejoin |
| `start-game` | Host clicks "Begin the Council" | Assign roles, shuffle deck, set seat order, create game_state, transition to election |
| `nominate-chancellor` | Herald selects a nominee | Set `current_lord_commander_id`, transition to voting |
| `submit-vote` | Player casts vote | Write vote; when all voted, flip `revealed`, evaluate result, transition phase |
| `vote-status` | Client polling | Check current vote tally without revealing individual votes |
| `fetch-hand` | Herald enters legislative phase | Draw 3 cards from deck, return in response body |
| `herald-discard` | Herald discards a card | Remove card, deliver 2 remaining to Lord Commander in response body |
| `enact-policy` | Lord Commander selects a card | Increment edict counter, check reshuffle, evaluate win + power |
| `request-veto` | Lord Commander requests veto | Set `rounds.veto_requested = true` |
| `respond-veto` | Herald accepts/rejects veto | Discard both + advance tracker, or proceed to enactment |
| `resolve-power` | Herald submits power action | Execute power logic, clear `active_power`, advance round |
| `reset-room` | Host clicks "Play Again" | Clear game data, reset room to lobby state |

---

## 5. Game State Machine

All phase transitions are triggered exclusively by Edge Functions.

```
LOBBY
  │
  └─► ELECTION (nomination → voting)
        │
        ├─► [vote fails] ──► election_tracker + 1
        │       │
        │       └─► [tracker = 3] ──► CHAOS ──► EDICT_CHECK ──► back to ELECTION
        │
        └─► [vote passes] ──► LEGISLATIVE (Herald → Lord Commander)
                │
                ├─► [veto requested + approved] ──► election_tracker + 1 ──► back to ELECTION
                │
                └─► [edict enacted] ──► EDICT_CHECK
                          │
                          ├─► [win condition met] ──► GAME_OVER
                          │
                          ├─► [power triggered] ──► EXECUTIVE_ACTION
                          │         │
                          │         └─► [power resolved] ──► back to ELECTION
                          │
                          └─► [no power] ──► back to ELECTION
```

---

## 6. UI/UX Design

### 6.1 Aesthetic Direction

**Dark medieval war room** — gothic, candlelit, conspiratorial. Not cartoonish fantasy — restrained and ominous.

**Color palette (HSL tokens in `index.css`):**

| Token | CSS Variable | Hex | Usage |
|---|---|---|---|
| Background | `--background` | `#0f0d0b` | Page background |
| Surface/Card | `--card` | `#1c1612` | Cards, panels |
| Gold | `--primary` | `#c9a84c` | Loyalist edicts, active states, heraldic details |
| Crimson | `--accent` | `#8b1a1a` | Shadow edicts, traitor reveals, executions |
| Body text | `--foreground` | `#e8dcc8` | Primary text |
| Muted text | `--muted-foreground` | `#7a6a55` | Secondary text |

**Typography:**
- Display / headings: `Cinzel` (`.font-display`)
- Body / UI text: `Crimson Text` (`.font-body`)
- Monospace: `Courier Prime` (`.font-mono`)

**Atmospheric effects:**
- Noise/grain overlay on backgrounds
- Gold foil shimmer on Loyalist edict cards (CSS gradient animation)
- Deep red glow on Shadow edict cards
- Candlelight flicker ambient overlay (radial gradient)
- Vignette edge darkening
- Ember particle animations on landing page

---

### 6.2 Screen Inventory

#### Screen 1 — Landing / Home (`/`)
- Full-bleed dark background with the Fractured Crown logo
- Tagline: *"In the kingdom of lies, loyalty is the rarest currency."*
- Three modes: Landing → Create Game / Join Game
- Player enters display name before creating or joining
- Ember particle animations for atmosphere
- Footer links to Privacy Policy and Terms of Service

#### Screen 2 — Join Room (`/join/:roomCode`)
- Direct-link join flow for shared URLs
- Player enters display name and joins automatically
- Redirects to room on success

#### Screen 3 — Room Lobby (`/room/:roomCode`)
- Live player list with sigil avatars and online/offline indicators (via Presence)
- **Sigil selection:** Players choose from 10 heraldic sigils (crown, sword, shield, wolf, raven, rose, flame, anchor, dragon, skull) stored in Supabase Storage
- **Ready-up system:** Players toggle ready status
- **Spectator mode:** Players can join as spectators
- **Room code** displayed prominently with copy button
- **QR code** generation for easy mobile joining (via `qrcode.react`)
- **Shareable link** with copy button
- **Host controls:**
  - "Begin the Council" button (enabled when ≥5 non-spectator players)
  - Kick players
  - Transfer host
  - **Royal Decrees** (game settings panel)
- **Lobby chat** with optimistic message sending
- **Lobby presence cursors** (real-time cursor positions via Broadcast)
- **How to Play** modal
- **Display name editing** in lobby
- Player count indicator (e.g. "6 / 10 players")

#### Screen 4 — Role Reveal (in-game overlay)
- Each player sees their secret role with dramatic animation
- Traitors/Usurper see their `revealed_allies` information
- Cinzel typography with faction-coloured styling

#### Screen 5 — Game Board (in-game, `/room/:roomCode` when `status = 'in_progress'`)
- **Edict Tracker:** Visual board showing Loyalist (0–5) and Shadow (0–6) edict progress
- **Player Council:** Circular/ring layout showing all players with:
  - Sigil avatars
  - Herald/Lord Commander indicators
  - Alive/dead status
  - Online/offline indicators
  - Active reactions (emoji bubbles via Broadcast)
- **Phase-specific panels:**
  - Election: Nomination UI (Herald only) + vote buttons + vote status
  - Legislative: Card selection overlays (Herald or Lord Commander)
  - Executive Action: Power-specific overlays
- **Event Log Feed:** Scrollable chronological game history
- **Chat Panel:** In-game chat with optimistic sends
- **Connection Banner:** Shows when Realtime connection drops
- **Phase Transition Banner:** Animated banner on phase changes
- **Turn Timer:** Optional countdown timer (configurable in room settings)
- **Mobile Action Bar:** Bottom action bar for mobile layout

#### Screen 6 — Legislative Overlays
- **Herald view:** 3 face-down cards animate flipping; Herald selects 1 to discard
- **Lord Commander view:** 2 cards; selects 1 to enact; veto option if unlocked
- **Other players:** "The Herald/Lord Commander is deliberating..." with animated quill

#### Screen 7 — Executive Power Overlays
- **Raven's Eye (Policy Peek):** Cards flip for Herald only
- **Investigate Loyalty:** Target selection → wax seal reveal
- **Call Conclave:** Target selection → crown passing animation
- **Royal Execution:** Target selection → confirmation modal → execution animation

#### Screen 8 — Game Over
- Full-screen dramatic reveal
- Win/loss announcement with faction-coloured Cinzel text
- All player role cards flip face-up with staggered animation
- Full event log summary
- **Game Replay** viewer
- "Play Again" button (host only, calls `reset-room`) and "Leave" button

#### Other Pages
- **Privacy Policy** (`/privacy`)
- **Terms of Service** (`/terms`)
- **404 Not Found** (catch-all)

---

### 6.3 Responsive Design

Primary target: **desktop/tablet**. Mobile supported with:
- Council ring collapses to horizontal scrollable player strip
- Active phase panel takes full width
- Event log and chat as tab-switched panels
- Mobile action bar at bottom

---

### 6.4 Accessibility

- WCAG AA minimum contrast
- Vote buttons labelled with icon + text
- Role cards include text labels
- Animations respect `prefers-reduced-motion`
- Focus states on all interactive elements

---

## 7. Real-time Architecture

### 7.1 Approach

Fractured Crown uses **Supabase Realtime** for live state synchronisation with a **2-second polling fallback** for resilience. The database is the single source of truth. The client is purely a renderer.

---

### 7.2 Channel Architecture

**Single Realtime channel per game room** in `useGameRoom.ts` — subscribes to Postgres Changes on all game tables + Broadcast for reactions. A separate Presence channel tracks online status.

**Lobby** uses a separate channel in `Room.tsx` for player/room changes and lobby chat, plus a Presence channel for online indicators and cursor positions (via `useLobbyPresence`).

---

### 7.3 Subscriptions (Game Room)

| Table | Event | Client reaction |
|---|---|---|
| `game_state` | `*` | Re-render game board; switch phase panel |
| `rounds` | `*` | Update round context |
| `players` | `*` | Update player list / council ring |
| `player_roles` | `*` | Re-fetch own role (RLS limits to own row) |
| `votes` | `*` | Update vote status / animate reveal |
| `event_log` | `*` | Append to event feed |
| `chat_messages` | `*` | Append to chat panel |
| Broadcast `reaction` | — | Show emoji reaction bubble on player avatar |

---

### 7.4 Polling Fallback

`useGameRoom` runs a 2-second `setInterval` calling `refreshAll()` to guard against dropped Realtime messages. This ensures eventual consistency even if the WebSocket connection is unstable.

---

### 7.5 Private Data Delivery

Private data is delivered exclusively in Edge Function response bodies and stored in local React state:

| Private data | Hook state | Source Edge Function |
|---|---|---|
| Herald's 3-card hand | `heraldHand` | `fetch-hand` |
| Lord Commander's 2-card hand | `chancellorHand` | `herald-discard` |
| Policy peek result | Response body | `resolve-power` |
| Investigation result | Response body | `resolve-power` |

These values are **never** written to Realtime-published columns.

---

### 7.6 Connection Loss

The channel monitors `CHANNEL_ERROR`, `TIMED_OUT`, and `CLOSED` statuses. On any of these, `disconnected` state is set to `true` (rendering `ConnectionBanner`) and a full state refresh is triggered. Supabase handles automatic reconnection.

---

### 7.7 Broadcast: Reactions

Players can send emoji reactions (throttled to one per 3 seconds). Reactions are broadcast to all room members via the game room channel and displayed as floating bubbles above player avatars for 2.5 seconds.

---

## 8. Auth & Lobby System

### 8.1 Authentication

**Anonymous Auth only.** No emails, passwords, or PII. `supabase.auth.signInAnonymously()` on page load via `AuthContext`. All RLS policies scoped to `authenticated` intentionally include anonymous sessions.

---

### 8.2 Room Creation Flow

1. Player lands on home → anonymous auth established
2. Player enters display name, clicks "Create Game"
3. Client invokes Edge Function `create-room` with `{ display_name }`
4. Edge Function generates room code, inserts room + player, returns `room_code`
5. Client navigates to `/room/:roomCode`

---

### 8.3 Room Join Flow

1. Player visits home or follows shared link (`/join/:roomCode`)
2. Anonymous auth established
3. Player enters display name
4. Client invokes `join-room` with `{ room_code, display_name }`
5. Idempotent rejoin: existing players are returned without duplicate insertion
6. Client navigates to `/room/:roomCode`

---

### 8.4 Lobby Features

- Live player list with Presence-based online indicators
- Sigil avatar selection (10 options, stored in Supabase Storage)
- Ready-up toggle
- Spectator mode toggle
- Display name editing
- Host transfer
- Player kick (host only)
- Room settings ("Royal Decrees")
- QR code for easy sharing
- Lobby chat (with `phase = 'lobby'`)
- Lobby cursor presence tracking
- How to Play modal

---

### 8.5 Game Start

Host clicks "Begin the Council" → Edge Function `start-game`:
- Validates host, player count (5–10), and lobby status
- Assigns roles per player count distribution
- Shuffles deck (11 shadow + 6 loyalist)
- Sets `rooms.status = 'in_progress'`
- Creates `game_state` with first Herald

---

### 8.6 Post-Game

Host can click "Play Again" → Edge Function `reset-room`:
- Clears rounds, votes, player_roles, policy_deck, presidential_actions, event_log, chat_messages
- Resets game_state and rooms.status to `'lobby'`
- Keeps existing player rows for immediate replay

---

## 9. Discord Activity Integration

### 9.1 Overview

Fractured Crown runs as a **Discord Embedded App** inside voice channels using `@discord/embedded-app-sdk` (Client ID: `1480188235148693635`).

### 9.2 Detection & Proxy

When running inside Discord's iframe (detected via `frame_id` query param or `discordsays.com` hostname):
- Supabase API requests route through `/.proxy/supabase/`
- Storage asset URLs route through `/.proxy/storage/`
- Raw DOM asset URLs (`src`, CSS backgrounds) must use `storageUrl()` / `sigilUrl()` from `src/lib/storageUrl.ts`

### 9.3 Rich Presence

`DiscordContext` provides `setActivity()` which updates Discord Rich Presence dynamically:
- **Lobby:** Shows room code and player count
- **In-game:** Shows current round and phase

### 9.4 Sound

`SoundContext` provides ambient sound management for the game experience.

---

## 10. File Organisation

| Path | Purpose |
|---|---|
| `src/components/game/` | All in-game UI components |
| `src/components/lobby/` | Lobby-specific components (presence cursors) |
| `src/components/ui/` | shadcn/ui primitives |
| `src/contexts/` | React contexts (Auth, Sound, Discord) |
| `src/hooks/` | Custom hooks (useGameRoom, useSound, useLobbyPresence, usePageTitle, useDiscord) |
| `src/lib/` | Utilities (storageUrl, backgroundImage, discordActivity, utils) |
| `src/pages/` | Route-level page components (Index, Room, JoinRoom, PrivacyPolicy, TermsOfService, NotFound) |
| `supabase/functions/` | Edge Functions (all game logic) |
| `supabase/migrations/` | Database migrations |

---

## 11. Terminology Mapping

Never use Secret Hitler terms in code, UI, or comments.

| Game concept | In-app name | Code identifier |
|---|---|---|
| President | Herald | `herald` |
| Chancellor | Lord Commander | `lord_commander` |
| Liberal | Loyalist | `loyalist` |
| Fascist | Traitor | `traitor` |
| Hitler | The Usurper | `usurper` |
| Policy tile | Royal Edict | `policy` / `edict` |
| Liberal policy | Loyalist Edict | `loyalist` |
| Fascist policy | Shadow Edict | `shadow` |
