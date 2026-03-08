

## Diagnosis: Realtime not delivering events

### Issue 1: `rooms` table is not in the Realtime publication

The `rooms` table was never added to the `supabase_realtime` publication. Room.tsx subscribes to `rooms` changes (for status updates like `lobby` → `in_progress`), but since it's not published, those events are silently dropped. This is why other players don't see the game start — they never receive the room status change.

### Issue 2: Chat messages not updating (including for the sender)

The chat insert goes directly via the Supabase client (`supabase.from('chat_messages').insert(...)`). The Realtime subscription in `useGameRoom` should pick this up, but there's no optimistic update — the sender relies entirely on the Realtime event loop. If the Realtime channel has any connectivity issue (e.g., the failed `rooms` subscription on the Room.tsx channel affecting the connection), no events are delivered.

Additionally, both `Room.tsx` and `useGameRoom.ts` create separate Realtime channels that subscribe to the `players` table with the same filter. This redundancy could contribute to connection instability.

### Plan

**Migration (1 SQL statement):**
- Add `rooms` to the `supabase_realtime` publication so room status changes are delivered.

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
```

**Code changes in `src/pages/Room.tsx`:**
- Remove the duplicate `players` and `rooms` subscription from Room.tsx when the game is in progress (useGameRoom already handles it).
- When the room transitions to `in_progress`, the existing subscription should now work since `rooms` will be published.

**Code changes in `src/hooks/useGameRoom.ts`:**
- Add an optimistic update to `sendChat` — append the new message to `chatMessages` state immediately so the sender sees it instantly without waiting for Realtime.

**Code changes in `src/components/game/ChatPanel.tsx`:**
- No changes needed; it already renders from the `messages` prop.

