## Live Cursor Presence in Lobby

Add ephemeral cursor presence to the lobby so players see each other's sigil-cursors drifting across the screen. No DB writes, no Edge Functions — pure Supabase Realtime Presence.

---

### Files to Create

**1.** `src/hooks/useLobbyPresence.ts`

- Hook that manages a dedicated Presence channel (`lobby-presence:{roomCode}`) — completely separate from the game Realtime channel in `useGameRoom.ts`, no conflict
- Tracks cursor position as percentage coordinates (0–100) relative to the lobby container
- **50ms throttle** on `track()` calls using a `useRef` timestamp check — prevent flooding the channel
- Filters out own cursor from the `cursors` state on every `sync` event
- On `leave` event, immediately remove that player's cursor from state
- Cleanup on unmount: `channel.untrack()` then `supabase.removeChannel(channel)`
- Import Supabase from `@/integrations/supabase/client` — not `@/lib/supabase`
- Player field is `display_name`, not `username` — map it correctly in the payload
- **Re-subscribe only when** `myPlayer.id` **changes** — not on every render or sigil change — to avoid channel churn
- **Sigil updates without re-subscribing:** `updateCursor` must close over the latest `myPlayer` value (including `sigil`) so the tracked payload always reflects the current sigil even without a channel restart. Pass `myPlayer` as a ref internally so `updateCursor` always reads the latest value

Tracked payload shape:

```typescript
interface CursorPresence {
  playerId: string
  username: string   // maps from display_name
  sigil: string
  x: number          // 0–100 percentage
  y: number          // 0–100 percentage
}

```

---

**2.** `src/components/lobby/LobbyPresenceCursor.tsx`

Spectral sigil cursor component. Each cursor should feel like a glowing phantom drifting through the candlelit throne room — not a generic mouse pointer.

Visual elements:

- **Sigil image** using `sigilImageUrl` from the existing `SigilAvatar` component for consistency
- **Slow pulsing gold aura** behind the sigil — do NOT use Tailwind's `animate-ping` (too fast and noisy with multiple players). Instead use a custom CSS `@keyframes` pulse that scales from 1.0 to 1.6 and back over **3 seconds** with `ease-in-out`, opacity going from 0.4 to 0 — atmospheric, not frantic
- **Username pill** below the sigil: Cinzel font, gold `#c9a84c` text, `#0f0d0b` background at 85% opacity, subtle gold border at 30% opacity
- `pointer-events-none` on the entire component
- Positioned absolutely via percentage-based `left` / `top` with `transform: translate(-50%, -50%)` so the center of the sigil tracks the cursor
- **Smooth movement:** `transition: left 80ms linear, top 80ms linear` — fluid without lag

Styling reference:

```
sigil: w-9 h-9 rounded-full object-cover
sigil box-shadow: 0 0 12px rgba(201,168,76,0.6), 0 0 4px rgba(201,168,76,0.9)
sigil border: 1.5px solid rgba(201,168,76,0.7)
aura: absolute, rounded-full, custom 3s ease-in-out pulse keyframe
username: text-xs font-cinzel, px-2 py-0.5, rounded-sm

```

---

### Files to Modify

**3.** `src/components/game/RoomLobby.tsx`

- Call `useLobbyPresence(room.room_code, myPlayerPayload)` at the top of the component where `myPlayerPayload` maps `{ id, username: player.display_name, sigil: player.sigil }`
- Add `onMouseMove` to the root container div:

```tsx
onMouseMove={(e) => {
  const rect = e.currentTarget.getBoundingClientRect()
  updateCursor(
    ((e.clientX - rect.left) / rect.width) * 100,
    ((e.clientY - rect.top) / rect.height) * 100
  )
}}

```

- Root div must have `relative overflow-hidden` — confirm it already does, add if missing
- Render `<LobbyPresenceCursor>` for each entry in `cursors` as the very last children inside the root div so they layer above everything else:

```tsx
{Object.values(cursors).map((cursor) => (
  <LobbyPresenceCursor key={cursor.playerId} cursor={cursor} />
))}

```

---

### Critical Constraints

- Lobby only — do not add presence tracking to the game board or any other screen
- Never render the local player's own cursor
- All cursor elements are `pointer-events-none` — never block clicks
- Do not change any game logic, DB calls, or the existing `useGameRoom` Realtime channel
- The `animate-ping` Tailwind class is explicitly forbidden here — use the custom 3s keyframe instead