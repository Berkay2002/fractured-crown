

# Debug Simulation Mode — Revised Implementation Plan

## Problem
Testing the full game flow (election → nomination → voting → legislative → executive → game over) requires 5+ real players. There is no way to inspect visual features like Kingdom's Decay stages or the Inquisitor's Lens without completing actual games. This makes UI development and debugging painfully slow.

## What We Build

A `/demo` route (also accessible via `?debug=true` on any room URL) that provides two modes:

1. **Mock Mode** (default) — Pure frontend. No Supabase calls. A local `useState`-driven `GameRoomState` is fed directly into `GameBoard` and `GameOverScreen`. Every field is controllable from a debug panel. Instant phase transitions, decay previews, hand inspection.

2. **Real DB Mode** — Creates a real room via Edge Functions, adds bot players, and uses `useGameRoom` normally. A debug panel provides "auto-advance" buttons that invoke Edge Functions in sequence.

Both modes include a **floating debug panel** with full game state controls and a decay stage slider (0–6).

---

## Architecture

```text
/demo?mode=mock              /demo?mode=real
┌───────────────────┐        ┌───────────────────┐
│ Local useState    │        │ Real Supabase room │
│ drives GameBoard  │        │ via useGameRoom    │
│ + GameOverScreen  │        │                    │
└────────┬──────────┘        └────────┬──────────┘
         │                            │
    ┌────▼────────────────────────────▼────┐
    │        DebugPanel (floating)         │
    │  Phase · Edicts · Decay · Roles ·   │
    │  Herald/LC · Alive/Dead · Hands     │
    └─────────────────────────────────────┘
```

---

## Files to Create

### 1. `src/pages/Demo.tsx`
The orchestrator page.
- Reads `?mode=mock|real` from URL (default: `mock`)
- **Mock mode**: Holds all game state in `useState`, initialized from `tutorialMockData`. Renders `GameBoard` or `GameOverScreen` depending on the current phase. All callbacks (`sendChat`, `sendReaction`, etc.) are no-ops that log to console.
- **Real mode**: Calls `create-room` + `join-room` Edge Functions to bootstrap a room, then renders the normal `Room`-like flow with `useGameRoom`. The debug panel gains an "Auto-Advance Round" button.
- Passes `decayStageOverride` to `GameBoard` when the debug slider is active.

### 2. `src/components/game/DebugPanel.tsx`
A collapsible, draggable panel fixed to bottom-right. Dark card aesthetic matching the game's war-room theme — not a generic dev tools panel. Iron-bordered, Cinzel headers, compact.

**Controls (mock mode)**:
- Phase dropdown: `election` / `legislative` / `executive_action` / `game_over`
- Shadow edicts slider: 0–6 (drives decay in real-time)
- Loyalist edicts slider: 0–5
- Election tracker: 0–3
- Herald / Lord Commander player selectors
- Veto unlocked toggle
- Active power selector: `null` / `investigate` / `peek` / `election` / `execution`
- Winner selector: `null` / `loyalists_edicts` / `usurper_executed` / `traitors_edicts` / `usurper_crowned`
- Per-player alive/dead toggles
- Herald hand override (3-card picker: loyalist/shadow)
- Chancellor hand override (2-card picker)
- Decay stage manual slider (0–6), overrides derived value

**Controls (real mode)**:
- "Start Game" button
- "Auto-Advance Round" button
- Decay slider override (visual only)

**Design direction**: This panel should feel like an illuminated manuscript margin — compact, dense, functional. Use the game's own tokens (`--card`, `--primary`, `--accent`). Cinzel for labels, Crimson Text for values. Iron/gold border treatment. Collapsible to a small sigil icon when not in use.

### 3. `src/lib/tutorialMockData.ts` — Expand
Add missing mock data needed for full GameBoard rendering:
- `MOCK_EVENTS` — 5–8 sample event log entries spanning different types
- `MOCK_CHAT_MESSAGES` — 3–4 sample lobby/game chat messages
- `MOCK_ROUND` — a mock round object with `id`, `round_number`, `room_id`
- `MOCK_ALL_ROLES` — full role set for 7 players (4 loyalist, 2 traitor, 1 usurper) for game-over screen
- `MOCK_ROUND_HISTORY` — sample data matching `get_round_history` return shape, for Inquisitor's Lens testing

---

## Files to Modify

### 4. `src/App.tsx`
Add route: `<Route path="/demo" element={<Demo />} />`

### 5. `src/components/game/GameBoard.tsx`
- Add optional prop `decayStageOverride?: number`
- When provided, use it instead of the value from `useDecayStage`
- Thread it through to `DecayOverlay` and `GoldTarnish`

### 6. `src/components/game/GameOverScreen.tsx`
- Add optional prop `roomIdOverride?: number` so the Inquisitor's Lens can work with mock data in demo mode
- When in demo mode, the Lens hook should accept pre-loaded mock round history instead of calling RPC

---

## Interaction Flow

1. User navigates to `/demo` — lands in mock mode
2. `GameBoard` renders with 7 mock players, election phase, 0 edicts
3. User opens debug panel (click iron-lock icon bottom-right)
4. Dragging the shadow edicts slider from 0→4 causes the Kingdom's Decay to visually progress in real-time — cracks appear, gold tarnishes, ash falls
5. Switching phase to `game_over` + setting winner shows `GameOverScreen` with Inquisitor's Lens populated from mock round history
6. Setting herald hand to `['shadow','shadow','loyalist']` and switching to legislative phase shows the legislative overlay with those cards
7. Toggling players dead shows execution effects on PlayerCouncil

For real mode: user clicks "Real Mode" toggle, a room is created, 6 bots join, "Start Game" begins the game, "Auto-Advance" runs a full round via Edge Functions.

---

## Performance & Constraints

- Mock mode makes zero network calls — pure React state
- Debug panel uses `z-[9999]` to float above all game overlays
- All motion in debug panel respects `prefers-reduced-motion`
- Panel state persists in `sessionStorage` so it survives hot reloads
- Real mode requires anonymous auth (already provided by `AuthProvider`)

---

## Implementation Order

1. Expand `tutorialMockData.ts` with events, chat, rounds, roles, round history
2. Build `DebugPanel.tsx` — the control surface
3. Build `Demo.tsx` — mock mode only first
4. Add `decayStageOverride` prop to `GameBoard`
5. Add `/demo` route to `App.tsx`
6. Wire real mode (creates room, bots, auto-advance) as a follow-up

