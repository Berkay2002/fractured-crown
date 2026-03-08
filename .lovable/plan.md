

# Interactive "How to Play" Tutorial with Live Component Previews

## Overview

Replace the current text-only How to Play modal with a detailed, step-by-step interactive tutorial that renders actual game components with mock data. The tutorial will live as both a compact modal (summary + link) and a full dedicated page at `/how-to-play`.

## Architecture

### Tutorial Engine

A `TutorialStep` system with 12 steps, each containing:
- A title and narrative description
- A live render of real game components (EdictTracker, PlayerCouncil, VotingPanel, PolicyCardUI, RoleReveal) fed with mock data
- Annotations (callout boxes pointing out key elements)
- Forward/back navigation with step indicator

### Mock Data Layer

A `src/lib/tutorialMockData.ts` file providing static mock objects that match the existing TypeScript types (`Tables<'players'>`, `Tables<'game_state'>`, `Tables<'votes'>`, etc.) so real components render without Supabase calls.

### Step Outline (12 steps)

1. **The Realm** — Overview of factions. Shows 3 mock RoleReveal cards (Loyalist, Traitor, Usurper) side by side as static previews.
2. **The Council** — PlayerCouncil rendered with 7 mock players, Herald/LC badges highlighted.
3. **The Edict Trackers** — EdictTracker x3 (loyalist at 2/5, shadow at 3/6, election at 1/3) with annotations.
4. **Nomination** — PlayerCouncil with one player glowing as selectable, showing the Herald nominating.
5. **The Vote** — VotingPanel with mock votes partially cast, showing Ja/Nein buttons.
6. **Vote Results** — VotingPanel in revealed state with mock vote results.
7. **The Legislative Session (Herald)** — 3 face-down PolicyCardUI components, one being discarded.
8. **The Legislative Session (Lord Commander)** — 2 face-up PolicyCardUI components, one being enacted.
9. **Shadow Powers: Raven's Eye** — 3 face-up cards shown as a peek preview.
10. **Shadow Powers: Investigate & Execute** — PlayerCouncil with selectable targets, skull icon.
11. **The Veto** — Veto dialog mockup with Accept/Reject buttons.
12. **Victory & Defeat** — EdictTracker at 5/5 loyalist (win) and 6/6 shadow (win), plus execution scenario.

### Component Reuse Strategy

The real components (`EdictTracker`, `PlayerCouncil`, `VotingPanel`, `PolicyCardUI`) will be rendered directly. Components that require Supabase calls (like `VotingPanel`'s `handleVote`) will have their interactive handlers replaced with no-ops or local state toggles in the tutorial wrapper.

For `PolicyCardUI`, it's currently defined inline in `LegislativeOverlay.tsx` — it will be extracted to a shared export so the tutorial can import it.

## File Changes

| File | Action |
|---|---|
| `src/lib/tutorialMockData.ts` | New — mock players, game state, votes, roles |
| `src/components/game/PolicyCardUI.tsx` | New — extracted from LegislativeOverlay |
| `src/components/game/LegislativeOverlay.tsx` | Import PolicyCardUI instead of inline definition |
| `src/components/game/HowToPlayTutorial.tsx` | New — full tutorial component with 12 steps |
| `src/components/game/HowToPlayModal.tsx` | Rewrite — compact summary modal with "Full Tutorial" link |
| `src/pages/HowToPlay.tsx` | New — full-page route rendering HowToPlayTutorial |
| `src/App.tsx` | Add `/how-to-play` route |

## UI Design

- **Full page**: Dark background matching game aesthetic. Centered content area (max-w-3xl). Step counter as gold dots at the top. Previous/Next buttons styled as `gold-shimmer`. Each step has the narrative text above and the live component preview below in a bordered "parchment" container.
- **Modal (compact)**: Keeps the 6 text sections as a quick reference, but adds a prominent "Launch Interactive Tutorial" button at the top that navigates to `/how-to-play`.
- All annotations use `font-body` with a left gold border accent, positioned below the live preview.

## Technical Notes

- Mock data objects will use `as any` casts where needed to satisfy the full `Tables<>` types without providing every column — only the fields actually read by the components.
- `PlayerCouncil`'s `onPlayerClick` will be wired to a local `useState` in the tutorial to show selection behavior.
- `VotingPanel` will be rendered in a "display only" mode by passing pre-populated votes and no `roomId` — the vote buttons will use local state instead of calling the Edge Function.
- No Supabase calls anywhere in the tutorial.

