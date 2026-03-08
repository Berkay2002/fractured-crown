# AGENTS.md — Fractured Crown

Guidelines for AI agents (Codex, Copilot, Lovable, etc.) working on this codebase.

---

## Project Overview

Fractured Crown is a browser-based multiplayer social deduction game (5–10 players) built with React + Vite + Tailwind CSS on the frontend and Supabase (Postgres, Auth, Realtime, Edge Functions) on the backend. It is a reskin of Secret Hitler with a dark medieval fantasy theme.

---

## Critical Rules

### Security Model

- **Anonymous auth only.** Every player gets an anonymous session via `supabase.auth.signInAnonymously()`. No emails, passwords, or PII exist. All RLS policies scoped to `authenticated` intentionally include anonymous sessions.
- **`policy_deck` has no client SELECT policy.** The deck must never be readable by any client. Only Edge Functions access it via the service role key. Never add a client-facing SELECT policy.
- **No role storage on profiles/users tables.** Game roles (`loyalist`, `traitor`, `usurper`) are stored in `player_roles` and protected by RLS so each player can only read their own role until `game_phase = 'game_over'`.

### Architecture Invariants

1. **All sensitive game logic lives in Edge Functions only.** Never move game state transitions, role assignments, deck management, win condition checks, or card dealing into client-side code. The authoritative Edge Functions are: `start-game`, `nominate-chancellor`, `submit-vote`, `herald-discard`, `enact-policy`, `request-veto`, `respond-veto`, `resolve-power`, `reset-room`.
2. **Private card hands are never exposed via Realtime.** Herald's 3-card hand and the Lord Commander's 2-card hand are delivered exclusively in Edge Function response bodies. They live in local React state (`heraldHand` / `chancellorHand` in `useGameRoom`) and are never written to any Realtime-published column.
3. **Single Realtime channel per game room.** All table subscriptions go through the channel in `useGameRoom.ts`. Do not create additional overlapping channels — this causes connection instability and duplicate event handling.
4. **All DB schema changes must be applied as migrations** tracked in the repo under `supabase/migrations/`.

### Database Conventions

- Primary keys: `bigint generated always as identity` (no UUIDs on hot tables)
- All RLS SELECT policies must be **PERMISSIVE** (the default). Never use `AS RESTRICTIVE` — Supabase Realtime silently fails to deliver events when only restrictive policies exist.
- All FK columns must have explicit indexes
- All tables use `REPLICA IDENTITY FULL`
- `SECURITY DEFINER` functions must always include `SET search_path = ''`
- The `supabase_realtime` publication includes: `rooms`, `players`, `game_state`, `rounds`, `votes`, `event_log`, `chat_messages`. Never add `policy_deck` or `player_roles`.

---

## Code Style

- TypeScript strict mode throughout
- Tailwind utility classes only — no custom CSS files (except `index.css` for theme tokens and keyframes)
- Custom hooks in `src/hooks/` — components should not contain direct Supabase calls
- All `supabase.functions.invoke()` calls go through the hook layer, never inline in components
- Optimistic UI updates for user-initiated actions (chat send, vote cast) — don't wait for Realtime echo

---

## Design System

**Aesthetic:** Dark medieval war room — gothic, candlelit, conspiratorial

| Token | CSS Variable | Value |
|---|---|---|
| Background | `--background` | `20 18% 4%` (#0f0d0b) |
| Surface/Card | `--card` | `18 22% 9%` (#1c1612) |
| Gold | `--primary` | `43 50% 54%` (#c9a84c) |
| Crimson | `--accent` | `0 68% 32%` (#8b1a1a) |
| Body text | `--foreground` | `36 38% 85%` (#e8dcc8) |
| Muted text | `--muted-foreground` | `30 20% 40%` (#7a6a55) |

- **Heading font:** Cinzel (`.font-display`)
- **Body font:** Crimson Text (`.font-body`)
- **Mono font:** Courier Prime (`.font-mono`)
- Use semantic design tokens from `index.css` / `tailwind.config.ts`. Never hardcode colors in components.

---

## Terminology Mapping

Never use Secret Hitler terms in code, UI, or comments:

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

---

## Discord Activity

- Client ID: `1480188235148693635`
- When running inside Discord's iframe (detected via `frame_id` query param or `discordsays.com` hostname), Supabase API requests route through `/.proxy/supabase/` and storage assets through `/.proxy/storage/`
- Raw DOM asset URLs (video `src`, image `src`, CSS backgrounds) must use `storageUrl()` / `sigilUrl()` from `src/lib/storageUrl.ts` — the Supabase JS client handles its own URL rewriting, but raw strings do not
- Rich Presence is updated dynamically to reflect room status, round, and game phase

---

## File Organization

| Path | Purpose |
|---|---|
| `src/components/game/` | All in-game UI components |
| `src/components/lobby/` | Lobby-specific components |
| `src/components/ui/` | shadcn/ui primitives |
| `src/contexts/` | React contexts (Auth, Sound, Discord) |
| `src/hooks/` | Custom hooks (game room, sound, presence) |
| `src/lib/` | Utilities (storageUrl, backgroundImage) |
| `src/pages/` | Route-level page components |
| `supabase/functions/` | Edge Functions (all game logic) |
| `supabase/migrations/` | Database migrations (read-only in repo) |

---

## Testing

- Vitest for unit tests (`src/test/`)
- Edge Function tests via `supabase--test_edge_functions` tool
- No E2E test framework currently configured

---

## Common Pitfalls

1. **Don't add overlapping Realtime channels.** All subscriptions for a game room go through `useGameRoom.ts`.
2. **Don't read `policy_deck` from the client.** It's service-role-only by design.
3. **Don't use `AS RESTRICTIVE` on RLS policies.** Realtime breaks silently.
4. **Don't store roles on the `players` table.** Use `player_roles` with proper RLS.
5. **Don't hardcode Supabase storage URLs in JSX.** Use `sigilUrl()` / `storageUrl()` for Discord proxy compatibility.
