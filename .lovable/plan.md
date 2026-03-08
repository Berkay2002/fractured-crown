## Phase 3: Game Logic Edge Functions + Client Wiring

### Overview

9 Edge Functions (8 client-facing + 1 internal helper shared across functions). Each follows the established pattern from create-room/join-room: CORS headers, Bearer token auth via `getClaims`, service role client for writes.

The `check-win-condition` logic will be a shared utility function inlined into the functions that call it (submit-vote, enact-policy, resolve-power), since Edge Functions cannot import from sibling function directories.

### Database Changes

A new column `special_election_herald_pointer` (bigint, nullable) on `game_state` to track the original Herald rotation pointer during special elections, so the rotation reverts correctly after. Migration:

```sql
ALTER TABLE public.game_state ADD COLUMN special_election_herald_pointer bigint;

```

### Edge Functions to Create

All functions: `verify_jwt = false` in config.toml, auth validated in code, service role for writes.

**1.** `supabase/functions/start-game/index.ts`

- Validates caller is host via `rooms.host_player_id`
- Validates `player_count` between 5–10
- Shuffles `seat_order` randomly across all players (Fisher-Yates)
- Assigns roles per distribution table (5p: 3L/1T/1U, etc.)
- Populates `player_roles` with `revealed_allies` logic (5–6p: T↔U see each other; 7–10p: Ts see all T+U, U sees nothing)
- Initializes `policy_deck`: 11 shadow + 6 loyalist, shuffled, pile='draw', position 0–16
- Creates `game_state` row: phase='election', random first Herald
- Creates first `rounds` row: round_number=1, herald_id=chosen Herald
- Sets `rooms.status = 'in_progress'`
- Inserts game_started event to `event_log`

**2.** `supabase/functions/nominate-chancellor/index.ts`

- Validates caller is current Herald
- Validates target is alive, not term-limited (`last_elected_herald_id`, `last_elected_lord_commander_id`; in 5-player games only last LC is ineligible)
- Updates `game_state.current_lord_commander_id`
- Updates current round's `lord_commander_id`
- Inserts nomination event to `event_log`

**3.** `supabase/functions/submit-vote/index.ts`

- Validates caller is alive player in room
- Inserts vote with `revealed = false`
- Counts votes vs alive players; if all voted:
  - Tallies ja/nein majority
  - **Ja majority**: Check usurper-crowned win condition (3+ shadow edicts AND nominee is Usurper). If win → trigger game over. Otherwise: reveal all votes, set term limits (`last_elected_herald_id`, `last_elected_lord_commander_id`), deal 3 cards from draw pile into `rounds.herald_hand`, transition to `legislative` phase. Return `{ herald_hand }` in response only to the Herald.
  - **Nein majority**: Reveal all votes, increment `election_tracker`. If tracker hits 3 → chaos policy (top draw card enacted, no power, reset tracker, clear term limits, advance Herald clockwise). Otherwise advance Herald clockwise, create new round, stay in `election`.

**4.** `supabase/functions/herald-discard/index.ts`

- Validates caller is current Herald
- Validates `card_index` is valid in `rounds.herald_hand`
- Moves discarded card to discard pile
- Writes remaining 2 cards to `rounds.chancellor_hand`
- Clears `rounds.herald_hand`
- Returns `{ chancellor_hand }` in response body (only LC client receives this)

**5.** `supabase/functions/enact-policy/index.ts`

- Validates caller is current Lord Commander
- Validates `card_index` is valid in `rounds.chancellor_hand`
- Sets `rounds.enacted_policy`, discards other card
- Increments `shadow_edicts_passed` or `loyalist_edicts_passed`
- If draw pile < 3 cards: reshuffle (combine discard into draw, reassign random positions)
- Sets `veto_unlocked = true` if `shadow_edicts_passed >= 5`
- Checks win condition
- If no win: checks power trigger table → if power: set `active_power`, phase='executive_action'. If no power: advance Herald clockwise, phase='election', create new round.

Power trigger table:

```
5-6p:  {3:'policy_peek', 4:'special_election', 5:'execution', 6:'execution'}
7-8p:  {2:'investigate_loyalty', 3:'special_election', 4:'execution', 5:'execution'}
9-10p: {1:'investigate_loyalty', 2:'investigate_loyalty', 3:'special_election', 4:'execution', 5:'execution'}

```

**6.** `supabase/functions/request-veto/index.ts`

- Validates caller is current LC, `veto_unlocked = true`
- Sets `rounds.veto_requested = true`
- Inserts veto_requested event to `event_log`

**7.** `supabase/functions/respond-veto/index.ts`

- Validates caller is current Herald
- If accepted: discard both chancellor_hand cards, increment `election_tracker`, check chaos (tracker=3), advance Herald, phase='election'
- If rejected: set `rounds.veto_approved = false`, LC must enact normally (no phase change)

**8.** `supabase/functions/resolve-power/index.ts`

- Validates caller is current Herald and `game_state.active_power` is set
- **policy_peek**: Read top 3 draw pile cards, return in response body, insert `presidential_actions`, clear power, advance to election
- **investigate_loyalty**: Read target's role, return team ('loyalist' or 'shadow_court') in response, insert `presidential_actions` with result, clear power, advance to election
- **special_election**: Set `current_herald_id` to chosen player, store original pointer in `special_election_herald_pointer`, clear power, phase='election', create new round
- **execution**: Set target `is_alive = false`, insert `presidential_actions`, check win (usurper_executed). If no win: clear power, advance to election

**9.** `supabase/functions/reset-room/index.ts`

- Validates caller is host
- Deletes all rows in `rounds`, `votes`, `player_roles`, `policy_deck`, `presidential_actions`, `event_log`, `chat_messages` for the room
- Deletes `game_state` row
- Resets `rooms.status = 'lobby'`, recounts players for `player_count`
- Keeps `players` rows intact

### Shared Helper Logic (inlined in each function that needs it)

`checkWinCondition`: Receives gameState + context, checks:

- `loyalist_edicts_passed >= 5` → `'loyalists_edicts'`
- Executed player is Usurper → `'usurper_executed'`
- `shadow_edicts_passed >= 6` → `'traitors_edicts'`
- Usurper elected LC after 3+ shadow edicts → `'usurper_crowned'`
- On win: sets `game_state.winner`, `current_phase = 'game_over'`, `rooms.status = 'finished'`, inserts game_over event to `event_log`

`advanceHerald`: Finds next alive player clockwise by `seat_order` from current Herald (respecting `special_election_herald_pointer` for revert after special elections).

`dealCards`: Reads top 3 from draw pile ordered by position, returns card types.

### Client Wiring (React Components)

Replace all `console.log('TODO: Phase 3...')` calls with `supabase.functions.invoke(...)`:

`RoomLobby.tsx`: "Begin the Council" → invoke `start-game` with `{ room_id }`. On success, room status change triggers Realtime → UI auto-transitions to GameBoard.

`GameBoard.tsx`: Nomination click → invoke `nominate-chancellor` with `{ room_id, nominee_id }`.

`VotingPanel.tsx`: Ja/Nein → invoke `submit-vote` with `{ room_id, vote }`. On response, if the caller is Herald and response contains `herald_hand`, store it in local state for the LegislativeOverlay.

`LegislativeOverlay.tsx`:

- Herald discard → invoke `herald-discard` with `{ room_id, card_index }`. Response contains `chancellor_hand` (only meaningful to LC client via Realtime round update showing phase change).
- LC enact → invoke `enact-policy` with `{ room_id, card_index }`.
- Veto → invoke `request-veto` / `respond-veto`.

`ExecutivePowerOverlay.tsx`: All 4 powers → invoke `resolve-power` with `{ room_id, action_type, target_player_id? }`. For policy_peek/investigate: use response body data instead of demo values.

`GameOverScreen.tsx`: "Play Again" button → invoke `reset-room` then navigate to lobby. Roles are revealed via the updated RLS policy (all roles readable when `game_state.current_phase = 'game_over'`).

### Additional Client Changes

- `useGameRoom.ts`: Add `heraldHand` and `chancellorHand` as local state (not from Realtime) that gets set from Edge Function responses. Expose setter functions.
- `LegislativeOverlay.tsx`: Remove demo card fallbacks; use hand data from props/state. Show waiting state when hand is empty.
- `ExecutivePowerOverlay.tsx`: Remove demo/random values; use response data from `resolve-power`.
- `GameOverScreen.tsx`: Fetch all roles on game_over — the updated RLS policy allows all room players to read all `player_roles` when game is over.

### RLS Adjustment for Game Over Role Reveals

The `player_roles_own_only` policy has already been fixed (uses `(select auth.uid())`). Only the game-over policy needs adding:

```sql
CREATE POLICY "player_roles_game_over" ON public.player_roles
  FOR SELECT TO authenticated
  USING (
    room_id IN (SELECT get_user_room_ids((SELECT auth.uid())))
    AND EXISTS (
      SELECT 1 FROM public.game_state gs
      WHERE gs.room_id = player_roles.room_id
      AND gs.current_phase = 'game_over'
    )
  );

```

### config.toml additions

```toml
[functions.start-game]
verify_jwt = false

[functions.nominate-chancellor]
verify_jwt = false

[functions.submit-vote]
verify_jwt = false

[functions.herald-discard]
verify_jwt = false

[functions.enact-policy]
verify_jwt = false

[functions.request-veto]
verify_jwt = false

[functions.respond-veto]
verify_jwt = false

[functions.resolve-power]
verify_jwt = false

[functions.reset-room]
verify_jwt = false

```

### Implementation Order

1. Add `special_election_herald_pointer` column + game-over RLS policy (migration)
2. Create all 9 Edge Functions
3. Update config.toml
4. Wire all React components to invoke Edge Functions
5. Update `useGameRoom` with local hand state
6. Remove demo/placeholder data from components
7. Deploy and test each function