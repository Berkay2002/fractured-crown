# Implementation Plan: Six Frontend Features

## Feature 1 — Kick Player (RoomLobby)

**Files:** `src/components/game/RoomLobby.tsx`, `src/pages/Room.tsx`

In the `playerGrid` section of `RoomLobby.tsx` (around line 353-483):

- Add state: `kickingPlayer` (number | null) and `confirmingKick` (number | null)
- On each player card, if `isHost && !isMe && player exists` (not ghost slots), show a small `X` button in the top-right corner on hover (similar to the existing transfer crown button pattern using `group-hover`)
- On click, set `confirmingKick` to that player's ID, showing an inline confirmation panel (reuse the same pattern as the transfer host confirmation at lines 442-476): "Remove [name] from the council?" with Confirm/Cancel
- On confirm, invoke `kick-player` edge function, show themed toast on success
- Pass a new `onKickPlayer` callback prop from `RoomLobby` or handle it inline

For the kicked player detection in `Room.tsx`:

- In the existing Realtime players subscription (line 147-159), after refetching players, check if `currentPlayerId` is no longer in the returned list. If so, navigate to `/` with a toast: "You have been removed from the council."

## Feature 2 — Player Name Change (RoomLobby)

**Files:** `src/components/game/RoomLobby.tsx`

- Add state: `editingName` (boolean), `editNameValue` (string)
- On the current player's card, show a pencil icon on hover (using `group-hover` like the kick button)
- On click, replace the `display_name` span with an `<input>` styled inline — same font (`font-body text-sm`), transparent bg, bottom border only, pre-filled with current name
- On Enter or blur: validate (1-30 chars trimmed), call `supabase.from('players').update({ display_name })`. On Escape: revert
- Realtime already broadcasts player updates so all clients see it

## Feature 3 — Council Ledger Stats (GameOverScreen)

**Files:** `src/components/game/GameOverScreen.tsx`

Below the Chronicle section (after line 321), add a new "Council Ledger" section:

- On mount, fetch votes with player joins, rounds count. Roles are already available via `allRoles` prop
- Display sections:
  1. **Voting Record** — per player: Ja count vs Nein count, "Most Deceptive" badge for the player who voted against the winning side most
  2. **Game Length** — total rounds
  3. **Policy Breakdown** — loyalist/shadow edicts from `gameState`
- Style: `bg-[#1c1612]` card, Cinzel headers, Crimson Text body, staggered entrance animations using framer-motion

Note: The existing "True Allegiances Revealed" section already handles role reveals, so the Council Ledger focuses on voting stats and summary data.

## Feature 4 — Policy Peek Cinematic Overlay

**Files:** `src/components/game/ExecutivePowerOverlay.tsx` (or new component `src/components/game/PolicyPeekOverlay.tsx`)

Currently the policy peek UI is inline in `ExecutivePowerOverlay.tsx` (lines 112-186). Replace the post-peek view with a full-screen cinematic overlay:

- After `invokeResolve('policy_peek')` returns `peeked_cards`, set state and render a fixed full-screen overlay (`fixed inset-0 z-50 bg-[#0f0d0b]/90 backdrop-blur-sm`)
- Title: "The Raven's Eye Reveals..." in Cinzel, gold, fade-in
- Three cards appear with 400ms stagger, flip animation from dark to color (gold for loyalist, crimson for shadow)
- Each card shows "Royal Edict — Loyalist" or "Royal Edict — Shadow"
- Subtext: "These are the next three edicts in the deck. Only you can see this."
- Close button + Escape key listener dismisses
- Non-Herald players already see the waiting screen (lines 52-96)

## Feature 5 — Investigation Cinematic Overlay

**Files:** `src/components/game/ExecutivePowerOverlay.tsx` (or new component `src/components/game/InvestigationOverlay.tsx`)

Currently the investigation result is shown inline (lines 221-243). Replace with full-screen cinematic overlay:

- After `invokeResolve('investigate_loyalty')` returns `team`, render fixed overlay
- Investigated player's sigil (96x96) with scale-in animation (600ms)
- Player name in Cinzel below
- 300ms delay then verdict: "Serves the Crown" (gold + gold glow) or "Serves the Shadow" (crimson + crimson glow)
- Subtext: "Only you can see this verdict."
- Close button + Escape key dismisses
- Local state only

## Feature 6 — Animated Edict Tracker

**Files:** `src/components/game/EdictTracker.tsx`

- Add a `useRef<Set<number>>` to track which slot indices have already been animated
- On render, compare current `count` with the set of animated slots
- For newly filled slots (delta), apply a CSS animation sequence:
  - Drop in: `opacity-0 translateY(-8px)` → `opacity-1 translateY(0)` over 300ms ease-out
  - Stamp pulse: scale to 1.1 over 100ms, back to 1.0 over 100ms
  - Glow: `box-shadow` with crimson (shadow) or gold (loyalist) that fades over 600ms
- Use framer-motion's `animate` on each slot, keyed by whether it's newly filled
- After animation completes, add the index to the ref set so it never re-animates

---

## Summary of Files to Edit


| File                                            | Features                                    |
| ----------------------------------------------- | ------------------------------------------- |
| `src/components/game/RoomLobby.tsx`             | 1 (kick), 2 (name edit)                     |
| `src/pages/Room.tsx`                            | 1 (kick detection/redirect)                 |
| `src/components/game/GameOverScreen.tsx`        | 3 (council ledger)                          |
| `src/components/game/ExecutivePowerOverlay.tsx` | 4 (peek overlay), 5 (investigation overlay) |
| `src/components/game/EdictTracker.tsx`          | 6 (animated tracker)                        |


No Edge Functions modified. No migrations. No new Realtime channels.  
  
PS: In the Realtime players subscription, detect kick by listening for `event: 'DELETE'` where `payload.old.id === myPlayerId`. Do not detect it by refetching and diffing the full player list — that will trigger false positives when other players leave.