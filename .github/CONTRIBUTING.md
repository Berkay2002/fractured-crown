# Fractured Crown — Contributing

Thank you for your interest in contributing!

## Getting Started

1. Fork and clone the repo
2. `npm install`
3. `npm run dev`

## Guidelines

- **TypeScript strict mode** — no `any` unless absolutely necessary
- **Tailwind semantic tokens only** — use CSS variables from `index.css`, never hardcode colors
- **Game logic stays in Edge Functions** — never move state transitions, role assignments, or deck management to the client
- **Use in-app terminology** — Herald (not President), Lord Commander (not Chancellor), etc. See `AGENTS.md` for the full mapping
- **Storage URLs** — always use `sigilUrl()` / `storageUrl()` from `src/lib/storageUrl.ts`, never hardcode Supabase URLs
- **Database changes** — must be applied as migrations in `supabase/migrations/`

## Pull Requests

- One feature/fix per PR
- Fill out the PR template
- Ensure `tsc --noEmit`, `eslint`, and `vitest` pass before requesting review
