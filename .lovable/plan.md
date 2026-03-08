

## Fix: Realtime not delivering changes due to missing REPLICA IDENTITY FULL

### Root Cause

Supabase Realtime with RLS-protected tables requires `REPLICA IDENTITY FULL` on each table so the Realtime system can evaluate RLS policies against the full row. Currently all 6 Realtime-enabled tables have the default replica identity (`d`), which only includes the primary key. This means Realtime silently drops change events because it can't determine if the subscribing user is allowed to see the row.

### Fix

One migration to set `REPLICA IDENTITY FULL` on all 6 tables that are published to Realtime:

```sql
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.game_state REPLICA IDENTITY FULL;
ALTER TABLE public.rounds REPLICA IDENTITY FULL;
ALTER TABLE public.votes REPLICA IDENTITY FULL;
ALTER TABLE public.event_log REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
```

No code changes needed. After this migration, when a new player joins via the `join-room` Edge Function, the INSERT into `players` will be delivered via Realtime to the host's subscription, triggering the re-fetch that updates the lobby player list.

