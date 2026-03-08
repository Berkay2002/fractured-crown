

## Phase 2: Game Board UI + Real-time Subscriptions

This phase builds the entire in-game UI layer. No Edge Functions or game logic mutations -- all actions call `console.log` placeholders. The client renders purely based on `current_phase` from `game_state`.

### New Files to Create

**1. `src/hooks/useGameRoom.ts` -- Core Realtime Hook**
- Accepts `roomId: number` and `currentPlayerId: number`
- Fetches initial state in parallel: `game_state`, `rounds`, `players`, `player_roles` (own only), `votes`, `event_log`, `chat_messages`
- Creates a single Supabase Realtime channel `game-room:{roomId}` subscribing to postgres_changes on all 6 tables filtered by `room_id=eq.{roomId}`
- On each change event: re-fetches the affected table (simple refetch strategy, avoids complex merge logic)
- Handles channel `CLOSED`/`CHANNEL_ERROR` status by re-fetching all state and resubscribing
- Returns: `{ gameState, currentRound, players, myRole, votes, events, chatMessages, room, loading, sendChat }`
- `sendChat` inserts into `chat_messages` via Supabase client

**2. `src/components/game/RoleReveal.tsx` -- Screen 4**
- Full-screen overlay triggered when game transitions from lobby to in_progress
- Envelope/scroll opening animation using framer-motion (scale + opacity sequence)
- Three role card designs:
  - **Loyalist**: Gold border, crown icon, "Serve the Crown" tagline
  - **Traitor**: Crimson border, dagger icon, "Serve the Shadow" + ally list from `revealed_allies`
  - **Usurper**: Dark purple border, skull-crown icon, "Seize the Throne"
- "I understand my duty" dismiss button

**3. `src/components/game/GameBoard.tsx` -- Screen 5 (Main Board)**
- Layout: responsive grid with sidebar
  - **Top bar**: Room code, round number, current phase indicator
  - **Left/Center**: Edict trackers (loyalist 0-5, shadow 0-6 as styled progress slots), election tracker (0-3)
  - **Center**: Player council ring -- circular/semi-circular arrangement of player medallions ordered by `seat_order`, highlighting current Herald (gold ring) and Lord Commander (silver ring), greyed out if `is_alive=false`
  - **Right sidebar**: Event log feed (scrollable, auto-scroll) + chat panel with input
- **Active Phase Panel** (context-sensitive, rendered below trackers):
  - `election`: Shows Herald badge on current herald, "Nominate Lord Commander" button (herald only) with player selector
  - `legislative`: Shows card selection overlay (Screen 6 component)
  - `executive_action`: Shows executive power overlay (Screen 7 component)
  - `game_over`: Shows game over screen (Screen 8 component)

**4. `src/components/game/EdictTracker.tsx`**
- Reusable tracker component: array of styled slots (filled/empty)
- Loyalist track: 5 slots, gold filled
- Shadow track: 6 slots, crimson filled, slots 4/5/6 show executive power icons
- Election tracker: 3 slots, grey filled

**5. `src/components/game/PlayerCouncil.tsx`**
- Renders player medallions in a flex-wrap ring layout
- Each medallion: initials avatar, display name, role indicators (Herald crown, LC sword icon), alive/dead state, online presence dot
- Click handler for nomination/targeting (passes `console.log` placeholder)

**6. `src/components/game/VotingPanel.tsx`**
- Shows during election phase after LC is nominated
- Two large buttons: "Ja" (gold) / "Nein" (crimson)
- Shows vote count progress ("5/8 voted")
- After reveal: displays each player's vote with Ja/Nein badge

**7. `src/components/game/LegislativeOverlay.tsx` -- Screen 6**
- Modal overlay for the legislative phase
- Herald view: 3 face-down cards that flip on reveal, "Discard one" instruction, click to discard
- Lord Commander view: 2 cards, "Enact one" instruction
- Veto request button (visible when `veto_unlocked`)
- All actions → `console.log('TODO: call edge function', { action, card })`

**8. `src/components/game/ExecutivePowerOverlay.tsx` -- Screen 7**
- Modal overlay shown when `current_phase === 'executive_action'`
- Renders different UI based on `gameState.active_power`:
  - **policy_peek** ("Raven's Eye"): Shows 3 card backs that flip to reveal top 3 deck cards, "Acknowledge" button
  - **investigate_loyalty** ("Investigate Loyalty"): Player selector grid, reveals party membership card on selection
  - **special_election** ("Call Conclave"): Player selector for next Herald
  - **execution** ("Royal Execution"): Player selector with confirmation dialog ("This cannot be undone")
- All actions → `console.log`

**9. `src/components/game/GameOverScreen.tsx` -- Screen 8**
- Full-screen overlay when `current_phase === 'game_over'`
- Winner announcement with themed text (loyalists/traitors win condition)
- Staggered role reveal: each player's role card flips one by one with 300ms delays using framer-motion
- Event log summary (scrollable)
- Two buttons: "Play Again" (navigates to `/`) and "Leave" (navigates to `/`)

**10. `src/components/game/EventLogFeed.tsx`**
- Scrollable list of event_log entries with auto-scroll-to-bottom
- Each entry: timestamp, icon by event_type, description text
- Styled with muted colors, Crimson Text font

**11. `src/components/game/ChatPanel.tsx`**
- Scrollable message list + input at bottom
- Messages show player name + content
- Calls `sendChat` from useGameRoom hook

### Modified Files

**`src/pages/Room.tsx`**
- When `room.status === 'in_progress'`, render `<GameBoard>` instead of the lobby UI
- When `room.status === 'finished'`, render `<GameOverScreen>`
- Pass room/player data to `useGameRoom` hook
- Show `<RoleReveal>` as a one-time overlay on first load if game is in_progress and user hasn't dismissed it (local state)

**`src/App.tsx`**
- No route changes needed; Room.tsx handles all game states

**`src/index.css`**
- Add card-flip keyframe animation for role/policy card reveals
- Add glow pulse animation for active Herald/LC highlights

### Architecture Notes

```text
Room.tsx
├── status === 'lobby' → existing lobby UI
├── status === 'in_progress' → useGameRoom hook
│   ├── RoleReveal (one-time overlay)
│   └── GameBoard
│       ├── EdictTracker (loyalist, shadow, election)
│       ├── PlayerCouncil (ring of medallions)
│       ├── ActivePhasePanel
│       │   ├── election → VotingPanel
│       │   ├── legislative → LegislativeOverlay
│       │   └── executive_action → ExecutivePowerOverlay
│       ├── EventLogFeed
│       └── ChatPanel
└── status === 'finished' → GameOverScreen
```

- All UI actions (`nominate`, `vote`, `discard_card`, `enact_card`, `execute_player`, etc.) call `console.log('TODO: Phase 3 edge function', payload)` with descriptive payloads
- The `useGameRoom` hook is the single source of truth; components receive data as props
- No database mutations except `chat_messages` INSERT (already has RLS)

